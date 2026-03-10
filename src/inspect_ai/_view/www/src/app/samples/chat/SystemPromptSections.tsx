import clsx from "clsx";
import { FC, useCallback, useState } from "react";
import { Collapsible } from "./Collapsible";
import styles from "./SystemPromptSections.module.css";

/** A parsed section of a system prompt */
interface PromptSection {
  label: string;
  content: string;
  defaultOpen: boolean;
  versionTag?: string;
}

/**
 * Parse a raw system prompt into labeled sections.
 *
 * Section markers:
 *   - ROLE: / Identity block
 *   - REASONING APPROACH / Reasoning Framework
 *   - ICL demonstrations (between reasoning and attack prompt)
 *   - OPERATIONAL SPECIFICATIONS: / ### Side Task
 *   - SETTING: / ### Setting Description
 *   - EXECUTION APPROACH: / ### General Instructions
 *
 * Falls back to a single "Full Prompt" section when no markers detected.
 */
export function parseSystemPrompt(text: string): PromptSection[] {
  if (!text || !text.trim()) {
    return [];
  }

  const sections: PromptSection[] = [];
  let remaining = text;
  let foundAny = false;

  // 1. Identity / Role block
  const roleMatch = remaining.match(
    /^(ROLE:\s*[\s\S]*?)(?=\n\n[A-Z]|\nREASONING APPROACH|\nOPERATIONAL SPECIFICATIONS:|\nSETTING:|\nEXECUTION APPROACH:)/,
  );
  if (roleMatch) {
    sections.push({
      label: "Identity",
      content: roleMatch[1].trim(),
      defaultOpen: false,
    });
    remaining = remaining.slice(roleMatch[0].length).trim();
    foundAny = true;
  }

  // 2. Reasoning Framework
  const reasoningIdx = remaining.indexOf("REASONING APPROACH");
  if (reasoningIdx !== -1) {
    const afterReasoning = remaining.slice(reasoningIdx);
    const nextSectionMatch = afterReasoning.match(
      /\n(?:OPERATIONAL SPECIFICATIONS:|SETTING:|EXECUTION APPROACH:|### Side Task|### Setting Description|### General Instructions|You are completing)/,
    );

    let reasoningEnd: number;
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      reasoningEnd = reasoningIdx + nextSectionMatch.index;
    } else {
      reasoningEnd = remaining.length;
    }

    const reasoningContent = remaining.slice(reasoningIdx, reasoningEnd);

    // Check for ICL demo markers
    const iclMarkers = [
      "--- Demonstration",
      "<think>",
      "Example demonstration",
      "Turn 1:",
      "## Scenario:",
    ];
    const iclIdx = iclMarkers.reduce((earliest, marker) => {
      const idx = reasoningContent.indexOf(marker);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) return idx;
      return earliest;
    }, -1);

    if (iclIdx !== -1 && iclIdx > 50) {
      sections.push({
        label: "Reasoning Framework",
        content: reasoningContent.slice(0, iclIdx).trim(),
        defaultOpen: false,
      });
      sections.push({
        label: "ICL Demonstrations",
        content: reasoningContent.slice(iclIdx).trim(),
        defaultOpen: false,
      });
    } else {
      sections.push({
        label: "Reasoning Framework",
        content: reasoningContent.trim(),
        defaultOpen: false,
      });
    }

    if (reasoningIdx > 0 && !roleMatch) {
      const preamble = remaining.slice(0, reasoningIdx).trim();
      if (preamble.length > 10) {
        sections.unshift({
          label: "Preamble",
          content: preamble,
          defaultOpen: false,
        });
      }
    }

    remaining = remaining.slice(reasoningEnd).trim();
    foundAny = true;
  }

  // 3. Attack prompt preamble
  const preambleMatch = remaining.match(
    /^(You are completing[\s\S]*?)(?=\nOPERATIONAL SPECIFICATIONS:|\n### Side Task)/,
  );
  if (preambleMatch) {
    remaining = remaining.trim();
  }

  // 4. Side Task
  const sideTaskPatterns = [
    /OPERATIONAL SPECIFICATIONS:\s*/,
    /### Side Task\s*/,
  ];
  for (const pattern of sideTaskPatterns) {
    const match = remaining.match(pattern);
    if (match && match.index !== undefined) {
      const afterMarker = remaining.slice(match.index + match[0].length);
      const nextMatch = afterMarker.match(
        /\n(?:SETTING:|### Setting Description|EXECUTION APPROACH:|### General Instructions)/,
      );

      let sectionContent: string;
      let consumeEnd: number;
      if (nextMatch && nextMatch.index !== undefined) {
        sectionContent = afterMarker.slice(0, nextMatch.index).trim();
        consumeEnd = match.index + match[0].length + nextMatch.index;
      } else {
        sectionContent = afterMarker.trim();
        consumeEnd = remaining.length;
      }

      if (match.index > 0) {
        const pre = remaining.slice(0, match.index).trim();
        if (pre.length > 10) {
          sections.push({
            label: "Attack Prompt Preamble",
            content: pre,
            defaultOpen: true,
          });
        }
      }

      sections.push({
        label: "Side Task",
        content: sectionContent,
        defaultOpen: true,
      });

      remaining = remaining.slice(consumeEnd).trim();
      foundAny = true;
      break;
    }
  }

  // 5. Setting Description
  const settingPatterns = [/SETTING:\s*/, /### Setting Description\s*/];
  for (const pattern of settingPatterns) {
    const match = remaining.match(pattern);
    if (match && match.index !== undefined) {
      const afterMarker = remaining.slice(match.index + match[0].length);
      const nextMatch = afterMarker.match(
        /\n(?:EXECUTION APPROACH:|### General Instructions)/,
      );

      let sectionContent: string;
      let consumeEnd: number;
      if (nextMatch && nextMatch.index !== undefined) {
        sectionContent = afterMarker.slice(0, nextMatch.index).trim();
        consumeEnd = match.index + match[0].length + nextMatch.index;
      } else {
        sectionContent = afterMarker.trim();
        consumeEnd = remaining.length;
      }

      sections.push({
        label: "Setting Description",
        content: sectionContent,
        defaultOpen: true,
      });

      remaining = remaining.slice(consumeEnd).trim();
      foundAny = true;
      break;
    }
  }

  // 6. Attack Prompt / General Instructions
  const attackPatterns = [
    /EXECUTION APPROACH:\s*/,
    /### General Instructions\s*/,
  ];
  for (const pattern of attackPatterns) {
    const match = remaining.match(pattern);
    if (match && match.index !== undefined) {
      const content = remaining.slice(match.index + match[0].length).trim();

      const versionMatch = content.match(/\bv(\d+)\b/i);
      let finalVersionTag = versionMatch ? `v${versionMatch[1]}` : undefined;
      if (!finalVersionTag) {
        const preContent = remaining.slice(0, match.index);
        const preVersionMatch = preContent.match(/\bv(\d+)\b/i);
        if (preVersionMatch) {
          finalVersionTag = `v${preVersionMatch[1]}`;
        }
      }

      sections.push({
        label: "Attack Prompt",
        content: content,
        defaultOpen: true,
        versionTag: finalVersionTag,
      });

      remaining = "";
      foundAny = true;
      break;
    }
  }

  if (remaining.trim().length > 10 && foundAny) {
    sections.push({
      label: "Additional Content",
      content: remaining.trim(),
      defaultOpen: false,
    });
  }

  if (!foundAny) {
    return [
      {
        label: "Full Prompt",
        content: text.trim(),
        defaultOpen: false,
      },
    ];
  }

  return sections;
}

/* ─── SystemPromptSections ─── */

interface SystemPromptSectionsProps {
  promptText: string;
  label?: string;
  defaultOpen?: boolean;
  charCount?: number;
}

export const SystemPromptSections: FC<SystemPromptSectionsProps> = ({
  promptText,
  label = "System Prompt",
  defaultOpen = false,
  charCount,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const sections = parseSystemPrompt(promptText);

  if (sections.length === 0) return null;

  const displayCharCount = charCount ?? promptText.length;

  return (
    <div className={styles.container}>
      <div className={styles.outerWrapper}>
        <div className={styles.outerHeader} onClick={toggle}>
          <span className={clsx(styles.chevron, open && styles.chevronOpen)}>
            &#9654;
          </span>
          <span>{label}</span>
          <span className={styles.charCount}>
            {displayCharCount.toLocaleString()} chars
          </span>
        </div>
        {open && (
          <div className={styles.outerBody}>
            {sections.map((section, i) => (
              <Collapsible
                key={`${section.label}-${i}`}
                label={section.label}
                defaultOpen={section.defaultOpen}
                badge={
                  section.versionTag ? (
                    <span className={styles.versionBadge}>
                      {section.versionTag}
                    </span>
                  ) : undefined
                }
              >
                <div className={styles.promptContent}>{section.content}</div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
