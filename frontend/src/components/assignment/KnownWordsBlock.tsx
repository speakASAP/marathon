import { ensureTerminalPunctuation, stripHeadingTerminalPeriod } from "./assignmentBlockNormalization";
import type { AnswerValue, KnownWordsBlockModel } from "./assignmentRendererTypes";

type KnownWordsBlockProps = {
  block: KnownWordsBlockModel;
  value: AnswerValue | undefined;
  sourceValue?: AnswerValue;
  readOnly: boolean;
  onChange: (name: string, value: string[]) => void;
};

function wordKey(paragraphIndex: number, tokenIndex: number, token: string) {
  return `${paragraphIndex}:${tokenIndex}:${token}`;
}

function splitKnownWordTokens(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

export function KnownWordsBlock({ block, value, sourceValue, readOnly, onChange }: KnownWordsBlockProps) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const sourceSelected = new Set(Array.isArray(sourceValue) ? sourceValue : []);
  const label = ensureTerminalPunctuation(block.label || "Текст для выделения знакомых слов");
  const toggle = (key: string) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(block.name, Array.from(next));
  };

  return (
    <section className="step-known-words" aria-label={label}>
      {label && <h3>{stripHeadingTerminalPeriod(label)}</h3>}
      {block.paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`${block.id}-${paragraphIndex}`}>
          {splitKnownWordTokens(ensureTerminalPunctuation(paragraph)).map((token, tokenIndex) => {
            if (/^\s+$/.test(token)) return token;
            const key = wordKey(paragraphIndex, tokenIndex, token);
            const isSelected = selected.has(key);
            const isSourceSelected = sourceSelected.has(key);
            const className = [
              "step-known-word",
              isSourceSelected ? "source-selected" : "",
              isSelected ? "selected" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                aria-pressed={isSelected}
                className={className}
                disabled={readOnly}
                key={key}
                onClick={(event) => {
                  toggle(key);
                  event.currentTarget.blur();
                }}
                type="button"
              >
                {token}
              </button>
            );
          })}
        </p>
      ))}
    </section>
  );
}
