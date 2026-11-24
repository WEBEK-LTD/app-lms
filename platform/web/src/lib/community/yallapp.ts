import type { DataStore } from "../data/store";
import { appIsActive } from "../license/status";
import { storeLinks } from "../links/fallback";
import { assetUrl } from "../assets";
import type { CommunityLinkedApp } from "./types";

/**
 * 231 A member's apps made with Yallapp, read from their linked Yallapp
 * account (never typed in by them): the account's client and its apps (not
 * the deleted ones), each with its icon, its store pages, whether it was
 * made from a Studio Market template (it counts toward Gold like any app),
 * and whether it is on a paid plan now (Green): its own license is active.
 */
export async function linkedApps(platform: DataStore, yallappUserId: string, now: Date): Promise<CommunityLinkedApp[]> {
  const client = await platform.getClientByUserId(yallappUserId);
  if (!client) return [];
  const [apps, licenses] = await Promise.all([platform.listAppsByClient(client.id), platform.listLicensesByClient(client.id)]);
  return Promise.all(
    apps.map(async (app): Promise<CommunityLinkedApp> => {
      const [publishing, templates] = await Promise.all([platform.getPublishingRequest(app.id), platform.listTemplateApplications({ appId: app.id })]);
      const links = storeLinks(app, publishing);
      const license = licenses.find((l) => l.appId === app.id) ?? null;
      return {
        appId: app.id,
        name: app.appName?.trim() || "App",
        iconUrl: app.iconAssetId ? assetUrl(app.iconAssetId) : null,
        appStoreUrl: links.appStore,
        playStoreUrl: links.googlePlay,
        fromTemplate: templates.length > 0,
        paidPlan: appIsActive(license, client, now),
      };
    }),
  );
}

/** The Yallapp account's name, shown on the member's link (the account's own name). */
export async function yallappAccountName(platform: DataStore, yallappUserId: string): Promise<string | null> {
  const user = await platform.getUserById(yallappUserId);
  return user?.name ?? null;
}
