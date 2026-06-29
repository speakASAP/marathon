export type AssignmentBranch = 'beginner' | 'medium' | 'advanced' | 'beginner-medium';

export type AssignmentChoice = {
  value: string;
  label: string;
};

export type AssignmentInlineLink = {
  text: string;
  href: string;
};

export type AssignmentTextBlock = {
  id: string;
  type: 'text';
  text: string;
  links?: AssignmentInlineLink[];
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

export type AssignmentImageBlock = {
  id: string;
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
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
  correctAnswers?: string[];
  hint?: string;
  answerSize?: 'short' | 'long';
  branch?: AssignmentBranch;
};

export type AssignmentBlock = AssignmentTextBlock | AssignmentVideoBlock | AssignmentAudioBlock | AssignmentLinkBlock | AssignmentImageBlock | AssignmentFieldBlock;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

const TERMINAL_PUNCTUATION_PATTERN = /[.!?…:;]["')\]»”]*$/u;
const TRAILING_TRANSLATION_PATTERN = /\s+(\([^()]+\))$/u;

function hasTerminalPunctuation(value: string): boolean {
  const text = value.trim();
  if (TERMINAL_PUNCTUATION_PATTERN.test(text)) return true;
  return TERMINAL_PUNCTUATION_PATTERN.test(text.replace(TRAILING_TRANSLATION_PATTERN, ''));
}

function ensureTerminalPunctuation(value: string): string {
  const text = normalizeParentheticalSpacing(value.replace(/\s+/g, ' '));
  if (!text || !/\p{L}/u.test(text) || hasTerminalPunctuation(text)) return text;
  const translation = text.match(TRAILING_TRANSLATION_PATTERN);
  if (translation) return `${text.slice(0, translation.index).trim()}. ${translation[1]}`;
  return `${text}.`;
}

function normalizeBranch(value: unknown): AssignmentBranch | undefined {
  if (value === 'beginner' || value === 'medium' || value === 'advanced' || value === 'beginner-medium') {
    return value;
  }
  return undefined;
}

function normalizeAnswerSize(value: unknown): 'short' | 'long' | undefined {
  return value === 'short' || value === 'long' ? value : undefined;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean);
}

function normalizeInlineLinks(value: unknown): AssignmentInlineLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((link) => {
      if (!isRecord(link)) return null;
      const text = cleanString(link.text);
      const href = cleanString(link.href);
      if (!text || !href) return null;
      return { text, href };
    })
    .filter((link): link is AssignmentInlineLink => Boolean(link));
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

function normalizeParentheticalSpacing(value: string): string {
  return value
    .replace(/\(\s+/gu, '(')
    .replace(/\s+\)/gu, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTextBlockText(text: string) {
  return normalizeParentheticalSpacing(text.replace(/\s+/g, " "));
}

const GENERIC_NEXT_SCHEDULE_INSTRUCTION = /Сформируйте отчет[,.]?\s*Новый этап появится в то\s*(?:⏰\s*)?время,\s*которое вы указали на странице(?:\s*⚙️?)?(?:\s*настроек\.?)?/gi;
const SPECIAL_CHARACTERS_FAQ_HREF = 'https://marathon.alfares.cz/faq#special-characters';

function stripGenericNextScheduleInstruction(text: string) {
  return text.replace(GENERIC_NEXT_SCHEDULE_INSTRUCTION, "").replace(/\s+/g, " ").trim();
}

function normalizeLegacyAssignmentText(text: string) {
  return text
    .replace(/Спряжение слабых глаголов\. Поставьте глагол в правильную форму$/u, 'Спряжение слабых глаголов. Поставьте глагол в правильную форму.')
    .replace(/Если не знаете, как это сделать, то смотрите раздел\s*["«]?\s*Помощь\s*$/u, 'Если не знаете, как это сделать, то смотрите раздел «Помощь')
    .replace(/\s+[“„]\s+(?=Детский немецкий для взрослых(?:\s|$))/u, ' «')
    .replace(/^[”»]\s+\(/u, '» (');
}

function normalizeLegacyInlineLinks(text: string, links: AssignmentInlineLink[]) {
  if (!/Если не знаете, как это сделать, то смотрите раздел «Помощь$/u.test(text)) return links;
  return links.map((link) => (
    link.text === 'Помощь' ? { ...link, href: SPECIAL_CHARACTERS_FAQ_HREF } : link
  ));
}

function isGenericSettingsLink(text: string, href: string) {
  return /^настроек\.?$/i.test(text) && /^\/profile\/?(?:[?#].*)?$/i.test(href);
}

function isDownloadHref(href: string) {
  return /\.(?:pdf|zip|docx?|xlsx?|pptx?|mp3|mp4|wav|ogg)(?:[?#]|$)/i.test(href);
}

function shouldJoinWithPrevious(previous: AssignmentBlock | undefined, text: string) {
  if (!previous || previous.type !== "text") return false;
  if (Array.isArray(previous.links) && previous.links.length && /^\(/.test(text)) return true;
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

    let text = stripGenericNextScheduleInstruction(normalizeTextBlockText(block.text));
    if (!text || isOptionalStep1Note(text)) continue;

    const previous = normalized[normalized.length - 1];
    const closingQuotePunctuation = text.match(/^[\"”»]\s*([.!?]+)$/);
    if (closingQuotePunctuation && previous?.type === "text" && sameBranch(previous, block)) {
      previous.text = `${previous.text}»${closingQuotePunctuation[1]}`;
      continue;
    }

    const closingQuoteContinuation = text.match(/^[\"”»]\s*(\([\s\S]+)$/);
    if (
      closingQuoteContinuation
      && previous?.type === "text"
      && Array.isArray(previous.links)
      && previous.links.length
      && sameBranch(previous, block)
    ) {
      previous.text = `${previous.text}» ${closingQuoteContinuation[1].trim()}`;
      if (Array.isArray(block.links) && block.links.length) {
        previous.links = [...(previous.links || []), ...block.links];
      }
      continue;
    }

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
      const separator = /^[.!?,;:]+$/.test(text) ? '' : ' ';
      const appendedText = /^[.!?,;:]+$/.test(text) ? text : text.replace(/\.$/, '');
      previous.text = `${previous.text}${separator}${appendedText}`;
      if (Array.isArray(block.links) && block.links.length) {
        previous.links = [...(previous.links || []), ...block.links];
      }
      continue;
    }

    if (/^[.!?,;:]+$/.test(text)) continue;
    normalized.push({ ...block, text });
  }
  return normalized;
}

function normalizeBlockTerminalPunctuation(blocks: AssignmentBlock[]): AssignmentBlock[] {
  return blocks.map((block) => {
    if (block.type === 'text') return { ...block, text: ensureTerminalPunctuation(block.text) };
    if (block.type === 'field') {
      return {
        ...block,
        label: ensureTerminalPunctuation(block.label),
        ...(block.hint ? { hint: ensureTerminalPunctuation(block.hint) } : {}),
      };
    }
    if (block.type === 'image' && block.caption) return { ...block, caption: ensureTerminalPunctuation(block.caption) };
    return block;
  });
}

function ensureAtLeastOneRequiredField(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const firstFieldIndex = blocks.findIndex((block) => block.type === 'field');
  if (firstFieldIndex < 0) return blocks;
  if (blocks.some((block) => block.type === 'field' && block.required !== false)) return blocks;

  return blocks.map((block, index) => (
    index === firstFieldIndex && block.type === 'field' ? { ...block, required: true } : block
  ));
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
        const text = normalizeLegacyAssignmentText(cleanString(raw.text));
        const links = normalizeLegacyInlineLinks(text, normalizeInlineLinks(raw.links));
        return text ? { id, type, text, ...(links.length ? { links } : {}), ...(branch ? { branch } : {}) } : null;
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
        if (!href || !text || isGenericSettingsLink(text, href)) return null;
        return { id, type, href, text, ...(raw.download === true && isDownloadHref(href) ? { download: true } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'image') {
        const src = cleanString(raw.src);
        if (!src || /\{%|%\}/.test(src)) return null;
        const alt = cleanString(raw.alt);
        const caption = cleanString(raw.caption);
        return { id, type, src, ...(alt ? { alt } : {}), ...(caption ? { caption } : {}), ...(branch ? { branch } : {}) };
      }

      if (type === 'field') {
        const name = cleanString(raw.name);
        const label = normalizeParentheticalSpacing(cleanString(raw.label) || name);
        const fieldType = raw.fieldType === 'radio' || raw.fieldType === 'checkbox' || raw.fieldType === 'textarea' ? raw.fieldType : 'text';
        if (!name || !label) return null;
        const correctAnswers = normalizeStringList(raw.correctAnswers);
        const hint = normalizeParentheticalSpacing(cleanString(raw.hint));
        const answerSize = normalizeAnswerSize(raw.answerSize);
        return {
          id,
          type,
          name,
          label,
          fieldType,
          required: raw.required !== false,
          choices: normalizeFieldChoices(name, label, normalizeChoices(raw.choices)),
          ...(correctAnswers.length ? { correctAnswers } : {}),
          ...(hint ? { hint } : {}),
          ...(answerSize ? { answerSize } : {}),
          ...(branch ? { branch } : {}),
        };
      }

      return null;
    })
    .filter((block): block is AssignmentBlock => Boolean(block));
  return ensureAtLeastOneRequiredField(normalizeBlockTerminalPunctuation(normalizeTextBlockSequence(blocks)));
}
