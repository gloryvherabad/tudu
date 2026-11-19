"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { todayIn, type ISODate } from "@/lib/dates";
import type { Category, Habit, Profile } from "@/lib/types";
import type { TaskSuggestion } from "@/components/ui/TaskInput";

type AppContextValue = {
  supabase: SupabaseClient;
  profile: Profile;
  setProfile: (p: Profile) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  habits: Habit[];
  setHabits: (h: Habit[]) => void;
  /** Today's date in the user's timezone. Updates at midnight. */
  today: ISODate;
  /** Titles of tasks added before, newest first, one per title. Used by the "/" menu. */
  loadSuggestions: () => Promise<TaskSuggestion[]>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function AppProvider({
  initialProfile,
  initialCategories,
  initialHabits,
  children,
}: {
  initialProfile: Profile;
  initialCategories: Category[];
  initialHabits: Habit[];
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [categories, setCategories] = useState(initialCategories);
  const [habits, setHabits] = useState(initialHabits);
  const [today, setToday] = useState(() => todayIn(initialProfile.timezone));

  // Keep "today" correct across midnight and timezone changes.
  useEffect(() => {
    const tick = () => setToday(todayIn(profile.timezone));
    tick();
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [profile.timezone]);

  // Leave the app as soon as the session ends: signed out in another tab,
  // expired, or revoked. Supabase refreshes the token on its own while it is valid.
  useEffect(() => {
    const toLogin = () => {
      router.replace("/login");
      router.refresh();
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") toLogin();
    });
    // Sign-out happens on the server, which only clears cookies. Check them when
    // the tab comes back into view or the page is restored with the Back button.
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) toLogin();
    };
    const onShow = (e: PageTransitionEvent) => e.persisted && void check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", onShow);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", onShow);
    };
  }, [supabase, router]);

  // First visit: adopt the device timezone if the profile still has the default.
  useEffect(() => {
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const untouched = profile.timezone === "UTC" && profile.created_at === profile.updated_at;
    if (!untouched || !deviceTz || deviceTz === "UTC") return;
    supabase
      .from("profiles")
      .update({ timezone: deviceTz })
      .eq("id", profile.id)
      .select()
      .single()
      .then(({ data }) => data && setProfile(data as Profile));
  }, [profile, supabase]);

  const loadSuggestions = useCallback(async (): Promise<TaskSuggestion[]> => {
    const { data } = await supabase
      .from("tasks")
      .select("title, category_id, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    const seen = new Set<string>();
    const out: TaskSuggestion[] = [];
    for (const row of (data ?? []) as Array<{ title: string; category_id: string | null }>) {
      const key = row.title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ title: row.title, category_id: row.category_id });
    }
    return out;
  }, [supabase]);

  return (
    <AppContext.Provider value={{ supabase, profile, setProfile, categories, setCategories, habits, setHabits, today, loadSuggestions }}>
      {children}
    </AppContext.Provider>
  );
}
