import clsx from "clsx";
import { FC, useCallback, useState } from "react";
import { RenderedText } from "../../content/RenderedText";
import { MessageContents } from "./MessageContents";
import { PlanningTurn } from "./messages";
import {
  extractOneLiner,
  extractVerifierOutcome,
  splitReasoningContent,
  VerifierOutcome,
} from "./planning-utils";
import styles from "./PlanningTimeline.module.css";

/* ─── Outcome maps ─── */

const outcomeLabel: Record<VerifierOutcome, string> = {
  accept: "ACCEPT",
  reject: "REJECT",
  refine: "REFINE",
  unknown: "UNKNOWN",
};

const outcomeStyle: Record<VerifierOutcome, string> = {
  accept: styles.outcomeAccept,
  reject: styles.outcomeReject,
  refine: styles.outcomeRefine,
  unknown: styles.outcomeUnknown,
};

/* ─── TimelineTurnCard ─── */

const TimelineTurnCard: FC<{
  id: string;
  turn: PlanningTurn;
  isVerifier: boolean;
}> = ({ id, turn, isVerifier }) => {
  const [open, setOpen] = useState(true);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const toggleInstruction = useCallback(
    () => setInstructionOpen((v) => !v),
    [],
  );

  const roleBadgeClass = isVerifier ? styles.roleVerifier : styles.rolePlanner;
  const roleText = isVerifier ? "VERIFIER" : "PLANNER";
  const dotClass = isVerifier ? styles.verifierDot : styles.plannerDot;

  const oneLiner = turn.assistantResponse
    ? extractOneLiner(turn.assistantResponse.content)
    : "";

  const outcome =
    isVerifier && turn.assistantResponse
      ? extractVerifierOutcome(turn.assistantResponse.content)
      : null;

  const { reasoning, hasRest, restContent } = turn.assistantResponse
    ? splitReasoningContent(turn.assistantResponse.content)
    : { reasoning: [], hasRest: false, restContent: undefined };

  return (
    <div
      className={clsx(
        styles.turnEntry,
        dotClass,
        isVerifier && styles.verifierIndent,
      )}
    >
      <div className={styles.turnHeader} onClick={toggle}>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)}>
          &#9654;
        </span>
        <span className={clsx(styles.roleBadge, roleBadgeClass)}>
          {roleText}
        </span>
        <span className={styles.turnLabel}>Turn {turn.turnNumber}</span>
        <span className={styles.oneLiner}>{oneLiner}</span>
        {outcome && (
          <span className={clsx(styles.outcomeBadge, outcomeStyle[outcome])}>
            {outcomeLabel[outcome]}
          </span>
        )}
      </div>
      {open && (
        <div className={styles.turnBody}>
          {turn.userInstruction && (
            <div className={styles.instructionSection}>
              <div
                className={styles.instructionHeader}
                onClick={toggleInstruction}
              >
                <span
                  className={clsx(
                    styles.chevron,
                    instructionOpen && styles.chevronOpen,
                  )}
                >
                  &#9654;
                </span>
                <span className={styles.instructionLabel}>
                  {isVerifier ? "Verifier Prompt" : "Planner Prompt"}
                </span>
              </div>
              {instructionOpen && (
                <div className={styles.instructionBody}>
                  <MessageContents
                    id={`${id}-turn-${turn.turnNumber}-user`}
                    message={turn.userInstruction}
                    toolMessages={[]}
                    toolCallStyle="complete"
                  />
                </div>
              )}
            </div>
          )}

          {reasoning.length > 0 && (
            <div className={styles.reasoningSection}>
              <div className={styles.reasoningLabel}>Reasoning</div>
              {reasoning.map((r, i) => (
                <div key={`reasoning-${i}`} className={styles.reasoningBlock}>
                  <RenderedText markdown={r.reasoning || r.summary || ""} />
                </div>
              ))}
            </div>
          )}

          {turn.assistantResponse && hasRest && (
            <div className={styles.responseSection}>
              <MessageContents
                id={`${id}-turn-${turn.turnNumber}-asst`}
                message={{
                  ...turn.assistantResponse,
                  content: restContent as typeof turn.assistantResponse.content,
                }}
                toolMessages={[]}
                toolCallStyle="complete"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── PlanningTimeline ─── */

interface PlanningTimelineProps {
  id: string;
  turns: PlanningTurn[];
}

export const PlanningTimeline: FC<PlanningTimelineProps> = ({ id, turns }) => {
  if (turns.length === 0) {
    return (
      <div className={styles.emptyTimeline}>No planning turns to display.</div>
    );
  }

  return (
    <div className={styles.timeline}>
      {turns.map((turn) => (
        <TimelineTurnCard
          key={`${id}-timeline-turn-${turn.turnNumber}`}
          id={id}
          turn={turn}
          isVerifier={turn.role === "verifier"}
        />
      ))}
    </div>
  );
};
