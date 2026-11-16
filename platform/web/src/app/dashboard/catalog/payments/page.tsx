import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { CardPayments, OtherPayments } from "../payments";
import { CatalogTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("manage.payments") };
}

/** 37 Card payments to the shop's own account and 96.2 its other ways to pay; 132.10 on their own page. */
export default async function CatalogPaymentsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("manage.payments")} description={t("manage.paymentsIntro")} />
      <CatalogTabs app={app} />
      <div className="flex flex-col gap-5 [&>*]:max-w-[760px]">
        <CardPayments app={app} />
        <OtherPayments app={app} />
      </div>
    </div>
  );
}
