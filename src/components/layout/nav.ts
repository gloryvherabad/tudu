import { CalendarCheck, CalendarDays, FolderKanban, Inbox, Repeat, Search, Settings, Tag, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: CalendarCheck, mobile: true },
  { href: "/inbox", label: "Inbox", icon: Inbox, mobile: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, mobile: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, mobile: true },
  { href: "/habits", label: "Habits", icon: Repeat, mobile: true },
  { href: "/categories", label: "Categories", icon: Tag, mobile: true },
  // On phones, Search sits in the top bar to keep the bottom bar to six items.
  { href: "/search", label: "Search", icon: Search, mobile: false },
  { href: "/settings", label: "Settings", icon: Settings, mobile: false },
];
