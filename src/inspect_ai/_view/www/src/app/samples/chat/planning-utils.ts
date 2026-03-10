/**
 * Shared utilities for planning pipeline rendering.
 *
 * Extracted from PlanningView and PlanningTimeline to eliminate duplication.
 * These helpers parse content arrays from ChatMessage objects.
 */

import { ContentReasoning } from "../../../@types/log";
import { PlanningTurn } from "./messages";

/* ─── Content extraction ─── */

/** Extract all text (including reasoning) from a message content field. */
export const getTextContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "type" in c) {
          if (c.type === "text" && "text" in c) return c.text;
          if (c.type === "reasoning" && "reasoning" in c) return c.reasoning;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

/** Extract text-only content (no reasoning) for ICL output. */
export const getTextOnlyContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === "string") return c;
        if (
          c &&
          typeof c === "object" &&
          "type" in c &&
          c.type === "text" &&
          "text" in c
        )
          return c.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

/* ─── Reasoning splitting ─── */

export interface SplitContent {
  reasoning: ContentReasoning[];
  hasRest: boolean;
  restContent: unknown;
}

/** Separate ContentReasoning blocks from other content so they can render expanded. */
export function splitReasoningContent(content: unknown): SplitContent {
  if (!Array.isArray(content)) {
    return { reasoning: [], hasRest: true, restContent: content };
  }

  const reasoning: ContentReasoning[] = [];
  const rest: unknown[] = [];

  for (const item of content) {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "reasoning"
    ) {
      reasoning.push(item as ContentReasoning);
    } else {
      rest.push(item);
    }
  }

  return {
    reasoning,
    hasRest: rest.length > 0,
    restContent: rest.length > 0 ? rest : content,
  };
}

/* ─── One-liner extraction ─── */

/** Extract a short summary sentence from content for timeline previews. */
export function extractOneLiner(content: unknown): string {
  const text = getTextContent(content);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("[") ||
      trimmed.startsWith("---")
    )
      continue;
    if (trimmed.startsWith("<think>") || trimmed.startsWith("</think>"))
      continue;
    const firstSentence = trimmed.match(/^[^.!?]+[.!?]/);
    if (firstSentence) return firstSentence[0];
    return trimmed.slice(0, 120) + (trimmed.length > 120 ? "..." : "");
  }
  return text.slice(0, 80) + "...";
}

/* ─── Verifier outcome detection ─── */

export type VerifierOutcome = "accept" | "reject" | "refine" | "unknown";

/** Heuristic detection of verifier accept/reject/refine from response text. */
export function extractVerifierOutcome(content: unknown): VerifierOutcome {
  const text = getTextContent(content).toLowerCase();
  if (
    text.includes("passes all") ||
    text.includes("all checks pass") ||
    text.includes("approved") ||
    text.includes("accepted")
  )
    return "accept";
  if (
    text.includes("fails") ||
    text.includes("critical issue") ||
    text.includes("rejected") ||
    text.includes("rewrite")
  )
    return "reject";
  if (
    text.includes("suggestion") ||
    text.includes("could be improved") ||
    text.includes("minor")
  )
    return "refine";
  return "unknown";
}

/* ─── Final ICL text extraction ─── */

/**
 * Extract the final ICL demo text from planning turns.
 * Uses the last accepted planner turn's assistant response.
 */
export function extractFinalIclText(turns: PlanningTurn[]): string {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role === "verifier" && turn.assistantResponse) {
      const text = getTextContent(turn.assistantResponse.content).toLowerCase();
      const isAccept =
        text.includes("passes all") ||
        text.includes("all checks pass") ||
        text.includes("approved") ||
        text.includes("accepted");
      if (isAccept && i > 0) {
        const prev = turns[i - 1];
        if (prev.role === "planner" && prev.assistantResponse) {
          return getTextOnlyContent(prev.assistantResponse.content);
        }
      }
    }
    if (turn.role === "planner" && turn.assistantResponse) {
      return getTextOnlyContent(turn.assistantResponse.content);
    }
  }
  return "";
}
