"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/app-context";
import type { Project } from "@/lib/types";
import { ProjectFormDialog } from "./ProjectFormDialog";

type Counts = Record<string, { open: number; done: number }>;

/** List of projects. Open one to add and tick off its tasks. */
export function ProjectsView() {
  const { supabase } = useApp();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [{ data, error }, { data: rows }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("project_id, is_completed").is("deleted_at", null).not("project_id", "is", null),
    ]);
    setLoading(false);
    if (error) {
      // 42P01 / PGRST205: the projects table doesn't exist yet.
      if (error.code === "42P01" || error.code === "PGRST205") setSetupNeeded(true);
      else toast({ message: "Couldn't load your projects. Try refreshing.", tone: "error" });
      return;
    }
    setProjects(data as Project[]);
    const c: Counts = {};
    for (const r of (rows ?? []) as Array<{ project_id: string; is_completed: boolean }>) {
      c[r.project_id] ??= { open: 0, done: 0 };
      c[r.project_id][r.is_completed ? "done" : "open"]++;
    }
    setCounts(c);
  }, [supabase, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (name: string): Promise<string | null> => {
    const { data, error } = await supabase.from("projects").insert({ name }).select().single();
    if (error) {
      return error.code === "23505" ? "You already have a project with that name." : "Couldn't create the project. Try again.";
    }
    setProjects([data as Project, ...projects]);
    toast({ message: `Created "${(data as Project).name}"` });
    setCreating(false);
    return null;
  };

  return (
    <>
      <PageHeader
        title="My Projects"
        actions={
          !setupNeeded && (
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New project
            </Button>
          )
        }
      />

      {loading ? (
        <TaskListSkeleton />
      ) : setupNeeded ? (
        <p role="alert" className="text-body text-text-secondary">
          Projects need a one-time database update. In Supabase, run{" "}
          <code className="text-text">supabase/migrations/0007_projects.sql</code> in the SQL Editor, then refresh.
        </p>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-8" />}
          title="No projects yet"
          description="Create a project, then add its tasks. Each task records when you created it and when you completed it."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create a project
            </Button>
          }
        />
      ) : (
        <ul>
          {projects.map((p) => {
            const c = counts[p.id] ?? { open: 0, done: 0 };
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex min-h-touch items-center gap-3 rounded-md px-1 hover:bg-hover"
                >
                  <FolderKanban className="size-4 shrink-0 text-text-secondary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-body">{p.name}</span>
                  <span className="shrink-0 text-secondary text-text-secondary">
                    {c.open} open · {c.done} done
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <ProjectFormDialog open={creating} project={null} onClose={() => setCreating(false)} onSave={create} />
    </>
  );
}
