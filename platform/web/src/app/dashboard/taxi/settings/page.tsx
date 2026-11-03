import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn, Notice, PageHeader } from "@/components/ui";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import { hasFeature } from "@/lib/plans";
import { platformSetting } from "@/lib/settings/platform";
import { LIVE_RULES } from "@/lib/taxi/live";
import { googleKeyOf, isRideApp, isTaxiApp, maskedKey, taxiSettingsOf } from "@/lib/taxi/settings";
import { RidesPlanNotice } from "../../rides/parts";
import { LiveTest, MapTest, TaxiSettingsForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("taxi.settings") };
}

/** 105.9 Maps & live: the company's map and its Firebase Realtime Database, each tested, and the rules to paste; 112.1 for ride hailing apps too, whose map is Yallapp's until they set their own. */
export default async function TaxiSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!app || !isRideApp(app)) {
    return <PageHeader title={t("taxi.settings")} description={t("taxi.notHere")} />;
  }
  const store = await getStore();
  const [saved, plan, platformMap] = await Promise.all([store.getDeliverySettings(app.id), appPlan(store, license, new Date()), platformSetting(store, "maps")]);
  const taxi = taxiSettingsOf(deliverySettingsOf(saved));
  const key = taxi.provider === "google" || taxi.googleKeyEncrypted ? googleKeyOf(app, taxi, encryptionKey()) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and the live map, then the map's and the live database's settings. */}
      <PageHeader
        title={t("taxi.settings")}
        description={t("taxi.settingsIntro")}
        actions={
          <Link href="/dashboard/taxi/live" className={`${btn.main} h-11`}>
            <Icon name="map" size={20} />
            {t("taxi.liveMap")}
          </Link>
        }
      />
      {isTaxiApp(app) && plan && !hasFeature(plan, "taxi") ? (
        <Notice tone="warn" icon="warning">
          {richText(t("taxi.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
        </Notice>
      ) : (
        <RidesPlanNotice app={app} plan={plan} t={t} />
      )}
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
        platformNote={isTaxiApp(app) ? null : t(platformMap?.value.tilesUrl ? "taxi.yallappMap" : "taxi.yallappMapOff")}
      />
    </div>
  );
}
