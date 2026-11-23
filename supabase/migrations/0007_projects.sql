-- tudu: projects. A project groups tasks you work through over time.
-- Each task keeps when it was created and when it was completed.
-- Completed project tasks stay in their project (they are not moved to a day).
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index projects_user_name_key on public.projects (user_id, lower(btrim(name)));

alter table public.projects enable row level security;

create policy "Own projects: read"   on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own projects: insert" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own projects: update" on public.projects for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own projects: delete" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;

-- A task can belong to one project owned by the same user.
-- Deleting a project moves its tasks to the Inbox.
alter table public.tasks add column if not exists project_id uuid;
alter table public.tasks
  add constraint tasks_project_fk foreign key (user_id, project_id)
  references public.projects (user_id, id) on delete set null (project_id);

create index if not exists tasks_user_project_idx
  on public.tasks (user_id, project_id, created_at)
  where deleted_at is null and project_id is not null;

-- Same task rules as 0002. The one change: a locked task may also lose its
-- project when that project is deleted (as it already may lose its category).
create or replace function public.enforce_task_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date;
begin
  if tg_op = 'DELETE' then
    if public.is_locked_date(old.scheduled_date, old.user_id) then
      raise exception 'This task is locked because its day ended more than 48 hours ago.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  today := public.user_today(new.user_id);

  if tg_op = 'INSERT' then
    if public.is_locked_date(new.scheduled_date, new.user_id) then
      raise exception 'Tasks can''t be added to a day that is locked.' using errcode = 'P0001';
    end if;
    new.deleted_at := null;
    new.completed_at := case when new.is_completed then now() else null end;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  new.user_id := old.user_id;
  new.created_at := old.created_at;

  if public.is_locked_date(old.scheduled_date, old.user_id) then
    -- Only allowed change: category and/or project cleared because it was deleted.
    if (new.category_id is distinct from old.category_id or new.project_id is distinct from old.project_id)
       and (new.category_id is not distinct from old.category_id
            or (new.category_id is null and not exists (select 1 from public.categories c where c.id = old.category_id)))
       and (new.project_id is not distinct from old.project_id
            or (new.project_id is null and not exists (select 1 from public.projects p where p.id = old.project_id)))
       and new.title is not distinct from old.title
       and new.scheduled_date is not distinct from old.scheduled_date
       and new.is_completed is not distinct from old.is_completed
       and new.completed_at is not distinct from old.completed_at
       and new.deleted_at is not distinct from old.deleted_at then
      new.updated_at := now();
      return new;
    end if;
    raise exception 'This task is locked because its day ended more than 48 hours ago.' using errcode = 'P0001';
  end if;

  if new.scheduled_date is not null
     and new.scheduled_date is distinct from old.scheduled_date
     and new.scheduled_date < today then
    raise exception 'Tasks can''t be moved to a past day.' using errcode = 'P0001';
  end if;

  if new.is_completed and not old.is_completed then
    new.completed_at := now();
  elsif not new.is_completed then
    new.completed_at := null;
  else
    new.completed_at := old.completed_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.enforce_task_rules() from public, anon, authenticated;
