import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader, Section } from "@/components/ui";
import { appZone } from "@/lib/analytics/zone";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl } from "@/lib/env";
import { campaignChoices, campaignFormValues } from "../choices";
import { CampaignForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("campaigns.newCampaign") };
}

/** 85.2 A new notification campaign; 112.5 `?course=` starts it for that course's students (from the course's page). */
export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { app } = await requireClient("notifications");
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) redirect("/dashboard/notifications/campaigns");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const [choices, zone] = await Promise.all([campaignChoices(store, app, lang, now), appZone(store, app)]);
  const course = Number((await searchParams).course);
  const initial = campaignFormValues(app, null, zone, appUrl());
  const forCourse = choices.courses.some((c) => c.id === course) ? { ...initial, who: "students" as const, courseId: String(course) } : initial;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/dashboard/notifications/campaigns", label: t("campaigns.title") }} title={t("campaigns.newCampaign")} description={t("campaigns.intro")} />
      <Section titleId="h-new-campaign" title={t("campaigns.newCampaign")} className="max-w-[760px]">
        <CampaignForm initial={forCourse} choices={choices} />
      </Section>
    </div>
  );
}
