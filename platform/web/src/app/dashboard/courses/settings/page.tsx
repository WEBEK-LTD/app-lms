import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { CurrencyForm } from "../forms";
import { OfflineDownloads } from "../offline";
import { CoursesTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("manage.settings") };
}

/** The academy's prices' currency and 45 offline downloads; 132.13 on their own page. */
export default async function CourseSettingsPage() {
  const { app, license } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("manage.settings")} description={t("manage.courseSettingsIntro")} />
      <CoursesTabs app={app} />
      <div className="flex flex-col gap-5 [&>*]:max-w-[760px]">
        <Section titleId="h-course-currency" title={t("courses.prices")}>
          <CurrencyForm currency={courseSetup(app).currency} />
        </Section>
        <OfflineDownloads app={app} license={license} />
      </div>
    </div>
  );
}
