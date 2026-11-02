import type { DataStore } from "../data/store";
import type { App, Build } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";
import { courierAppNameOf, courierBundleIdOf, courierPackageOf, hasSecondApp, secondAppRoleOf, workedInCustomersApp, type SecondAppRole } from "./courier-app";
import { deliverySettingsOf } from "./settings";

export interface TwoAppsApp {
  name: string;
  android: string;
  ios: string;
  latest: Build | null;
  iconUrl: string | null;
}

export interface TwoAppsData {
  role: SecondAppRole;
  customers: TwoAppsApp;
  second: TwoAppsApp;
  onPlan: boolean;
  before: boolean;
  settingsPath: string;
}

const dashboardAsset = (id: string | null | undefined) => (id ? `/api/v1/assets/${id}` : null);

/**
 * 112.3 What Setup and Builds show of a delivery, food, ride or taxi
 * project's two apps (components/two-apps.tsx); null for other projects and
 * for companies on the shared Yallapp Courier app.
 */
export async function twoAppsOf(store: Pick<DataStore, "getDeliverySettings" | "listBuildsByApp">, app: App, plan: PlanInfo | null): Promise<TwoAppsData | null> {
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  if (!hasSecondApp(app, settings)) return null;
  const role = secondAppRoleOf(app);
  const [customers, second] = await Promise.all([store.listBuildsByApp(app.id, 1), store.listBuildsByApp(app.id, 1, "courier")]);
  const name = (app.appName ?? "").trim();
  return {
    role,
    customers: {
      name,
      android: app.androidPackage ?? "—",
      ios: app.iosBundleId ?? "—",
      latest: customers[0] ?? null,
      iconUrl: dashboardAsset(app.iconAssetId),
    },
    second: {
      name: courierAppNameOf(app, settings),
      android: app.androidPackage ? courierPackageOf(app.androidPackage, role) : "—",
      ios: app.iosBundleId ? courierBundleIdOf(app.iosBundleId, role) : "—",
      latest: second[0] ?? null,
      iconUrl: dashboardAsset(settings.courierIconAssetId ?? app.iconAssetId),
    },
    onPlan: hasFeature(plan, "courier_app"),
    before: workedInCustomersApp(settings),
    settingsPath: role === "driver" ? "/dashboard/ride-settings" : "/dashboard/delivery",
  };
}
