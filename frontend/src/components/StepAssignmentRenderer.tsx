import { useEffect, useMemo, useRef, useState } from "react";
import type { AssignmentBlock, SubmissionPayload } from "../api/assignmentMarathon";
import { AssignmentBlockRenderer } from "./assignment/AssignmentBlockRenderer";
import {
  branchVisible,
  composeReport,
  decorateBlocks,
  findLevelField,
  getLevel,
  normalizeInitialPayload,
  payloadFromAnswers,
} from "./assignment/assignmentBlockNormalization";
import type { Answers, AnswerValue } from "./assignment/assignmentRendererTypes";

type StepAssignmentRendererProps = {
  blocks?: AssignmentBlock[] | null;
  fallbackContent?: string;
  initialPayload?: SubmissionPayload;
  readOnly?: boolean;
  onPayloadChange?: (payload: SubmissionPayload, report: string) => void;
};

function assignmentBlockLayoutClass(block: AssignmentBlock) {
  if (block.type !== "field") {
    return "step-assignment-item step-assignment-item--wide";
  }

  const fieldTypeClass = `step-assignment-item--${block.fieldType}`;

  if (block.fieldType === "textarea") {
    return `step-assignment-item step-assignment-item--field step-assignment-item--wide-field ${fieldTypeClass}`;
  }

  if (block.fieldType === "radio" || block.fieldType === "checkbox") {
    return `step-assignment-item step-assignment-item--field step-assignment-item--choice-field ${fieldTypeClass}`;
  }

  return `step-assignment-item step-assignment-item--field step-assignment-item--short-field ${fieldTypeClass}`;
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
  const touchedRef = useRef(false);
  const levelField = findLevelField(assignmentBlocks);
  const level = levelField && levelField.type === "field" ? getLevel(answers[levelField.name]) : null;

  useEffect(() => {
    setAnswers(normalizeInitialPayload(initialPayload));
    setTouched(false);
    touchedRef.current = false;
  }, [assignmentBlocks]);

  useEffect(() => {
    if (touchedRef.current) return;
    setAnswers(normalizeInitialPayload(initialPayload));
  }, [initialPayload]);

  useEffect(() => {
    if (!touched || !onPayloadChange) return;
    onPayloadChange(payloadFromAnswers(assignmentBlocks, answers, level), composeReport(assignmentBlocks, answers, level));
  }, [answers, assignmentBlocks, level, onPayloadChange, touched]);

  const updateAnswer = (name: string, value: AnswerValue) => {
    if (readOnly) return;
    touchedRef.current = true;
    setTouched(true);
    setAnswers((current) => ({ ...current, [name]: value }));
  };

  if (!assignmentBlocks.length) {
    return <div className="step-assignment-content">{fallbackContent}</div>;
  }

  return (
    <div className="step-assignment-content structured">
      {assignmentBlocks.map((block) => {
        if (!branchVisible(block.branch, level)) return null;

        return (
          <div className={assignmentBlockLayoutClass(block)} key={block.id}>
            <AssignmentBlockRenderer
              answers={answers}
              block={block}
              onAnswerChange={updateAnswer}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}
