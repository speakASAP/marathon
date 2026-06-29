import { useState } from "react";
import { answerPartsFromValue, ensureTerminalPunctuation, fieldUsesLongAnswer, isPracticeExerciseField, practiceExerciseDisplayLabel } from "./assignmentBlockNormalization";
import type { AnswerValue, FieldBlock } from "./assignmentRendererTypes";

type AssignmentFieldRendererProps = {
  block: FieldBlock;
  value: AnswerValue | undefined;
  readOnly: boolean;
  validationError?: string;
  onChange: (name: string, value: AnswerValue) => void;
};

function normalizeAnswer(value: string) {
  return value.replace(/’/g, "'").trim();
}

function getTextValue(value: AnswerValue | undefined) {
  return typeof value === "string" ? value : "";
}

function getEditableTextParts(value: AnswerValue | undefined, expectedCount: number) {
  const parts = Array.isArray(value)
    ? value
    : (typeof value === "string" ? answerPartsFromValue(value, expectedCount) : []);
  return Array.from({ length: expectedCount }, (_, index) => parts[index] || "");
}

function splitTranslatedLabel(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?)\s*(\([^()]+\))$/);

  if (!match) {
    return { original: label, translation: "" };
  }

  return { original: match[1].trim(), translation: match[2].trim() };
}

function splitInlineBlank(label: string) {
  const parts = splitTranslatedLabel(label);
  const matches = [...parts.original.matchAll(/\[([^\]]+)\]/g)];

  if (!matches.length) {
    return null;
  }

  const segments: string[] = [];
  const blanks: string[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index ?? 0;
    segments.push(parts.original.slice(lastIndex, index));
    blanks.push(match[1].trim());
    lastIndex = index + match[0].length;
  }
  segments.push(parts.original.slice(lastIndex));

  return {
    segments,
    blanks,
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
  const hintText = block.hint || correctAnswers.join(", ");
  const isPracticeExercise = isPracticeExerciseField(block);
  const useLongAnswer = fieldUsesLongAnswer(block);
  const displayLabel = ensureTerminalPunctuation(practiceExerciseDisplayLabel(block));
  const inlineBlank = !useLongAnswer && block.fieldType === "text" ? splitInlineBlank(displayLabel) : null;
  const inlineBlankCount = inlineBlank?.blanks.length || 0;
  const inlineValues = inlineBlank ? getEditableTextParts(value, inlineBlankCount) : [];

  const answerAccepted = (rawValue: string, index = 0) => {
    const normalizedValue = normalizeAnswer(rawValue);
    if (!hasAnswerCheck || !normalizedValue) return false;
    if (inlineBlankCount > 1) {
      const expectedAnswer = correctAnswers[index];
      return expectedAnswer ? normalizedValue === expectedAnswer : correctAnswers.includes(normalizedValue);
    }
    return correctAnswers.includes(normalizedValue);
  };

  const normalizedTextValue = normalizeAnswer(textValue);
  const answerMismatch = inlineBlank
    ? inlineValues.some((item, index) => normalizeAnswer(item).length > 0 && !answerAccepted(item, index))
    : hasAnswerCheck && normalizedTextValue.length > 0 && !correctAnswers.includes(normalizedTextValue);
  const answerIsWrong = answerMismatch && (readOnly || textFieldBlurred);

  const toggleCheckbox = (option: string) => {
    onChange(block.name, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  const updateText = (nextValue: string) => {
    onChange(block.name, nextValue);
    if (textFieldBlurred) setTextFieldBlurred(false);
    if (hintOpen) setHintOpen(false);
  };

  const updateInlineText = (index: number, nextValue: string) => {
    if (inlineBlankCount <= 1) {
      updateText(nextValue);
      return;
    }
    const nextValues = [...inlineValues];
    nextValues[index] = nextValue;
    onChange(block.name, nextValues);
    if (textFieldBlurred) setTextFieldBlurred(false);
    if (hintOpen) setHintOpen(false);
  };

  const markTextFieldBlurred = () => {
    if (hasAnswerCheck) setTextFieldBlurred(true);
  };

  const validationErrorId = `assignment-field-error-${block.id || block.name}`;
  const blockClassName = `step-question-block step-question-block--${block.fieldType}${isPracticeExercise ? " step-question-block--practice-exercise" : ""}${useLongAnswer ? " step-question-block--long-answer" : ""}${answerIsWrong ? " step-question-block-error" : ""}${validationError ? " step-question-block-required-error" : ""}`;
  const textInput = (
    <input
      type="text"
      value={textValue}
      onChange={(event) => updateText(event.target.value)}
      onBlur={markTextFieldBlurred}
      onKeyDown={(event) => event.stopPropagation()}
      disabled={readOnly}
      aria-invalid={answerIsWrong || Boolean(validationError) || undefined}
      aria-describedby={validationError ? validationErrorId : undefined}
      aria-label={displayLabel}
    />
  );

  if (inlineBlank) {
    const renderInlineControl = (index: number) => {
      const currentValue = inlineBlankCount > 1 ? inlineValues[index] : textValue;
      const widthChars = Math.min(Math.max((inlineBlank.blanks[index]?.length || 0) + 2, 5), 16);
      if (answerAccepted(currentValue, index)) {
        return (
          <strong className="step-inline-answer-accepted" key={`answer-${index}`}>
            {normalizeAnswer(currentValue)}
          </strong>
        );
      }

      return (
        <input
          type="text"
          value={currentValue}
          onChange={(event) => updateInlineText(index, event.target.value)}
          onBlur={markTextFieldBlurred}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={readOnly}
          aria-invalid={answerIsWrong || Boolean(validationError) || undefined}
          aria-describedby={validationError ? validationErrorId : undefined}
          aria-label={`${displayLabel} ${index + 1}`}
          placeholder={inlineBlank.blanks[index]}
          title={inlineBlank.blanks[index] || undefined}
          style={{ width: `${widthChars}ch` }}
        />
      );
    };

    return (
      <fieldset className={`${blockClassName} step-question-block--inline-blank`}>
        <legend className="sr-only">{displayLabel}</legend>
        <div className="step-inline-exercise-line">
          <span className="step-inline-exercise-number" aria-hidden="true" />
          <span className="step-inline-exercise-text">
            {inlineBlank.segments.map((segment, index) => (
              <span key={`segment-${index}`}>
                {segment}
                {index < inlineBlankCount && renderInlineControl(index)}
              </span>
            ))}
          </span>
          {inlineBlank.translation && <span className="step-question-label-translation"> {inlineBlank.translation}</span>}
          {!block.required && !isPracticeExercise && <span className="step-question-label-optional">Необязательное поле</span>}
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
        {renderTranslatedLabel(displayLabel)}
        {!block.required && !isPracticeExercise && <span className="step-question-label-optional">Необязательное поле</span>}
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
