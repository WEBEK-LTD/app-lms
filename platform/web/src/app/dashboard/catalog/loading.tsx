import { ListSkeleton } from "@/components/manage-kit";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.10 Products and its pages while they load: the shape of the list. */
export default async function CatalogLoading() {
  return <ListSkeleton label={(await dashboardText()).t("overview.loading")} />;
}
