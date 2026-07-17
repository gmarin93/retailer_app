import { redirect } from "next/navigation";

/** Legacy alias — bookmarks to /planning_studio land on /plan (Angular parity). */
export default function PlanningStudioPage() {
  redirect("/plan");
}
