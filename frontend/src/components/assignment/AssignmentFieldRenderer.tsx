import { useState } from "react";
import { fieldUsesLongAnswer } from "./assignmentBlockNormalization";
import type { AnswerValue, FieldBlock } from "./assignmentRendererTypes";

type AssignmentFieldRendererProps = {
  block: FieldBlock;
  value: AnswerValue | undefined;
  readOnly: boolean;
  validationError?: string;
  onChange: (name: string, value: AnswerValue) => void;
};

type InlineBlankPart =
  | { type: "text"; text: string }
  | { type: "blank"; hint: string; index: number };

function normalizeAnswer(value: string) {
  return value.replace(/’/g, "'").trim();
}

function getTextValue(value: AnswerValue | undefined) {
  return typeof value === "string" ? value : "";
}

function getTextValues(value: AnswerValue | undefined, count: number) {
  const values = Array.isArray(value) ? value : (typeof value === "string" && count === 1 ? [value] : []);
  return Array.from({ length: count }, (_, index) => values[index] || "");
}

function splitTranslatedLabel(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?)\s*(\([^()]+\))$/);

  if (!match) {
    return { original: label, translation: "" };
  }

  return { original: match[1].trim(), translation: match[2].trim() };
}

function splitInlineBlanks(label: string) {
  const parts = splitTranslatedLabel(label);
  const placeholderPattern = /\[([^\]]+)\]/g;
  const matches = Array.from(parts.original.matchAll(placeholderPattern));

  if (!matches.length) {
    return null;
  }

  const inlineParts: InlineBlankPart[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      inlineParts.push({ type: "text", text: parts.original.slice(lastIndex, matchIndex) });
    }
    inlineParts.push({ type: "blank", hint: match[1].trim(), index });
    lastIndex = matchIndex + match[0].length;
  });

  if (lastIndex < parts.original.length) {
    inlineParts.push({ type: "text", text: parts.original.slice(lastIndex) });
  }

  return {
    parts: inlineParts,
    blankCount: matches.length,
    translation: parts.translation,
  };
}

function renderTranslatedLabel(label: string) {
  const parts = splitTranslatedLabel(label);

  if (!parts.translation) {
    return <span className="step-question-label-original">{parts.original}</span>;
  }

  return (
    <>
      <span className="step-question-label-original">{parts.original}</span>{" "}
      <span className="step-question-label-translation">{parts.translation}</span>
    </>
  );
}

export function AssignmentFieldRenderer({ block, value, readOnly, validationError, onChange }: AssignmentFieldRendererProps) {
  const [hintOpen, setHintOpen] = useState(false);
  const [textFieldBlurred, setTextFieldBlurred] = useState(false);
  const values = Array.isArray(value) ? value : [];
  const textValue = getTextValue(value);
  const correctAnswers = block.correctAnswers?.map(normalizeAnswer).filter(Boolean) || [];
  const hasAnswerCheck = correctAnswers.length > 0 && (block.fieldType === "text" || block.fieldType === "textarea");
  const useLongAnswer = fieldUsesLongAnswer(block);
  const inlineBlank = !useLongAnswer && block.fieldType === "text" ? splitInlineBlanks(block.label) : null;
  const inlineTextValues = inlineBlank ? getTextValues(value, inlineBlank.blankCount) : [];
  const normalizedTextValue = normalizeAnswer(textValue);
  const inlineAnswerMismatch = Boolean(inlineBlank && inlineBlank.blankCount > 1 && inlineTextValues.some((item, index) => {
    const expected = correctAnswers[index];
    const normalized = normalizeAnswer(item);
    return Boolean(expected && normalized.length > 0 && normalized !== expected);
  }));
  const answerMismatch = hasAnswerCheck && (
    inlineAnswerMismatch
    || ((!inlineBlank || inlineBlank.blankCount <= 1) && normalizedTextValue.length > 0 && !correctAnswers.includes(normalizedTextValue))
  );
  const answerIsWrong = answerMismatch && (readOnly || textFieldBlurred);
  const hintText = block.hint || correctAnswers.join(", ");

  const toggleCheckbox = (option: string) => {
    onChange(block.name, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  const resetTextFeedback = () => {
    if (textFieldBlurred) setTextFieldBlurred(false);
    if (hintOpen) setHintOpen(false);
  };

  const updateText = (nextValue: string) => {
    onChange(block.name, nextValue);
    resetTextFeedback();
  };

  const updateInlineText = (index: number, nextValue: string) => {
    if (!inlineBlank || inlineBlank.blankCount <= 1) {
      updateText(nextValue);
      return;
    }

    const nextValues = [...inlineTextValues];
    nextValues[index] = nextValue;
    onChange(block.name, nextValues);
    resetTextFeedback();
  };

  const markTextFieldBlurred = () => {
    if (hasAnswerCheck) setTextFieldBlurred(true);
  };

  const validationErrorId = `assignment-field-error-${block.id || block.name}`;
  const blockClassName = `step-question-block step-question-block--${block.fieldType}${useLongAnswer ? " step-question-block--long-answer" : ""}${answerIsWrong ? " step-question-block-error" : ""}${validationError ? " step-question-block-required-error" : ""}`;

  const renderTextInput = ({
    inputKey,
    inputValue,
    inputPlaceholder,
    ariaLabel,
    onValueChange,
    inline = false,
  }: {
    inputKey?: string;
    inputValue: string;
    inputPlaceholder?: string;
    ariaLabel: string;
    onValueChange: (nextValue: string) => void;
    inline?: boolean;
  }) => {
    const widthChars = inline && inputPlaceholder
      ? Math.min(Math.max(inputPlaceholder.length + 2, 5), 16)
      : undefined;

    return (
      <input
        key={inputKey}
        type="text"
        value={inputValue}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={markTextFieldBlurred}
        onKeyDown={(event) => event.stopPropagation()}
        disabled={readOnly}
        aria-invalid={answerIsWrong || Boolean(validationError) || undefined}
        aria-describedby={validationError ? validationErrorId : undefined}
        aria-label={ariaLabel}
        placeholder={inputPlaceholder}
        title={inputPlaceholder || undefined}
        style={widthChars ? { width: `${widthChars}ch` } : undefined}
      />
    );
  };

  const textInput = renderTextInput({
    inputValue: textValue,
    inputPlaceholder: inlineBlank?.blankCount === 1
      ? inlineBlank.parts.find((part): part is Extract<InlineBlankPart, { type: "blank" }> => part.type === "blank")?.hint
      : undefined,
    ariaLabel: block.label,
    onValueChange: updateText,
  });

  if (inlineBlank) {
    return (
      <fieldset className={`${blockClassName} step-question-block--inline-blank`}>
        <legend className="sr-only">{block.label}</legend>
        <div className="step-inline-exercise-line">
          <span className="step-inline-exercise-number" aria-hidden="true" />
          <span className="step-question-label-original">
            {inlineBlank.parts.map((part, index) => {
              if (part.type === "text") return <span key={`text-${index}`}>{part.text}</span>;
              return renderTextInput({
                inputKey: `blank-${part.index}`,
                inputValue: inlineTextValues[part.index] || "",
                inputPlaceholder: part.hint,
                ariaLabel: `${block.label} - ${part.hint}`,
                onValueChange: (nextValue) => updateInlineText(part.index, nextValue),
                inline: true,
              });
            })}
          </span>
          {inlineBlank.translation && <span className="step-question-label-translation"> {inlineBlank.translation}</span>}
          {!block.required && <span className="step-question-label-optional">Необязательное поле</span>}
        </div>
        {validationError && <div id={validationErrorId} className="step-required-field-message" role="alert">{validationError}</div>}
        {answerIsWrong && (
          <div className="step-answer-hint-panel" aria-live="polite">
            <span>Ответ пока не совпадает с правильным вариантом.</span>
            <button type="button" className="step-answer-hint-toggle" onClick={() => setHintOpen((open) => !open)}>
              {hintOpen ? "Скрыть подсказку" : "Показать подсказку"}
            </button>
            {hintOpen && <strong>{hintText}</strong>}
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <fieldset className={blockClassName}>
      <legend>
        {renderTranslatedLabel(block.label)}
        {!block.required && <span className="step-question-label-optional">Необязательное поле</span>}
      </legend>
      {block.fieldType === "radio" || block.fieldType === "checkbox" ? (
        <div className="step-choice-list">
          {(block.choices || []).map((choice) => {
            const checked = block.fieldType === "checkbox" ? values.includes(choice.value) : value === choice.value;
            return (
              <label className={`step-choice${checked ? " selected" : ""}`} key={choice.value}>
                <input
                  type={block.fieldType}
                  name={block.name}
                  value={choice.value}
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => {
                    if (block.fieldType === "checkbox") toggleCheckbox(choice.value);
                    else onChange(block.name, choice.value);
                  }}
                />
                <span>{choice.label}</span>
              </label>
            );
          })}
        </div>
      ) : useLongAnswer ? (
        <textarea
          value={textValue}
          onChange={(event) => updateText(event.target.value)}
          onBlur={markTextFieldBlurred}
          onKeyDown={(event) => event.stopPropagation()}
          rows={6}
          disabled={readOnly}
          aria-invalid={answerIsWrong || Boolean(validationError) || undefined}
          aria-describedby={validationError ? validationErrorId : undefined}
        />
      ) : (
        textInput
      )}
      {validationError && <div id={validationErrorId} className="step-required-field-message" role="alert">{validationError}</div>}
      {answerIsWrong && (
        <div className="step-answer-hint-panel" aria-live="polite">
          <span>Ответ пока не совпадает с правильным вариантом.</span>
          <button type="button" className="step-answer-hint-toggle" onClick={() => setHintOpen((open) => !open)}>
            {hintOpen ? "Скрыть подсказку" : "Показать подсказку"}
          </button>
          {hintOpen && <strong>{hintText}</strong>}
        </div>
      )}
    </fieldset>
  );
}
