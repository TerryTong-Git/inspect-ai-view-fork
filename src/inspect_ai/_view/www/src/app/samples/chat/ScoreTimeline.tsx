import clsx from "clsx";
import { FC, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Messages } from "../../../@types/log";
import { getMetadataField, getSuspicionScore } from "./messages";
import styles from "./ScoreTimeline.module.css";

interface TurnEntry {
  msgId: string; // message ID for DOM lookup
  score: number | null;
  label: string;
}

interface ScoreTimelineProps {
  messages: Messages;
  onJumpTo?: (messageIndex: number) => void;
}

/**
 * Sidebar timeline showing assistant turns with suspicion score dots.
 * Clicking a dot scrolls to that message in the chat view.
 */
export const ScoreTimeline: FC<ScoreTimelineProps> = ({
  messages,
  onJumpTo,
}) => {
  const [, setSearchParams] = useSearchParams();

  // Extract assistant turns with scores, assign IDs if missing
  const turns = useMemo(() => {
    const entries: TurnEntry[] = [];
    let assistantCount = 0;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // Assign ID if missing (matches resolveMessages behavior)
      if (msg.id === undefined) {
        msg.id = `msg-${i}`;
      }
      if (msg.role !== "assistant") continue;

      const isPlanning = getMetadataField(msg, "_is_planning") === true;
      if (isPlanning) continue; // skip planning turns

      assistantCount++;
      const score = getSuspicionScore(msg);
      entries.push({
        msgId: msg.id || `msg-${i}`,
        score,
        label: `T${assistantCount}`,
      });
    }
    return entries;
  }, [messages]);

  const handleClick = useCallback(
    (msgId: string, index: number) => {
      if (onJumpTo) {
        onJumpTo(index);
        return;
      }
      // DOM-based scrolling using message ID
      const el = document.querySelector(`[data-msg-id="${msgId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // For virtualized message lists, target rows may not be mounted yet.
      // Updating the existing deep-link param lets the list scroll by ID.
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("message", msgId);
          return next;
        },
        { replace: true },
      );
    },
    [onJumpTo, setSearchParams],
  );

  if (turns.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>Turns</div>
      <div className={styles.timeline}>
        {turns.map((turn, idx) => {
          const dotClass = getDotClass(turn.score);
          return (
            <div
              key={idx}
              className={styles.turnEntry}
              onClick={() => handleClick(turn.msgId, idx)}
              title={
                turn.score !== null
                  ? `Turn ${idx + 1} — Score: ${turn.score.toFixed(2)}`
                  : `Turn ${idx + 1}`
              }
            >
              <div className={clsx(styles.dot, dotClass)} />
              <span className={styles.turnLabel}>{turn.label}</span>
              {turn.score !== null && (
                <span className={clsx(styles.scoreLabel, dotClass)}>
                  {turn.score.toFixed(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getDotClass(score: number | null): string {
  if (score === null) return styles.dotNeutral;
  if (score <= 0.3) return styles.dotGreen;
  if (score <= 0.6) return styles.dotYellow;
  return styles.dotRed;
}
