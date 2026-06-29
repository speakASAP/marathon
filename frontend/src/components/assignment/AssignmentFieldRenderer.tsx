import { useState } from "react";
import type { AnswerValue, FieldBlock } from "./assignmentRendererTypes";

type AssignmentFieldRendererProps = {
  block: FieldBlock;
  value: AnswerValue | undefined;
  readOnly: boolean;
  onChange: (name: string, value: AnswerValue) => void;
};

function normalizeAnswer(value: string) {
  return value.replace(/’/g, "'").trim();
}

function getTextValue(value: AnswerValue | undefined) {
  return typeof value === "string" ? value : "";
}

function splitTranslatedLabel(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?)\s*(\([^()]+\))$/);

  if (!match) {
    return { original: label, translation: "" };
  }

  return { original: match[1].trim(), translation: match[2].trim() };
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

export function AssignmentFieldRenderer({ block, value, readOnly, onChange }: AssignmentFieldRendererProps) {
  const [hintOpen, setHintOpen] = useState(false);
  const [textFieldBlurred, setTextFieldBlurred] = useState(false);
  const values = Array.isArray(value) ? value : [];
  const textValue = getTextValue(value);
  const correctAnswers = block.correctAnswers?.map(normalizeAnswer).filter(Boolean) || [];
  const hasAnswerCheck = correctAnswers.length > 0 && (block.fieldType === "text" || block.fieldType === "textarea");
  const normalizedTextValue = normalizeAnswer(textValue);
  const answerMismatch = hasAnswerCheck && normalizedTextValue.length > 0 && !correctAnswers.includes(normalizedTextValue);
  const answerIsWrong = answerMismatch && (readOnly || textFieldBlurred);
  const hintText = block.hint || correctAnswers.join(", ");

  const toggleCheckbox = (option: string) => {
    onChange(block.name, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  const updateText = (nextValue: string) => {
    onChange(block.name, nextValue);
    if (textFieldBlurred) setTextFieldBlurred(false);
    if (hintOpen) setHintOpen(false);
  };

  const markTextFieldBlurred = () => {
    if (hasAnswerCheck) setTextFieldBlurred(true);
  };

  const blockClassName = `step-question-block step-question-block--${block.fieldType}${answerIsWrong ? " step-question-block-error" : ""}`;

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
      ) : block.fieldType === "textarea" ? (
        <textarea
          value={textValue}
          onChange={(event) => updateText(event.target.value)}
          onBlur={markTextFieldBlurred}
          onKeyDown={(event) => event.stopPropagation()}
          rows={4}
          disabled={readOnly}
          aria-invalid={answerIsWrong || undefined}
        />
      ) : (
        <input
          type="text"
          value={textValue}
          onChange={(event) => updateText(event.target.value)}
          onBlur={markTextFieldBlurred}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={readOnly}
          aria-invalid={answerIsWrong || undefined}
        />
      )}
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
