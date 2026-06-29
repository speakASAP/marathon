import { useParams, Link, useLocation } from 'react-router-dom';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { fetchMyMarathon, updateReportTime, type Answer, type MyMarathon } from '../api/profileMarathon';
import PublicAnswerReport, {
  answerRowsFromPayload,
  peerAnswerRowsFromPayload,
  renderPublicAnswerQuestion,
} from '../components/assignment/PublicAnswerReport';
import {
  answerPartsFromValue,
  decorateBlocks,
  fieldInlineBlankCount,
  stripHeadingTerminalPeriod,
} from '../components/assignment/assignmentBlockNormalization';

const DRAFT_SAVE_DELAY_MS = 900;

type Level = 'beginner' | 'medium' | 'advanced' | null;
type AssignmentFieldBlock = Extract<AssignmentBlock, { type: 'field' }>;
type KnownWordsBlock = Extract<AssignmentBlock, { type: 'knownWords' }>;
type KnownWordsReplayEntry = {
  paragraphs: string[];
  selected: string[];
};
type LocalStepDraft = {
  report: string;
  payload: SubmissionPayload;
  savedAt: string;
};

const LOCAL_DRAFT_VERSION = 'v1';

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

function isCompletedScheduleAnswer(answer: Answer) {
  return answer.state === 'completed' || answer.state === 'checked' || answer.state === 'done';
}

function canNavigateToScheduleAnswer(answer: Answer | null | undefined) {
  if (!answer) return false;
  return Boolean(answer.can_open && answer.state !== 'inactive' && answer.block_reason !== 'payment_required');
}

function getStepAccessMessage(answer: Answer | null | undefined) {
  if (!answer) return '';
  if (answer.block_reason === 'payment_required') return 'Доступ к этапу откроется после подтверждения оплаты марафона.';
  if (answer.block_reason === 'previous_report_pending') return 'Этот этап откроется после отправки отчета по предыдущему этапу.';
  if (answer.block_reason === 'scheduled_future') return `Этап появится ${formatDateTime(answer.start)}.`;
  return 'Этот этап пока закрыт.';
}

function resolveNextUnopenedSchedule(answers: Answer[] | undefined | null) {
  if (!answers?.length) return null;

  const activeIndex = answers.findIndex((answer) => !isCompletedScheduleAnswer(answer) && answer.state === 'active');
  const searchStart = activeIndex >= 0 ? activeIndex + 1 : 0;
  const targetIndex = answers.findIndex((answer, index) => index >= searchStart && !isCompletedScheduleAnswer(answer));

  return targetIndex >= 0 ? { answer: answers[targetIndex], index: targetIndex } : null;
}

function allPreviousScheduleAnswersCompleted(answers: Answer[] | undefined | null, targetIndex: number) {
  if (!answers?.length || targetIndex <= 0) return targetIndex === 0;
  return answers.slice(0, targetIndex).every(isCompletedScheduleAnswer);
}

const GENERIC_NEXT_SCHEDULE_INSTRUCTION = /Сформируйте отчет[,.]?\s*Новый этап появится в то\s*(?:⏰\s*)?время,\s*которое вы указали на странице(?:\s*⚙️?)?(?:\s*настроек\.?)?/gi;

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
    && /странице/i.test(block.text);
}

function isGenericSettingsLink(block: AssignmentBlock) {
  return block.type === 'link'
    && /^настроек\.?$/i.test(block.text)
    && /^\/profile\/?(?:[?#].*)?$/i.test(block.href);
}

function sanitizeAssignmentBlock(block: AssignmentBlock): AssignmentBlock | null {
  if (isGenericNextScheduleInstruction(block) || isGenericSettingsLink(block)) return null;
  if (block.type !== 'text') return block;

  const text = stripGenericNextScheduleInstruction(block.text);
  return text ? { ...block, text } : null;
}

function sanitizedDecoratedBlocks(blocks: AssignmentBlock[] | null | undefined) {
  return decorateBlocks(
    blocks?.map(sanitizeAssignmentBlock).filter((block): block is AssignmentBlock => Boolean(block)) || [],
  );
}

function isPayloadRecord(value: unknown): value is SubmissionPayload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFieldBlock(block: AssignmentBlock): block is AssignmentFieldBlock {
  return block.type === 'field';
}

function isKnownWordsBlock(block: AssignmentBlock): block is KnownWordsBlock {
  return block.type === 'knownWords';
}

function isLegacyKnownWordsPlaceholder(value: string) {
  return /^ранее\s+выделенные\s+слова(?:\s+Текст\s+\d+)?\.?$/i.test(value.trim());
}

function isReplayKnownWordsBlock(block: KnownWordsBlock) {
  return block.paragraphs.length > 0 && block.paragraphs.every(isLegacyKnownWordsPlaceholder);
}

function payloadStringList(payload: SubmissionPayload, name: string) {
  const value = payload[name];
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function mergePayloadDefaults(payload: SubmissionPayload, defaults: SubmissionPayload) {
  if (!Object.keys(defaults).length) return payload;
  const next = { ...defaults, ...payload };
  Object.entries(defaults).forEach(([name, value]) => {
    const current = payload[name];
    if (Array.isArray(current) && current.length === 0 && Array.isArray(value) && value.length > 0) {
      next[name] = value;
    }
  });
  return next;
}

function withKnownWordsReplay(blocks: AssignmentBlock[], replayEntries: KnownWordsReplayEntry[]) {
  if (!replayEntries.length) return blocks;
  let replayIndex = 0;
  return blocks.map((block) => {
    if (!isKnownWordsBlock(block) || !isReplayKnownWordsBlock(block)) return block;
    const entry = replayEntries[replayIndex];
    replayIndex += 1;
    if (!entry?.paragraphs.length) return block;
    return { ...block, paragraphs: entry.paragraphs };
  });
}

function knownWordsReplayDefaults(blocks: AssignmentBlock[], replayEntries: KnownWordsReplayEntry[]) {
  const defaults: SubmissionPayload = {};
  if (!replayEntries.length) return defaults;
  let replayIndex = 0;
  blocks.forEach((block) => {
    if (!isKnownWordsBlock(block) || !isReplayKnownWordsBlock(block)) return;
    const entry = replayEntries[replayIndex];
    replayIndex += 1;
    if (entry?.selected.length) defaults[block.name] = entry.selected;
  });
  return defaults;
}

async function loadKnownWordsReplayEntries(marathon: MyMarathon, participantId: string) {
  const step3Answers = marathon.answers.filter((answer) => /^Этап\s+3\./i.test(answer.title));
  const stepResults = await Promise.all(step3Answers.map(async (answer) => {
    try {
      const [stepInfo, submission] = await Promise.all([
        fetchStepInfo(answer.stepId),
        fetchSavedSubmission(participantId, answer.stepId),
      ]);
      if (!stepInfo || !submission.exists || !isPayloadRecord(submission.payload)) return [];
      return sanitizedDecoratedBlocks(stepInfo.assignmentBlocks)
        .filter(isKnownWordsBlock)
        .map((block) => ({
          paragraphs: block.paragraphs,
          selected: payloadStringList(submission.payload, block.name),
        }));
    } catch {
      return [];
    }
  }));
  return stepResults.flat();
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

const REQUIRED_REPORT_FIELD_MIN_LENGTH = 2;

function answerFilled(block: AssignmentFieldBlock, value: unknown) {
  if (block.fieldType === 'radio') return typeof value === 'string' && Boolean(value.trim());
  if (block.fieldType === 'checkbox') return Array.isArray(value) && value.some((item) => typeof item === 'string' && Boolean(item.trim()));
  const blankCount = fieldInlineBlankCount(block);
  if (blankCount > 1) {
    if (!Array.isArray(value) && typeof value !== 'string') return false;
    const parts = answerPartsFromValue(value, blankCount);
    return parts.length >= blankCount && parts.every((part) => part.length >= REQUIRED_REPORT_FIELD_MIN_LENGTH);
  }
  if (Array.isArray(value)) return value.some((part) => typeof part === 'string' && part.trim().length >= REQUIRED_REPORT_FIELD_MIN_LENGTH);
  return typeof value === 'string' && value.trim().length >= REQUIRED_REPORT_FIELD_MIN_LENGTH;
}

function missingRequiredAnswers(blocks: AssignmentBlock[] | null | undefined, payload: SubmissionPayload) {
  const assignmentBlocks = Array.isArray(blocks) ? blocks : [];
  const levelField = findLevelField(assignmentBlocks);
  const level = levelField ? getLevel(payload[levelField.name]) : null;
  return assignmentBlocks
    .filter((block): block is Extract<AssignmentBlock, { type: 'field' }> => (
      isFieldBlock(block) && block.required && branchVisible(block.branch, level)
    ))
    .filter((block) => !answerFilled(block, payload[block.name]));
}

function makeDraftKey(report: string, payload: SubmissionPayload) {
  return JSON.stringify({ report: report.trim(), payload });
}

function hasMeaningfulDraft(report: string, payload: SubmissionPayload) {
  return Boolean(report.trim()) || Object.keys(payload).length > 0;
}

function cssEscapeValue(value: string) {
  if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function makeLocalDraftKey(participantId: string, stepId: string) {
  return `marathon:step-draft:${LOCAL_DRAFT_VERSION}:${participantId}:${stepId}`;
}

function readLocalDraft(participantId: string, stepId: string): LocalStepDraft | null {
  try {
    const raw = window.localStorage.getItem(makeLocalDraftKey(participantId, stepId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LocalStepDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.report !== 'string') return null;
    if (!isPayloadRecord(parsed.payload)) return null;
    if (typeof parsed.savedAt !== 'string') return null;

    return {
      report: parsed.report,
      payload: parsed.payload,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function writeLocalDraft(participantId: string, stepId: string, report: string, payload: SubmissionPayload) {
  try {
    window.localStorage.setItem(
      makeLocalDraftKey(participantId, stepId),
      JSON.stringify({
        report,
        payload,
        savedAt: new Date().toISOString(),
      } satisfies LocalStepDraft),
    );
  } catch {
    // The server draft remains the authoritative persistence path when local storage is unavailable.
  }
}

function removeLocalDraft(participantId: string, stepId: string) {
  try {
    window.localStorage.removeItem(makeLocalDraftKey(participantId, stepId));
  } catch {
    // Ignore browser storage failures.
  }
}

function isLocalDraftNewerThanServer(localDraft: LocalStepDraft, serverUpdatedAt?: string) {
  if (!serverUpdatedAt) return true;
  const localTime = new Date(localDraft.savedAt).getTime();
  const serverTime = new Date(serverUpdatedAt).getTime();
  return Number.isFinite(localTime) && (!Number.isFinite(serverTime) || localTime > serverTime);
}

/**
 * Step (task) page: assignment and submission form first; peer reports unlock after submission.
 */
export default function Step() {
  const { stepId } = useParams<{ stepId: string }>();
  const location = useLocation();
  const [step, setStep] = useState<StepInfo | null>(null);
  const [loadingStep, setLoadingStep] = useState(true);
  const [stepNotFound, setStepNotFound] = useState(false);
  const [stepLoadError, setStepLoadError] = useState('');
  const [tab, setTab] = useState<'task' | 'report'>('task');
  const [randomAnswer, setRandomAnswer] = useState<RandomAnswer | null>(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [randomAnswerError, setRandomAnswerError] = useState('');
  const [marathonerId, setMarathonerId] = useState('');
  const [report, setОтчет] = useState('');
  const [assignmentPayload, setAssignmentPayload] = useState<SubmissionPayload>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [requiredValidationAttempted, setRequiredValidationAttempted] = useState(false);
  const [invalidRequiredFieldNames, setInvalidRequiredFieldNames] = useState<string[]>([]);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [lastSavedDraftKey, setLastSavedDraftKey] = useState(makeDraftKey('', {}));
  const [savedSubmission, setSavedSubmission] = useState<SavedSubmission | null>(null);
  const [loadingSavedSubmission, setLoadingSavedSubmission] = useState(false);
  const [savedSubmissionError, setSavedSubmissionError] = useState('');
  const [submissionAuthRequired, setSubmissionAuthRequired] = useState(false);
  const [marathon, setMarathon] = useState<MyMarathon | null>(null);
  const [, setMarathonLoadError] = useState('');
  const [knownWordsReplayEntries, setKnownWordsReplayEntries] = useState<KnownWordsReplayEntry[]>([]);
  const [reportTime, setReportTime] = useState('13:00');
  const [browserTimeZone] = useState(getBrowserTimeZone);
  const [reportTimeSaving, setReportTimeSaving] = useState(false);
  const [reportTimeMessage, setReportTimeMessage] = useState('');
  const [reportTimeError, setReportTimeError] = useState('');
  const contentCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stepId) return;
    setMarathonerId(new URLSearchParams(window.location.search).get('marathonerId') || '');
    setStep(null);
    setStepNotFound(false);
    setStepLoadError('');
    setRandomAnswer(null);
    setSavedSubmission(null);
    setRandomAnswerError('');
    setSavedSubmissionError('');
    setSubmissionAuthRequired(false);
    setMarathon(null);
    setMarathonLoadError('');
    setKnownWordsReplayEntries([]);
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
          setMarathonLoadError('Навигация по дням временно недоступна.');
        }
      });
  }, [marathonerId]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (step?.formKey !== 'Step11Form1' || !marathon || !participantId || !getToken()) {
      setKnownWordsReplayEntries([]);
      return;
    }

    let cancelled = false;
    loadKnownWordsReplayEntries(marathon, participantId)
      .then((entries) => {
        if (!cancelled) setKnownWordsReplayEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setKnownWordsReplayEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [step?.formKey, marathon?.id, marathonerId]);

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
        const localDraft = readLocalDraft(participantId, stepId);
        const serverPayload = data.exists && isPayloadRecord(data.payload) ? data.payload : {};
        const serverReport = data.exists && typeof data.report === 'string' ? data.report : '';
        const shouldUseLocalDraft = Boolean(data.state !== 'completed'
          && localDraft
          && hasMeaningfulDraft(localDraft.report, localDraft.payload)
          && isLocalDraftNewerThanServer(localDraft, data.updated_at));
        const nextPayload = shouldUseLocalDraft && localDraft ? localDraft.payload : serverPayload;
        const nextReport = shouldUseLocalDraft && localDraft ? localDraft.report : serverReport;

        if (data.state === 'completed' || !shouldUseLocalDraft) {
          removeLocalDraft(participantId, stepId);
        }

        setSavedSubmission(data);
        setОтчет(nextReport);
        setAssignmentPayload(nextPayload);
        setDraftStatus(shouldUseLocalDraft ? 'Восстановлен локальный черновик. Он сохранится на сервере автоматически.' : '');
        setLastSavedDraftKey(shouldUseLocalDraft
          ? makeDraftKey(serverReport, serverPayload)
          : makeDraftKey(nextReport, nextPayload));
        setLoadingSavedSubmission(false);
      })
      .catch((error) => {
        if (error instanceof MarathonAuthRequiredError) {
          setSubmissionAuthRequired(true);
        } else {
          setSavedSubmissionError('Статус сохраненного отчета не загрузился.');
        }

        const localDraft = readLocalDraft(participantId, stepId);
        if (localDraft && hasMeaningfulDraft(localDraft.report, localDraft.payload)) {
          setОтчет(localDraft.report);
          setAssignmentPayload(localDraft.payload);
          setDraftStatus('Восстановлен локальный черновик. Подключение к серверу проверим при отправке.');
          setLastSavedDraftKey(makeDraftKey('', {}));
        }

        setLoadingSavedSubmission(false);
      });
  }, [stepId, marathonerId]);

  const assignmentContent = step?.assignmentContent?.trim();
  const hasParticipantContext = Boolean(marathonerId.trim());
  const isFinalSubmission = Boolean(savedSubmission?.exists && savedSubmission.state === 'completed');
  const baseAssignmentBlocks = useMemo(
    () => sanitizedDecoratedBlocks(step?.assignmentBlocks),
    [step?.assignmentBlocks],
  );
  const knownWordsDefaults = useMemo(
    () => knownWordsReplayDefaults(baseAssignmentBlocks, knownWordsReplayEntries),
    [baseAssignmentBlocks, knownWordsReplayEntries],
  );
  const filteredAssignmentBlocks = useMemo(
    () => withKnownWordsReplay(baseAssignmentBlocks, knownWordsReplayEntries),
    [baseAssignmentBlocks, knownWordsReplayEntries],
  );
  const hasStructuredFields = Boolean(filteredAssignmentBlocks.some((block) => block.type === 'field'));
  const displayedPayload = mergePayloadDefaults(
    isFinalSubmission && savedSubmission?.payload ? savedSubmission.payload : assignmentPayload,
    knownWordsDefaults,
  );
  const displayedReport = isFinalSubmission && savedSubmission?.report ? savedSubmission.report : report;
  const filteredAssignmentContent = useMemo(
    () => stripGenericNextScheduleInstruction(assignmentContent || ''),
    [assignmentContent],
  );
  const answerRows = useMemo(
    () => answerRowsFromPayload(filteredAssignmentBlocks, displayedPayload, displayedReport),
    [filteredAssignmentBlocks, displayedPayload, displayedReport],
  );
  const peerAnswerRows = useMemo(
    () => randomAnswer
      ? peerAnswerRowsFromPayload(filteredAssignmentBlocks, randomAnswer.payload || {}, randomAnswer.report, randomAnswer.rows)
      : [],
    [filteredAssignmentBlocks, randomAnswer],
  );
  const draftKey = useMemo(() => makeDraftKey(report, assignmentPayload), [report, assignmentPayload]);
  const currentScheduleIndex = marathon?.answers.findIndex((answer) => answer.stepId === stepId) ?? -1;
  const currentSchedule = marathon && currentScheduleIndex >= 0 ? marathon.answers[currentScheduleIndex] : null;
  const stepAccessBlocked = Boolean(hasParticipantContext && marathon && currentSchedule && !currentSchedule.can_open);
  const stepAccessMessage = getStepAccessMessage(currentSchedule);

  const loadRandomОтчет = () => {
    if (!stepId) return;
    setLoadingRandom(true);
    setRandomAnswerError('');
    fetchRandomAnswer(stepId, marathonerId)
      .then((data) => {
        setRandomAnswer(data);
        if (!data) {
          setRandomAnswerError('empty');
        }
        setLoadingRandom(false);
      })
      .catch(() => {
        setRandomAnswer(null);
        setRandomAnswerError('load');
        setLoadingRandom(false);
      });
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
      || !assignmentContent
      || stepAccessBlocked
      || isFinalSubmission
      || loadingSavedSubmission
      || submitting
    ) {
      return;
    }

    if (hasMeaningfulDraft(report, assignmentPayload)) {
      writeLocalDraft(participantId, stepId, report, assignmentPayload);
    } else {
      removeLocalDraft(participantId, stepId);
    }
  }, [
    assignmentContent,
    assignmentPayload,
    isFinalSubmission,
    loadingSavedSubmission,
    marathonerId,
    report,
    stepAccessBlocked,
    stepId,
    submitting,
  ]);

  useEffect(() => {
    const participantId = marathonerId.trim();
    if (
      !stepId
      || !participantId
      || !getToken()
      || !assignmentContent
      || stepAccessBlocked
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
          removeLocalDraft(participantId, stepId);
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
    stepAccessBlocked,
    stepId,
    submissionAuthRequired,
    submitting,
  ]);

  const submitОтчет = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');
    setRequiredValidationAttempted(true);
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
    if (stepAccessBlocked) {
      setSubmitError(stepAccessMessage || 'Этот этап пока закрыт.');
      return;
    }

    const missing = missingRequiredAnswers(filteredAssignmentBlocks, assignmentPayload);
    setInvalidRequiredFieldNames(missing.map((block) => block.name));
    if (missing.length) {
      const firstMissing = missing[0];
      setSubmitError("Это поле нужно заполнить.");
      window.requestAnimationFrame(() => {
        const target = document.querySelector(`[data-assignment-field-name="${cssEscapeValue(firstMissing.name)}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusTarget = target?.querySelector('textarea, input[type="text"], input[type="radio"], input[type="checkbox"]') as HTMLElement | null;
        focusTarget?.focus({ preventScroll: true });
      });
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
      removeLocalDraft(marathonerId.trim(), stepId);
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
      setReportTimeMessage('Время сохранено. Следующий день будет не раньше чем через 24 часа.');
    } catch (error) {
      if (error instanceof MarathonAuthRequiredError) {
        redirectToLogin(`/steps/${stepId}?marathonerId=${encodeURIComponent(marathonerId.trim())}`);
        return;
      }
      setReportTimeError(error instanceof Error ? error.message : 'Не удалось сохранить время следующих заданий');
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
  const previousSchedule = marathon && currentScheduleIndex > 0 ? marathon.answers[currentScheduleIndex - 1] : null;
  const sequentialNextSchedule = marathon && currentScheduleIndex >= 0 && currentScheduleIndex < marathon.answers.length - 1
    ? marathon.answers[currentScheduleIndex + 1]
    : null;
  const nextUnopenedSchedule = resolveNextUnopenedSchedule(marathon?.answers);
  const nextSchedule = nextUnopenedSchedule?.answer || null;
  const nextOpenAllowed = Boolean(
    nextSchedule?.can_open
    && nextSchedule.block_reason !== 'payment_required'
    && allPreviousScheduleAnswersCompleted(marathon?.answers, nextUnopenedSchedule?.index ?? -1),
  );
  const nextAvailabilityText = nextSchedule
    ? `Появится ${formatDateTime(nextSchedule.start)}.`
    : '';
  const participantStepQuery = encodeURIComponent(marathonerId.trim());
  const profileUrl = hasParticipantContext ? `/profile/${participantStepQuery}` : '/profile';
  const submitDisabled = submitting
    || loadingSavedSubmission
    || submissionAuthRequired
    || !hasParticipantContext
    || !assignmentContent
    || submitBlockedByStatusError
    || stepAccessBlocked
    || isFinalSubmission;
  const peerОтчетEmpty = canViewPeerReports && !loadingRandom && !randomAnswer && randomAnswerError === 'empty';
  const peerОтчетLoadError = canViewPeerReports && !loadingRandom && !randomAnswer && randomAnswerError === 'load';

  const stepUrl = (targetStepId: string) => `/steps/${targetStepId}?marathonerId=${participantStepQuery}`;
  const reportsReturnUrl = `${location.pathname}${location.search}${location.hash}`;
  const participantReportsUrl = (participantId: string) => {
    const params = new URLSearchParams({
      throughStepId: stepId || '',
      next: reportsReturnUrl,
    });
    return `/participants/${encodeURIComponent(participantId)}/reports?${params.toString()}`;
  };

  const renderStepNavigation = (placement: 'top' | 'footer' = 'top') => {
    if (!previousSchedule && !sequentialNextSchedule) return null;

    return (
      <nav className={`step-sequence-actions step-sequence-actions-${placement}`} aria-label="Навигация по дням">
        {canNavigateToScheduleAnswer(previousSchedule) ? (
          <Link to={stepUrl(previousSchedule!.stepId)} className="step-nav-link">
            Предыдущий день
          </Link>
        ) : (
          <span className="step-nav-link step-nav-disabled">Предыдущий день</span>
        )}
        {canNavigateToScheduleAnswer(sequentialNextSchedule) ? (
          <Link to={stepUrl(sequentialNextSchedule!.stepId)} className="step-nav-link">
            Следующий день
          </Link>
        ) : (
          <span className="step-nav-link step-nav-disabled">Следующий день</span>
        )}
      </nav>
    );
  };

  const renderNextControl = () => {
    if (!nextSchedule || !marathon) return null;

    return (
      <section className="step-next-control" aria-label="Следующий день">
        <div className="step-next-control-main">
          <p><strong>{nextSchedule.title}</strong></p>
          <p>{nextAvailabilityText}</p>
          {nextOpenAllowed && (
            <Link to={stepUrl(nextSchedule.stepId)} className="btn-profile-open step-next-now">
              Открыть следующий день сейчас
            </Link>
          )}
        </div>
        <form className="step-next-time-form" onSubmit={submitReportTime}>
          <label htmlFor="step-report-time">Время появления следующих заданий</label>
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
      </section>
    );
  };

  const renderPeerReports = (inline = false) => (
    <section className={`step-report${inline ? ' step-report-inline' : ''}`}>
      <h2>Отчёты других участников</h2>
      <p className="step-report-note">Пример отчёта участника по этому этапу (случайный выбор).</p>
      {loadingRandom && !randomAnswer && <p>Загрузка…</p>}
      {randomAnswer && (
        <div className="random-report">
          <Link
            to={participantReportsUrl(randomAnswer.marathoner.id)}
            className="random-report-person"
          >
            {randomAnswer.marathoner.avatar ? (
              <img src={randomAnswer.marathoner.avatar} alt="" width={44} height={44} loading="lazy" />
            ) : (
              <span className="random-report-avatar-placeholder" aria-hidden="true">
                {randomAnswer.marathoner.name.trim().charAt(0).toUpperCase() || 'У'}
              </span>
            )}
            <span>
              <strong>{randomAnswer.marathoner.name}</strong>
              <small>Посмотреть ответы по пройденным этапам</small>
            </span>
          </Link>
          <PublicAnswerReport rows={peerAnswerRows} report={randomAnswer.report} className="random-report-body" />
        </div>
      )}
      <div className="step-report-actions">
        {!loadingRandom && randomAnswer && (
          <button type="button" className="btn-show-more" onClick={loadRandomОтчет}>
            Показать ещё
          </button>
        )}
      </div>
      {peerОтчетLoadError && (
        <div className="step-peer-empty" aria-live="polite">
          <strong>Пример отчета временно не загрузился</strong>
          <span>
            Обновите пример еще раз. Если отчеты по этому этапу уже есть, они появятся без повторной отправки вашего отчета.
          </span>
          <button type="button" className="btn-show-more" onClick={loadRandomОтчет}>
            Загрузить пример
          </button>
        </div>
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
  );


  useEffect(() => {
    if (tab === 'report' && !canViewPeerReports) {
      setTab('task');
    }
  }, [tab, canViewPeerReports]);

  useEffect(() => {
    if (!canViewPeerReports || !stepId || randomAnswer || loadingRandom || randomAnswerError) return;
    loadRandomОтчет();
  }, [canViewPeerReports, stepId, marathonerId, randomAnswerError]);

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
        {renderStepNavigation()}
      </div>
      <h1>{stripHeadingTerminalPeriod(step?.title ?? `Этап ${stepId}`)}</h1>
      <div className="step-content-card" ref={contentCardRef}>
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
          {stepAccessBlocked && (
            <div className="step-submit-auth-panel" role="alert">
              <strong>Этап пока закрыт</strong>
              <span>{stepAccessMessage}</span>
              <Link to={profileUrl} className="btn-profile-login">Вернуться в профиль</Link>
            </div>
          )}
          {!stepAccessBlocked && assignmentContent ? (
            <>
              <StepAssignmentRenderer
                blocks={filteredAssignmentBlocks}
                fallbackContent={filteredAssignmentContent}
                initialPayload={displayedPayload}
                readOnly={isFinalSubmission || stepAccessBlocked}
                onPayloadChange={(payload, draft) => {
                  setAssignmentPayload(payload);
                  setОтчет(draft);
                  setDraftStatus('');
                  if (requiredValidationAttempted) {
                    const missing = missingRequiredAnswers(filteredAssignmentBlocks, payload);
                    setInvalidRequiredFieldNames(missing.map((block) => block.name));
                    if (!missing.length) setSubmitError('');
                  }
                }}
                validationAttempted={requiredValidationAttempted}
                invalidFieldNames={invalidRequiredFieldNames}
              />
              {!hasStructuredFields && (
                <label className="step-manual-answer">
                  <span>Ответ на задание</span>
                  <textarea
                    value={report}
                    onChange={(event) => {
                      setОтчет(event.target.value);
                      setDraftStatus('');
                      if (requiredValidationAttempted && event.target.value.trim().length >= REQUIRED_REPORT_FIELD_MIN_LENGTH) setSubmitError('');
                    }}
                    rows={6}
                    disabled={isFinalSubmission || stepAccessBlocked || !hasParticipantContext || submissionAuthRequired || submitBlockedByStatusError}
                  />
                </label>
              )}
            </>
          ) : !stepAccessBlocked ? (
            <div className="step-content-missing" role="alert">
              Содержание задания не настроено для этого этапа. Свяжитесь с поддержкой перед отправкой отчета.
            </div>
          ) : null}
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
                        <dt>{renderPublicAnswerQuestion(row.question)}</dt>
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
            {canViewPeerReports && renderPeerReports(true)}
            {renderNextControl()}
          </section>
        </section>
      )}

      {tab === 'report' && (
        <>
          {renderPeerReports()}
          {renderNextControl()}
        </>
      )}
      </div>
      {renderStepNavigation('footer')}
    </div>
  );
}
