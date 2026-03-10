import { JsonChange } from "../../@types/log";
import { EvalSample, Events, StoreEvent } from "../../@types/log";

export interface LiveTaskStatus {
  mainTaskCompleted: boolean | null;
  sideTaskCompleted: boolean | null;
  scorerSuccess: boolean | null;
  updatedAtStep: number | null;
  requestedAtStep: number | null;
  evaluating: boolean | null;
  evaluatingStartedAt: number | null;
  mainTaskEvalCount: number | null;
  sideTaskEvalCount: number | null;
  errorMessage: string | null;
}

const kShadeArenaTaskStatusKey = "ShadeArenaTaskStatus:instance";

interface RawTaskStatus {
  main_task_completed?: boolean | null;
  side_task_completed?: boolean | null;
  scorer_success?: boolean | null;
  updated_at_step?: number | null;
  requested_at_step?: number | null;
  evaluating?: boolean | null;
  evaluating_started_at?: number | null;
  main_task_eval_count?: number | null;
  side_task_eval_count?: number | null;
  error_message?: string | null;
}

function isStoreEvent(event: Events[number]): event is StoreEvent {
  return event.event === "store";
}

function statusFromRaw(raw: RawTaskStatus | undefined): LiveTaskStatus | null {
  if (!raw) {
    return null;
  }
  return {
    mainTaskCompleted: raw.main_task_completed ?? null,
    sideTaskCompleted: raw.side_task_completed ?? null,
    scorerSuccess: raw.scorer_success ?? null,
    updatedAtStep:
      typeof raw.updated_at_step === "number" ? raw.updated_at_step : null,
    requestedAtStep:
      typeof raw.requested_at_step === "number" ? raw.requested_at_step : null,
    evaluating: typeof raw.evaluating === "boolean" ? raw.evaluating : null,
    evaluatingStartedAt:
      typeof raw.evaluating_started_at === "number"
        ? raw.evaluating_started_at
        : null,
    mainTaskEvalCount:
      typeof raw.main_task_eval_count === "number"
        ? raw.main_task_eval_count
        : null,
    sideTaskEvalCount:
      typeof raw.side_task_eval_count === "number"
        ? raw.side_task_eval_count
        : null,
    errorMessage: raw.error_message ?? null,
  };
}

export function liveTaskStatusFromStore(
  store: EvalSample["store"] | Record<string, unknown> | null | undefined,
): LiveTaskStatus | null {
  if (!store) {
    return null;
  }
  return statusFromRaw(store[kShadeArenaTaskStatusKey] as RawTaskStatus | undefined);
}

export function liveTaskStatusFromEvents(
  events: Events | undefined,
): LiveTaskStatus | null {
  if (!events || events.length === 0) {
    return null;
  }

  const raw: RawTaskStatus = {};
  let sawTaskStatusChange = false;

  for (const event of events) {
    if (!isStoreEvent(event)) {
      continue;
    }
    for (const change of event.changes) {
      sawTaskStatusChange = applyTaskStatusChange(raw, change) || sawTaskStatusChange;
    }
  }

  if (!sawTaskStatusChange) {
    return null;
  }

  return statusFromRaw(raw);
}

function applyTaskStatusChange(raw: RawTaskStatus, change: JsonChange): boolean {
  const match = change.path.match(/^\/ShadeArenaTaskStatus:([^/]+)$/);
  if (!match) {
    return false;
  }

  const field = match[1];
  const value = change.op === "remove" ? null : change.value;

  switch (field) {
    case "main_task_completed":
      raw.main_task_completed = value as boolean | null;
      return true;
    case "side_task_completed":
      raw.side_task_completed = value as boolean | null;
      return true;
    case "scorer_success":
      raw.scorer_success = value as boolean | null;
      return true;
    case "updated_at_step":
      raw.updated_at_step = value as number | null;
      return true;
    case "requested_at_step":
      raw.requested_at_step = value as number | null;
      return true;
    case "evaluating":
      raw.evaluating = value as boolean | null;
      return true;
    case "evaluating_started_at":
      raw.evaluating_started_at = value as number | null;
      return true;
    case "main_task_eval_count":
      raw.main_task_eval_count = value as number | null;
      return true;
    case "side_task_eval_count":
      raw.side_task_eval_count = value as number | null;
      return true;
    case "error_message":
      raw.error_message = value as string | null;
      return true;
    default:
      return false;
  }
}
