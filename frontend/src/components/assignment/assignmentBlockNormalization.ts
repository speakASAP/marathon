import type { AssignmentBlock, AssignmentBranch } from "../../api/assignmentMarathon";
import type { AnswerValue, Answers, FieldBlock, Level, TextBlock } from "./assignmentRendererTypes";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").trim();
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

export function inlineBlankCount(label: string) {
  return Array.from(label.matchAll(/\[[^\]]+\]/g)).length;
}

export function fieldHasInlineBlank(block: FieldBlock) {
  return block.fieldType === "text" && inlineBlankCount(block.label) > 0;
}

export function fieldHasMultipleInlineBlanks(block: FieldBlock) {
  return fieldHasInlineBlank(block) && inlineBlankCount(block.label) > 1;
}

function textAnswerFilled(value: unknown) {
  return typeof value === "string" && value.trim().length >= REQUIRED_TEXT_MIN_LENGTH;
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

function displayValues(block: AssignmentBlock, value: AnswerValue | undefined) {
  if (block.type !== "field") return [];
  const choiceLabel = (raw: string) => block.choices?.find((choice) => choice.value === raw)?.label || raw;
  if (Array.isArray(value)) return value.map(choiceLabel).filter(Boolean);
  return value ? [choiceLabel(value)] : [];
}

export function displayValue(block: AssignmentBlock, value: AnswerValue | undefined) {
  return displayValues(block, value).join(", ");
}

function fillAssignmentLabelPlaceholder(label: string, answer: AnswerValue | undefined, block: AssignmentBlock) {
  const placeholders = Array.from(label.matchAll(/\[[^\]]+\]/g));
  if (!placeholders.length) return null;

  const cleanAnswers = displayValues(block, answer).map((item) => item.trim()).filter(Boolean);
  if (!cleanAnswers.length) return null;
  if (placeholders.length > 1 && cleanAnswers.length < placeholders.length) return null;

  let answerIndex = 0;
  return label
    .replace(/\[[^\]]+\]/g, () => cleanAnswers[Math.min(answerIndex++, cleanAnswers.length - 1)] || "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function requiredAnswerValid(block: FieldBlock, value: AnswerValue | undefined) {
  if (block.fieldType === "radio") return typeof value === "string" && value.trim().length > 0;
  if (block.fieldType === "checkbox") return Array.isArray(value) && value.some((item) => item.trim().length > 0);
  if (fieldHasMultipleInlineBlanks(block)) {
    const count = inlineBlankCount(block.label);
    return Array.isArray(value)
      && value.slice(0, count).length === count
      && value.slice(0, count).every(textAnswerFilled);
  }
  if (Array.isArray(value)) return value.some(textAnswerFilled);
  return textAnswerFilled(value);
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
      const value = displayValue(block, answers[block.name]);
      const cleanValue = value.trim();
      if (!cleanValue) return "";
      return fillAssignmentLabelPlaceholder(block.label, answers[block.name], block) || `${block.label}\n${cleanValue}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function payloadFromAnswers(blocks: AssignmentBlock[], answers: Answers, level: Level) {
  const payload: Record<string, unknown> = {};
  blocks.forEach((block) => {
    if (isFieldBlock(block)) {
      if (!branchVisible(block.branch, level)) return;
      const value = answers[block.name];
      if (Array.isArray(value)) {
        const normalized = block.fieldType === "text" ? value.map((item) => item.trim()) : value;
        if (normalized.some((item) => item.trim().length > 0)) payload[block.name] = normalized;
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

    decorated.push(block);
  }

  return ensureAtLeastOneRequiredField(mergeAdjacentTextParagraphs(decorated));
}
