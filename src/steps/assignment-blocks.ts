export type AssignmentBranch = 'beginner' | 'medium' | 'advanced' | 'beginner-medium';

export type AssignmentChoice = {
  value: string;
  label: string;
};

export type AssignmentTextBlock = {
  id: string;
  type: 'text';
  text: string;
  branch?: AssignmentBranch;
};

export type AssignmentVideoBlock = {
  id: string;
  type: 'video';
  code: string;
  title?: string;
  branch?: AssignmentBranch;
};

export type AssignmentAudioBlock = {
  id: string;
  type: 'audio';
  code: string;
  title?: string;
  branch?: AssignmentBranch;
};

export type AssignmentLinkBlock = {
  id: string;
  type: 'link';
  href: string;
  text: string;
  download?: boolean;
  branch?: AssignmentBranch;
};

export type AssignmentFieldBlock = {
  id: string;
  type: 'field';
  name: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'checkbox';
  required: boolean;
  choices?: AssignmentChoice[];
  branch?: AssignmentBranch;
};

export type AssignmentBlock = AssignmentTextBlock | AssignmentVideoBlock | AssignmentAudioBlock | AssignmentLinkBlock | AssignmentFieldBlock;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBranch(value: unknown): AssignmentBranch | undefined {
  if (value === 'beginner' || value === 'medium' || value === 'advanced' || value === 'beginner-medium') {
    return value;
  }
  return undefined;
}

function normalizeChoices(value: unknown): AssignmentChoice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice) => {
      if (!isRecord(choice)) return null;
      const label = cleanString(choice.label);
      const rawValue = cleanString(choice.value) || label;
      if (!label || !rawValue) return null;
      return { value: rawValue, label };
    })
    .filter((choice): choice is AssignmentChoice => Boolean(choice));
}

const FIRST_STEP_PLATFORM_PROGRAM_CHOICE: AssignmentChoice = { value: 'Программы', label: 'Программы' };

function normalizeFieldChoices(name: string, label: string, choices: AssignmentChoice[]): AssignmentChoice[] {
  if (
    name !== 'm3'
    || !/Какие площадки для изучения вам больше всего нравятся/i.test(label)
    || choices.some((choice) => choice.value === FIRST_STEP_PLATFORM_PROGRAM_CHOICE.value)
  ) {
    return choices;
  }
  return [...choices, FIRST_STEP_PLATFORM_PROGRAM_CHOICE];
}

function sameBranch(left: AssignmentBlock, right: AssignmentBlock) {
  return left.branch === right.branch;
}

function isOptionalStep1Note(text: string) {
  return /^\(дальше\s+заполнять\s+необязательно\)\.?$/i.test(text);
}

function isSentenceContinuation(previousText: string, text: string) {
  const previous = previousText.trim();
  if (!previous || /[.!?…:;]$/.test(previous)) return false;
  if (/^(?:[-–—*•]|\d+[.)])\s*/.test(text)) return false;
  return /^[а-яёa-z]/.test(text);
}

function normalizeTextBlockText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldJoinWithPrevious(previous: AssignmentBlock | undefined, text: string) {
  if (!previous || previous.type !== "text") return false;
  return /^[.!?,;:]+$/.test(text)
    || /^настроек\.?$/i.test(text) && /^Сформируйте отчет\./i.test(previous.text)
    || isSentenceContinuation(previous.text, text);
}

function normalizeTextBlockSequence(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const normalized: AssignmentBlock[] = [];
  for (const block of blocks) {
    if (block.type !== 'text') {
      normalized.push(block);
      continue;
    }

    let text = normalizeTextBlockText(block.text);
    if (!text || isOptionalStep1Note(text)) continue;

    const previous = normalized[normalized.length - 1];
    const leadingPunctuation = text.match(/^([.!?,;:]+)\s+([\s\S]+)$/);
    if (leadingPunctuation && previous?.type === "text" && sameBranch(previous, block)) {
      previous.text = `${previous.text}${leadingPunctuation[1]}`;
      text = leadingPunctuation[2].trim();
      if (!text || isOptionalStep1Note(text)) continue;
    }

    if (/^Отвечайте\s+🇷🇺\s+по-русски\.?$/i.test(text)) {
      let joined = false;
      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const candidate = normalized[index];
        if (candidate.type !== 'text') break;
        if (candidate.branch !== 'advanced' && candidate.branch !== 'beginner-medium') continue;
        candidate.text = `${candidate.text} ${text.replace(/\.$/, '')}`;
        joined = true;
      }
      if (joined) continue;
    }

    if (shouldJoinWithPrevious(previous, text) && previous?.type === 'text' && sameBranch(previous, block)) {
      previous.text = /^[.!?,;:]+$/.test(text) ? `${previous.text}${text}` : `${previous.text} ${text.replace(/\.$/, '')}`;
      continue;
    }

    if (/^[.!?,;:]+$/.test(text)) continue;
    normalized.push({ ...block, text });
  }
  return normalized;
}

export function normalizeAssignmentBlocks(value: unknown): AssignmentBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks = value
    .map((raw, index): AssignmentBlock | null => {
      if (!isRecord(raw)) return null;
      const type = raw.type;
      const branch = normalizeBranch(raw.branch);
      const id = cleanString(raw.id) || `block-${index}`;

      if (type === 'text') {
        const text = cleanString(raw.text);
        return text ? { id, type, text, ...(branch ? { branch } : {}) } : null;
      }

      if (type === 'video') {
        const code = cleanString(raw.code);
        if (!/^[\w-]{6,}$/.test(code)) return null;
        const title = cleanString(raw.title);
        return { id, type, code, ...(title ? { title } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'audio') {
        const code = cleanString(raw.code);
        if (!code) return null;
        const title = cleanString(raw.title);
        return { id, type, code, ...(title ? { title } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'link') {
        const href = cleanString(raw.href);
        const text = cleanString(raw.text) || cleanString(raw.label) || href;
        if (!href || !text) return null;
        return { id, type, href, text, ...(raw.download === true ? { download: true } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'field') {
        const name = cleanString(raw.name);
        const label = cleanString(raw.label) || name;
        const fieldType = raw.fieldType === 'radio' || raw.fieldType === 'checkbox' || raw.fieldType === 'textarea' ? raw.fieldType : 'text';
        if (!name || !label) return null;
        return {
          id,
          type,
          name,
          label,
          fieldType,
          required: raw.required !== false,
          choices: normalizeFieldChoices(name, label, normalizeChoices(raw.choices)),
          ...(branch ? { branch } : {}),
        };
      }

      return null;
    })
    .filter((block): block is AssignmentBlock => Boolean(block));
  return normalizeTextBlockSequence(blocks);
}
