import { AssignmentBlock, AssignmentBranch, AssignmentFieldBlock } from './assignment-blocks';

export type AssignmentLevel = 'beginner' | 'medium' | 'advanced' | null;
export type AssignmentPayload = Record<string, unknown>;

export type MissingAssignmentAnswer = {
  name: string;
  label: string;
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

function isLegacyDiagnosticField(block: AssignmentFieldBlock): boolean {
  return /^c\d+$/i.test(block.name);
}

function legacyPayloadQuestionLabel(name: string): string {
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

function shouldPublishLegacyPayloadValue(name: string, value: string): boolean {
  if (!value) return false;
  if (/^c\d+$/i.test(name)) return false;
  if (name === 'level' || name === 'assignmentLevel') return false;
  return value.length >= 12;
}

function legacyPublicAssignmentFields(
  payload: AssignmentPayload,
  visibleFields: AssignmentFieldBlock[],
): Array<{ name: string; label: string; value: string }> {
  const visibleNames = new Set(visibleFields.map((block) => block.name));
  return Object.entries(payload)
    .filter(([name]) => !visibleNames.has(name))
    .map(([name, rawValue]) => ({
      name,
      label: legacyPayloadQuestionLabel(name),
      value: stringifyPublicPayloadValue(name, rawValue),
    }))
    .filter((entry) => shouldPublishLegacyPayloadValue(entry.name, entry.value));
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

export function generateAssignmentReport(payload: AssignmentPayload | null, blocks: AssignmentBlock[]): string {
  if (!payload) return '';

  const lines: string[] = [];
  const visibleFields = visiblePublicAssignmentFields(blocks, payload);
  for (const block of visibleFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, block.name)) continue;
    const value = stringifyPublicPayloadValue(block.name, payload[block.name], block.choices);
    if (!value) continue;
    lines.push(`${block.label}:`, value);
  }

  for (const entry of legacyPublicAssignmentFields(payload, visibleFields)) {
    if (!entry.value) continue;
    lines.push(`${entry.label}:`, entry.value);
  }

  return lines.join('\n\n');
}

export function filterAssignmentPayloadForPublicReport(
  payload: AssignmentPayload | null,
  blocks: AssignmentBlock[],
): AssignmentPayload {
  if (!payload) return {};

  const filtered: AssignmentPayload = {};
  const visibleFields = visiblePublicAssignmentFields(blocks, payload);
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

export function assignmentAnswerFilled(value: unknown): boolean {
  if (typeof value === 'string') return Boolean(value.trim());
  if (Array.isArray(value)) return value.some((item) => typeof item === 'string' && Boolean(item.trim()));
  return false;
}

export function missingRequiredAssignmentAnswers(
  blocks: AssignmentBlock[],
  payload: AssignmentPayload,
): MissingAssignmentAnswer[] {
  const level = resolveAssignmentPayloadLevel(blocks, payload);
  return blocks
    .filter(isAssignmentFieldBlock)
    .filter((block) => block.required && assignmentBranchVisible(block.branch, level))
    .filter((block) => !assignmentAnswerFilled(payload[block.name]))
    .map((block) => ({ name: block.name, label: block.label }));
}
