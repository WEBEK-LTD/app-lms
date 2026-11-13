export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { TRAVEL_TIMEZONES, travelSettingsFormValues } from "@/lib/travel/forms";
import { travelMode, travelSettingsOf, travelTabLabels } from "@/lib/travel/settings";
import { TravelSettingsForm } from "../forms";
import { isTravel, NotTravel, TravelPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("travel.settings") };
}

/** 126 How people pay and what they save; which parts are on is Yallapp's (Admin › client › Travel). */
export default async function TravelSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t, k } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.settings")} t={t} />;
  const store = await getStore();
  const [saved, plan] = await Promise.all([store.getTravelSettings(app.id), appPlan(store, license, new Date())]);
  const settings = travelSettingsOf(saved, app);
  const mode = travelMode(settings);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("travel.settings")} description={t("travel.settingsIntro")} />
      <TravelPlanNotice app={app} plan={plan} t={t} />
      <Section titleId="h-mode" title={t("travel.mode")}>
        <p className="m-0 text-[15px] leading-relaxed" data-travel-mode={mode}>
          {t("travel.modeText", { mode: t(`travel.mode_${mode}` as DashKey), tabs: travelTabLabels(mode).map(k).join(" · ") })}
        </p>
      </Section>
      <Section titleId="h-settings" title={t("travel.settings")}>
        <TravelSettingsForm values={travelSettingsFormValues(settings)} zones={[...new Set([settings.timeZone, ...TRAVEL_TIMEZONES])]} />
      </Section>
    </div>
  );
}
