import { applyPatch } from "fast-json-patch";
import { EvalSample, Events, StoreEvent } from "../../@types/log";

export interface LiveTaskStatus {
  mainTaskCompleted: boolean | null;
  sideTaskCompleted: boolean | null;
  scorerSuccess: boolean | null;
  updatedAtStep: number | null;
  requestedAtStep: number | null;
  evaluating: boolean | null;
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

  let store: Record<string, unknown> = {};
  let sawStoreEvent = false;

  for (const event of events) {
    if (!isStoreEvent(event)) {
      continue;
    }
    sawStoreEvent = true;
    store = applyPatch(
      structuredClone(store),
      event.changes as Parameters<typeof applyPatch>[1],
    ).newDocument as Record<string, unknown>;
  }

  if (!sawStoreEvent) {
    return null;
  }

  return liveTaskStatusFromStore(store);
}
