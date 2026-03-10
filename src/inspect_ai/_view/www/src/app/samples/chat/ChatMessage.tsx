import clsx from "clsx";
import { FC, memo, useState } from "react";
import {
  ChatMessageAssistant,
  ChatMessageSystem,
  ChatMessageTool,
  ChatMessageUser,
} from "../../../@types/log";
import { CopyButton } from "../../../components/CopyButton";
import ExpandablePanel from "../../../components/ExpandablePanel";
import { LabeledValue } from "../../../components/LabeledValue";
import { ApplicationIcons } from "../../appearance/icons";
import { RecordTree } from "../../content/RecordTree";
import {
  supportsLinking,
  toFullUrl,
  useSampleMessageUrl,
} from "../../routing/url";
import styles from "./ChatMessage.module.css";
import { getMetadataField, getSuspicionScore } from "./messages";
import { MessageContents } from "./MessageContents";
import { MonitorCard } from "./MonitorCard";
import { ChatViewToolCallStyle } from "./types";

interface ChatMessageProps {
  id: string;
  message:
    | ChatMessageAssistant
    | ChatMessageSystem
    | ChatMessageUser
    | ChatMessageTool;
  toolMessages: ChatMessageTool[];
  indented?: boolean;
  toolCallStyle: ChatViewToolCallStyle;
  allowLinking?: boolean;
}

export const ChatMessage: FC<ChatMessageProps> = memo(
  ({
    id,
    message,
    toolMessages,
    indented,
    toolCallStyle,
    allowLinking = true,
  }) => {
    const messageUrl = useSampleMessageUrl(message.id);

    const collapse = message.role === "system" || message.role === "user";

    const [mouseOver, setMouseOver] = useState(false);

    const suspicionScore = getSuspicionScore(message);

    const suspicionBadge = (() => {
      if (suspicionScore === null) return null;
      let color: string;
      let bgColor: string;
      if (suspicionScore <= 0.3) {
        color = "#155724";
        bgColor = "#d4edda";
      } else if (suspicionScore <= 0.6) {
        color = "#856404";
        bgColor = "#fff3cd";
      } else {
        color = "#721c24";
        bgColor = "#f8d7da";
      }
      return (
        <span
          style={{
            display: "inline-block",
            padding: "0.1em 0.45em",
            borderRadius: "0.3em",
            fontSize: "0.8em",
            fontWeight: 600,
            color,
            backgroundColor: bgColor,
            marginLeft: "0.3em",
          }}
          title={`Suspicion score: ${suspicionScore}`}
        >
          {suspicionScore.toFixed(2)}
        </span>
      );
    })();

    return (
      <div
        className={clsx(
          message.role,
          "text-size-base",
          styles.message,
          message.role === "system" ? styles.systemRole : undefined,
          message.role === "user" ? styles.userRole : undefined,
          mouseOver ? styles.hover : undefined,
        )}
        onMouseEnter={() => setMouseOver(true)}
        onMouseLeave={() => setMouseOver(false)}
      >
        <div
          className={clsx(
            styles.messageGrid,
            message.role === "tool" ? styles.toolMessageGrid : undefined,
            "text-style-label",
          )}
        >
          {message.role}
          {message.role === "tool" ? `: ${message.function}` : ""}
          {suspicionBadge}
          {supportsLinking() && messageUrl && allowLinking ? (
            <CopyButton
              icon={ApplicationIcons.link}
              value={toFullUrl(messageUrl)}
              className={clsx(styles.copyLink)}
            />
          ) : (
            ""
          )}
        </div>
        <div
          className={clsx(
            styles.messageContents,
            indented ? styles.indented : undefined,
          )}
        >
          <ExpandablePanel
            id={`${id}-message`}
            collapse={collapse}
            lines={collapse ? 15 : 25}
          >
            <MessageContents
              id={`${id}-contents`}
              key={`${id}-contents`}
              message={message}
              toolMessages={toolMessages}
              toolCallStyle={toolCallStyle}
            />
          </ExpandablePanel>

          {/* Monitor evaluation card (indented under assistant messages) */}
          {message.role === "assistant" &&
            suspicionScore !== null &&
            (() => {
              const reason = getMetadataField(message, "reason");
              return typeof reason === "string" && reason ? (
                <MonitorCard score={suspicionScore} reason={reason} />
              ) : null;
            })()}

          {message.metadata && Object.keys(message.metadata).length > 0 ? (
            <LabeledValue
              label="Metadata"
              className={clsx(styles.metadataLabel, "text-size-smaller")}
            >
              <RecordTree
                record={message.metadata}
                id={`${id}-metadata`}
                defaultExpandLevel={0}
              />
            </LabeledValue>
          ) : (
            ""
          )}
        </div>
      </div>
    );
  },
);
