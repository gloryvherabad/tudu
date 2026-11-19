"use client";

import { useState } from "react";
import { Ellipsis, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/app-context";
import { CATEGORY_COLORS } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { Habit } from "@/lib/types";
import { HabitFormDialog } from "./HabitFormDialog";

const sortByTitle = (hs: Habit[]) => [...hs].sort((a, b) => a.title.localeCompare(b.title));

/** Manage habits: reusable tasks you can add from the "/" menu when creating a task. */
export function HabitsView() {
  const { supabase, categories, habits, setHabits } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState<Habit | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const saveHabit = async (title: string, category_id: string | null): Promise<string | null> => {
    const req = editing
      ? supabase.from("habits").update({ title, category_id }).eq("id", editing.id).select().single()
      : supabase.from("habits").insert({ title, category_id }).select().single();
    const { data, error } = await req;
    if (error) {
      return error.code === "23505"
        ? "You already have a habit with that name."
        : "Couldn't save the habit. Try again.";
    }
    const saved = data as Habit;
    setHabits(sortByTitle([...habits.filter((h) => h.id !== saved.id), saved]));
    toast({ message: editing ? "Habit updated" : `Created "${saved.title}"` });
    setEditing(undefined);
    return null;
  };

  // Habits grouped under their category, in category order; Uncategorized last. Empty groups are hidden.
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name, dot: CATEGORY_COLORS[c.color].dot, habits: habits.filter((h) => h.category_id === c.id) })),
    {
      id: "none",
      name: "Uncategorized",
      dot: "border border-text-disabled",
      habits: habits.filter((h) => !h.category_id || !categories.some((c) => c.id === h.category_id)),
    },
  ].filter((g) => g.habits.length > 0);

  const deleteHabit = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("habits").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast({ message: "Couldn't delete the habit. Try again.", tone: "error" });
      return;
    }
    setHabits(habits.filter((h) => h.id !== deleting.id));
    toast({ message: `Deleted "${deleting.title}". Tasks you added from it stay.` });
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Habits"
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditing(null)}>
            <Plus className="size-4" aria-hidden />
            New habit
          </Button>
        }
      />

      {habits.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-8" />}
          title="No habits yet"
          description="Save tasks you repeat, like “Walk the dog”. When adding a task, type / and pick one to add it in a tap."
          action={
            <Button variant="primary" onClick={() => setEditing(null)}>
              Create a habit
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-secondary text-text-secondary">
            When adding a task, type / and the first letters of a habit to add it in one step.
          </p>
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`habits-${g.id}`} className="mb-4">
              <h2 id={`habits-${g.id}`} className="flex items-center gap-2 pb-1 text-subheading">
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", g.dot)} />
                <span className="truncate">{g.name}</span>
              </h2>
              <ul>
                {g.habits.map((h) => (
                  <li key={h.id} className="flex min-h-touch items-center gap-3">
                    <Repeat className="size-4 shrink-0 text-text-secondary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-body">{h.title}</span>
                    <Menu
                      items={[
                        { label: "Edit habit", icon: <Pencil className="size-4" />, onSelect: () => setEditing(h) },
                        { label: "Delete habit", icon: <Trash2 className="size-4" />, destructive: true, onSelect: () => setDeleting(h) },
                      ]}
                      trigger={(p) => (
                        <button
                          {...p}
                          type="button"
                          aria-label={`Actions for habit "${h.title}"`}
                          className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-hover hover:text-text"
                        >
                          <Ellipsis className="size-4" aria-hidden />
                        </button>
                      )}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <HabitFormDialog
        open={editing !== undefined}
        habit={editing ?? null}
        categories={categories}
        onClose={() => setEditing(undefined)}
        onSave={saveHabit}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        description="It will no longer show in the / menu. Tasks you already added from it are not deleted."
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" loading={deleteBusy} onClick={deleteHabit}>
              Delete habit
            </Button>
          </>
        }
      />
    </>
  );
}
