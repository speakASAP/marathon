import { AssignmentBlock, AssignmentBranch, AssignmentFieldBlock } from './assignment-blocks';

export type AssignmentLevel = 'beginner' | 'medium' | 'advanced' | null;
export type AssignmentPayload = Record<string, unknown>;

const REQUIRED_TEXT_MIN_LENGTH = 2;

export type MissingAssignmentAnswer = {
  name: string;
  label: string;
};

export type PublicAssignmentReportRow = {
  id: string;
  question: string;
  answer: string;
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

function stringifyPayloadValue(value: unknown, choices: Array<{ value: string; label: string }> = []): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((item) => stringifyPayloadValue(item, choices)).filter(Boolean).join(', ');
  }
  if (typeof value === 'string') {
    const choice = choices.find((item) => item.value === value);
    return choice?.label || value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isLegacyKnownWordsField(name: string): boolean {
  return /^known_words\d*$/i.test(name) || /^known_words_audio_/i.test(name);
}

function stripLegacyHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractLegacyStrongText(value: string): string {
  const selected: string[] = [];
  const spanPattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null;
  while ((match = spanPattern.exec(value))) {
    const attributes = match[1] || '';
    if (!/\bclass\s*=\s*["'][^"']*\bstrong\b/i.test(attributes)) continue;
    const text = stripLegacyHtml(match[2]);
    if (text) selected.push(text);
  }
  return selected.join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

function stringifyPublicPayloadValue(name: string, value: unknown, choices: Array<{ value: string; label: string }> = []): string {
  const text = stringifyPayloadValue(value, choices);
  if (isLegacyKnownWordsField(name)) {
    const selectedText = extractLegacyStrongText(text);
    if (selectedText || /<span\b/i.test(text)) return selectedText;
    return stripLegacyHtml(text);
  }
  return stripLegacyHtml(text);
}

function inlineBlankCount(label: string): number {
  return label.match(/\[[^\]]+\]/g)?.length || 0;
}

function splitStoredAnswer(value: string, expectedCount: number): string[] {
  const cleanValue = value.trim();
  if (!cleanValue) return [];
  if (expectedCount > 1) {
    const commaParts = cleanValue.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
    if (commaParts.length === expectedCount) return commaParts;
  }
  return [cleanValue];
}

function payloadAnswerParts(value: unknown, expectedCount: number): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return splitStoredAnswer(value, expectedCount);
  return [];
}

function stringifyPublicPayloadValues(
  name: string,
  value: unknown,
  choices: Array<{ value: string; label: string }> = [],
  expectedCount = 1,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyPublicPayloadValue(name, item, choices))
      .filter(Boolean);
  }

  const text = stringifyPublicPayloadValue(name, value, choices);
  return splitStoredAnswer(text, expectedCount);
}

function fillAssignmentLabelPlaceholder(label: string, answers: string[]): string | null {
  const blankCount = inlineBlankCount(label);
  const cleanAnswers = answers.map((answer) => answer.trim()).filter(Boolean);
  if (!blankCount || cleanAnswers.length < blankCount) return null;

  let answerIndex = 0;
  return label
    .replace(/\[[^\]]+\]/g, () => cleanAnswers[answerIndex++] || '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function legacyTableRowAnswer(block: AssignmentFieldBlock, values: string[]): string | null {
  if (block.rowLayout !== 'three-column' || (!block.rowPrefix && !block.rowSuffix)) return null;
  const answer = fillAssignmentLabelPlaceholder(block.label, values) || values.join(', ').trim();
  if (!answer) return null;
  return [block.rowPrefix, answer, block.rowSuffix].filter(Boolean).join(' ');
}

function isLegacyDiagnosticField(block: AssignmentFieldBlock): boolean {
  return /^c\d+$/i.test(block.name);
}

const LEGACY_GERMAN_STEP1_FIELDS: Array<{ name: string; label: string }> = [
  { name: 'q1', label: 'Как долго вы учите немецкий язык?' },
  { name: 'bm2', label: 'Какие эмоции вызвали у вас эти вопросы и задания?' },
  { name: 'bm8', label: 'Что вы хотите уметь в немецком уже через месяц? Через полгода? Через год?' },
  { name: 'c21', label: 'К какому внутреннему выводу вы пришли, что вы для себя решили? (возможно, не только на время марафона)' },
];

function isLegacyGermanStep1Payload(payload: AssignmentPayload): boolean {
  return ['bm8', 'bm9', 'c21'].some((name) => Object.prototype.hasOwnProperty.call(payload, name));
}

function legacyPayloadQuestionLabel(name: string, payload?: AssignmentPayload): string {
  if (payload && isLegacyGermanStep1Payload(payload)) {
    const legacyField = LEGACY_GERMAN_STEP1_FIELDS.find((field) => field.name === name);
    if (legacyField) return legacyField.label;
  }
  if (isLegacyKnownWordsField(name)) {
    return 'Какие знакомые слова вы выделили в тексте?';
  }
  if (name === 'thoughts') {
    return 'Какие мысли и переживания появились во время работы над заданием?';
  }
  if (name === 'report') {
    return 'Ответ участника';
  }
  return `Ответ на предыдущую версию вопроса (${name})`;
}

function shouldPublishLegacyPayloadValue(name: string, value: string, payload?: AssignmentPayload): boolean {
  if (!value) return false;
  if (payload && isLegacyGermanStep1Payload(payload)) {
    return LEGACY_GERMAN_STEP1_FIELDS.some((field) => field.name === name);
  }
  if (/^c\d+$/i.test(name)) return false;
  if (name === 'level' || name === 'assignmentLevel') return false;
  return value.length >= 12;
}

function legacyPublicAssignmentFields(
  payload: AssignmentPayload,
  visibleFields: AssignmentFieldBlock[],
): Array<{ name: string; label: string; value: string }> {
  const legacyGermanStep1 = isLegacyGermanStep1Payload(payload);
  const visibleNames = new Set(visibleFields.map((block) => block.name));
  return Object.entries(payload)
    .filter(([name]) => legacyGermanStep1 || !visibleNames.has(name))
    .map(([name, rawValue]) => ({
      name,
      label: legacyPayloadQuestionLabel(name, payload),
      value: stringifyPublicPayloadValue(name, rawValue),
    }))
    .filter((entry) => shouldPublishLegacyPayloadValue(entry.name, entry.value, payload));
}

export function isAssignmentFieldBlock(block: AssignmentBlock): block is AssignmentFieldBlock {
  return block.type === 'field';
}

export function findAssignmentLevelField(blocks: AssignmentBlock[]): AssignmentFieldBlock | undefined {
  const fields = blocks.filter(isAssignmentFieldBlock);
  return fields.find((block) => block.name === 'q1')
    || fields.find((block) => normalizeText(block.label).startsWith('как долго вы учите'));
}

export function resolveAssignmentLevel(value: unknown): AssignmentLevel {
  if (typeof value !== 'string') return null;
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.includes('только')) return 'beginner';
  if (normalized.includes('несколько')) return 'medium';
  if (normalized.includes('полугода')) return 'advanced';
  return null;
}

export function assignmentBranchVisible(branch: AssignmentBranch | undefined, level: AssignmentLevel): boolean {
  if (!branch) return true;
  if (!level) return false;
  if (branch === 'beginner-medium') return level === 'beginner' || level === 'medium';
  return branch === level;
}

export function resolveAssignmentPayloadLevel(blocks: AssignmentBlock[], payload: AssignmentPayload): AssignmentLevel {
  const levelField = findAssignmentLevelField(blocks);
  return levelField ? resolveAssignmentLevel(payload[levelField.name]) : null;
}

export function hasPublicAssignmentQuestionLabel(block: AssignmentFieldBlock): boolean {
  const label = block.label.trim();
  if (!label) return false;
  if (label === block.name) return false;
  return !/^(?:[a-zа-я]+\d+|field\d+)$/i.test(label);
}

export function visiblePublicAssignmentFields(
  blocks: AssignmentBlock[],
  payload: AssignmentPayload,
): AssignmentFieldBlock[] {
  const level = resolveAssignmentPayloadLevel(blocks, payload);
  return blocks.filter((block): block is AssignmentFieldBlock => (
    isAssignmentFieldBlock(block)
    && assignmentBranchVisible(block.branch, level)
    && hasPublicAssignmentQuestionLabel(block)
    && !isLegacyDiagnosticField(block)
  ));
}

function formatReportQuestionLabel(label: string): string {
  const text = label.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return /[?!…:;.]$/.test(text) ? text : `${text}:`;
}

export function formatAssignmentReportRows(rows: PublicAssignmentReportRow[]): string {
  return rows
    .map((row) => {
      const answer = row.answer.trim();
      if (!answer) return '';

      const question = formatReportQuestionLabel(row.question);
      return question ? `${question}\n${answer}` : answer;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function generateAssignmentReportRows(
  payload: AssignmentPayload | null,
  blocks: AssignmentBlock[],
): PublicAssignmentReportRow[] {
  if (!payload) return [];

  const rows: PublicAssignmentReportRow[] = [];
  const visibleFields = isLegacyGermanStep1Payload(payload) ? [] : visiblePublicAssignmentFields(blocks, payload);
  for (const block of visibleFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, block.name)) continue;
    const values = stringifyPublicPayloadValues(block.name, payload[block.name], block.choices, inlineBlankCount(block.label));
    const value = values.join(', ');
    if (!value) continue;
    const rowAnswer = legacyTableRowAnswer(block, values);
    if (rowAnswer) {
      rows.push({ id: block.id || block.name, question: '', answer: rowAnswer });
      continue;
    }
    const filledSentence = fillAssignmentLabelPlaceholder(block.label, values);
    rows.push(filledSentence
      ? { id: block.id || block.name, question: '', answer: filledSentence }
      : { id: block.id || block.name, question: block.label.trim(), answer: value });
  }

  for (const entry of legacyPublicAssignmentFields(payload, visibleFields)) {
    if (!entry.value) continue;
    rows.push({
      id: entry.name,
      question: entry.label.trim(),
      answer: entry.value,
    });
  }

  return rows;
}

export function generateAssignmentReport(payload: AssignmentPayload | null, blocks: AssignmentBlock[]): string {
  return formatAssignmentReportRows(generateAssignmentReportRows(payload, blocks));
}

export function filterAssignmentPayloadForPublicReport(
  payload: AssignmentPayload | null,
  blocks: AssignmentBlock[],
): AssignmentPayload {
  if (!payload) return {};

  const filtered: AssignmentPayload = {};
  const visibleFields = isLegacyGermanStep1Payload(payload) ? [] : visiblePublicAssignmentFields(blocks, payload);
  for (const block of visibleFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, block.name)) continue;
    const value = stringifyPublicPayloadValue(block.name, payload[block.name], block.choices);
    if (!value) continue;
    filtered[block.name] = value;
  }

  for (const entry of legacyPublicAssignmentFields(payload, visibleFields)) {
    if (!entry.value) continue;
    filtered[entry.name] = entry.value;
  }

  return filtered;
}

export function assignmentAnswerFilled(block: AssignmentFieldBlock, value: unknown): boolean {
  if (block.fieldType === 'radio') return typeof value === 'string' && Boolean(value.trim());
  if (block.fieldType === 'checkbox') return Array.isArray(value) && value.some((item) => typeof item === 'string' && Boolean(item.trim()));
  const blankCount = block.fieldType === 'text' ? inlineBlankCount(block.label) : 0;
  if (blankCount > 1) {
    const parts = payloadAnswerParts(value, blankCount);
    return parts.length >= blankCount && parts.every((part) => part.length >= REQUIRED_TEXT_MIN_LENGTH);
  }
  if (Array.isArray(value)) return value.some((part) => typeof part === 'string' && part.trim().length >= REQUIRED_TEXT_MIN_LENGTH);
  return typeof value === 'string' && value.trim().length >= REQUIRED_TEXT_MIN_LENGTH;
}

export function missingRequiredAssignmentAnswers(
  blocks: AssignmentBlock[],
  payload: AssignmentPayload,
): MissingAssignmentAnswer[] {
  const level = resolveAssignmentPayloadLevel(blocks, payload);
  return blocks
    .filter(isAssignmentFieldBlock)
    .filter((block) => block.required && assignmentBranchVisible(block.branch, level))
    .filter((block) => !assignmentAnswerFilled(block, payload[block.name]))
    .map((block) => ({ name: block.name, label: block.label }));
}
