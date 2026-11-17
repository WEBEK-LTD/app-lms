import { SectionTabs } from "@/components/manage-kit-client";
import { dashboardText } from "@/lib/dashboard-lang";

/**
 * 132.171 Publishing's own pages as a segmented control under each one's
 * title: the stores, the links that open the app, and the other Android
 * stores' keys (`more`: for the owner who publishes the app, or open).
 */
export async function PublishingTabs({ more }: { more: boolean }) {
  const { t } = await dashboardText();
  return (
    <SectionTabs
      label={t("publishing.title")}
      items={[
        { href: "/dashboard/publishing", label: t("publishing.tabStores"), icon: "storefront" },
        { href: "/dashboard/publishing/links", label: t("publishing.links"), icon: "link" },
        ...(more ? [{ href: "/dashboard/publishing/more-stores", label: t("publishing.moreStores"), icon: "storefront" as const }] : []),
      ]}
    />
  );
}
