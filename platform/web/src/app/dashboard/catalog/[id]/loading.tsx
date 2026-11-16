import { EditorSkeleton } from "@/components/manage-kit";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.11 A product's editor while it loads. */
export default async function ProductLoading() {
  return <EditorSkeleton label={(await dashboardText()).t("overview.loading")} />;
}
