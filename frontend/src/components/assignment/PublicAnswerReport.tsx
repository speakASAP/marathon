import { type ReactNode } from 'react';
import type { AssignmentBlock, PublicAnswerReportRow, SubmissionPayload } from '../../api/assignmentMarathon';
import { answerPartsFromValue, inlineBlankCount } from './assignmentBlockNormalization';

type Level = 'beginner' | 'medium' | 'advanced' | null;
type AssignmentFieldBlock = Extract<AssignmentBlock, { type: 'field' }>;
export type AnswerRow = { id: string; question: string; answer: ReactNode };

function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
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

export function stripLegacyAnswerMarkup(value: string) {
  const hasLegacyTags = /<\/?(?:p|span|strong|b|br|div)\b/i.test(value);
  if (!hasLegacyTags) return value.trim();

  if (typeof DOMParser === 'undefined') {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  const parsed = new DOMParser().parseFromString(value, 'text/html');
  return (parsed.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isLegacyKnownWordsField(name: string) {
  return /^known_words\d*$/i.test(name) || /^known_words_audio_/i.test(name);
}

const LEGACY_GERMAN_STEP1_LABELS: Record<string, string> = {
  q1: 'Как долго вы учите немецкий язык?',
  bm2: 'Какие эмоции вызвали у вас эти вопросы и задания?',
  bm8: 'Что вы хотите уметь в немецком уже через месяц? Через полгода? Через год?',
  c21: 'К какому внутреннему выводу вы пришли, что вы для себя решили? (возможно, не только на время марафона)',
};

function isLegacyGermanStep1Payload(payload: SubmissionPayload) {
  return ['bm8', 'bm9', 'c21'].some((name) => Object.prototype.hasOwnProperty.call(payload, name));
}

function legacyPayloadQuestionLabel(name: string, payload?: SubmissionPayload) {
  if (payload && isLegacyGermanStep1Payload(payload) && LEGACY_GERMAN_STEP1_LABELS[name]) {
    return LEGACY_GERMAN_STEP1_LABELS[name];
  }
  if (isLegacyKnownWordsField(name)) return 'Какие знакомые слова вы выделили в тексте?';
  if (name === 'thoughts') return 'Какие мысли и переживания появились во время работы над заданием?';
  return '';
}

function extractLegacyKnownWords(value: string) {
  if (!/<span\b/i.test(value)) return stripLegacyAnswerMarkup(value);
  if (typeof DOMParser === 'undefined') return stripLegacyAnswerMarkup(value);

  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const selected = Array.from(parsed.querySelectorAll('span.strong'))
    .map((node) => node.textContent || '')
    .map((text) => text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return selected.join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function formatPublicAnswerValue(name: string, value: string) {
  if (isLegacyKnownWordsField(name)) return extractLegacyKnownWords(value);
  return stripLegacyAnswerMarkup(value);
}

function formatAnswerValues(block: AssignmentFieldBlock, value: unknown) {
  const choiceLabel = (raw: string) => block.choices?.find((choice) => choice.value === raw)?.label || raw;
  if (!Array.isArray(value) && typeof value !== 'string') return [];
  return answerPartsFromValue(value, inlineBlankCount(block.label))
    .map((item) => formatPublicAnswerValue(block.name, choiceLabel(item)))
    .filter(Boolean);
}

function splitMutedParenthetical(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.+?)\s*(\([^()]+\))$/);

  if (!match) {
    return { main: text, parenthetical: '' };
  }

  return { main: match[1].trim(), parenthetical: match[2].trim() };
}

export function renderPublicAnswerQuestion(text: string): ReactNode {
  const parts = splitMutedParenthetical(text);

  if (!parts.parenthetical) return text;

  return (
    <>
      {parts.main}{' '}
      <span className="step-muted-parenthetical">{parts.parenthetical}</span>
    </>
  );
}

function renderInsertedAnswerSentence(label: string, answers: string[]): ReactNode | null {
  const blankCount = inlineBlankCount(label);
  const cleanAnswers = answers.map((answer) => answer.trim()).filter(Boolean);
  if (!blankCount || cleanAnswers.length < blankCount) return null;

  const labelParts = splitMutedParenthetical(label);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let insertIndex = 0;
  const placeholderPattern = /\[[^\]]+\]/g;

  for (const match of labelParts.main.matchAll(placeholderPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(labelParts.main.slice(lastIndex, index));
    nodes.push(
      <strong className="step-answer-inserted" key={`answer-${insertIndex}`}>
        {cleanAnswers[insertIndex]}
      </strong>,
    );
    lastIndex = index + match[0].length;
    insertIndex += 1;
  }

  if (lastIndex < labelParts.main.length) nodes.push(labelParts.main.slice(lastIndex));
  if (labelParts.parenthetical) {
    nodes.push(' ');
    nodes.push(
      <span className="step-muted-parenthetical" key="translation">
        {labelParts.parenthetical}
      </span>,
    );
  }

  return <>{nodes}</>;
}

function legacyAnswerRowsFromPayload(payload: SubmissionPayload): AnswerRow[] {
  const grouped = new Map<string, { id: string; question: string; answers: string[] }>();

  Object.entries(payload)
    .filter(([name]) => (
      isLegacyGermanStep1Payload(payload)
        ? Boolean(LEGACY_GERMAN_STEP1_LABELS[name])
        : (name === 'thoughts' || isLegacyKnownWordsField(name))
    ))
    .forEach(([name, value]) => {
      const question = legacyPayloadQuestionLabel(name, payload);
      if (!question || typeof value !== 'string') return;

      const answer = formatPublicAnswerValue(name, value);
      if (!answer.trim()) return;

      const id = isLegacyKnownWordsField(name) ? 'known_words' : name;
      const existing = grouped.get(question) || { id, question, answers: [] };
      existing.answers.push(answer);
      grouped.set(question, existing);
    });

  return Array.from(grouped.values()).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answers.join('\n\n'),
  }));
}

function hasPublicQuestionLabel(block: AssignmentFieldBlock) {
  const label = block.label.trim();
  if (!label) return false;
  if (label === block.name) return false;
  return !/^(?:[a-zа-я]+\d+|field\d+)$/i.test(label);
}

export function answerRowsFromPayload(
  blocks: AssignmentBlock[] | null | undefined,
  payload: SubmissionPayload,
  report: string,
): AnswerRow[] {
  const assignmentBlocks = Array.isArray(blocks) ? blocks : [];
  const levelField = findLevelField(assignmentBlocks);
  const level = levelField ? getLevel(payload[levelField.name]) : null;
  const rows = assignmentBlocks
    .filter(isFieldBlock)
    .filter((block) => branchVisible(block.branch, level) && hasPublicQuestionLabel(block))
    .map((block) => {
      const answerValues = formatAnswerValues(block, payload[block.name]);
      const answer = answerValues.join(', ');
      const insertedSentence = renderInsertedAnswerSentence(block.label, answerValues);
      return {
        id: block.id || block.name,
        question: insertedSentence ? '' : block.label,
        answer: insertedSentence || answer,
        answerText: answer,
      };
    })
    .filter((row) => row.answerText.trim())
    .map(({ answerText, ...row }) => row);

  if (!rows.length && report.trim()) {
    return [{ id: 'report', question: 'Ответ', answer: stripLegacyAnswerMarkup(report) }];
  }

  return rows;
}

function answerExists(answer: ReactNode) {
  if (typeof answer === 'string') return Boolean(answer.trim());
  return answer != null && answer !== false;
}

function stripQuestionColon(question: string) {
  return question.replace(/\?:$/, '?').replace(/:$/, '').trim();
}

function normalizeProvidedRows(rows: Array<AnswerRow | PublicAnswerReportRow> | null | undefined): AnswerRow[] {
  return (rows || [])
    .map((row) => ({
      id: row.id,
      question: stripQuestionColon(row.question || ''),
      answer: typeof row.answer === 'string' ? stripLegacyAnswerMarkup(row.answer) : row.answer,
    }))
    .filter((row) => answerExists(row.answer));
}

function rowsFromReportText(report: string): AnswerRow[] {
  const cleanedReport = stripLegacyAnswerMarkup(report);
  const parts = cleanedReport.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const rows: AnswerRow[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const lines = part.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    if (lines.length > 1) {
      rows.push({
        id: `report-${index}`,
        question: stripQuestionColon(lines[0]),
        answer: lines.slice(1).join('\n'),
      });
      continue;
    }

    const next = parts[index + 1];
    if (next && /[?:]$/.test(part)) {
      rows.push({
        id: `report-${index}`,
        question: stripQuestionColon(part),
        answer: next,
      });
      index += 1;
      continue;
    }

    rows.push({ id: `report-${index}`, question: '', answer: part });
  }

  return rows.filter((row) => answerExists(row.answer));
}

export function peerAnswerRowsFromPayload(
  blocks: AssignmentBlock[] | null | undefined,
  payload: SubmissionPayload,
  report: string,
  apiRows?: PublicAnswerReportRow[] | null,
): AnswerRow[] {
  const normalizedApiRows = normalizeProvidedRows(apiRows);
  if (normalizedApiRows.length) return normalizedApiRows;

  const legacyRows = legacyAnswerRowsFromPayload(payload);
  if (isLegacyGermanStep1Payload(payload) && legacyRows.length) return legacyRows;

  const rows = answerRowsFromPayload(blocks, payload, '');
  const existingQuestions = new Set(rows.map((row) => row.question));
  const mergedRows = [
    ...rows,
    ...legacyRows.filter((row) => !existingQuestions.has(row.question)),
  ];
  if (mergedRows.length) return mergedRows;

  return rowsFromReportText(report);
}

type PublicAnswerReportProps = {
  rows?: AnswerRow[] | PublicAnswerReportRow[] | null;
  report?: string | null;
  className?: string;
};

export default function PublicAnswerReport({ rows, report = '', className = '' }: PublicAnswerReportProps) {
  const renderedRows = normalizeProvidedRows(rows);
  const fallbackRows = renderedRows.length ? renderedRows : rowsFromReportText(report || '');
  const dlClassName = ['public-answer-report', className].filter(Boolean).join(' ');

  if (!fallbackRows.length) return null;

  return (
    <dl className={dlClassName}>
      {fallbackRows.map((row) => (
        <div className="step-answer-row" key={row.id}>
          {row.question && <dt>{renderPublicAnswerQuestion(row.question)}</dt>}
          <dd>{row.answer}</dd>
        </div>
      ))}
    </dl>
  );
}
