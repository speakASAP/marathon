import type { AnswerValue, FieldBlock } from "./assignmentRendererTypes";

type AssignmentFieldRendererProps = {
  block: FieldBlock;
  value: AnswerValue | undefined;
  readOnly: boolean;
  onChange: (name: string, value: AnswerValue) => void;
};

export function AssignmentFieldRenderer({ block, value, readOnly, onChange }: AssignmentFieldRendererProps) {
  const values = Array.isArray(value) ? value : [];

  const toggleCheckbox = (option: string) => {
    onChange(block.name, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  return (
    <fieldset className="step-question-block">
      <legend>
        {block.label}
        {!block.required && <span>Необязательное поле</span>}
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
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(block.name, event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          rows={4}
          disabled={readOnly}
        />
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(block.name, event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          disabled={readOnly}
        />
      )}
    </fieldset>
  );
}
