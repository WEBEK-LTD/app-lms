import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { CardPayments, OtherPayments } from "../../catalog/payments";
import { CoursesTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("manage.payments") };
}

/** Card payments to the academy's own account and 96.2 its other ways to pay; 132.13 on their own page. */
export default async function CoursePaymentsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("manage.payments")} description={t("manage.paymentsIntro")} />
      <CoursesTabs app={app} />
      <div className="flex flex-col gap-5 [&>*]:max-w-[760px]">
        <CardPayments app={app} currency={courseSetup(app).currency} />
        <OtherPayments app={app} />
      </div>
    </div>
  );
}
