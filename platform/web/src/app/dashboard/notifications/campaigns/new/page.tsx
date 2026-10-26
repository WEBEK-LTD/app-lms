import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
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

/** 85.2 A new notification campaign. */
export default async function NewCampaignPage() {
  const { app } = await requireClient("notifications");
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) redirect("/dashboard/notifications/campaigns");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const [choices, zone] = await Promise.all([campaignChoices(store, app, lang, now), appZone(store, app)]);
  return (
    <div className="flex max-w-[680px] flex-col gap-5">
      <Link href="/dashboard/notifications/campaigns" className="flex items-center gap-1 text-[14px] font-semibold no-underline">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("campaigns.title")}
      </Link>
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("campaigns.newCampaign")}</h1>
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <CampaignForm initial={campaignFormValues(app, null, zone, appUrl())} choices={choices} />
      </section>
    </div>
  );
}
