import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import { DEFAULT_RIDES_TIMEZONE } from "@/lib/rides/settings";
import { liveBoard } from "@/lib/taxi/board";
import { taxiConfig } from "@/lib/taxi/service";
import { googleKeyOf, isTaxiApp, taxiSettingsOf } from "@/lib/taxi/settings";
import { RidesPlanNotice } from "../../rides/parts";
import { LiveBoardView } from "./view";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("taxi.liveMap") };
}

export const dynamic = "force-dynamic";

/** 105.9 The live map: the company's taxis where they are, the rides waiting at their pickup, and the rides going on now. */
export default async function LiveMapPage() {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!app || !isTaxiApp(app)) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("taxi.liveMap")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("taxi.notHere")}</p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const [saved, plan] = await Promise.all([store.getDeliverySettings(app.id), appPlan(store, license, now)]);
  const settings = deliverySettingsOf(saved);
  const taxi = taxiSettingsOf(settings);
  let googleKey: string | null = null;
  if (taxi.provider === "google") {
    try {
      googleKey = googleKeyOf(app, taxi, encryptionKey());
    } catch {
      googleKey = null;
    }
  }
  const [board, config] = await Promise.all([
    liveBoard(store, app, settings, now),
    taxiConfig({ store, app, settings, googleKey, account: null, language: lang, now }),
  ]);
  return (
    <LiveBoardView
      board={board}
      tilesUrl={config.map.tiles_url}
      attribution={config.map.attribution}
      timezone={settings.timezone ?? DEFAULT_RIDES_TIMEZONE}
      notice={<RidesPlanNotice app={app} plan={plan} t={t} />}
      t={t}
      lang={lang}
    />
  );
}
