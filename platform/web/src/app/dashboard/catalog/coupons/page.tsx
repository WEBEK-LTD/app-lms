import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { CouponsPanel } from "../coupons-panel";
import { CatalogTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shop.coupons") };
}

/** 91.1 The shop's coupons; 132.10 on their own page. */
export default async function CatalogCouponsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t } = await dashboardText();
  const coupons = await (await getStore()).listCatalogCoupons(app.id);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop.coupons")} description={t("shop.couponsIntro")} />
      <CatalogTabs app={app} />
      <CouponsPanel coupons={coupons} currency={catalogSettings(app).currency} />
    </div>
  );
}
