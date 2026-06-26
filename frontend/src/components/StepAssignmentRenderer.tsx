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
    if (!isFieldBlock(block) || !branchVisible(block.branch, level)) return;
    const value = answers[block.name];
    if (Array.isArray(value)) {
      if (value.length) payload[block.name] = value;
    } else if (value?.trim()) {
      payload[block.name] = value.trim();
    }
  });
  return payload;
}

export default function StepAssignmentRenderer({
  blocks,
  fallbackContent,
  initialPayload,
  readOnly = false,
  onPayloadChange,
}: StepAssignmentRendererProps) {
  const assignmentBlocks = useMemo(() => Array.isArray(blocks) ? blocks : [], [blocks]);
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
          return <p className="step-assignment-paragraph" key={block.id}>{block.text}</p>;
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
          return (
            <div className="step-audio-block" key={block.id}>
              <a href={block.code} target="_blank" rel="noreferrer">Открыть аудио</a>
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
