import type { Metadata } from "next";
import Link from "next/link";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import { hasFeature } from "@/lib/plans";
import { LIVE_RULES } from "@/lib/taxi/live";
import { googleKeyOf, isTaxiApp, maskedKey, taxiSettingsOf } from "@/lib/taxi/settings";
import { PageHead } from "../../rides/parts";
import { LiveTest, MapTest, TaxiSettingsForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("taxi.settings") };
}

/** 105.9 Maps & live: the company's map and its Firebase Realtime Database, each tested, and the rules to paste. */
export default async function TaxiSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!app || !isTaxiApp(app)) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("taxi.settings")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("taxi.notHere")}</p>
      </div>
    );
  }
  const store = await getStore();
  const [saved, plan] = await Promise.all([store.getDeliverySettings(app.id), appPlan(store, license, new Date())]);
  const taxi = taxiSettingsOf(deliverySettingsOf(saved));
  const key = taxi.provider === "google" || taxi.googleKeyEncrypted ? googleKeyOf(app, taxi, encryptionKey()) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("taxi.settings")} intro={t("taxi.settingsIntro")} />
      {plan && !hasFeature(plan, "taxi") ? (
        <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("taxi.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
        </p>
      ) : null}
      <TaxiSettingsForm
        values={{
          provider: taxi.provider,
          tilesUrl: taxi.tilesUrl ?? "",
          attribution: taxi.attribution ?? "",
          searchUrl: taxi.searchUrl ?? "",
          routingUrl: taxi.routingUrl ?? "",
          databaseUrl: taxi.databaseUrl ?? "",
        }}
        savedKey={key ? maskedKey(key) : null}
        mapTest={<MapTest />}
        liveTest={<LiveTest />}
        rules={LIVE_RULES}
      />
    </div>
  );
}
