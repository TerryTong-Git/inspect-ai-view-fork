import clsx from "clsx";
import { FC, useCallback, useState } from "react";
import { Messages } from "../../../@types/log";
import { RenderedText } from "../../content/RenderedText";
import { Collapsible } from "./Collapsible";
import { FinalIclCard } from "./FinalIclCard";
import { MessageContents } from "./MessageContents";
import { extractPlanningTurns, PlanningData, PlanningTurn } from "./messages";
import {
  extractFinalIclText,
  getTextContent,
  splitReasoningContent,
} from "./planning-utils";
import { PlanningTimeline } from "./PlanningTimeline";
import styles from "./PlanningView.module.css";
import { SystemPromptSections } from "./SystemPromptSections";

/* ─── Pipeline Summary ─── */

const PipelineSummary: FC<{ data: PlanningData }> = ({ data }) => {
  const totalTurns = data.turns.length;
  const plannerCount = data.turns.filter((t) => t.role === "planner").length;
  const verifierCount = data.turns.filter((t) => t.role === "verifier").length;
  const strategyCount = data.turns.filter((t) => t.role === "strategy").length;

  return (
    <div className={styles.summary}>
      <div className={styles.summaryTitle}>Planning Pipeline</div>
      <div className={styles.summaryStats}>
        <span className={styles.statItem}>
          <strong>{totalTurns}</strong> turns
        </span>
        {strategyCount > 0 && (
          <span className={clsx(styles.statItem, styles.statStrategy)}>
            {strategyCount} strategy
          </span>
        )}
        <span className={clsx(styles.statItem, styles.statPlanner)}>
          {plannerCount} planner
        </span>
        <span className={clsx(styles.statItem, styles.statVerifier)}>
          {verifierCount} verifier
        </span>
      </div>
    </div>
  );
};

/* ─── Strategy Card ─── */

const StrategyCard: FC<{ id: string; turn: PlanningTurn }> = ({ id, turn }) => {
  const [open, setOpen] = useState(true);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const toggleInstruction = useCallback(
    () => setInstructionOpen((v) => !v),
    [],
  );

  const { reasoning, hasRest, restContent } = turn.assistantResponse
    ? splitReasoningContent(turn.assistantResponse.content)
    : { reasoning: [], hasRest: false, restContent: undefined };

  return (
    <div className={styles.strategyCard}>
      <div className={styles.strategyHeader} onClick={toggle}>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)}>
          &#9654;
        </span>
        <span className={clsx(styles.roleBadge, styles.roleStrategy)}>
          STRATEGY
        </span>
        <span className={styles.strategyLabel}>
          Turn {turn.turnNumber} — Attack Strategy
        </span>
      </div>
      {open && (
        <div className={styles.strategyBody}>
          {turn.userInstruction && (
            <div className={styles.strategyInstruction}>
              <div
                className={styles.strategyInstructionHeader}
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
                <span>Strategy Prompt</span>
              </div>
              {instructionOpen && (
                <div className={styles.strategyInstructionBody}>
                  <MessageContents
                    id={`${id}-strategy-${turn.turnNumber}-user`}
                    message={turn.userInstruction}
                    toolMessages={[]}
                    toolCallStyle="complete"
                  />
                </div>
              )}
            </div>
          )}

          {reasoning.length > 0 && (
            <div className={styles.strategyReasoning}>
              <div className={styles.reasoningLabel}>Reasoning</div>
              {reasoning.map((r, i) => (
                <div
                  key={`strategy-reasoning-${i}`}
                  className={styles.reasoningBlock}
                >
                  <RenderedText markdown={r.reasoning || r.summary || ""} />
                </div>
              ))}
            </div>
          )}

          {turn.assistantResponse && hasRest && (
            <div className={styles.strategyResponse}>
              <MessageContents
                id={`${id}-strategy-${turn.turnNumber}-asst`}
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

/* ─── PlanningView ─── */

interface PlanningViewProps {
  id: string;
  title?: string;
  messages: Messages;
}

export const PlanningView: FC<PlanningViewProps> = ({ id, messages }) => {
  const data = extractPlanningTurns(messages);
  const { sharedSystemPrompt, taskInstruction, turns } = data;

  const strategyTurns = turns.filter((t) => t.role === "strategy");
  const timelineTurns = turns.filter((t) => t.role !== "strategy");

  const systemPromptText = sharedSystemPrompt
    ? getTextContent(sharedSystemPrompt.content)
    : "";

  const finalIclText = extractFinalIclText(timelineTurns);

  return (
    <div className={styles.container}>
      <PipelineSummary data={data} />

      {systemPromptText && (
        <SystemPromptSections
          promptText={systemPromptText}
          label="System Prompt"
          defaultOpen={false}
          charCount={systemPromptText.length}
        />
      )}

      {taskInstruction && (
        <Collapsible label="Task Instruction" defaultOpen={false}>
          <MessageContents
            id={`${id}-task-instruction`}
            message={taskInstruction}
            toolMessages={[]}
            toolCallStyle="complete"
          />
        </Collapsible>
      )}

      {strategyTurns.map((turn) => (
        <StrategyCard
          key={`${id}-strategy-${turn.turnNumber}`}
          id={id}
          turn={turn}
        />
      ))}

      {timelineTurns.length > 0 && (
        <>
          <div className={styles.iclHeader}>
            ICL Demo Generation
            <span className={styles.turnCount}>
              {timelineTurns.length}{" "}
              {timelineTurns.length === 1 ? "turn" : "turns"}
            </span>
          </div>
          <PlanningTimeline id={id} turns={timelineTurns} />
        </>
      )}

      <FinalIclCard iclText={finalIclText} />
    </div>
  );
};
