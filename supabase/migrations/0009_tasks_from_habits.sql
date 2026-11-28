-- tudu: remember which habit a task was added from, so renaming a habit
-- (or changing its category) updates its tasks for today and later days.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- No foreign key on purpose: deleting a habit just leaves an unused id on its
-- tasks, and never runs into the rule that locks tasks on past days.
alter table public.tasks add column if not exists habit_id uuid;

create index if not exists tasks_user_habit_idx
  on public.tasks (user_id, habit_id)
  where deleted_at is null and habit_id is not null;

-- Link tasks you already added from a habit (same name, same person).
alter table public.tasks disable trigger tasks_enforce_rules;

update public.tasks t
set habit_id = h.id
from public.habits h
where t.habit_id is null
  and t.user_id = h.user_id
  and lower(btrim(t.title)) = lower(btrim(h.title));

alter table public.tasks enable trigger tasks_enforce_rules;
