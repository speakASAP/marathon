import { useParams, Link } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import { getToken, redirectToLogin } from '../auth';
import {
  MarathonAuthRequiredError,
  fetchRandomAnswer,
  fetchSavedSubmission,
  fetchStepInfo,
  submitStepReport,
  type RandomAnswer,
  type SavedSubmission,
  type StepInfo,
} from '../api/assignmentMarathon';

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
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [savedSubmission, setSavedSubmission] = useState<SavedSubmission | null>(null);
  const [loadingSavedSubmission, setLoadingSavedSubmission] = useState(false);
  const [savedSubmissionError, setSavedSubmissionError] = useState('');
  const [submissionAuthRequired, setSubmissionAuthRequired] = useState(false);

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
    setОтчет('');
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
        setSavedSubmission(data);
        if (data.exists && typeof data.report === 'string') {
          setОтчет(data.report);
        }
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

  const submitОтчет = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');
    if (!stepId) return;
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
    if (!report.trim()) {
      setSubmitError('Напишите отчет перед отправкой.');
      return;
    }

    setSubmitting(true);
    try {
      const body = await submitStepReport(marathonerId.trim(), stepId, report.trim());
      setSavedSubmission({
        exists: true,
        id: body.id,
        report: report.trim(),
        state: body.state || 'completed',
        is_late: Boolean(body.is_late),
        bonus_left: typeof body.bonus_left === 'number' ? body.bonus_left : 0,
        updated_at: body.updated_at,
      });
      setSubmitMessage(body.is_late ? 'Отчет сохранен. Он отмечен как поздний.' : 'Отчет сохранен. Ваш прогресс записан.');
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

  const assignmentContent = step?.assignmentContent?.trim();
  const hasParticipantContext = Boolean(marathonerId.trim());
  const stepReturnPath = stepId && hasParticipantContext
    ? `/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`
    : '/profile';
  const openLogin = () => redirectToLogin(stepReturnPath);
  const submitBlockedByStatusError = Boolean(savedSubmissionError);
  const canViewPeerReports = Boolean(savedSubmission?.exists && savedSubmission.state === 'completed');
  const submitDisabled = submitting
    || loadingSavedSubmission
    || submissionAuthRequired
    || !hasParticipantContext
    || !assignmentContent
    || submitBlockedByStatusError;
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
      <h1>{step?.title ?? `Этап ${stepId}`}</h1>

      <div className="step-content-card">
      <div className="step-tabs">
        <button
          type="button"
          className={tab === 'task' ? 'active' : ''}
          onClick={() => setTab('task')}
        >
          Задание
        </button>
        {canViewPeerReports && (
          <button
            type="button"
            className={tab === 'report' ? 'active' : ''}
            onClick={() => setTab('report')}
          >
            Отчёты других участников
          </button>
        )}
      </div>

      {tab === 'task' && (
        <section className="step-task">
          {assignmentContent ? (
            <div className="step-assignment-content">{assignmentContent}</div>
          ) : (
            <div className="step-content-missing" role="alert">
              Содержание задания не настроено для этого этапа. Свяжитесь с поддержкой перед отправкой отчета.
            </div>
          )}
          <section className="step-submit" aria-labelledby="step-submit-title">
            <h2 id="step-submit-title">Отправка отчета</h2>
            <p className="step-report-note">Ответьте на вопросы задания и отправьте отчет внизу этой страницы. После отправки откроются отчеты других участников.</p>
            {loadingSavedSubmission && <p className="step-report-note">Проверяем сохраненный отчет...</p>}
            {savedSubmissionError && (
              <p className="ml-error">
                {savedSubmissionError} Отправка приостановлена, пока статус задания не будет проверен.
              </p>
            )}
            {!assignmentContent && (
              <div className="step-submit-auth-panel" role="alert">
                <strong>Содержание задания не настроено</strong>
                <span>Отправка заблокирована, пока поддержка не добавит утвержденное содержание для этого этапа.</span>
                <Link to="/support" className="btn-profile-login">Связаться с поддержкой</Link>
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
                <strong>{savedSubmission.state === 'completed' ? 'Отчет отправлен' : 'Черновик отчета загружен'}</strong>
                <span>
                  {savedSubmission.updated_at && `Обновлено ${new Date(savedSubmission.updated_at).toLocaleString('ru-RU')}.`}
                  {savedSubmission.is_late ? ' Отмечено как поздняя отправка.' : ''}
                </span>
              </div>
            )}
            <form onSubmit={submitОтчет} className="step-submit-form">
              <label htmlFor="step-report">Ваши ответы</label>
              <textarea
                id="step-report"
                value={report}
                onChange={(event) => setОтчет(event.target.value)}
                placeholder="Заполните ответы по заданию, ссылки, заметки или результат практики..."
                rows={8}
                disabled={!hasParticipantContext || submissionAuthRequired || submitBlockedByStatusError || !assignmentContent}
              />
              <button type="submit" className="btn-show-more" disabled={submitDisabled}>
                {submitting ? 'Сохранение...' : submissionAuthRequired ? 'Войти' : 'Отправить отчет'}
              </button>
            </form>
            {submitMessage && <p className="step-submit-success">{submitMessage}</p>}
            {submitError && <p className="ml-error">{submitError}</p>}
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
