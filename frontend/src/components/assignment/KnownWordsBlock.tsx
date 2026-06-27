import type { AnswerValue, KnownWordsBlockModel } from "./assignmentRendererTypes";

type KnownWordsBlockProps = {
  block: KnownWordsBlockModel;
  value: AnswerValue | undefined;
  readOnly: boolean;
  onChange: (name: string, value: string[]) => void;
};

function wordKey(paragraphIndex: number, tokenIndex: number, token: string) {
  return `${paragraphIndex}:${tokenIndex}:${token}`;
}

function splitKnownWordTokens(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

export function KnownWordsBlock({ block, value, readOnly, onChange }: KnownWordsBlockProps) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const toggle = (key: string) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(block.name, Array.from(next));
  };

  return (
    <section className="step-known-words" aria-label={block.label || "Текст для выделения знакомых слов"}>
      {block.label && <h3>{block.label}</h3>}
      {block.paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`${block.id}-${paragraphIndex}`}>
          {splitKnownWordTokens(paragraph).map((token, tokenIndex) => {
            if (/^\s+$/.test(token)) return token;
            const key = wordKey(paragraphIndex, tokenIndex, token);
            const isSelected = selected.has(key);
            return (
              <button
                aria-pressed={isSelected}
                className={`step-known-word${isSelected ? " selected" : ""}`}
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
