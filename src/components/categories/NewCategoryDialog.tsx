"use client";

import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/Toast";
import type { Category, CategoryColor } from "@/lib/types";
import { CategoryFormDialog } from "./CategoryFormDialog";

/** Value of the "+ Add category" option in category selects. */
export const ADD_CATEGORY = "__add_category__";

/** Creates a category from anywhere (name and color), then hands it back so the caller can select it. */
export function NewCategoryDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
}) {
  const { supabase, categories, setCategories } = useApp();
  const toast = useToast();

  const save = async (name: string, color: CategoryColor): Promise<string | null> => {
    const { data, error } = await supabase.from("categories").insert({ name, color }).select().single();
    if (error) {
      return error.code === "23505" ? "You already have a category with that name." : error.code === "23514" ? "Custom colors need a one-time database update (migration 0008). Pick a preset for now." : "Couldn't save the category. Try again.";
    }
    const saved = data as Category;
    setCategories([...categories, saved].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ message: `Created "${saved.name}"` });
    onCreated(saved);
    onClose();
    return null;
  };

  return <CategoryFormDialog open={open} category={null} onClose={onClose} onSave={save} />;
}
