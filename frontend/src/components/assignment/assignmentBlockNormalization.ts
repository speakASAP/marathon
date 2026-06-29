import type { AssignmentBlock, AssignmentBranch } from "../../api/assignmentMarathon";
import type { AnswerValue, Answers, FieldBlock, Level, TextBlock } from "./assignmentRendererTypes";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

const TERMINAL_PUNCTUATION_PATTERN = /[.!?…:;]["')\]»”]*$/u;
const TRAILING_TRANSLATION_PATTERN = /\s+(\([^()]+\))$/u;

export function normalizeParentheticalSpacing(value: string) {
  return value
    .replace(/\(\s+/gu, "(")
    .replace(/\s+\)/gu, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasTerminalPunctuation(value: string) {
  const text = value.trim();
  if (TERMINAL_PUNCTUATION_PATTERN.test(text)) return true;
  return TERMINAL_PUNCTUATION_PATTERN.test(text.replace(TRAILING_TRANSLATION_PATTERN, ""));
}

export function ensureTerminalPunctuation(value: string) {
  const text = normalizeParentheticalSpacing(value.replace(/\s+/g, " "));
  if (!text || !/\p{L}/u.test(text) || hasTerminalPunctuation(text)) return text;
  const translation = text.match(TRAILING_TRANSLATION_PATTERN);
  if (translation) return `${text.slice(0, translation.index).trim()}. ${translation[1]}`;
  return `${text}.`;
}

export function stripHeadingTerminalPeriod(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+(["')\]»”]*)$/u, "$1")
    .trim();
}

export function getLevel(value: AnswerValue | undefined): Level {
  if (Array.isArray(value)) return null;
  const normalized = normalizeText(value || "");
  if (!normalized) return null;
  if (normalized.includes("только")) return "beginner";
  if (normalized.includes("несколько")) return "medium";
  if (normalized.includes("полугода")) return "advanced";
  return null;
}

export function isFieldBlock(block: AssignmentBlock): block is FieldBlock {
  return block.type === "field";
}

export function fieldHasInlineBlank(block: FieldBlock) {
  return block.fieldType === "text" && inlineBlankCount(block.label) > 0;
}

export function fieldUsesLongAnswer(block: FieldBlock) {
  if (block.fieldType === "radio" || block.fieldType === "checkbox") return false;
  if (block.answerSize === "long") return true;
  if (block.answerSize === "short") return false;
  if (block.fieldType === "textarea") return true;
  if (fieldHasInlineBlank(block)) return false;
  if (block.correctAnswers?.length) return false;
  return true;
}

export function findLevelField(blocks: AssignmentBlock[]) {
  return blocks.find((block) => isFieldBlock(block) && block.name === "q1")
    || blocks.find((block) => isFieldBlock(block) && normalizeText(block.label).startsWith("как долго вы учите"));
}

export function branchVisible(branch: AssignmentBranch | undefined, level: Level) {
  if (!branch) return true;
  if (!level) return false;
  if (branch === "beginner-medium") return level === "beginner" || level === "medium";
  return branch === level;
}

export function normalizeInitialPayload(payload: Record<string, unknown> | undefined): Answers {
  if (!payload) return {};
  const answers: Answers = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === "string") answers[key] = value;
    else if (Array.isArray(value)) answers[key] = value.map(String);
  });
  return answers;
}

export const REQUIRED_TEXT_MIN_LENGTH = 2;

export function inlineBlankCount(label: string) {
  return label.match(/\[[^\]]+\]/g)?.length || 0;
}

export function fieldInlineBlankCount(block: FieldBlock) {
  return block.fieldType === "text" ? inlineBlankCount(block.label) : 0;
}

export function isPracticeExerciseField(block: FieldBlock) {
  return block.fieldType === "text"
    && block.required === false
    && /^[a-z]*ex[a-z]*\d+(?:_\d+)?$/i.test(block.name)
    && fieldInlineBlankCount(block) > 0
    && Boolean(block.correctAnswers?.length);
}

export function practiceExerciseDisplayLabel(block: FieldBlock) {
  if (!isPracticeExerciseField(block)) return block.label;
  return normalizeParentheticalSpacing(block.label)
    .replace(/^\s*<li>\s*/i, "")
    .replace(/\s*<\/li>\s*$/i, "")
    .replace(/^\s*\d+[.)]?\s*/, "")
    .replace(/([.!?])(?=\p{Lu})/gu, "$1 ")
    .trim();
}

function splitStoredAnswer(value: string, expectedCount: number) {
  const cleanValue = value.trim();
  if (!cleanValue) return [];
  if (expectedCount > 1) {
    const commaParts = cleanValue.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
    if (commaParts.length === expectedCount) return commaParts;
  }
  return [cleanValue];
}

export function answerPartsFromValue(value: AnswerValue | undefined, expectedCount = 1) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return splitStoredAnswer(value, expectedCount);
  return [];
}

export function displayValue(block: AssignmentBlock, value: AnswerValue | undefined) {
  if (block.type !== "field") return "";
  const choiceLabel = (raw: string) => block.choices?.find((choice) => choice.value === raw)?.label || raw;
  const parts = answerPartsFromValue(value, inlineBlankCount(block.label)).map(choiceLabel);
  if (parts.length) return parts.join(", ");
  return typeof value === "string" ? choiceLabel(value) : "";
}

function fillAssignmentLabelPlaceholder(label: string, value: AnswerValue | undefined) {
  const blankCount = inlineBlankCount(label);
  const cleanAnswers = answerPartsFromValue(value, blankCount);
  if (!blankCount || cleanAnswers.length < blankCount) return null;

  let answerIndex = 0;
  return label
    .replace(/\[[^\]]+\]/g, () => cleanAnswers[answerIndex++] || "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function requiredAnswerValid(block: FieldBlock, value: AnswerValue | undefined) {
  if (block.fieldType === "radio") return typeof value === "string" && value.trim().length > 0;
  if (block.fieldType === "checkbox") return Array.isArray(value) && value.some((item) => item.trim().length > 0);
  const blankCount = fieldInlineBlankCount(block);
  if (blankCount > 1) {
    const parts = answerPartsFromValue(value, blankCount);
    return parts.length >= blankCount && parts.every((part) => part.length >= REQUIRED_TEXT_MIN_LENGTH);
  }
  if (Array.isArray(value)) return value.some((part) => part.trim().length >= REQUIRED_TEXT_MIN_LENGTH);
  return typeof value === "string" && value.trim().length >= REQUIRED_TEXT_MIN_LENGTH;
}

export function missingRequiredFields(blocks: AssignmentBlock[], answers: Answers, level: Level) {
  return blocks
    .filter((block): block is FieldBlock => isFieldBlock(block) && branchVisible(block.branch, level) && block.required)
    .filter((block) => !requiredAnswerValid(block, answers[block.name]));
}

export function composeReport(blocks: AssignmentBlock[], answers: Answers, level: Level) {
  return blocks
    .filter((block): block is FieldBlock => isFieldBlock(block) && branchVisible(block.branch, level))
    .map((block) => {
      if (isPracticeExerciseField(block)) return "";
      const value = displayValue(block, answers[block.name]);
      const cleanValue = value.trim();
      if (!cleanValue) return "";
      const filledLabel = fillAssignmentLabelPlaceholder(block.label, answers[block.name]);
      return filledLabel ? ensureTerminalPunctuation(filledLabel) : `${ensureTerminalPunctuation(block.label)}\n${cleanValue}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function payloadFromAnswers(blocks: AssignmentBlock[], answers: Answers, level: Level) {
  const payload: Record<string, unknown> = {};
  blocks.forEach((block) => {
    if (isFieldBlock(block)) {
      if (isPracticeExerciseField(block) || !branchVisible(block.branch, level)) return;
      const value = answers[block.name];
      if (Array.isArray(value)) {
        const cleanParts = value.map((item) => item.trim()).filter(Boolean);
        if (cleanParts.length) payload[block.name] = cleanParts;
      } else if (value?.trim()) {
        payload[block.name] = value.trim();
      }
      return;
    }
    if (block.type === "knownWords" && branchVisible(block.branch, level)) {
      const value = answers[block.name];
      if (Array.isArray(value) && value.length) payload[block.name] = value;
      else if (typeof value === "string" && value.trim()) payload[block.name] = value.trim();
    }
  });
  return payload;
}

function isNumberedHeading(text: string) {
  return /^\d+\.\s+\S/.test(text.trim());
}

function startsRussianInstruction(text: string) {
  return /^(?:Скачайте|Сказано|Также|Нам с вами|И сейчас|Давайте|Вопрос:|Завтра|И перед|Через|И, кстати)/i.test(text.trim());
}

function shouldBecomeBookLink(text: string) {
  return /^Книга\s+"Немецкий язык вместе с SpeakASAP/i.test(text.trim());
}

function isBookFeatureItem(text: string) {
  return /^(?:Упражнения с ответами|QR\s*-?\s*коды с озвучкой носителя|Схема изучения языка|Советы по организации обучения|Большой словарный запас)$/i.test(text.trim());
}

function isParticipantQuoteStart(text: string) {
  return /^(?:…|Раньше песни на английском)/i.test(text.trim());
}

function isParticipantQuoteStop(text: string) {
  return /^(?:И перед|Через|И, кстати|Вопрос:|Завтра|Нам с вами|Давайте|Скачайте|Сказано|Также|К тому же|Эта книга|Нажмите)/i.test(text.trim());
}

function letterCount(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern)).length;
}

function isTargetLanguageReadingParagraph(text: string) {
  const trimmed = text.trim();
  if (!trimmed || isNumberedHeading(trimmed) || startsRussianInstruction(trimmed)) return false;

  const allLetters = letterCount(trimmed, /\p{L}/gu);
  if (allLetters < 20) return false;

  const latinLetters = letterCount(trimmed, /\p{Script=Latin}/gu);
  if (latinLetters < 20) return false;

  const cyrillicLetters = letterCount(trimmed, /\p{Script=Cyrillic}/gu);
  return cyrillicLetters / allLetters < 0.2;
}

function targetLanguageReadingBlock(block: AssignmentBlock, branch: AssignmentBranch | undefined): block is TextBlock {
  return block.type === "text"
    && block.branch === branch
    && isTargetLanguageReadingParagraph(block.text);
}

export function isReadingRulesTitle(text: string) {
  return /^Подробнее о правилах чтения/i.test(text.trim());
}

function isTextBlock(block: AssignmentBlock | undefined): block is TextBlock {
  return block != null && block.type === "text";
}

function shouldMergeTextParagraph(previous: TextBlock, current: TextBlock) {
  if (previous.branch !== current.branch) return false;
  if (previous.style === "heading" || current.style === "heading") return false;

  const previousText = previous.text.trim();
  const currentText = current.text.trim();
  if (!previousText || !currentText) return false;
  if (isNumberedHeading(previousText) || isNumberedHeading(currentText)) return false;
  if (/^(?:[-–—]|[.!?,;:])\s*/.test(currentText)) return true;
  if (/^[а-яёa-z]/.test(currentText)) return true;
  if (/[,:;]$/.test(previousText) && !/^(?:\d+[.)]|[-–—*•])\s*/.test(currentText)) return true;

  return false;
}

function splitLinkedNumberedHeading(block: TextBlock): TextBlock[] | null {
  const links = block.links || [];
  if (!links.length) return null;

  const firstLink = links
    .map((link) => ({ ...link, index: block.text.indexOf(link.text) }))
    .filter((link) => link.index > 0)
    .sort((a, b) => a.index - b.index)[0];
  if (!firstLink) return null;

  const headingText = block.text.slice(0, firstLink.index).trim();
  const paragraphText = block.text.slice(firstLink.index).trim();
  if (!isNumberedHeading(headingText) || !paragraphText) return null;

  return [
    { ...block, id: `${block.id}-heading`, text: headingText, links: undefined, style: "heading" },
    { ...block, id: `${block.id}-body`, text: paragraphText, links },
  ];
}

function mergeAdjacentTextParagraphs(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const merged: AssignmentBlock[] = [];

  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (isTextBlock(previous) && isTextBlock(block) && shouldMergeTextParagraph(previous, block)) {
      previous.text = `${previous.text.trim()} ${block.text.trim()}`;
      continue;
    }
    merged.push(block);
  }

  return merged;
}

function compactReadingRules(items: string[]) {
  const joined = items.map((item) => item.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!joined) return items;

  const ruleStartPattern = /(?:^|\s)([A-Za-zÄÖÜäöüß]{1,4}(?:,\s*[A-Za-zÄÖÜäöüß]{1,4})*)\s+(?:-|читается)/g;
  const starts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = ruleStartPattern.exec(joined))) {
    starts.push(match.index + (match[0].startsWith(" ") ? 1 : 0));
  }

  if (!starts.length) return items;

  return starts
    .map((start, index) => joined.slice(start, starts[index + 1] ?? joined.length).trim())
    .filter(Boolean);
}

function ensureAtLeastOneRequiredField(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const firstFieldIndex = blocks.findIndex((block) => block.type === "field");
  if (firstFieldIndex < 0) return blocks;
  if (blocks.some((block) => block.type === "field" && block.required !== false)) return blocks;

  return blocks.map((block, index) => (
    index === firstFieldIndex && block.type === "field" ? { ...block, required: true } : block
  ));
}

export function decorateBlocks(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const decorated: AssignmentBlock[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type === "text") {
      const splitBlocks = splitLinkedNumberedHeading(block);
      if (splitBlocks) {
        decorated.push(...splitBlocks);
        continue;
      }
    }

    if (block.type === "text" && isNumberedHeading(block.text)) {
      decorated.push({ ...block, style: "heading" });
      continue;
    }

    if (block.type === "text" && shouldBecomeBookLink(block.text)) {
      decorated.push({
        id: `${block.id}-link`,
        type: "link",
        href: "https://ast.ru/book/nemetskiy-yazyk-vmeste-s-speakasap-vyuchi-navsegda-853381/",
        text: block.text,
        ...(block.branch ? { branch: block.branch } : {}),
      });
      continue;
    }

    if (block.type === "text" && isReadingRulesTitle(block.text)) {
      const items: string[] = [];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== "text" || isNumberedHeading(candidate.text)) break;
        items.push(candidate.text);
        cursor += 1;
      }
      if (items.length) {
        decorated.push({
          id: `${block.id}-rules`,
          type: "list",
          title: block.text,
          items: compactReadingRules(items),
          ...(block.branch ? { branch: block.branch } : {}),
        });
        index = cursor - 1;
        continue;
      }
    }

    if (block.type === "text" && isBookFeatureItem(block.text)) {
      const items = [block.text];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== "text" || !isBookFeatureItem(candidate.text)) break;
        items.push(candidate.text);
        cursor += 1;
      }
      decorated.push({
        id: `${block.id}-book-features`,
        type: "list",
        title: "В книге даны:",
        items,
        ...(block.branch ? { branch: block.branch } : {}),
      });
      index = cursor - 1;
      continue;
    }

    if (block.type === "audio") {
      const paragraphs: string[] = [];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== "text" || startsRussianInstruction(candidate.text)) break;
        paragraphs.push(candidate.text);
        cursor += 1;
      }
      decorated.push(block);
      if (paragraphs.length) {
        decorated.push({
          id: `${block.id}-known-words`,
          type: "knownWords",
          name: `known_words_${block.id.replace(/[^a-z0-9]+/gi, "_")}`,
          paragraphs,
          label: "Нажимайте на знакомые слова",
          ...(block.branch ? { branch: block.branch } : {}),
        });
        index = cursor - 1;
      }
      continue;
    }

    if (block.type === "text" && isParticipantQuoteStart(block.text)) {
      const quoteLines = [block.text];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== "text" || isParticipantQuoteStop(candidate.text)) break;
        quoteLines.push(candidate.text);
        cursor += 1;
      }
      decorated.push({
        id: `${block.id}-quote`,
        type: "quote",
        text: quoteLines.join("\n\n"),
        ...(block.branch ? { branch: block.branch } : {}),
      });
      index = cursor - 1;
      continue;
    }

    if (block.type === "text" && isTargetLanguageReadingParagraph(block.text)) {
      const quoteLines = [block.text];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (!targetLanguageReadingBlock(candidate, block.branch)) break;
        quoteLines.push(candidate.text);
        cursor += 1;
      }

      if (quoteLines.length > 1 || quoteLines.join(" ").length >= 160) {
        decorated.push({
          id: `${block.id}-reading-quote`,
          type: "quote",
          text: quoteLines.join("\n\n"),
          ...(block.branch ? { branch: block.branch } : {}),
        });
        index = cursor - 1;
        continue;
      }
    }

    decorated.push(block);
  }

  return ensureAtLeastOneRequiredField(mergeAdjacentTextParagraphs(decorated).map((block) => {
    if (block.type === "text") return { ...block, text: ensureTerminalPunctuation(block.text) };
    if (block.type === "quote") return { ...block, text: ensureTerminalPunctuation(block.text) };
    if (block.type === "list") {
      return {
        ...block,
        ...(block.title ? { title: ensureTerminalPunctuation(block.title) } : {}),
        items: block.items.map(ensureTerminalPunctuation),
      };
    }
    if (block.type === "knownWords") return { ...block, label: ensureTerminalPunctuation(block.label || "Текст для выделения знакомых слов") };
    return block;
  }));
}
