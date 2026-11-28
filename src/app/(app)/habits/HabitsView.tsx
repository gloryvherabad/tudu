"use client";

import { useRef, useState, type ReactNode } from "react";
import { CalendarPlus, ChevronRight, Ellipsis, Pencil, Plus, Repeat, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/app-context";
import { dotPaint } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { Category, CategoryColor, Habit } from "@/lib/types";
import { HabitFormDialog } from "./HabitFormDialog";

const sortByTitle = (hs: Habit[]) => [...hs].sort((a, b) => a.title.localeCompare(b.title));

/**
 * Manage habits (reusable tasks you can add from the "/" menu) and the
 * categories they, and your tasks, are grouped by.
 */
export function HabitsView() {
  const { supabase, categories, setCategories, habits, setHabits, today } = useApp();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState<Habit | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null | undefined>(undefined); // undefined = closed, null = new
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryDeleteBusy, setCategoryDeleteBusy] = useState(false);

  const saveCategory = async (name: string, color: CategoryColor): Promise<string | null> => {
    const req = editingCategory
      ? supabase.from("categories").update({ name, color }).eq("id", editingCategory.id).select().single()
      : supabase.from("categories").insert({ name, color }).select().single();
    const { data, error } = await req;
    if (error) {
      return error.code === "23505" ? "You already have a category with that name." : error.code === "23514" ? "Custom colors need a one-time database update (migration 0008). Pick a preset for now." : "Couldn't save the category. Try again.";
    }
    const saved = data as Category;
    setCategories([...categories.filter((c) => c.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ message: editingCategory ? "Category updated" : `Created "${saved.name}"` });
    setEditingCategory(undefined);
    return null;
  };

  const deleteCategory = async () => {
    if (!deletingCategory) return;
    const gone = deletingCategory;
    setCategoryDeleteBusy(true);
    const { error } = await supabase.from("categories").delete().eq("id", gone.id);
    setCategoryDeleteBusy(false);
    if (error) {
      toast({ message: "Couldn't delete the category. Try again.", tone: "error" });
      return;
    }
    setCategories(categories.filter((c) => c.id !== gone.id));
    setHabits(habits.map((h) => (h.category_id === gone.id ? { ...h, category_id: null } : h)));
    toast({ message: `Deleted "${gone.name}". Its habits and tasks are now uncategorized.` });
    setDeletingCategory(null);
  };

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

  // Every category with its habits, in name order; Uncategorized last, only when it has habits.
  const groups = [
    ...categories.map((c) => ({
      id: c.id,
      category: c as Category | null,
      name: c.name,
      dot: dotPaint(c.color).className,
      dotStyle: dotPaint(c.color).style,
      habits: habits.filter((h) => h.category_id === c.id),
    })),
    {
      id: "none",
      category: null,
      name: "Uncategorized",
      dot: "border border-text-disabled",
      dotStyle: undefined,
      habits: habits.filter((h) => !h.category_id || !categories.some((c) => c.id === h.category_id)),
    },
  ].filter((g) => g.category || g.habits.length > 0);

  /** Quick add from a category's "Add habit" row. Returns false when it couldn't be saved. */
  const createHabit = async (title: string, category_id: string | null) => {
    const { data, error } = await supabase.from("habits").insert({ title, category_id }).select().single();
    if (error) {
      toast({
        message: error.code === "23505" ? `You already have a habit called "${title}".` : "Couldn't save the habit. Try again.",
        tone: "error",
      });
      return false;
    }
    setHabits(sortByTitle([...habits, data as Habit]));
    return true;
  };

  /** Adds the habit as a task on today's list. */
  const addToToday = async (h: Habit) => {
    const categoryId = h.category_id && categories.some((c) => c.id === h.category_id) ? h.category_id : null;
    const { error } = await supabase
      .from("tasks")
      .insert({ title: h.title, scheduled_date: today, category_id: categoryId });
    if (error) {
      toast({ message: "Couldn't add it to today. Try again.", tone: "error" });
      return;
    }
    toast({ message: `Added "${h.title}" to today`, action: { label: "View", onClick: () => router.push("/today") } });
  };

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
          <>
            <Button size="sm" onClick={() => setEditingCategory(null)}>
              <Tag className="size-4" aria-hidden />
              <span className="max-sm:sr-only">New category</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setEditing(null)}>
              <Plus className="size-4" aria-hidden />
              New habit
            </Button>
          </>
        }
      />

      {habits.length === 0 && categories.length === 0 ? (
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
            <CategorySection
              key={g.id}
              id={g.id}
              heading={
                <>
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", g.dot)} style={g.dotStyle} />
                  <span className="truncate">{g.name}</span>
                  <span className="shrink-0 text-secondary font-normal text-text-secondary">{g.habits.length}</span>
                </>
              }
              menu={
                g.category && (
                  <Menu
                    items={[
                      { label: "Edit name and color", icon: <Pencil className="size-4" />, onSelect: () => setEditingCategory(g.category) },
                      { label: "Delete category", icon: <Trash2 className="size-4" />, destructive: true, onSelect: () => setDeletingCategory(g.category) },
                    ]}
                    trigger={(p) => (
                      <button
                        {...p}
                        type="button"
                        aria-label={`Actions for category "${g.name}"`}
                        className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-hover hover:text-text"
                      >
                        <Ellipsis className="size-4" aria-hidden />
                      </button>
                    )}
                  />
                )
              }
            >
              {g.habits.length === 0 && <p className="py-1.5 text-secondary text-text-secondary">No habits yet</p>}
              <ul>
                {g.habits.map((h) => (
                  <li key={h.id} className="group/habit flex min-h-touch items-center gap-3">
                    <Repeat className="size-4 shrink-0 text-text-secondary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-body">{h.title}</span>
                    <IconButton
                      label="Add to today"
                      icon={<CalendarPlus className="size-4" />}
                      onClick={() => void addToToday(h)}
                      className="pointer-fine:opacity-0 pointer-fine:group-hover/habit:opacity-100 pointer-fine:focus-visible:opacity-100"
                    />
                    <Menu
                      items={[
                        { label: "Add to today", icon: <CalendarPlus className="size-4" />, onSelect: () => void addToToday(h) },
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
              <AddHabit onAdd={(title) => createHabit(title, g.category?.id ?? null)} />
            </CategorySection>
          ))}
        </>
      )}

      <CategoryFormDialog
        open={editingCategory !== undefined}
        category={editingCategory ?? null}
        onClose={() => setEditingCategory(undefined)}
        onSave={saveCategory}
      />

      <Dialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        title={`Delete "${deletingCategory?.name ?? ""}"?`}
        description="Its habits and tasks become uncategorized. Nothing is deleted."
        footer={
          <>
            <Button onClick={() => setDeletingCategory(null)}>Cancel</Button>
            <Button variant="danger" loading={categoryDeleteBusy} onClick={deleteCategory}>
              Delete category
            </Button>
          </>
        }
      />

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

/** "Add habit" at the end of an open category; turns into a field when clicked. */
function AddHabit({ onAdd }: { onAdd: (title: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const submit = async () => {
    const title = value.trim();
    if (!title) return;
    setValue("");
    if (!(await onAdd(title))) setValue(title);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-touch w-full items-center gap-3 rounded-md text-left text-body text-text-secondary hover:text-text",
        )}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        Add habit
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex min-h-touch items-center gap-3"
    >
      <Repeat className="size-4 shrink-0 text-text-secondary" aria-hidden />
      <input
        autoFocus
        aria-label="New habit"
        value={value}
        maxLength={500}
        placeholder="Habit name, then Enter"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        onBlur={() => {
          void submit();
          setOpen(false);
        }}
        className="h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-bg px-2 text-body focus:border-primary focus:outline-none"
      />
    </form>
  );
}

/**
 * A category on the Habits page. Collapsed by default: click the heading to
 * keep it open, or hover it with a mouse to peek (it stays open while you
 * type or use a menu inside it).
 */
function CategorySection({
  id,
  heading,
  menu,
  children,
}: {
  id: string;
  heading: ReactNode;
  menu?: ReactNode;
  children: ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = pinned || hovered || focused;
  const panelId = `habits-${id}-panel`;

  const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <section
      aria-labelledby={`habits-${id}`}
      className="group/cat mb-1"
      onMouseEnter={() => {
        if (!canHover()) return;
        // A short delay so moving the mouse past a category doesn't open it.
        timer.current = setTimeout(() => setHovered(true), 200);
      }}
      onMouseLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setHovered(false);
      }}
      // Keep it open while typing or using a menu inside the habit list.
      onFocus={(e) => document.getElementById(panelId)?.contains(e.target) && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setPinned(!open);
            setHovered(false);
          }}
          className="flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded-md text-left"
        >
          <ChevronRight
            aria-hidden
            className={cn("size-4 shrink-0 text-text-secondary transition-transform duration-150", open && "rotate-90")}
          />
          <h2 id={`habits-${id}`} className="flex min-w-0 items-center gap-2 text-subheading">
            {heading}
          </h2>
        </button>
        {menu}
      </div>
      {open && (
        <div id={panelId} className="pb-3 pl-6">
          {children}
        </div>
      )}
    </section>
  );
}
