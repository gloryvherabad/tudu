"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Project } from "@/lib/types";

/** Create a project, or rename one. */
export function ProjectFormDialog({
  open,
  project,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = create a new project */
  project: Project | null;
  onClose: () => void;
  /** Returns an error message to show, or null on success. */
  onSave: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setError(null);
  }, [open, project]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the project a name.");
      return;
    }
    setSaving(true);
    const err = await onSave(trimmed);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Rename project" : "New project"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {project ? "Save changes" : "Create project"}
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
          Project name
        </label>
        <input
          id={nameId}
          autoFocus
          value={name}
          maxLength={100}
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
      </form>
    </Dialog>
  );
}
