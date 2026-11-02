import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliveryBoard } from "@/lib/delivery/board";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { platformSetting } from "@/lib/settings/platform";
import { isDelivery, NotDelivery, PlanNotice } from "../../shipments/parts";
import { DeliveryBoardView } from "./view";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("delivery.liveMap") };
}

export const dynamic = "force-dynamic";

/** 112.2 The live map of a delivery or food company: its couriers with a parcel, the jobs waiting at their pickup and those on the way, on the platform's map. */
export default async function DeliveryLivePage() {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.liveMap")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [saved, plan, maps] = await Promise.all([store.getDeliverySettings(app.id), appPlan(store, license, now), platformSetting(store, "maps")]);
  const settings = deliverySettingsOf(saved);
  const board = await deliveryBoard(store, app, settings, now);
  return (
    <DeliveryBoardView
      board={board}
      tilesUrl={maps?.value.tilesUrl ?? null}
      attribution={maps?.value.tilesUrl ? (maps.value.attribution ?? null) : null}
      timezone={settings.timezone ?? "Africa/Cairo"}
      live={settings.tracking === "live"}
      notice={<PlanNotice plan={plan} t={t} app={app} />}
      t={t}
      lang={lang}
    />
  );
}
