import type { DataStore } from "../data/store";
import type { Client } from "../data/types";
import { appIsActive } from "../license/status";
import { storeLinks } from "../links/fallback";
import { assetUrl } from "../assets";
import type { CommunityLinkedApp } from "./types";

/**
 * 231 A member's apps made with Yallapp, read from their linked Yallapp
 * account (never typed in by them), as its dashboard lists them: the apps of
 * the account's own business, and those of the businesses it works on as a
 * team member (all of a business's apps, or only those its access names).
 * Not the deleted ones. Each with its icon, its store pages, whether it was
 * made from a Studio Market template (it counts toward Gold like any app),
 * and whether it is on a paid plan now (Green): its own license is active.
 */
export async function linkedApps(platform: DataStore, yallappUserId: string, now: Date): Promise<CommunityLinkedApp[]> {
  const [own, memberships] = await Promise.all([platform.getClientByUserId(yallappUserId), platform.listMembershipsOfUser(yallappUserId)]);
  const businesses: { client: Client; appIds: readonly string[] | null }[] = own ? [{ client: own, appIds: null }] : [];
  for (const member of memberships) {
    if (member.clientId === own?.id) continue;
    const client = await platform.getClientById(member.clientId);
    if (client) businesses.push({ client, appIds: member.appIds });
  }
  const seen = new Set<string>();
  const out: CommunityLinkedApp[] = [];
  for (const { client, appIds } of businesses) {
    const [apps, licenses] = await Promise.all([platform.listAppsByClient(client.id), platform.listLicensesByClient(client.id)]);
    const theirs = apps.filter((app) => (appIds === null || appIds.includes(app.id)) && !seen.has(app.id));
    for (const app of theirs) seen.add(app.id);
    out.push(
      ...(await Promise.all(
        theirs.map(async (app): Promise<CommunityLinkedApp> => {
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
      )),
    );
  }
  return out;
}

/** The Yallapp account's name, shown on the member's link (the account's own name). */
export async function yallappAccountName(platform: DataStore, yallappUserId: string): Promise<string | null> {
  const user = await platform.getUserById(yallappUserId);
  return user?.name ?? null;
}
