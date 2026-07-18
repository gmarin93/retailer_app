"use client";

import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export interface VisitAccordionStep {
  id: string;
  title: string;
  icon: IconSvgElement;
  content: ReactNode;
}

interface VisitAccordionProps {
  steps: VisitAccordionStep[];
  activeStep: number;
  onStepChange: (step: number) => void;
}

/**
 * Single-expand accordion matching Angular itinerary `mat-accordion` steps
 * (Documents → Questions → Photos → Submit) with Next/Back navigation.
 */
export function VisitAccordion({ steps, activeStep, onStepChange }: VisitAccordionProps) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const expanded = activeStep === stepNumber;
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-expanded={expanded}
              onClick={() => onStepChange(expanded ? 0 : stepNumber)}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <HugeiconsIcon icon={step.icon} className="size-5" aria-hidden="true" />
              </span>
              <h4 className="min-w-0 flex-1 text-base font-semibold text-foreground">
                {step.title}
              </h4>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {expanded ? (
              <div className="border-t border-border">
                <div className="max-h-[480px] overflow-y-auto px-4 py-4">{step.content}</div>
                <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                  {!isFirst ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onStepChange(stepNumber - 1)}
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft01Icon}
                        className="size-3.5"
                        data-icon="inline-start"
                      />
                      Back
                    </Button>
                  ) : null}
                  {!isLast ? (
                    <Button type="button" size="sm" onClick={() => onStepChange(stepNumber + 1)}>
                      Next
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="size-3.5"
                        data-icon="inline-end"
                      />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
