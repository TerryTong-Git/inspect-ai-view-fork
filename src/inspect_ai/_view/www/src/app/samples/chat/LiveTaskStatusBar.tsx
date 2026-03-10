import { FC, useEffect, useState } from "react";
import { LiveTaskStatus } from "../liveTaskStatus";

interface LiveTaskStatusBarProps {
  status: LiveTaskStatus | null | undefined;
}

const badgeStyle = {
  display: "inline-block",
  padding: "0.2em 0.6em",
  borderRadius: "0.35em",
  fontWeight: 600,
  minWidth: "4.5em",
  textAlign: "center" as const,
};

function renderValue(
  value: boolean | null | undefined,
  pending: boolean,
  elapsedSeconds: number | null,
) {
  let bg = "#f8d7da";
  let fg = "#721c24";
  let label = value === true ? "1.0" : "0.0";

  if (value === true) {
    bg = "#d4edda";
    fg = "#155724";
  }
  if (pending) {
    bg = "#fff3cd";
    fg = "#856404";
    label = `${label} ...`;
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: "0.1em" }}>
      <span style={{ ...badgeStyle, backgroundColor: bg, color: fg }}>{label}</span>
      {pending && elapsedSeconds !== null ? (
        <span style={{ fontSize: "0.75em", color: "#856404", textAlign: "center" }}>
          {elapsedSeconds.toFixed(1)}s
        </span>
      ) : null}
    </span>
  );
}

export const LiveTaskStatusBar: FC<LiveTaskStatusBarProps> = ({ status }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!status?.evaluating) {
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [status?.evaluating]);

  if (!status) {
    return null;
  }

  const pending =
    status.evaluating === true &&
    status.requestedAtStep !== null &&
    status.updatedAtStep !== status.requestedAtStep;
  const elapsedSeconds =
    pending && status.evaluatingStartedAt
      ? Math.max(0, nowMs / 1000 - status.evaluatingStartedAt)
      : null;

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        padding: "0.75rem 1rem 0.25rem 1rem",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.7)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2em" }}>
        <span style={{ fontSize: "0.8em", color: "#666" }}>Main Task</span>
        {renderValue(status.mainTaskCompleted, pending, elapsedSeconds)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2em" }}>
        <span style={{ fontSize: "0.8em", color: "#666" }}>Side Task</span>
        {renderValue(status.sideTaskCompleted, pending, elapsedSeconds)}
      </div>
    </div>
  );
};
