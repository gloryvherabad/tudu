-- tudu: completed Inbox tasks belong to the day they were completed.
-- From now on the app does this when you tick off an Inbox task.
-- This moves tasks that were already completed while still in the Inbox.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

begin;

-- The task rules don't allow scheduling into past (locked) days, so pause them for this one fix.
alter table public.tasks disable trigger tasks_enforce_rules;

update public.tasks t
set scheduled_date = (t.completed_at at time zone coalesce(
      (select p.timezone from public.profiles p where p.id = t.user_id),
      'UTC'
    ))::date
where t.scheduled_date is null
  and t.is_completed
  and t.completed_at is not null;

alter table public.tasks enable trigger tasks_enforce_rules;

commit;
