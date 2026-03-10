import { FC } from "react";
import { Card, CardBody, CardHeader } from "../../../components/Card";
import styles from "./FinalIclCard.module.css";

interface FinalIclCardProps {
  /** The concatenated planner visible outputs (final ICL demo text) */
  iclText: string;
}

/**
 * Renders the final ICL demonstration text as a formatted card.
 *
 * Shows the actual text that gets injected into the execution system prompt.
 * Returns null when iclText is empty/undefined.
 */
export const FinalIclCard: FC<FinalIclCardProps> = ({ iclText }) => {
  if (!iclText || !iclText.trim()) {
    return null;
  }

  const charCount = iclText.length;

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.headerRow}>
        <span>Final ICL Output</span>
        <span className={styles.injectedBadge}>Injected into Execution</span>
        <span className={styles.charCount}>
          {charCount.toLocaleString()} chars
        </span>
      </CardHeader>
      <CardBody>
        <div className={styles.iclContent}>{iclText}</div>
      </CardBody>
    </Card>
  );
};
