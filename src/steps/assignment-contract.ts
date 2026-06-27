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

function isLegacyDiagnosticField(block: AssignmentFieldBlock): boolean {
  return /^c\d+$/i.test(block.name);
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
  for (const block of visiblePublicAssignmentFields(blocks, payload)) {
    if (!Object.prototype.hasOwnProperty.call(payload, block.name)) continue;
    const value = stringifyPayloadValue(payload[block.name], block.choices);
    if (!value) continue;
    lines.push(`${block.label}:`, value);
  }

  return lines.join('\n\n');
}

export function filterAssignmentPayloadForPublicReport(
  payload: AssignmentPayload | null,
  blocks: AssignmentBlock[],
): AssignmentPayload {
  if (!payload) return {};

  const filtered: AssignmentPayload = {};
  for (const block of visiblePublicAssignmentFields(blocks, payload)) {
    if (!Object.prototype.hasOwnProperty.call(payload, block.name)) continue;
    if (!stringifyPayloadValue(payload[block.name], block.choices)) continue;
    filtered[block.name] = payload[block.name];
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
