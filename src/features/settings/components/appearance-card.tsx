"use client";

import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { useResolvedTheme } from "@/shared/providers/theme-provider";
import { cn } from "@/shared/lib/utils";
import type { ThemePreference } from "@/shared/lib/theme";
import { useThemeStore } from "@/stores/theme-store";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  description: string;
  icon: IconSvgElement;
}

const OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces with brand accents",
    icon: Sun03Icon,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Layered charcoal surfaces for low light",
    icon: Moon02Icon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your operating system setting",
    icon: ComputerIcon,
  },
];

function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-16 overflow-hidden rounded-lg border",
        isDark ? "border-white/10 bg-[#121722]" : "border-black/10 bg-[#f4f6fb]",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1/3 border-r",
          isDark
            ? "border-white/10 bg-[linear-gradient(180deg,#1a2030_0%,#151a26_100%)]"
            : "border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)]",
        )}
      />
      <div className="absolute top-2.5 right-2.5 left-[38%] space-y-1.5">
        <div
          className={cn(
            "h-2 w-3/4 rounded-full",
            isDark ? "bg-[#6b86ff]/80" : "bg-[#4c6fff]",
          )}
        />
        <div
          className={cn(
            "h-2 w-1/2 rounded-full",
            isDark ? "bg-white/15" : "bg-black/10",
          )}
        />
        <div
          className={cn(
            "mt-2 h-6 rounded-md border",
            isDark ? "border-white/10 bg-[#1c2333]" : "border-black/5 bg-white",
          )}
        />
      </div>
    </div>
  );
}

/** Settings card for choosing light, dark, or system theme. */
export function AppearanceCard() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const resolved = useResolvedTheme();

  return (
    <section
      aria-labelledby="appearance-heading"
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Sun03Icon} className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="appearance-heading" className="text-sm font-semibold">
            Appearance
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose how Powerhouse looks. Your preference is saved on this device.
            {preference === "system" ? (
              <>
                {" "}
                Currently following the system (
                <span className="font-medium text-foreground">{resolved}</span>
                ).
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="appearance-heading"
        className="grid gap-3 pt-4 sm:grid-cols-3"
      >
        {OPTIONS.map((option) => {
          const selected = preference === option.value;
          const previewMode =
            option.value === "system" ? resolved : option.value === "dark" ? "dark" : "light";

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(option.value)}
              className={cn(
                "group flex flex-col gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                "hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary-soft shadow-[0_0_0_1px_var(--primary)]"
                  : "border-border bg-background/60",
              )}
            >
              <ThemePreview mode={previewMode} />
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:text-primary",
                  )}
                >
                  <HugeiconsIcon icon={option.icon} className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {option.label}
                    {selected ? (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase">
                        Active
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
