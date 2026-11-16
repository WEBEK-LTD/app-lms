import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { CouponsPanel } from "../../catalog/coupons-panel";
import { CoursesTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shop.coupons") };
}

/** 112.5 Coupons for the paid courses (113.1 and bundles), taken on the payment page; one of 100% enrols at once. 132.13 On their own page. */
export default async function CourseCouponsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { t } = await dashboardText();
  const coupons = await (await getStore()).listCatalogCoupons(app.id);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop.coupons")} description={t("lms.couponsIntro")} />
      <CoursesTabs app={app} />
      <CouponsPanel coupons={coupons} currency={courseSetup(app).currency} intro={t("lms.couponsIntro")} />
    </div>
  );
}
