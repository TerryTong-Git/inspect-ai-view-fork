import { FC, ReactElement, RefObject } from "react";
import { Messages } from "../../../@types/log";
import { NavPills } from "../../../components/NavPills";
import { ChatViewVirtualList } from "./ChatViewVirtualList";
import { PlanningView } from "./PlanningView";
import { ScoreTimeline } from "./ScoreTimeline";
import styles from "./MessagesNavPills.module.css";

/* ─── MessagesWithSidebar ─── */

interface MessagesWithSidebarProps {
  id: string;
  title?: string;
  messages: Messages;
  initialMessageId?: string | null;
  topOffset?: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  running?: boolean;
  sortBySuspicion?: boolean;
}

/**
 * Messages list with ScoreTimeline sidebar.
 * Used as a NavPill child — needs a `title` prop for NavPills.
 */
export const MessagesWithSidebar: FC<MessagesWithSidebarProps> = ({
  id,
  messages,
  initialMessageId,
  topOffset,
  scrollRef,
  running,
  sortBySuspicion,
}) => {
  return (
    <div className={styles.withSidebar}>
      <ScoreTimeline messages={messages} />
      <div className={styles.content}>
        <ChatViewVirtualList
          key={id}
          id={id}
          messages={messages}
          initialMessageId={initialMessageId}
          topOffset={topOffset}
          indented={true}
          scrollRef={scrollRef}
          toolCallStyle="complete"
          running={running}
          sortBySuspicion={sortBySuspicion}
        />
      </div>
    </div>
  );
};

/* ─── MessagesNavPills ─── */

interface MessagesNavPillsProps {
  id: string;
  sampleMessages: Messages;
  executionMessages: Messages;
  initialMessageId?: string | null;
  topOffset?: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  running?: boolean;
  sortBySuspicion?: boolean;
}

/**
 * NavPills wrapper for the Messages tab when planning messages exist.
 * Tabs: Planning | Execution | All
 */
export const MessagesNavPills: FC<MessagesNavPillsProps> = ({
  id,
  sampleMessages,
  executionMessages,
  initialMessageId,
  topOffset,
  scrollRef,
  running,
  sortBySuspicion,
}) => {
  const pills: ReactElement<{ title: string; [key: string]: unknown }>[] = [
    <PlanningView
      key="planning"
      title="Planning"
      id={`${id}-planning`}
      messages={sampleMessages}
    />,
    <MessagesWithSidebar
      key="execution"
      title="Execution"
      id={`${id}-exec`}
      messages={executionMessages}
      initialMessageId={initialMessageId}
      topOffset={topOffset}
      scrollRef={scrollRef}
      running={running}
      sortBySuspicion={sortBySuspicion}
    />,
    <MessagesWithSidebar
      key="all"
      title="All"
      id={`${id}-all`}
      messages={sampleMessages}
      initialMessageId={initialMessageId}
      topOffset={topOffset}
      scrollRef={scrollRef}
      running={running}
      sortBySuspicion={sortBySuspicion}
    />,
  ];

  return <NavPills id={`${id}-navpills`}>{pills}</NavPills>;
};
