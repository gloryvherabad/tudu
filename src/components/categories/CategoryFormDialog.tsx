"use client";

import { useEffect, useId, useState } from "react";
import { Check, Pipette } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { CATEGORY_COLORS, PRESET_COLORS, isHexColor } from "@/lib/categories";
import type { Category, CategoryColor } from "@/lib/types";


/** Create a category, or rename / recolor an existing one. */
export function CategoryFormDialog({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = create a new category */
  category: Category | null;
  onClose: () => void;
  /** Returns an error message to show, or null on success. */
  onSave: (name: string, color: CategoryColor) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<CategoryColor>("blue");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? "blue");
    setError(null);
  }, [open, category]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the category a name.");
      return;
    }
    setSaving(true);
    const err = await onSave(trimmed, color);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {category ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor={nameId} className="block text-label text-text-secondary">
          Name
        </label>
        <input
          id={nameId}
          autoFocus
          value={name}
          maxLength={50}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          className="mt-1 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-body focus:border-primary focus:outline-none aria-invalid:border-error"
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-secondary text-error">
            {error}
          </p>
        )}

        <p className="mt-4 text-label text-text-secondary" id={`${nameId}-color`}>
          Color
        </p>
        <div role="radiogroup" aria-labelledby={`${nameId}-color`} className="mt-2 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={CATEGORY_COLORS[c].label}
              onClick={() => setColor(c)}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full border",
                color === c ? "border-primary" : "border-transparent hover:border-border-strong",
              )}
            >
              <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-text", CATEGORY_COLORS[c].dot)}>
                {color === c && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              </span>
            </button>
          ))}

          {/* Any color: opens the device's color picker. */}
          <label
            className={cn(
              "relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-primary",
              isHexColor(color) ? "border-primary" : "border-transparent hover:border-border-strong",
            )}
            title="Pick any color"
          >
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full ring-1 ring-inset ring-border-strong",
                isHexColor(color) ? (lightOn(color) ? "text-text" : "text-on-primary") : "bg-surface text-text-secondary",
              )}
              style={isHexColor(color) ? { backgroundColor: color } : undefined}
            >
              {isHexColor(color) ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              ) : (
                <Pipette className="size-3.5" aria-hidden />
              )}
            </span>
            <input
              type="color"
              role="radio"
              aria-checked={isHexColor(color)}
              aria-label={isHexColor(color) ? `Custom color ${color.toUpperCase()}` : "Pick any color"}
              value={isHexColor(color) ? color : "#a3c4f3"}
              onChange={(e) => setColor(e.target.value as CategoryColor)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        {isHexColor(color) && (
          <p className="mt-2 text-secondary text-text-secondary">Custom color {color.toUpperCase()}</p>
        )}
      </form>
    </Dialog>
  );
}

/** True when dark text reads well on this color. */
function lightOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 0.5;
}
