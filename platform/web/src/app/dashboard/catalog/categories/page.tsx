import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AddCategoryForm } from "../forms";
import { CatalogTabs } from "../tabs";
import { CategoriesList, type CategoryRow } from "./categories-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("shop.categories") };
}

/**
 * 132.12 The shop's categories (a restaurant's menu sections) on their own
 * page: added, renamed, put in the app's order by dragging, each with its
 * products' count and the first one's photo.
 */
export default async function CatalogCategoriesPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t } = await dashboardText();
  const restaurant = app.vertical === "restaurant";
  const kind = restaurant ? "restaurant" : "shop";
  const store = await getStore();
  const [categories, products] = await Promise.all([store.listCatalogCategories(app.id), store.listCatalogProducts(app.id)]);
  const rows: CategoryRow[] = categories.map((c) => {
    const inIt = products.filter((p) => p.categoryIds.includes(c.id));
    const pictured = inIt.find((p) => p.imageAssetIds.length > 0);
    return { id: c.id, name: c.name, names: c.names ?? null, count: inIt.length, image: pictured ? assetUrl(pictured.imageAssetIds[0]!) : null };
  });
  const without = products.filter((p) => p.categoryIds.length === 0).length;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop.categories")} description={t("shop.categoriesHint", { kind })} />
      <CatalogTabs app={app} />
      <section aria-labelledby="h-categories" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <div className="flex flex-col gap-1 px-5 pt-5 pb-4 sm:px-6">
          <h2 id="h-categories" className="m-0 text-lg font-bold">
            {t("manage.categoriesCount", { count: categories.length })}
          </h2>
          <AddCategoryForm />
        </div>
        {rows.length ? (
          <CategoriesList categories={rows} restaurant={restaurant} />
        ) : (
          <div className="px-5 pb-6 sm:px-6">
            <EmptyState icon="category" title={t("manage.noCategories")}>
              {t("manage.noCategoriesText", { kind })}
            </EmptyState>
          </div>
        )}
        {without && rows.length ? (
          <p className="m-0 border-t border-line-soft px-5 py-3 text-[13px] text-muted sm:px-6">
            <Link href="/dashboard/catalog?category=none">{t("manage.withoutCategory", { kind, count: without })}</Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
