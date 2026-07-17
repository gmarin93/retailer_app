"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Alert02Icon,
  MultiplicationSignCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

/** Top-center toasts with Angular notification tokens (success #1bc28a, etc.). */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />,
        error: (
          <HugeiconsIcon
            icon={MultiplicationSignCircleIcon}
            strokeWidth={2}
            className="size-4"
          />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
          "--success-bg": "#e7f8f1",
          "--success-text": "#0f172a",
          "--success-border": "#1bc28a",
          "--error-bg": "#ffe9e6",
          "--error-text": "#0f172a",
          "--error-border": "#f04438",
          "--warning-bg": "#fff3df",
          "--warning-text": "#0f172a",
          "--warning-border": "#ff9b1f",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-[0_12px_30px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.05)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
