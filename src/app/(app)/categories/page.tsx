import { redirect } from "next/navigation";

/** Categories are managed on the Habits page now. */
export default function CategoriesPage() {
  redirect("/habits");
}
