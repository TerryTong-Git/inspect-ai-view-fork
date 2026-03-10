import clsx from "clsx";
import { EvalSample, Target, TotalTime, WorkingTime } from "../../@types/log";
import { arrayToString, formatTime, inputString } from "../../utils/format";
import { FlatSampleError } from "./error/FlatSampleErrorView";

import { FC, ReactNode, useEffect, useState } from "react";
import { SampleSummary } from "../../client/api/types";
import { useSampleDescriptor, useSelectedScores } from "../../state/hooks";
import { RenderedText } from "../content/RenderedText";
import { LiveTaskStatus } from "./liveTaskStatus";
import styles from "./SampleSummaryView.module.css";
import { SamplesDescriptor } from "./descriptor/samplesDescriptor";

const kMaxRowTextSize = 1024 * 5;

interface SampleSummaryViewProps {
  parent_id: string;
  sample: SampleSummary | EvalSample;
  maxSuspicionScore?: number | null;
  sampleCompleted?: boolean | null;
  liveTaskStatus?: LiveTaskStatus | null;
}

interface SummaryColumn {
  label: string;
  value: string | ReactNode;
  size: string;
  center?: boolean;
  clamp?: boolean;
  title?: string;
}

interface SampleFields {
  id: string | number;
  input: string[];
  target: Target;
  answer?: string;
  limit?: string;
  retries?: number;
  working_time?: WorkingTime;
  total_time?: TotalTime;
  error?: string;
}

function isEvalSample(
  sample: SampleSummary | EvalSample,
): sample is EvalSample {
  return "store" in sample;
}

const resolveSample = (
  sample: SampleSummary | EvalSample,
  sampleDescriptor: SamplesDescriptor,
): SampleFields => {
  const input = inputString(sample.input);
  if (isEvalSample(sample) && sample.choices && sample.choices.length > 0) {
    input.push("");
    input.push(
      ...sample.choices.map((choice, index) => {
        return `${String.fromCharCode(65 + index)}) ${choice}`;
      }),
    );
  }

  const target = sample.target;
  const answer =
    sample && sampleDescriptor
      ? sampleDescriptor.selectedScorerDescriptor(sample)?.answer()
      : undefined;
  const limit = isEvalSample(sample) ? sample.limit?.type : undefined;
  const working_time = isEvalSample(sample) ? sample.working_time : undefined;
  const total_time = isEvalSample(sample) ? sample.total_time : undefined;
  const error = isEvalSample(sample) ? sample.error?.message : undefined;
  const retries = isEvalSample(sample)
    ? sample.error_retries?.length
    : sample.retries;

  return {
    id: sample.id,
    input,
    target,
    answer,
    limit,
    retries,
    working_time,
    total_time,
    error,
  };
};

/**
 * Component to display a sample with relevant context and visibility control.
 */
export const SampleSummaryView: FC<SampleSummaryViewProps> = ({
  parent_id,
  sample,
  maxSuspicionScore,
  sampleCompleted,
  liveTaskStatus,
}) => {
  const sampleDescriptor = useSampleDescriptor();
  const selectedScores = useSelectedScores();
  const [nowMs, setNowMs] = useState(() => Date.now());
  if (!sampleDescriptor) {
    return undefined;
  }
  const fields = resolveSample(sample, sampleDescriptor);

  useEffect(() => {
    if (!liveTaskStatus?.evaluating) {
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 200);
    return () => window.clearInterval(id);
  }, [liveTaskStatus?.evaluating]);

  const limitSize =
    sampleDescriptor?.messageShape.normalized.limit > 0
      ? Math.max(0.15, sampleDescriptor.messageShape.normalized.limit)
      : 0;
  const retrySize =
    sampleDescriptor?.messageShape.normalized.retries > 0 ? 6 : 0;
  const idSize = Math.max(
    2,
    Math.min(10, sampleDescriptor?.messageShape.raw.id),
  );

  // The columns for the sample
  const columns: SummaryColumn[] = [];
  columns.push({
    label: "Id",
    value: fields.id,
    size: `${idSize}em`,
  });

  columns.push({
    label: "Input",
    value: (
      <RenderedText
        markdown={fields.input.join(" ").slice(0, kMaxRowTextSize)}
      />
    ),
    size: `minmax(auto, 5fr)`,
    clamp: true,
  });

  if (fields.target) {
    columns.push({
      label: "Target",
      value: (
        <RenderedText
          markdown={arrayToString(fields?.target || "none").slice(
            0,
            kMaxRowTextSize,
          )}
          className={clsx("no-last-para-padding", styles.target)}
        />
      ),
      size: `minmax(auto, 3fr)`,
      clamp: true,
    });
  }

  if (fields.answer) {
    columns.push({
      label: "Answer",
      value: sample ? (
        <RenderedText
          markdown={(fields.answer || "").slice(0, kMaxRowTextSize)}
          className={clsx("no-last-para-padding", styles.answer)}
        />
      ) : (
        ""
      ),
      size: `minmax(auto, 5fr)`,
      clamp: true,
    });
  }

  const toolTip = (working_time?: WorkingTime) => {
    if (working_time === undefined || working_time === null) {
      return undefined;
    }
    return `Working time: ${formatTime(working_time)}`;
  };

  if (fields.total_time) {
    columns.push({
      label: "Time",
      value: formatTime(fields.total_time),
      size: `fit-content(10rem)`,
      center: true,
      title: toolTip(fields.working_time),
    });
  }

  if (fields?.limit && limitSize > 0) {
    columns.push({
      label: "Limit",
      value: fields.limit,
      size: `fit-content(10rem)`,
      center: true,
    });
  }

  if (fields?.retries && retrySize > 0) {
    columns.push({
      label: "Retries",
      value: fields.retries,
      size: `fit-content(${retrySize}rem)`,
      center: true,
    });
  }

  const renderStatusBadge = (
    value: boolean | null | undefined,
    title?: string,
    evaluating?: boolean,
    evaluatingStartedAt?: number | null,
  ) => {
    let badgeColor = "#6c757d";
    let badgeBg = "#e9ecef";
    let label = value === true ? "1.0" : "0.0";

    if (value === true) {
      badgeColor = "#155724";
      badgeBg = "#d4edda";
    } else if (value === false || value === null || value === undefined) {
      badgeColor = "#721c24";
      badgeBg = "#f8d7da";
    }

    let elapsed = "";
    if (evaluating && evaluatingStartedAt) {
      badgeColor = "#856404";
      badgeBg = "#fff3cd";
      const elapsedSeconds = Math.max(0, nowMs / 1000 - evaluatingStartedAt);
      label = `${label} ...`;
      elapsed = `${elapsedSeconds.toFixed(1)}s`;
    }

    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.15em 0.5em",
          borderRadius: "0.3em",
          fontWeight: 600,
          color: badgeColor,
          backgroundColor: badgeBg,
          whiteSpace: "nowrap",
        }}
        title={title}
      >
        <span style={{ display: "block" }}>{label}</span>
        {elapsed ? (
          <span
            style={{
              display: "block",
              fontSize: "0.75em",
              fontWeight: 500,
              marginTop: "0.15em",
              opacity: 0.85,
            }}
          >
            {elapsed}
          </span>
        ) : null}
      </span>
    );
  };

  if (sampleCompleted !== null && sampleCompleted !== undefined) {
    columns.push({
      label: "Sample",
      value: renderStatusBadge(
        sampleCompleted,
        "Whether the sample has completed execution.",
      ),
      size: "fit-content(10em)",
      center: true,
    });
  }

  if (liveTaskStatus) {
    const statusPending =
      liveTaskStatus.evaluating === true &&
      liveTaskStatus.requestedAtStep !== null &&
      liveTaskStatus.updatedAtStep !== liveTaskStatus.requestedAtStep;
    columns.push({
      label: "Main Task",
      value: renderStatusBadge(
        statusPending ? null : liveTaskStatus.mainTaskCompleted,
        liveTaskStatus.errorMessage || "Best-effort live main task completion.",
        statusPending,
        liveTaskStatus.evaluatingStartedAt,
      ),
      size: "fit-content(12em)",
      center: true,
    });
    columns.push({
      label: "Side Task",
      value: renderStatusBadge(
        statusPending ? null : liveTaskStatus.sideTaskCompleted,
        liveTaskStatus.errorMessage || "Best-effort live side task completion.",
        statusPending,
        liveTaskStatus.evaluatingStartedAt,
      ),
      size: "fit-content(12em)",
      center: true,
    });
    columns.push({
      label: "MT Evals",
      value: String(liveTaskStatus.mainTaskEvalCount ?? 0),
      size: "fit-content(8em)",
      center: true,
      title: "Number of live main-task evaluations launched.",
    });
    columns.push({
      label: "ST Evals",
      value: String(liveTaskStatus.sideTaskEvalCount ?? 0),
      size: "fit-content(8em)",
      center: true,
      title: "Number of live side-task evaluations launched.",
    });
  }

  if (selectedScores && selectedScores.length > 0) {
    selectedScores.forEach((scoreLabel) => {
      columns.push({
        label: selectedScores.length === 1 ? "Score" : scoreLabel.name,
        value: fields.error ? (
          <FlatSampleError message={fields.error} />
        ) : (
          sampleDescriptor?.evalDescriptor
            .score(sample, scoreLabel)
            ?.render() || ""
        ),
        size: "fit-content(15em)",
        center: true,
      });
    });
  } else {
    columns.push({
      label: "Score",
      value: fields.error ? <FlatSampleError message={fields.error} /> : "",
      size: "fit-content(15em)",
      center: true,
    });
  }

  if (maxSuspicionScore !== null && maxSuspicionScore !== undefined) {
    let badgeColor: string;
    let badgeBg: string;
    if (maxSuspicionScore <= 0.3) {
      badgeColor = "#155724";
      badgeBg = "#d4edda";
    } else if (maxSuspicionScore <= 0.6) {
      badgeColor = "#856404";
      badgeBg = "#fff3cd";
    } else {
      badgeColor = "#721c24";
      badgeBg = "#f8d7da";
    }
    columns.push({
      label: "Max Suspicion",
      value: (
        <span
          style={{
            display: "inline-block",
            padding: "0.15em 0.5em",
            borderRadius: "0.3em",
            fontWeight: 600,
            color: badgeColor,
            backgroundColor: badgeBg,
          }}
          title={`Max per-message suspicion score: ${maxSuspicionScore}`}
        >
          {maxSuspicionScore.toFixed(2)}
        </span>
      ),
      size: "fit-content(10em)",
      center: true,
    });
  }

  return (
    <div
      id={`sample-heading-${parent_id}`}
      className={clsx(styles.grid, "text-size-base")}
      style={{
        gridTemplateColumns: `${columns
          .map((col) => {
            return col.size;
          })
          .join(" ")}`,
      }}
    >
      {columns.map((col, idx) => {
        return (
          <div
            key={`sample-summ-lbl-${idx}`}
            className={clsx(
              "text-style-label",
              "text-style-secondary",
              "text-size-smallest",
              col.title ? styles.titled : undefined,
              col.center ? styles.centerLabel : undefined,
            )}
            title={col.title}
            data-unsearchable={true}
          >
            {col.label}
          </div>
        );
      })}
      {columns.map((col, idx) => {
        return (
          <div
            key={`sample-summ-val-${idx}`}
            className={clsx(
              styles.value,
              styles.wrap,
              col.clamp ? "three-line-clamp" : undefined,
              col.center ? styles.centerValue : undefined,
            )}
            data-unsearchable={true}
          >
            {col.value}
          </div>
        );
      })}
    </div>
  );
};
