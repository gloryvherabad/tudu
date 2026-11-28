-- tudu: categories can use any color from the color picker, stored as "#rrggbb",
-- as well as the preset names.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.

alter table public.categories drop constraint if exists categories_color_check;
alter table public.categories
  add constraint categories_color_check
  check (
    color in ('gray', 'blue', 'green', 'pink', 'orange', 'purple', 'red', 'yellow')
    or color ~ '^#[0-9a-fA-F]{6}$'
  );
