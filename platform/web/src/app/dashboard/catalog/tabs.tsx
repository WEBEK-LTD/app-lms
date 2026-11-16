import type { App } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AnchorRedirect, SectionTabs } from "@/components/manage-kit-client";

/**
 * 132.10 Products (a restaurant's Menu), each job on its own page: the
 * products, their categories, coupons, a restaurant's pickup and delivery,
 * payments and the shop's settings. The tabs under each page's header.
 */
export async function CatalogTabs({ app }: { app: App }) {
  const { t } = await dashboardText();
  const restaurant = app.vertical === "restaurant";
  const kind = restaurant ? "restaurant" : "shop";
  const store = await getStore();
  const [products, categories, coupons] = await Promise.all([store.listCatalogProducts(app.id), store.listCatalogCategories(app.id), store.listCatalogCoupons(app.id)]);
  return (
    <SectionTabs
      label={t("shop.page", { kind })}
      items={[
        { href: "/dashboard/catalog", label: t("shop.statItems", { kind }), icon: restaurant ? "restaurant_menu" : "inventory_2", count: products.length },
        { href: "/dashboard/catalog/categories", label: t("shop.categories"), icon: "category", count: categories.length },
        { href: "/dashboard/catalog/coupons", label: t("shop.coupons"), icon: "local_offer", count: coupons.length },
        ...(restaurant ? [{ href: "/dashboard/catalog/delivery", label: t("shop.pickupDelivery"), icon: "delivery_dining" as const }] : []),
        // 132.120 The one Payments page, a tab away (it isn't a copy).
        { href: "/dashboard/payments", label: t("manage.payments"), icon: "payments" },
        { href: "/dashboard/catalog/settings", label: t("manage.settings"), icon: "settings" },
      ]}
    />
  );
}

/** 132.10 The old long page's parts, at their own pages now (`/dashboard/catalog#h-payments`). */
export const CATALOG_ANCHORS: Record<string, string> = {
  "h-categories": "/dashboard/catalog/categories",
  "h-coupons": "/dashboard/catalog/coupons",
  "new-coupon": "/dashboard/catalog/coupons",
  "h-payments": "/dashboard/payments",
  "h-other-payments": "/dashboard/payments",
  "h-shop": "/dashboard/catalog/settings",
  "h-loyalty": "/dashboard/catalog/settings",
  "h-fulfilment": "/dashboard/catalog/delivery",
};

export function CatalogAnchors() {
  return <AnchorRedirect map={CATALOG_ANCHORS} />;
}
