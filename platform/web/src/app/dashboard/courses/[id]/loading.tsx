import { EditorSkeleton } from "@/components/manage-kit";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.13 A course's editor (and its lessons' pages) while they load. */
export default async function CourseLoading() {
  return <EditorSkeleton label={(await dashboardText()).t("overview.loading")} />;
}
