import type { IconSvgElement } from "@hugeicons/react";
import {
  Activity01Icon,
  AiMagicIcon,
  Alert02Icon,
  AnalyticsUpIcon,
  CheckListIcon,
  Clock01Icon,
  HelpCircleIcon,
  Invoice01Icon,
  MagicWand01Icon,
  Notification03Icon,
  Pdf02Icon,
  Store01Icon,
  Sun03Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserRemove01Icon,
  HeartCheckIcon,
} from "@hugeicons/core-free-icons";

export interface QuickAction {
  label: string;
  prompt: string;
  icon: IconSvgElement;
  /** Screen-specific chip (purple accent). */
  context?: boolean;
}

/** Chips offered on every screen (Angular `generalActions`). */
const generalActions: QuickAction[] = [
  {
    label: "Daily briefing",
    prompt: "Give me my daily briefing — what needs my attention today?",
    icon: Sun03Icon,
  },
  {
    label: "Cycle health check",
    prompt:
      "Run a cycle health check: combine fill rate, blocked plans, over-budget programs, " +
      "the review backlog and unassigned jobs into one triage list ranked by urgency, " +
      "with a suggested next step for each item.",
    icon: HeartCheckIcon,
  },
  {
    label: "What's unusual?",
    prompt:
      "Compare this cycle to the previous one and tell me only what is unusual or " +
      "off-trend — skip anything that looks normal.",
    icon: AnalyticsUpIcon,
  },
  {
    label: "Fix unassigned jobs",
    prompt:
      "Find the unassigned jobs for this cycle and propose rep assignments based on " +
      "current workload. Let me confirm before applying anything.",
    icon: UserAdd01Icon,
  },
  {
    label: "My reminders",
    prompt: "What reminders do I have pending?",
    icon: Notification03Icon,
  },
  {
    label: "Explain this screen",
    prompt: "Explain what I'm looking at and suggest next steps.",
    icon: HelpCircleIcon,
  },
  {
    label: "Export PDF & email",
    prompt: "Export the blocked plans for this cycle to PDF and email it to me.",
    icon: Pdf02Icon,
  },
];

/** Screen-specific chips keyed by pathname (Angular `contextualActions`). */
const contextualActions: Record<string, QuickAction[]> = {
  "/command_center": [
    {
      label: "Top risks now",
      prompt:
        "Looking at the command center, what are the top 3 risks right now and what " +
        "should I do about each?",
      icon: Alert02Icon,
    },
  ],
  "/operations": [
    {
      label: "Unassigned here",
      prompt:
        "Filter this Operations page to the unassigned jobs for this cycle and run the search.",
      icon: UserRemove01Icon,
    },
    {
      label: "Overloaded reps",
      prompt:
        "Which reps are overloaded this cycle, and which of their jobs could be reassigned?",
      icon: UserGroupIcon,
    },
  ],
  "/review": [
    {
      label: "Triage the queue",
      prompt:
        "Triage the review queue — group the pending jobs by issue type and tell me " +
        "which to review first.",
      icon: CheckListIcon,
    },
    {
      label: "Oldest pending",
      prompt: "Filter this page to the oldest pending reviews and run the search.",
      icon: Clock01Icon,
    },
  ],
  "/plan": [
    {
      label: "Why blocked?",
      prompt:
        "Which plans in this cycle are blocked or not ready, why, and what would unblock each?",
      icon: AiMagicIcon,
    },
    {
      label: "Fill the gaps",
      prompt: "Where are the gaps in this plan? Propose how to fill them.",
      icon: MagicWand01Icon,
    },
  ],
  "/itinerary": [
    {
      label: "Reps behind",
      prompt: "Which reps are behind on their itineraries this cycle?",
      icon: Activity01Icon,
    },
    {
      label: "Nudge late reps",
      prompt:
        "Draft reminders for the reps who are behind on their itineraries and let me " +
        "confirm before sending.",
      icon: Notification03Icon,
    },
  ],
  "/stores": [
    {
      label: "Uncovered stores",
      prompt: "Which stores have no jobs planned for this cycle?",
      icon: Store01Icon,
    },
  ],
  "/customer_invoices": [
    {
      label: "Stuck drafts",
      prompt:
        "Find customer invoices stuck in draft and propose whether to finalize or void each one.",
      icon: Invoice01Icon,
    },
  ],
  "/user_invoicing": [
    {
      label: "Rep invoice check",
      prompt:
        "Check the rep invoices for this cycle — flag anything missing, duplicated or off-trend.",
      icon: Invoice01Icon,
    },
  ],
};

/** Contextual chips for the current route first, then general ones. */
export function getQuickActions(pathname: string): QuickAction[] {
  const route = (pathname || "/").split("?")[0];
  const contextual = (contextualActions[route] ?? []).map((a) => ({
    ...a,
    context: true,
  }));
  return [...contextual, ...generalActions];
}
