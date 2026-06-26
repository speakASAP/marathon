import { useEffect, useMemo, useState } from 'react';
import type { AssignmentBlock, AssignmentBranch, SubmissionPayload } from '../api/assignmentMarathon';

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;
type Level = 'beginner' | 'medium' | 'advanced' | null;

type StepAssignmentRendererProps = {
  blocks?: AssignmentBlock[] | null;
  fallbackContent?: string;
  initialPayload?: SubmissionPayload;
  readOnly?: boolean;
  onPayloadChange?: (payload: SubmissionPayload, report: string) => void;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

function youtubeEmbedUrl(code: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(code)}`;
}

function mediaAudioUrl(code: string, extension: 'mp3' | 'ogg') {
  if (/^https?:\/\//i.test(code)) return code;
  const normalized = code.replace(/^\/+/, '').replace(/\.(mp3|ogg)$/i, '');
  return `/media/${normalized}.${extension}`;
}

function getLevel(value: AnswerValue | undefined): Level {
  if (Array.isArray(value)) return null;
  const normalized = normalizeText(value || '');
  if (!normalized) return null;
  if (normalized.includes('только')) return 'beginner';
  if (normalized.includes('несколько')) return 'medium';
  if (normalized.includes('полугода')) return 'advanced';
  return null;
}

function isFieldBlock(block: AssignmentBlock): block is Extract<AssignmentBlock, { type: 'field' }> {
  return block.type === 'field';
}

function findLevelField(blocks: AssignmentBlock[]) {
  return blocks.find((block) => isFieldBlock(block) && block.name === 'q1')
    || blocks.find((block) => isFieldBlock(block) && normalizeText(block.label).startsWith('как долго вы учите'));
}

function branchVisible(branch: AssignmentBranch | undefined, level: Level) {
  if (!branch) return true;
  if (!level) return false;
  if (branch === 'beginner-medium') return level === 'beginner' || level === 'medium';
  return branch === level;
}

function normalizeInitialPayload(payload: SubmissionPayload | undefined): Answers {
  if (!payload) return {};
  const answers: Answers = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (typeof value === 'string') answers[key] = value;
    else if (Array.isArray(value)) answers[key] = value.map(String);
  });
  return answers;
}

function displayValue(block: AssignmentBlock, value: AnswerValue | undefined) {
  if (block.type !== 'field') return '';
  const choiceLabel = (raw: string) => block.choices?.find((choice) => choice.value === raw)?.label || raw;
  if (Array.isArray(value)) return value.map(choiceLabel).join(', ');
  return value ? choiceLabel(value) : '';
}

function composeReport(blocks: AssignmentBlock[], answers: Answers, level: Level) {
  return blocks
    .filter((block): block is Extract<AssignmentBlock, { type: 'field' }> => isFieldBlock(block) && branchVisible(block.branch, level))
    .map((block) => {
      const value = displayValue(block, answers[block.name]);
      return value.trim() ? `${block.label}\n${value.trim()}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function payloadFromAnswers(blocks: AssignmentBlock[], answers: Answers, level: Level): SubmissionPayload {
  const payload: SubmissionPayload = {};
  blocks.forEach((block) => {
    if (isFieldBlock(block)) {
      if (!branchVisible(block.branch, level)) return;
      const value = answers[block.name];
      if (Array.isArray(value)) {
        if (value.length) payload[block.name] = value;
      } else if (value?.trim()) {
        payload[block.name] = value.trim();
      }
      return;
    }
    if (block.type === 'knownWords' && branchVisible(block.branch, level)) {
      const value = answers[block.name];
      if (Array.isArray(value) && value.length) payload[block.name] = value;
      else if (typeof value === 'string' && value.trim()) payload[block.name] = value.trim();
    }
  });
  return payload;
}

function wordKey(paragraphIndex: number, tokenIndex: number, token: string) {
  return `${paragraphIndex}:${tokenIndex}:${token}`;
}

function splitKnownWordTokens(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
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

function decorateBlocks(blocks: AssignmentBlock[]): AssignmentBlock[] {
  const decorated: AssignmentBlock[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type === 'text' && isNumberedHeading(block.text)) {
      decorated.push({ ...block, style: 'heading' });
      continue;
    }

    if (block.type === 'text' && shouldBecomeBookLink(block.text)) {
      decorated.push({
        id: `${block.id}-link`,
        type: 'link',
        href: 'https://ast.ru/book/nemetskiy-yazyk-vmeste-s-speakasap-vyuchi-navsegda-853381/',
        text: block.text,
        ...(block.branch ? { branch: block.branch } : {}),
      });
      continue;
    }

    if (block.type === 'text' && /^Подробнее о правилах чтения/i.test(block.text)) {
      const items: string[] = [];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== 'text' || isNumberedHeading(candidate.text)) break;
        items.push(candidate.text);
        cursor += 1;
      }
      if (items.length) {
        decorated.push({
          id: `${block.id}-rules`,
          type: 'list',
          title: block.text,
          items: compactReadingRules(items),
          ...(block.branch ? { branch: block.branch } : {}),
        });
        index = cursor - 1;
        continue;
      }
    }

    if (block.type === 'audio') {
      const paragraphs: string[] = [];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== 'text' || startsRussianInstruction(candidate.text)) break;
        paragraphs.push(candidate.text);
        cursor += 1;
      }
      decorated.push(block);
      if (paragraphs.length) {
        decorated.push({
          id: `${block.id}-known-words`,
          type: 'knownWords',
          name: `known_words_${block.id.replace(/[^a-z0-9]+/gi, '_')}`,
          paragraphs,
          label: 'Нажимайте на знакомые слова',
          ...(block.branch ? { branch: block.branch } : {}),
        });
        index = cursor - 1;
      }
      continue;
    }

    if (block.type === 'text' && /^…/.test(block.text)) {
      const quoteLines = [block.text];
      let cursor = index + 1;
      while (cursor < blocks.length) {
        const candidate = blocks[cursor];
        if (candidate.type !== 'text' || /^(?:И перед|Через|И, кстати|Вопрос:)/i.test(candidate.text)) break;
        quoteLines.push(candidate.text);
        cursor += 1;
      }
      decorated.push({
        id: `${block.id}-quote`,
        type: 'quote',
        text: quoteLines.join('\n\n'),
        ...(block.branch ? { branch: block.branch } : {}),
      });
      index = cursor - 1;
      continue;
    }

    decorated.push(block);
  }

  return decorated;
}

function compactReadingRules(items: string[]) {
  const result: string[] = [];
  let current = '';
  for (const item of items) {
    const text = item.trim();
    if (!text) continue;
    const startsRule = /^[A-Za-zÄÖÜäöüß, ]{1,34}\s+(?:-|–|\[|читается)/.test(text);
    if (startsRule && current) {
      result.push(current);
      current = text;
    } else {
      current = current ? `${current} ${text}` : text;
    }
  }
  if (current) result.push(current);
  return result.length ? result : items;
}

type KnownWordsBlockProps = {
  block: Extract<AssignmentBlock, { type: 'knownWords' }>;
  value: AnswerValue | undefined;
  readOnly: boolean;
  onChange: (name: string, value: string[]) => void;
};

function KnownWordsBlock({ block, value, readOnly, onChange }: KnownWordsBlockProps) {
  const selected = new Set(Array.isArray(value) ? value : []);
  const toggle = (key: string) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(block.name, Array.from(next));
  };

  return (
    <section className="step-known-words" aria-label={block.label || 'Текст для выделения знакомых слов'}>
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
                className={`step-known-word${isSelected ? ' selected' : ''}`}
                disabled={readOnly}
                key={key}
                onClick={() => toggle(key)}
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

export default function StepAssignmentRenderer({
  blocks,
  fallbackContent,
  initialPayload,
  readOnly = false,
  onPayloadChange,
}: StepAssignmentRendererProps) {
  const assignmentBlocks = useMemo(() => decorateBlocks(Array.isArray(blocks) ? blocks : []), [blocks]);
  const [answers, setAnswers] = useState<Answers>(() => normalizeInitialPayload(initialPayload));
  const [touched, setTouched] = useState(false);
  const levelField = findLevelField(assignmentBlocks);
  const level = levelField && levelField.type === 'field' ? getLevel(answers[levelField.name]) : null;

  useEffect(() => {
    setAnswers(normalizeInitialPayload(initialPayload));
    setTouched(false);
  }, [initialPayload, assignmentBlocks]);

  useEffect(() => {
    if (!touched || !onPayloadChange) return;
    onPayloadChange(payloadFromAnswers(assignmentBlocks, answers, level), composeReport(assignmentBlocks, answers, level));
  }, [answers, assignmentBlocks, level, onPayloadChange, touched]);

  const updateAnswer = (name: string, value: AnswerValue) => {
    if (readOnly) return;
    setTouched(true);
    setAnswers((current) => ({ ...current, [name]: value }));
  };

  const toggleCheckbox = (name: string, option: string) => {
    const current = answers[name];
    const values = Array.isArray(current) ? current : [];
    updateAnswer(name, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };

  if (!assignmentBlocks.length) {
    return <div className="step-assignment-content">{fallbackContent}</div>;
  }

  return (
    <div className="step-assignment-content structured">
      {assignmentBlocks.map((block) => {
        if (!branchVisible(block.branch, level)) return null;

        if (block.type === 'text') {
          const className = block.style === 'heading' ? 'step-assignment-heading' : block.style === 'lead' ? 'step-assignment-lead' : 'step-assignment-paragraph';
          return <p className={className} key={block.id}>{block.text}</p>;
        }

        if (block.type === 'quote') {
          return <blockquote className="step-assignment-quote" key={block.id}>{block.text}</blockquote>;
        }

        if (block.type === 'list') {
          return (
            <section className="step-assignment-list-panel" key={block.id}>
              {block.title && <h3>{block.title}</h3>}
              <ul>
                {block.items.map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}
              </ul>
            </section>
          );
        }

        if (block.type === 'link') {
          return <p className="step-assignment-link-row" key={block.id}><a href={block.href} target="_blank" rel="noreferrer">{block.text}</a></p>;
        }

        if (block.type === 'knownWords') {
          return <KnownWordsBlock block={block} key={block.id} onChange={updateAnswer} readOnly={readOnly} value={answers[block.name]} />;
        }

        if (block.type === 'video') {
          return (
            <section className="step-video-block" key={block.id} aria-label="Видео задания">
              <iframe
                src={youtubeEmbedUrl(block.code)}
                title={block.title || `Видео задания ${block.code}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </section>
          );
        }

        if (block.type === 'audio') {
          const mp3Url = mediaAudioUrl(block.code, 'mp3');
          return (
            <div className="step-audio-block" key={block.id}>
              {block.title && <strong>{block.title}</strong>}
              <audio controls preload="metadata">
                <source src={mp3Url} type="audio/mpeg" />
                <source src={mediaAudioUrl(block.code, 'ogg')} type="audio/ogg" />
              </audio>
              <a href={mp3Url} download>Скачать MP3</a>
            </div>
          );
        }

        const value = answers[block.name];
        const values = Array.isArray(value) ? value : [];
        const controlDisabled = readOnly;

        return (
          <fieldset className="step-question-block" key={block.id}>
            <legend>
              {block.label}
              {!block.required && <span>Необязательное поле</span>}
            </legend>
            {block.fieldType === 'radio' || block.fieldType === 'checkbox' ? (
              <div className="step-choice-list">
                {(block.choices || []).map((choice) => {
                  const checked = block.fieldType === 'checkbox' ? values.includes(choice.value) : value === choice.value;
                  return (
                    <label className={`step-choice${checked ? ' selected' : ''}`} key={choice.value}>
                      <input
                        type={block.fieldType}
                        name={block.name}
                        value={choice.value}
                        checked={checked}
                        disabled={controlDisabled}
                        onChange={() => {
                          if (block.fieldType === 'checkbox') toggleCheckbox(block.name, choice.value);
                          else updateAnswer(block.name, choice.value);
                        }}
                      />
                      <span>{choice.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : block.fieldType === 'textarea' ? (
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => updateAnswer(block.name, event.target.value)}
                rows={4}
                disabled={controlDisabled}
              />
            ) : (
              <input
                type="text"
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => updateAnswer(block.name, event.target.value)}
                disabled={controlDisabled}
              />
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
