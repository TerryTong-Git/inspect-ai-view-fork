import clsx from "clsx";
import { FC, ReactNode, useCallback, useState } from "react";
import styles from "./Collapsible.module.css";

interface CollapsibleProps {
  label: string;
  defaultOpen: boolean;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Shared collapsible section with chevron toggle.
 * Used by PlanningView, SystemPromptSections, PlanningTimeline.
 */
export const Collapsible: FC<CollapsibleProps> = ({
  label,
  defaultOpen,
  badge,
  className,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <div className={clsx(styles.section, className)}>
      <div className={styles.header} onClick={toggle}>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)}>
          &#9654;
        </span>
        <span className={styles.label}>{label}</span>
        {badge}
      </div>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  );
};
