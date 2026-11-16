import { ListSkeleton } from "@/components/manage-kit";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.13 Courses and its pages while they load: the shape of the list. */
export default async function CoursesLoading() {
  return <ListSkeleton label={(await dashboardText()).t("overview.loading")} grid />;
}
