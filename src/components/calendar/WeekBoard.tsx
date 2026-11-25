"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { CATEGORY_COLORS } from "@/lib/categories";
import { addDays, formatDate, isLockedDate, type ISODate } from "@/lib/dates";
import { formatTimeOfDay } from "@/lib/time";
import { useApp } from "@/lib/app-context";
import { TaskCheck } from "@/components/ui/TaskCheck";
import type { Task } from "@/lib/types";
import type { TaskActions } from "@/lib/use-tasks";

/**
 * The whole week side by side: one column per day with its tasks.
 * Tick tasks off right here; click a day's heading to open that day and add or edit tasks.
 */
export function WeekBoard({
  weekStart,
  today,
  tasks,
  actions,
  onOpenDay,
}: {
  weekStart: ISODate;
  today: ISODate;
  tasks: Task[];
  actions: TaskActions;
  onOpenDay: (d: ISODate) => void;
}) {
  const { categories } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="mb-6 grid grid-cols-7 gap-2">
      {days.map((d) => {
        const isToday = d === today;
        const locked = isLockedDate(d, today);
        const list = tasks.filter((t) => t.scheduled_date === d);
        const ordered = [...list.filter((t) => !t.is_completed), ...list.filter((t) => t.is_completed)];
        return (
          <section
            key={d}
            aria-label={formatDate(d, { weekday: "long", day: "numeric", month: "long" })}
            className="group/day min-h-48 min-w-0"
          >
            <button
              type="button"
              onClick={() => onOpenDay(d)}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex w-full min-h-touch flex-col items-center justify-center rounded-md hover:bg-hover",
                d < today ? "text-text-disabled" : "text-text",
              )}
            >
              <span className={cn("text-label uppercase", isToday && "font-semibold")}>
                {formatDate(d, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "inline-flex min-w-6 items-center justify-center rounded-sm px-1 text-body",
                  isToday && "bg-primary font-semibold text-on-primary",
                )}
              >
                {formatDate(d, { day: "numeric" })}
              </span>
            </button>

            <ul className="mt-2 flex flex-col gap-1">
              {ordered.map((t) => {
                const c = categories.find((cat) => cat.id === t.category_id);
                return (
                  <li
                    key={t.id}
                    className={cn("flex items-start gap-1.5 rounded-md p-1.5", c ? CATEGORY_COLORS[c.color].fill : "bg-surface")}
                  >
                    <TaskCheck
                      checked={t.is_completed}
                      onChange={(v) => void actions.update(t, { is_completed: v })}
                      disabled={locked}
                      label={t.title}
                    />
                    <button
                      type="button"
                      onClick={() => onOpenDay(d)}
                      className={cn(
                        "min-w-0 flex-1 text-left text-secondary break-words",
                        t.is_completed ? cn("text-text-disabled", d >= today && "line-through") : "text-text",
                      )}
                    >
                      {t.start_time && <span className="font-medium tabular-nums">{formatTimeOfDay(t.start_time)} </span>}
                      {t.title}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!locked && <AddTask onAdd={(title) => actions.create(title, d)} />}
          </section>
        );
      })}
    </div>
  );
}

/** "Add task" under a day's tasks: shows on hover (always on touch), turns into a field when clicked. */
function AddTask({ onAdd }: { onAdd: (title: string) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const submit = () => {
    const title = value.trim();
    if (title) void onAdd(title);
    setValue("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "mt-1 flex w-full items-center gap-1.5 rounded-md p-1.5 text-secondary text-text-secondary hover:bg-hover hover:text-text",
          "pointer-fine:opacity-0 pointer-fine:group-hover/day:opacity-100 pointer-fine:focus-visible:opacity-100",
        )}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-1"
    >
      <input
        autoFocus
        aria-label="New task"
        value={value}
        maxLength={500}
        placeholder="Task name"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        onBlur={() => {
          submit();
          setOpen(false);
        }}
        className="w-full rounded-md border border-border-strong bg-bg p-1.5 text-secondary focus:border-primary focus:outline-none"
      />
    </form>
  );
}
