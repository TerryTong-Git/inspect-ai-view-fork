import clsx from "clsx";
import { FC, useCallback, useState } from "react";
import { RenderedText } from "../../content/RenderedText";
import styles from "./MonitorCard.module.css";

interface MonitorCardProps {
  score: number;
  reason: string;
}

/**
 * Indented card showing the monitor's suspicion evaluation.
 * Color-coded border: green (<=0.3), yellow (<=0.6), red (>0.6).
 * Reason text is collapsible, collapsed by default.
 */
export const MonitorCard: FC<MonitorCardProps> = ({ score, reason }) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const tier = score <= 0.3 ? "green" : score <= 0.6 ? "yellow" : "red";

  return (
    <div className={clsx(styles.card, styles[tier])}>
      <div className={styles.header} onClick={toggle}>
        <span className={clsx(styles.badge, styles[`badge_${tier}`])}>
          MONITOR {score.toFixed(2)}
        </span>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)}>
          &#9654;
        </span>
      </div>
      {open && (
        <div className={styles.body}>
          <RenderedText markdown={reason} />
        </div>
      )}
    </div>
  );
};
