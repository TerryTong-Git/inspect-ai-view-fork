import { FC, ReactElement } from "react";
import {
  ChatMessageAssistant,
  ChatMessageSystem,
  ChatMessageTool,
  ChatMessageUser,
} from "../../../@types/log";
import { NavPills } from "../../../components/NavPills.tsx";
import { Buckets, ContentRenderer } from "../../content/types.ts";
import { ChatView } from "./ChatView";
import { hasPlanningMessages, getExecutionOnlyMessages } from "./messages";
import { PlanningView } from "./PlanningView";

/**
 * Renders chat messages as a ChatView component.
 * Conditionally adds Planning and Execution tabs when planning metadata is present.
 */
export const ChatMessageRenderer: ContentRenderer = {
  bucket: Buckets.first,
  canRender: (entry) => {
    const val = entry.value;
    return (
      Array.isArray(val) &&
      val.length > 0 &&
      val[0]?.role !== undefined &&
      val[0]?.content !== undefined
    );
  },
  render: (id, entry) => {
    const showPlanning = hasPlanningMessages(entry.value);
    const pills: ReactElement<{ title: string; [key: string]: unknown }>[] = [
      <ChatSummary
        key="last-turn"
        title="Last Turn"
        id={id}
        messages={entry.value}
      />,
    ];
    if (showPlanning) {
      const executionMessages = getExecutionOnlyMessages(entry.value);
      pills.push(
        <PlanningView
          key="planning"
          title="Planning"
          id={id}
          messages={entry.value}
        />,
        <ChatView
          key="execution"
          title="Execution"
          id={id}
          messages={executionMessages}
        />,
      );
    }
    pills.push(
      <ChatView
        key="all"
        title="All"
        id={id}
        messages={entry.value}
        allowLinking={false}
      />,
    );
    return {
      rendered: <NavPills id={`${id}-navpills`}>{pills}</NavPills>,
    };
  },
};

/**
 * Represents a chat summary component that renders a list of chat messages.
 */
export const ChatSummary: FC<{
  id: string;
  title?: string;
  messages: (
    | ChatMessageAssistant
    | ChatMessageUser
    | ChatMessageSystem
    | ChatMessageTool
  )[];
}> = ({ id, messages }) => {
  // Show the last 'turn'
  const summaryMessages = [];
  for (const message of messages.slice().reverse()) {
    summaryMessages.unshift(message);
    if (message.role === "user") {
      break;
    }
  }

  return <ChatView id={id} messages={summaryMessages} />;
};
