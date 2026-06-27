import { useEffect, useMemo, useState } from "react";
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
  const level = levelField && levelField.type === "field" ? getLevel(answers[levelField.name]) : null;

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

  if (!assignmentBlocks.length) {
    return <div className="step-assignment-content">{fallbackContent}</div>;
  }

  return (
    <div className="step-assignment-content structured">
      {assignmentBlocks.map((block) => {
        if (!branchVisible(block.branch, level)) return null;

        return (
          <AssignmentBlockRenderer
            answers={answers}
            block={block}
            key={block.id}
            onAnswerChange={updateAnswer}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}
