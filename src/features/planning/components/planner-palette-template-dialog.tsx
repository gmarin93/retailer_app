"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { PhotoPaletteTemplate, QuestionPaletteTemplate } from "../palette-types";
import { QUESTION_REQUEST_KIND_OPTIONS, type QuestionRequestKind } from "../types";

type Mode = "photo" | "question";

interface PlannerPaletteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSave: (template: PhotoPaletteTemplate | QuestionPaletteTemplate) => void;
}

export function PlannerPaletteTemplateDialog({
  open,
  onOpenChange,
  mode,
  onSave,
}: PlannerPaletteTemplateDialogProps) {
  const [label, setLabel] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(true);
  const [kind, setKind] = useState<QuestionRequestKind>("text");
  const [data, setData] = useState("");

  const needsData =
    mode === "question" &&
    (kind === "checklist" || kind === "multiple_choice" || kind === "number");

  function reset() {
    setLabel("");
    setSubtitle("");
    setDescription("");
    setRequired(true);
    setKind("text");
    setData("");
  }

  function handleSave() {
    const trimmedLabel = label.trim();
    const trimmedSubtitle = subtitle.trim();
    if (!trimmedLabel || !trimmedSubtitle) return;

    const id = `${mode}-custom-${Date.now()}`;
    if (mode === "photo") {
      onSave({
        id,
        label: trimmedLabel.slice(0, 80),
        subtitle: trimmedSubtitle.slice(0, 120),
        description: description.trim().slice(0, 500),
        required,
        icon: "photo_camera",
        custom: true,
      });
    } else {
      onSave({
        id,
        label: trimmedLabel.slice(0, 80),
        subtitle: trimmedSubtitle.slice(0, 120),
        description: description.trim().slice(0, 500),
        kind,
        required,
        data: needsData ? data : "",
        icon: "short_text",
        custom: true,
      });
    }
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "photo" ? "Add photo type" : "Add question type"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="palette-label">Label</Label>
            <Input
              id="palette-label"
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palette-subtitle">Subtitle</Label>
            <Input
              id="palette-subtitle"
              value={subtitle}
              maxLength={120}
              onChange={(event) => setSubtitle(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palette-description">Description</Label>
            <Input
              id="palette-description"
              value={description}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {mode === "question" && (
            <>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as QuestionRequestKind)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_REQUEST_KIND_OPTIONS.map(([value, optionLabel]) => (
                      <SelectItem key={value} value={value}>
                        {optionLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsData && (
                <div className="space-y-1.5">
                  <Label htmlFor="palette-data">
                    {kind === "number"
                      ? "Min,max"
                      : kind === "checklist"
                        ? "Items (comma-separated)"
                        : "Choices (comma-separated)"}
                  </Label>
                  <Input
                    id="palette-data"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                  />
                </div>
              )}
            </>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
            />
            Required
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!label.trim() || !subtitle.trim()}
            onClick={handleSave}
          >
            Save type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
