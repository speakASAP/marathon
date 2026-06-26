import { useParams, Link } from 'react-router-dom';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getToken, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchRandomAnswer,
  fetchSavedSubmission,
  fetchStepInfo,
  saveStepDraft,
  submitStepReport,
  type AssignmentBlock,
  type RandomAnswer,
  type SavedSubmission,
  type StepInfo,
  type SubmissionPayload,
} from '../api/assignmentMarathon';
import StepAssignmentRenderer from '../components/StepAssignmentRenderer';
import { fetchMyMarathon, updateReportTime, type MyMarathon } from '../api/profileMarathon';

const DRAFT_SAVE_DELAY_MS = 900;

type Level = 'beginner' | 'medium' | 'advanced' | null;
type AssignmentFieldBlock = Extract<AssignmentBlock, { type: 'field' }>;
type AnswerRow = { id: string; question: string; answer: string };

function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

function formatDateTime(value: string) {
  const formatted = new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatted.replace(',', ' в');
}

function formatTimeInput(value?: string | null) {
  if (!value) return '13:00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '13:00';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'локальный часовой пояс';
  } catch {
    return 'локальный часовой пояс';
  }
}

const GENERIC_NEXT_SCHEDULE_INSTRUCTION = /Сформируйте отчет[,.]?\s*Новый этап появится в то\s*(?:⏰\s*)?время,\s*которое вы указали на странице\s*(?:⚙️?\s*)?настроек\.?/gi;

function stripGenericNextScheduleInstruction(value: string) {
  return value
    .replace(GENERIC_NEXT_SCHEDULE_INSTRUCTION, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isGenericNextScheduleInstruction(block: AssignmentBlock) {
  return block.type === 'text'
    && /Сформируйте отчет/i.test(block.text)
    && /Новый этап появится/i.test(block.text)
    && /странице\s*(?:⚙️?\s*)?настроек/i.test(block.text);
}

function sanitizeAssignmentBlock(block: AssignmentBlock): AssignmentBlock | null {
  if (isGenericNextScheduleInstruction(block)) return null;
  if (block.type !== 'text') return block;

  const text = stripGenericNextScheduleInstruction(block.text);
  return text ? { ...block, text } : null;
}

function isPayloadRecord(value: unknown): value is SubmissionPayload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFieldBlock(block: AssignmentBlock): block is AssignmentFieldBlock {
  return block.type === 'field';
}

function findLevelField(blocks: AssignmentBlock[]): AssignmentFieldBlock | undefined {
  return blocks.find((block): block is AssignmentFieldBlock => isFieldBlock(block) && block.name === 'q1')
    || blocks.find((block): block is AssignmentFieldBlock => (
      isFieldBlock(block) && normalizeText(block.label).startsWith('как долго вы учите')
    ));
}

function getLevel(value: unknown): Level {
  if (typeof value !== 'string') return null;
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.includes('только')) return 'beginner';
  if (normalized.includes('несколько')) return 'medium';
  if (normalized.includes('полугода')) return 'advanced';
  return null;
}

function branchVisible(branch: AssignmentBlock['branch'], level: Level) {
  if (!branch) return true;
  if (!level) return false;
  if (branch === 'beginner-medium') return level === 'beginner' || level === 'medium';
  return branch === level;
}

function answerFilled(value: unknown) {
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.some((item) => typeof item === 'string' && Boolean(item.trim()));
  return false;
}

function missingRequiredAnswers(blocks: AssignmentBlock[] | null | undefined, payload: SubmissionPayload) {
  const assignmentBlocks = Array.isArray(blocks) ? blocks : [];
  const levelField = findLevelField(assignmentBlocks);
  const level = levelField ? getLevel(payload[levelField.name]) : null;
  return assignmentBlocks
    .filter((block): block is Extract<AssignmentBlock, { type: 'field' }> => (
      isFieldBlock(block) && block.required && branchVisible(block.branch, level)
    ))
    .filter((block) => !answerFilled(payload[block.name]));
}

function formatAnswerValue(block: AssignmentFieldBlock, value: unknown) {
  const choiceLabel = (raw: string) => block.choices?.find((choice) => choice.value === raw)?.label || raw;
  if (Array.isArray(value)) {
    return value.map((item) => choiceLabel(String(item))).filter(Boolean).join(', ');
  }
  if (typeof value === 'string') return choiceLabel(value).trim();
  return '';
}

function answerRowsFromPayload(
  blocks: AssignmentBlock[] | null | undefined,
  payload: SubmissionPayload,
  report: string,
): AnswerRow[] {
  const assignmentBlocks = Array.isArray(blocks) ? blocks : [];
  const rows = assignmentBlocks
    .filter(isFieldBlock)
    .map((block) => ({
      id: block.id || block.name,
      question: block.label,
      answer: formatAnswerValue(block, payload[block.name]),
    }))
    .filter((row) => row.answer.trim());

  if (!rows.length && report.trim()) {
    return [{ id: 'report', question: 'Ответ', answer: report.trim() }];
  }

  return rows;
}

function makeDraftKey(report: string, payload: SubmissionPayload) {
  return JSON.stringify({ report: report.trim(), payload });
}

function hasMeaningfulDraft(report: string, payload: SubmissionPayload) {
  return Boolean(report.trim()) || Object.keys(payload).length > 0;
}

/**
 * Step (task) page: assignment and submission form first; peer reports unlock after submission.
 */
export default function Step() {
  const { stepId } = useParams<{ stepId: string }>();
  const [step, setStep] = useState<StepInfo | null>(null);
  const [loadingStep, setLoadingStep] = useState(true);
  const [stepNotFound, setStepNotFound] = useState(false);
  const [stepLoadError, setStepLoadError] = useState('');
  const [tab, setTab] = useState<'task' | 'report'>('task');
  const [randomAnswer, setRandomAnswer] = useState<RandomAnswer | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [marathonerId, setMarathonerId] = useState('');
  const [report, setОтчет] = useState('');
  const [assignmentPayload, setAssignmentPayload] = useState<SubmissionPayload>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [lastSavedDraftKey, setLastSavedDraftKey] = useState(makeDraftKey('', {}));
  const [savedSubmission, setSavedSubmission] = useState<SavedSubmission | null>(null);
  const [loadingSavedSubmission, setLoadingSavedSubmission] = useState(false);
  const [savedSubmissionError, setSavedSubmissionError] = useState('');
  const [submissionAuthRequired, setSubmissionAuthRequired] = useState(false);
  const [marathon, setMarathon] = useState<MyMarathon | null>(null);
  const [, setMarathonLoadError] = useState('');
  const [reportTime, setReportTime] = useState('13:00');
  const [browserTimeZone] = useState(getBrowserTimeZone);
  const [reportTimeSaving, setReportTimeSaving] = useState(false);
  const [reportTimeMessage, setReportTimeMessage] = useState('');
  const [reportTimeError, setReportTimeError] = useState('');

  useEffect(() => {
    if (!stepId) return;
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setStep(null);
    setStepNotFound(false);
    setStepLoadError('');
    setRandomAnswer(null);
    setSavedSubmission(null);
    setSavedSubmissionError('');
    setSubmissionAuthRequired(false);
    setMarathon(null);
    setMarathonLoadError('');
    setОтчет('');
    setAssignmentPayload({});
    setDraftStatus('');
    setLastSavedDraftKey(makeDraftKey('', {}));
    setLoadingStep(true);
    fetchStepInfo(stepId)
      .then((data) => {
        if (!data) {
          setStepNotFound(true);
          setLoadingStep(false);
          return;
        }
        setStep(data);
        setLoadingStep(false);
      })
      .catch(() => {
        setStepLoadError('Задание не загрузилось. Обновите страницу или обратитесь в поддержку, если проблема повторится.');
        setLoadingStep(false);
      });
  }, [stepId]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (!participantId || !getToken()) return;
    fetchMyMarathon(participantId)
      .then((data) => {
        setMarathon(data);
        setReportTime(formatTimeInput(data.report_time));
        setReportTimeMessage('');
        setReportTimeError('');
        setMarathonLoadError('');
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setSubmissionAuthRequired(true);
        } else {
          setMarathonLoadError('Навигация по этапам временно недоступна.');
        }
      });
  }, [marathonerId]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (!stepId || !participantId) return;
    setLoadingSavedSubmission(true);
    setSavedSubmissionError('');
    setSubmissionAuthRequired(false);
    if (!getToken()) {
      setSubmissionAuthRequired(true);
      setLoadingSavedSubmission(false);
      return;
    }
    fetchSavedSubmission(participantId, stepId)
      .then((data) => {
        const nextPayload = data.exists && isPayloadRecord(data.payload) ? data.payload : {};
        const nextReport = data.exists && typeof data.report === 'string' ? data.report : '';
        setSavedSubmission(data);
        setОтчет(nextReport);
        setAssignmentPayload(nextPayload);
        setDraftStatus('');
        setLastSavedDraftKey(makeDraftKey(nextReport, nextPayload));
        setLoadingSavedSubmission(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setSubmissionAuthRequired(true);
        } else {
          setSavedSubmissionError('Статус сохраненного отчета не загрузился.');
        }
        setLoadingSavedSubmission(false);
      });
  }, [stepId, marathonerId]);

  const assignmentContent = step?.assignmentContent?.trim();
  const hasParticipantContext = Boolean(marathonerId.trim());
  const isFinalSubmission = Boolean(savedSubmission?.exists && savedSubmission.state === 'completed');
  const hasStructuredFields = Boolean(step?.assignmentBlocks?.some((block) => block.type === 'field'));
  const displayedPayload = isFinalSubmission && savedSubmission?.payload ? savedSubmission.payload : assignmentPayload;
  const displayedReport = isFinalSubmission && savedSubmission?.report ? savedSubmission.report : report;
  const filteredAssignmentBlocks = useMemo(
    () => step?.assignmentBlocks?.map(sanitizeAssignmentBlock).filter((block): block is AssignmentBlock => Boolean(block)),
    [step?.assignmentBlocks],
  );
  const filteredAssignmentContent = useMemo(
    () => stripGenericNextScheduleInstruction(assignmentContent || ''),
    [assignmentContent],
  );
  const answerRows = useMemo(
    () => answerRowsFromPayload(step?.assignmentBlocks, displayedPayload, displayedReport),
    [step?.assignmentBlocks, displayedPayload, displayedReport],
  );
  const draftKey = useMemo(() => makeDraftKey(report, assignmentPayload), [report, assignmentPayload]);

  const loadRandomОтчет = () => {
    if (!stepId) return;
    setLoadingRandom(true);
    fetchRandomAnswer(stepId, marathonerId)
      .then((data) => {
        setRandomAnswer(data);
        setLoadingRandom(false);
      })
      .catch(() => setLoadingRandom(false));
  };

  useEffect(() => {
    if (tab === 'report' && stepId) {
      loadRandomОтчет();
    }
  }, [tab, stepId, marathonerId]);

  useEffect(() => {
    if (step) document.title = `${step.title} — Марафон`;
  }, [step]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (
      !stepId
      || !participantId
      || !getToken()
      || !assignmentContent
      || submissionAuthRequired
      || loadingSavedSubmission
      || submitting
      || isFinalSubmission
      || draftKey === lastSavedDraftKey
      || !hasMeaningfulDraft(report, assignmentPayload)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const reportToSave = report.trim();
      const payloadToSave = assignmentPayload;
      const savedKey = draftKey;
      setDraftSaving(true);
      setDraftStatus('Сохраняем черновик...');
      saveStepDraft(participantId, stepId, reportToSave, payloadToSave)
        .then((body) => {
          setSavedSubmission({
            exists: true,
            id: body.id,
            report: reportToSave,
            payload: payloadToSave,
            state: body.state || 'active',
            is_late: Boolean(body.is_late),
            bonus_left: typeof body.bonus_left === 'number' ? body.bonus_left : 0,
            updated_at: body.updated_at,
          });
          setLastSavedDraftKey(savedKey);
          setDraftStatus('');
        })
        .catch((error) => {
          if (error instanceof MarathonAuthRequiredError) {
            setSubmissionAuthRequired(true);
          } else {
            setDraftStatus(error instanceof Error ? error.message : 'Черновик временно не сохранился');
          }
        })
        .finally(() => setDraftSaving(false));
    }, DRAFT_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    assignmentContent,
    assignmentPayload,
    draftKey,
    isFinalSubmission,
    lastSavedDraftKey,
    loadingSavedSubmission,
    marathonerId,
    report,
    stepId,
    submissionAuthRequired,
    submitting,
  ]);

  const submitОтчет = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');
    if (!stepId) return;
    if (isFinalSubmission) {
      setSubmitError('Этот отчет уже отправлен и больше не редактируется.');
      return;
    }
    if (!marathonerId.trim()) {
      setSubmitError('Откройте это задание из профиля марафона перед отправкой отчета.');
      return;
    }
    if (submissionAuthRequired || !getToken()) {
      redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
      return;
    }
    if (!assignmentContent) {
      setSubmitError('Содержание задания не настроено. Отправка заблокирована, пока поддержка не добавит утвержденное задание.');
      return;
    }

    const missing = missingRequiredAnswers(step?.assignmentBlocks, assignmentPayload);
    if (missing.length) {
      setSubmitError(`Заполните обязательные ответы: ${missing.map((block) => block.label).join(', ')}`);
      return;
    }

    const reportToSubmit = report.trim();
    if (!hasMeaningfulDraft(reportToSubmit, assignmentPayload)) {
      setSubmitError('Заполните ответы перед отправкой.');
      return;
    }

    setSubmitting(true);
    try {
      const body = await submitStepReport(marathonerId.trim(), stepId, reportToSubmit, assignmentPayload);
      setSavedSubmission({
        exists: true,
        id: body.id,
        report: reportToSubmit,
        payload: assignmentPayload,
        state: body.state || 'completed',
        is_late: Boolean(body.is_late),
        bonus_left: typeof body.bonus_left === 'number' ? body.bonus_left : 0,
        updated_at: body.updated_at,
      });
      setLastSavedDraftKey(makeDraftKey(reportToSubmit, assignmentPayload));
      setDraftStatus('');
      setSubmitMessage(body.is_late
        ? 'Отчет отправлен. Он отмечен как поздний, ответы зафиксированы и больше не редактируются.'
        : 'Отчет отправлен. Ответы зафиксированы и больше не редактируются.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      setSubmitError(error instanceof Error ? error.message : 'Не удалось отправить отчет');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReportTime = async (event: FormEvent) => {
    event.preventDefault();
    if (!marathon) return;
    setReportTimeSaving(true);
    setReportTimeMessage('');
    setReportTimeError('');
    try {
      const body = await updateReportTime(marathon.id, reportTime, browserTimeZone);
      setMarathon(body);
      setReportTime(formatTimeInput(body.report_time));
      setReportTimeMessage('Время сохранено.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      setReportTimeError(error instanceof Error ? error.message : 'Не удалось сохранить время следующего этапа');
    } finally {
      setReportTimeSaving(false);
    }
  };

  const stepReturnPath = stepId && hasParticipantContext
    ? `/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`
    : '/profile';
  const openLogin = () => redirectToLogin(stepReturnPath);
  const submitBlockedByStatusError = Boolean(savedSubmissionError);
  const canViewPeerReports = isFinalSubmission;
  const currentScheduleIndex = marathon?.answers.findIndex((answer) => answer.stepId === stepId) ?? -1;
  const previousSchedule = marathon && currentScheduleIndex > 0 ? marathon.answers[currentScheduleIndex - 1] : null;
  const nextSchedule = marathon && currentScheduleIndex >= 0 && currentScheduleIndex < marathon.answers.length - 1
    ? marathon.answers[currentScheduleIndex + 1]
    : null;
  const nextOpenAllowed = Boolean(isFinalSubmission && nextSchedule?.can_open && nextSchedule.block_reason !== 'payment_required');
  const nextAvailabilityText = nextSchedule
    ? `Появится ${formatDateTime(nextSchedule.start)}.`
    : '';
  const profileUrl = hasParticipantContext ? `/profile/${encodeURIComponent(marathonerId.trim())}` : '/profile';
  const submitDisabled = submitting
    || loadingSavedSubmission
    || submissionAuthRequired
    || !hasParticipantContext
    || !assignmentContent
    || submitBlockedByStatusError
    || isFinalSubmission;
  const peerОтчетEmpty = tab === 'report' && !loadingRandom && !randomAnswer;

  useEffect(() => {
    if (tab === 'report' && !canViewPeerReports) {
      setTab('task');
    }
  }, [tab, canViewPeerReports]);

  if (loadingStep && !step) {
    return (
      <div className="container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (stepLoadError) {
    return (
      <div className="container page-static page-step">
        <h1>Задание временно недоступно</h1>
        <section className="profile-empty-panel" role="alert">
          <p>{stepLoadError}</p>
          <div className="profile-empty-actions">
            <button type="button" className="btn-profile-open" onClick={() => window.location.reload()}>
              Обновить
            </button>
            <a className="btn-profile-login" href="mailto:support@speakasap.com">
              Связаться с поддержкой
            </a>
          </div>
        </section>
      </div>
    );
  }

  if (!stepId || stepNotFound || (!loadingStep && !step)) {
    return (
      <div className="container page-static page-step">
        <p>Этап не найден.</p>
        <Link to="/profile">Мои марафоны</Link>
      </div>
    );
  }

  return (
    <div className="container page-static page-step">
      <div className="step-page-topbar">
        <Link to={profileUrl} className="step-profile-link">← Профиль марафона</Link>
        {(previousSchedule || nextSchedule) && (
          <div className="step-sequence-actions" aria-label="Навигация по этапам">
            {previousSchedule ? (
              <Link to={`/steps/${previousSchedule.stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`} className="btn-profile-login">
                Предыдущий этап
              </Link>
            ) : (
              <span className="btn-profile-login step-nav-disabled">Предыдущий этап</span>
            )}
            {nextSchedule && nextOpenAllowed ? (
              <Link to={`/steps/${nextSchedule.stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`} className="btn-profile-open">
                {nextSchedule.state === 'inactive' ? 'Открыть следующий сейчас' : 'Следующий этап'}
              </Link>
            ) : (
              <span className="btn-profile-open step-nav-disabled">
                Следующий этап
              </span>
            )}
          </div>
        )}
      </div>
      <h1>{step?.title ?? `Этап ${stepId}`}</h1>
      <div className="step-content-card">
      {canViewPeerReports && (
        <div className="step-tabs">
          <button
            type="button"
            className={tab === 'task' ? 'active' : ''}
            onClick={() => setTab('task')}
          >
            Задание
          </button>
          <button
            type="button"
            className={tab === 'report' ? 'active' : ''}
            onClick={() => setTab('report')}
          >
            Отчёты других участников
          </button>
        </div>
      )}

      {tab === 'task' && (
        <section className="step-task">
          {assignmentContent ? (
            <>
              <StepAssignmentRenderer
                blocks={filteredAssignmentBlocks}
                fallbackContent={filteredAssignmentContent}
                initialPayload={assignmentPayload}
                readOnly={isFinalSubmission}
                onPayloadChange={(payload, draft) => {
                  setAssignmentPayload(payload);
                  setОтчет(draft);
                  setDraftStatus('');
                }}
              />
              {!hasStructuredFields && (
                <label className="step-manual-answer">
                  <span>Ответ на задание</span>
                  <textarea
                    value={report}
                    onChange={(event) => {
                      setОтчет(event.target.value);
                      setDraftStatus('');
                    }}
                    rows={6}
                    disabled={isFinalSubmission || !hasParticipantContext || submissionAuthRequired || submitBlockedByStatusError}
                  />
                </label>
              )}
            </>
          ) : (
            <div className="step-content-missing" role="alert">
              Содержание задания не настроено для этого этапа. Свяжитесь с поддержкой перед отправкой отчета.
            </div>
          )}
          <section className="step-submit" aria-label="Форма отчета">
            {loadingSavedSubmission && <p className="step-report-note">Проверяем сохраненный отчет...</p>}
            {(draftSaving || draftStatus) && !isFinalSubmission && (
              <p className={`step-draft-status${draftSaving ? ' saving' : ''}`}>{draftStatus || 'Сохраняем черновик...'}</p>
            )}
            {savedSubmissionError && (
              <p className="ml-error">
                {savedSubmissionError} Отправка приостановлена, пока статус задания не будет проверен.
              </p>
            )}
            {!assignmentContent && (
              <div className="step-submit-auth-panel" role="alert">
                <strong>Содержание задания не настроено</strong>
                <span>Отправка заблокирована, пока поддержка не добавит утвержденное содержание для этого этапа.</span>
                <Link to="/faq" className="btn-profile-login">Связаться с поддержкой</Link>
              </div>
            )}
            {!hasParticipantContext && (
              <div className="step-submit-auth-panel" role="alert">
                <strong>Откройте это задание из профиля марафона</strong>
                <span>Ссылка из профиля содержит ID участника, нужный для сохранения отчета в правильном марафоне.</span>
                <Link to="/profile" className="btn-profile-login">Открыть профиль</Link>
              </div>
            )}
            {hasParticipantContext && submissionAuthRequired && (
              <div className="step-submit-auth-panel" role="alert">
                <strong>Войдите, чтобы отправить отчет</strong>
                <span>Отчет сохранится только после возврата из портала с токеном марафона для этого участника.</span>
                <button type="button" className="btn-profile-login" onClick={openLogin}>Войти</button>
              </div>
            )}
            {savedSubmission?.exists && (
              <div className="step-saved-report" aria-live="polite">
                {isFinalSubmission && <strong>Отчет отправлен</strong>}
                <span>
                  {savedSubmission.updated_at && `${isFinalSubmission ? 'Отправлено' : 'Черновик обновлен'} ${new Date(savedSubmission.updated_at).toLocaleString('ru-RU')}.`}
                  {savedSubmission.is_late ? ' Отмечено как поздняя отправка.' : ''}
                </span>
              </div>
            )}
            <form onSubmit={submitОтчет} className="step-submit-form">
              <div className="step-answer-summary" aria-live="polite">
                <h3>Ваши ответы</h3>
                {answerRows.length ? (
                  <dl>
                    {answerRows.map((row) => (
                      <div className="step-answer-row" key={row.id}>
                        <dt>{row.question}</dt>
                        <dd>{row.answer}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>Ответы появятся здесь после заполнения полей задания.</p>
                )}
              </div>
              {!isFinalSubmission && (
                <button type="submit" className="btn-show-more" disabled={submitDisabled}>
                  {submitting ? 'Отправка...' : submissionAuthRequired ? 'Войти' : 'Сформировать отчет'}
                </button>
              )}
            </form>
            {submitMessage && <p className="step-submit-success">{submitMessage}</p>}
            {submitError && <p className="ml-error">{submitError}</p>}
            {nextSchedule && marathon && (
              <section className="step-next-control" aria-label="Следующий этап">
                <div className="step-next-control-main">
                  <p><strong>Следующий этап, {nextSchedule.title}.</strong></p>
                  <p>{nextAvailabilityText}</p>
                </div>
                <form className="step-next-time-form" onSubmit={submitReportTime}>
                  <label htmlFor="step-report-time">Время появления следующих этапов</label>
                  <div className="step-next-time-row">
                    <input
                      id="step-report-time"
                      type="time"
                      value={reportTime}
                      onChange={(event) => setReportTime(event.target.value)}
                      disabled={!marathon.can_change_report_time || reportTimeSaving}
                    />
                    <button type="submit" className="btn-profile-login" disabled={!marathon.can_change_report_time || reportTimeSaving}>
                      {reportTimeSaving ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                  </div>
                  {!marathon.can_change_report_time && <span className="profile-step-meta">Время нельзя менять после завершения марафона.</span>}
                  {reportTimeMessage && <p className="step-submit-success">{reportTimeMessage}</p>}
                  {reportTimeError && <p className="ml-error">{reportTimeError}</p>}
                </form>
                {nextOpenAllowed && (
                  <Link to={`/steps/${nextSchedule.stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`} className="btn-profile-open step-next-now">
                    {nextSchedule.state === 'inactive' ? 'Открыть следующий сейчас' : 'Перейти к следующему этапу'}
                  </Link>
                )}
              </section>
            )}
          </section>
        </section>
      )}

      {tab === 'report' && (
        <section className="step-report">
          <h2>Отчёты других участников</h2>
          <p className="step-report-note">Пример отчёта участника по этому этапу (случайный выбор).</p>
          {loadingRandom && !randomAnswer && <p>Загрузка…</p>}
          {randomAnswer && (
            <div className="random-report">
              <p className="random-report-meta">
                {randomAnswer.marathoner.name}
                {randomAnswer.complete_time && (
                  <span> — {new Date(randomAnswer.complete_time).toLocaleString('ru-RU')}</span>
                )}
              </p>
              <div className="random-report-body">{randomAnswer.report}</div>
            </div>
          )}
          {!loadingRandom && randomAnswer && (
            <button type="button" className="btn-show-more" onClick={loadRandomОтчет}>
              Показать ещё
            </button>
          )}
          {peerОтчетEmpty && (
            <div className="step-peer-empty" aria-live="polite">
              <strong>Пока нет примеров отчетов</strong>
              <span>
                Когда участники сохранят первые отчеты по этому этапу, здесь появится случайный пример
                для самопроверки.
              </span>
              <button type="button" className="btn-show-more" onClick={loadRandomОтчет}>
                Проверить еще раз
              </button>
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
