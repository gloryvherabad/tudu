"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/lib/app-context";
import type { Project } from "@/lib/types";
import { useTasks } from "@/lib/use-tasks";
import { ProjectFormDialog } from "../ProjectFormDialog";

/**
 * One project's tasks. Each shows when it was created and completed.
 * Completed tasks stay here instead of moving to a day.
 */
export function ProjectView({ id }: { id: string }) {
  const { supabase } = useApp();
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState<Project | null | undefined>(undefined); // undefined = loading, null = not found
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { tasks, loading, create, update, remove, reorder } = useTasks({ kind: "project", projectId: id });

  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setProject((data as Project) ?? null));
  }, [supabase, id]);

  const actions = {
    // New tasks always go in this project.
    create: (...[title, date, categoryId = null, , habitId = null]: Parameters<typeof create>) =>
      create(title, date, categoryId, id, habitId),
    update,
    remove,
    reorder,
  };
  const open = tasks.filter((t) => !t.is_completed).length;
  const done = tasks.length - open;

  const rename = async (name: string): Promise<string | null> => {
    const { data, error } = await supabase.from("projects").update({ name }).eq("id", id).select().single();
    if (error) {
      return error.code === "23505" ? "You already have a project with that name." : "Couldn't rename the project. Try again.";
    }
    setProject(data as Project);
    setRenaming(false);
    return null;
  };

  const deleteProject = async () => {
    setDeleteBusy(true);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    setDeleteBusy(false);
    if (error) {
      toast({ message: "Couldn't delete the project. Try again.", tone: "error" });
      return;
    }
    toast({ message: `Deleted "${project?.name ?? "project"}". Its tasks moved to the Inbox.` });
    router.push("/projects");
  };

  const back = (
    <Link
      href="/projects"
      className="mb-4 inline-flex items-center gap-1 text-secondary text-text-secondary hover:text-text"
    >
      <ChevronLeft className="size-4" aria-hidden />
      My Projects
    </Link>
  );

  if (project === null) {
    return (
      <>
        {back}
        <p className="text-body text-text-secondary">This project doesn&apos;t exist or was deleted.</p>
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={project?.name ?? "Project"}
        subtitle={!loading && `${open} open · ${done} done`}
        actions={
          project && (
            <Menu
              items={[
                { label: "Rename project", icon: <Pencil className="size-4" />, onSelect: () => setRenaming(true) },
                { label: "Delete project", icon: <Trash2 className="size-4" />, destructive: true, onSelect: () => setDeleting(true) },
              ]}
              trigger={(p) => (
                <button
                  {...p}
                  type="button"
                  aria-label="Project actions"
                  className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-hover hover:text-text"
                >
                  <Ellipsis className="size-4" aria-hidden />
                </button>
              )}
            />
          )
        }
      />

      {loading || project === undefined ? (
        <TaskListSkeleton />
      ) : (
        <TaskList addTo={null} tasks={tasks} actions={actions} showTimestamps emptyText="No tasks yet. Add the first one below." />
      )}

      <ProjectFormDialog open={renaming} project={project ?? null} onClose={() => setRenaming(false)} onSave={rename} />

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete "${project?.name ?? ""}"?`}
        description={
          tasks.length > 0
            ? `Its ${tasks.length} ${tasks.length === 1 ? "task moves" : "tasks move"} to the Inbox. No tasks are deleted.`
            : "This project has no tasks."
        }
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteBusy} onClick={deleteProject}>
              Delete project
            </Button>
          </>
        }
      />
    </>
  );
}
