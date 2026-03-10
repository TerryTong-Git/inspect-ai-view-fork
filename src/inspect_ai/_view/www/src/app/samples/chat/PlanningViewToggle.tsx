import clsx from "clsx";
import { FC } from "react";

import styles from "./PlanningViewToggle.module.css";

export type PlanningViewMode = "planning" | "execution" | "all";

interface PlanningViewToggleProps {
  mode: PlanningViewMode;
  setMode: (mode: PlanningViewMode) => void;
  plannerCount: number;
  verifierCount: number;
  strategyCount: number;
}

export const PlanningViewToggle: FC<PlanningViewToggleProps> = ({
  mode,
  setMode,
  plannerCount,
  verifierCount,
  strategyCount: _strategyCount,
}) => {
  // strategyCount reserved for future use (Plan 03 will display strategy turns)
  void _strategyCount;
  return (
    <div className={styles.toggleBar}>
      <button
        className={clsx(styles.toggleBtn, mode === "planning" && styles.active)}
        onClick={() => setMode("planning")}
      >
        Planning ({plannerCount}P / {verifierCount}V)
      </button>
      <button
        className={clsx(
          styles.toggleBtn,
          mode === "execution" && styles.active,
        )}
        onClick={() => setMode("execution")}
      >
        Execution
      </button>
      <button
        className={clsx(styles.toggleBtn, mode === "all" && styles.active)}
        onClick={() => setMode("all")}
      >
        All
      </button>
    </div>
  );
};
