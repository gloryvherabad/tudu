import type { Metadata } from "next";
import { ProjectsView } from "./ProjectsView";

export const metadata: Metadata = { title: "My Projects" };

export default function ProjectsPage() {
  return <ProjectsView />;
}
