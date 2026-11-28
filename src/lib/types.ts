/** One of the preset pastel colors. */
export type NamedCategoryColor =
  | "gray"
  | "blue"
  | "green"
  | "pink"
  | "orange"
  | "purple"
  | "red"
  | "yellow";

/** A preset name, or any color picked with the color picker as "#rrggbb". */
export type CategoryColor = NamedCategoryColor | `#${string}`;

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  week_starts_on: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: CategoryColor;
  created_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  title: string;
  category_id: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  category_id: string | null;
  /** Project the task belongs to. Missing until the projects migration (0007) has been run. */
  project_id?: string | null;
  /** Habit the task was added from, so renaming the habit updates it. Missing until migration 0009. */
  habit_id?: string | null;
  title: string;
  /** Time of day ("HH:MM" or "HH:MM:SS"), or null when the task has no time. */
  start_time: string | null;
  /** ISO date (YYYY-MM-DD). null means the task is in the Inbox. */
  scheduled_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  /** Position in the list; lower comes first. */
  sort_order: number;
};
