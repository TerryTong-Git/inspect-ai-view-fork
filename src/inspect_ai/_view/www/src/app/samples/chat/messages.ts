import {
  ChatMessageAssistant,
  ChatMessageSystem,
  ChatMessageTool,
  ChatMessageUser,
  ContentAudio,
  ContentData,
  ContentDocument,
  ContentImage,
  ContentReasoning,
  ContentText,
  ContentToolUse,
  ContentVideo,
  Events,
  Messages,
} from "../../../@types/log";
import { ApplicationIcons } from "../../appearance/icons";

export interface ResolvedMessage {
  message:
    | ChatMessageAssistant
    | ChatMessageSystem
    | ChatMessageUser
    | ChatMessageTool;
  toolMessages: ChatMessageTool[];
}

export const resolveMessages = (messages: Messages) => {
  // Filter tool messages into a sidelist that the chat stream
  // can use to lookup the tool responses

  const resolvedMessages: ResolvedMessage[] = [];
  let index = 0;
  for (const message of messages) {
    if (message.role === "tool") {
      // Add this tool message onto the previous message
      if (resolvedMessages.length > 0) {
        const msg = resolvedMessages[resolvedMessages.length - 1];

        msg.toolMessages = msg.toolMessages || [];
        msg.toolMessages.push(message);
      }
    } else {
      resolvedMessages.push({ message, toolMessages: [] });
    }

    // Create a stable id for the item, if it doesn't have one
    if (message.id === undefined) {
      message.id = `msg-${index}`;
    }
    index++;
  }

  // Capture system messages (there could be multiple)
  const systemMessages: ChatMessageSystem[] = [];
  const collapsedMessages = resolvedMessages
    .map((resolved) => {
      if (resolved.message.role === "system") {
        systemMessages.push(resolved.message);
      }
      return resolved;
    })
    .filter((resolved) => {
      return resolved.message.role !== "system";
    });

  // Collapse system messages
  const systemContent: (
    | ContentText
    | ContentImage
    | ContentAudio
    | ContentVideo
    | ContentDocument
    | ContentReasoning
    | ContentData
    | ContentToolUse
  )[] = [];
  for (const systemMessage of systemMessages) {
    const contents = Array.isArray(systemMessage.content)
      ? systemMessage.content
      : [systemMessage.content];
    systemContent.push(...contents.map(normalizeContent));
  }

  const systemMessage: ChatMessageSystem = {
    id: "sys-message-6815A84B062A",
    role: "system",
    content: systemContent,
    source: "input",
    metadata: null,
  };

  // Converge them
  if (systemMessage && systemMessage.content.length > 0) {
    collapsedMessages.unshift({ message: systemMessage, toolMessages: [] });
  }
  return collapsedMessages;
};

export const iconForMsg = (
  msg:
    | ChatMessageAssistant
    | ChatMessageSystem
    | ChatMessageUser
    | ChatMessageTool,
) => {
  if (msg.role === "user") {
    return ApplicationIcons.role.user;
  } else if (msg.role === "system") {
    return ApplicationIcons.role.system;
  } else if (msg.role === "tool") {
    return ApplicationIcons.role.tool;
  } else if (msg.role === "assistant") {
    return ApplicationIcons.role.assistant;
  } else {
    return ApplicationIcons.role.unknown;
  }
};

/**
 * Normalize strings
 */
const normalizeContent = (
  content:
    | ContentText
    | ContentImage
    | ContentAudio
    | ContentVideo
    | ContentDocument
    | ContentReasoning
    | ContentData
    | ContentToolUse
    | string,
):
  | ContentText
  | ContentImage
  | ContentAudio
  | ContentVideo
  | ContentDocument
  | ContentReasoning
  | ContentData
  | ContentToolUse => {
  if (typeof content === "string") {
    return {
      type: "text",
      text: content,
      refusal: null,
      internal: null,
      citations: null,
    };
  } else {
    return content;
  }
};

export const getSuspicionScore = (
  message:
    | ChatMessageAssistant
    | ChatMessageSystem
    | ChatMessageUser
    | ChatMessageTool,
): number | null => {
  if (message.metadata && typeof message.metadata === "object") {
    const score = (message.metadata as Record<string, unknown>)[
      "suspicion_score"
    ];
    if (typeof score === "number") return score;
  }
  return null;
};

export const sortMessagesBySuspicion = (
  messages: ResolvedMessage[],
  descending: boolean = true,
): ResolvedMessage[] => {
  return [...messages].sort((a, b) => {
    const scoreA = getSuspicionScore(a.message);
    const scoreB = getSuspicionScore(b.message);
    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1;
    if (scoreB === null) return -1;
    return descending ? scoreB - scoreA : scoreA - scoreB;
  });
};

export type PlanningRole = "strategy" | "planner" | "verifier";

export interface PlanningTurn {
  turnNumber: number;
  role: PlanningRole;
  systemPrompt: ChatMessageSystem | null;
  userInstruction: ChatMessageUser | null;
  assistantResponse: ChatMessageAssistant | null;
}

export interface PlanningData {
  sharedSystemPrompt: ChatMessageSystem | null;
  taskInstruction: ChatMessageUser | null;
  turns: PlanningTurn[];
  executionMessages: Messages;
}

export const getMetadataField = (
  message:
    | ChatMessageAssistant
    | ChatMessageSystem
    | ChatMessageUser
    | ChatMessageTool,
  field: string,
): unknown => {
  if (message.metadata && typeof message.metadata === "object") {
    return (message.metadata as Record<string, unknown>)[field];
  }
  return undefined;
};

export const hasPlanningMessages = (messages: Messages): boolean => {
  return messages.some((m) => getMetadataField(m, "_is_planning") === true);
};

export interface PlanningRoleCounts {
  planner: number;
  verifier: number;
  strategy: number;
  total: number;
}

export const countPlanningRoles = (messages: Messages): PlanningRoleCounts => {
  let planner = 0,
    verifier = 0,
    strategy = 0;
  for (const msg of messages) {
    if (getMetadataField(msg, "_is_planning") !== true) continue;
    // Only count assistant responses (not user instructions) for accurate turn counting
    if (msg.role !== "assistant") continue;
    const role = getMetadataField(msg, "_planning_role");
    if (role === "planner") planner++;
    else if (role === "verifier") verifier++;
    else if (role === "strategy") strategy++;
    else planner++; // default fallback
  }
  return { planner, verifier, strategy, total: planner + verifier + strategy };
};

export const getExecutionOnlyMessages = (messages: Messages): Messages => {
  return messages.filter(
    (msg) => getMetadataField(msg, "_is_planning") !== true,
  );
};

export const extractPlanningTurns = (messages: Messages): PlanningData => {
  const turns: PlanningTurn[] = [];
  const executionMessages: Messages = [];
  let sharedSystemPrompt: ChatMessageSystem | null = null;
  let taskInstruction: ChatMessageUser | null = null;
  let foundFirstPlanningMsg = false;

  const resolvePlanningRole = (
    msg:
      | ChatMessageAssistant
      | ChatMessageSystem
      | ChatMessageUser
      | ChatMessageTool,
  ): PlanningRole => {
    const planningRole = getMetadataField(msg, "_planning_role");
    if (
      planningRole === "strategy" ||
      planningRole === "planner" ||
      planningRole === "verifier"
    ) {
      return planningRole;
    }
    return "planner";
  };

  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    const isPlanning = getMetadataField(msg, "_is_planning") === true;

    if (isPlanning) {
      if (!foundFirstPlanningMsg) {
        foundFirstPlanningMsg = true;
        // Capture the system prompt and task instruction that precede planning.
        // Walk backwards from current position to find them.
        for (let j = i - 1; j >= 0; j--) {
          const prev = messages[j];
          if (prev.role === "user" && !taskInstruction) {
            taskInstruction = prev as ChatMessageUser;
          } else if (prev.role === "system" && !sharedSystemPrompt) {
            sharedSystemPrompt = prev as ChatMessageSystem;
          }
        }
        // Remove captured messages from executionMessages
        if (taskInstruction) {
          const idx = executionMessages.indexOf(taskInstruction);
          if (idx !== -1) executionMessages.splice(idx, 1);
        }
        if (sharedSystemPrompt) {
          const idx = executionMessages.indexOf(sharedSystemPrompt);
          if (idx !== -1) executionMessages.splice(idx, 1);
        }
      }

      // Collect planning user → assistant pair
      if (msg.role === "user") {
        const role = resolvePlanningRole(msg);
        let assistantResponse: ChatMessageAssistant | null = null;
        i++;
        if (
          i < messages.length &&
          messages[i].role === "assistant" &&
          getMetadataField(messages[i], "_is_planning") === true
        ) {
          assistantResponse = messages[i] as ChatMessageAssistant;
          i++;
        }
        turns.push({
          turnNumber: turns.length,
          role,
          systemPrompt: null,
          userInstruction: msg as ChatMessageUser,
          assistantResponse,
        });
      } else if (msg.role === "assistant") {
        // Standalone planning assistant (e.g., older format with only assistant marked)
        turns.push({
          turnNumber: turns.length,
          role: resolvePlanningRole(msg),
          systemPrompt: null,
          userInstruction: null,
          assistantResponse: msg as ChatMessageAssistant,
        });
        i++;
      } else {
        // System or tool with planning flag — skip into execution
        executionMessages.push(msg);
        i++;
      }
    } else {
      // Non-planning messages between planning turns are separator fillers
      // (e.g., "Please proceed...") — skip them if we're in the planning phase
      if (
        foundFirstPlanningMsg &&
        msg.role === "user" &&
        i + 1 < messages.length &&
        getMetadataField(messages[i + 1], "_is_planning") === true
      ) {
        // This is a separator between planning turns — skip it
        i++;
        continue;
      }
      executionMessages.push(msg);
      i++;
    }
  }

  return { sharedSystemPrompt, taskInstruction, turns, executionMessages };
};

export const messagesFromEvents = (runningEvents: Events): Messages => {
  const modelEvents = runningEvents.filter((e) => e.event === "model");
  if (modelEvents.length === 0) {
    return [];
  }

  const latestTopLevelModelEvent =
    [...modelEvents].reverse().find((e) => e.role === "untrusted") ??
    modelEvents[modelEvents.length - 1];
  const latestTopLevelIndex = runningEvents.lastIndexOf(latestTopLevelModelEvent);

  const messages: Map<
    string,
    ChatMessageSystem | ChatMessageUser | ChatMessageAssistant | ChatMessageTool
  > = new Map();

  const appendMessage = (
    message:
      | ChatMessageSystem
      | ChatMessageUser
      | ChatMessageAssistant
      | ChatMessageTool,
    key: string,
  ) => {
    if (!messages.has(key)) {
      messages.set(key, message);
    }
  };

  latestTopLevelModelEvent.input.forEach((m, inputIndex) => {
    const inputMessage = m as
      | ChatMessageSystem
      | ChatMessageUser
      | ChatMessageAssistant
      | ChatMessageTool;
    const key =
      inputMessage.id ??
      `${latestTopLevelIndex}:input:${inputIndex}:${inputMessage.role}`;
    appendMessage(inputMessage, key);
  });

  (latestTopLevelModelEvent.output.choices || []).forEach((choice, choiceIndex) => {
    const outputMessage = choice.message;
    const key =
      outputMessage.id ??
      `${latestTopLevelIndex}:output:${choiceIndex}:${outputMessage.role}`;
    appendMessage(outputMessage, key);
  });

  // If the agent is currently between model calls, append any later tool results
  // so the live Messages tab reflects the latest visible conversation state.
  runningEvents.slice(latestTopLevelIndex + 1).forEach((event, offset) => {
    if (event.event !== "tool" || !event.message_id) {
      return;
    }

    const toolContent =
      typeof event.error?.message === "string"
        ? event.error.message
        : typeof event.result === "string"
          ? event.result
          : JSON.stringify(event.result);

    const toolMessage: ChatMessageTool = {
      id: event.message_id,
      role: "tool",
      content: toolContent,
      source: "input",
      metadata: event.metadata,
      tool_call_id: event.id,
      function: event.function,
      error: event.error,
    };
    appendMessage(toolMessage, toolMessage.id ?? `${latestTopLevelIndex}:tool:${offset}`);
  });

  if (messages.size > 0) {
    return Array.from(messages.values());
  } else {
    return [];
  }
};
