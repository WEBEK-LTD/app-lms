import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { linkedApps } from "@/lib/community/yallapp";
import type { DataStore } from "@/lib/data/store";
import { api, joinWithEmail, NOW, testCommunity } from "./community-support";

/**
 * 231 A linked Yallapp account's apps, as its dashboard lists them: its own
 * business's, and those of the businesses it works on as a team member (all
 * of them for a manager, the ones named for staff limited to some apps).
 * Deleted apps and businesses it left don't count; an app is listed once.
 */
async function business(platform: DataStore, owner: string, apps: string[]) {
  const { user, client } = await registerClient(platform, { name: owner, email: `${owner.toLowerCase().replace(/\W+/g, ".")}@yallapp.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const made = [];
  for (const name of apps) {
    const app = { ...newApp(client.id, null, NOW, "store"), appName: name };
    await platform.createApp(app);
    made.push(app);
  }
  return { user, client, apps: made };
}

describe("231 the linked Yallapp account's apps", () => {
  it("counts the apps of the businesses the account works on as a team member, not only its own", async () => {
    const c = await testCommunity();
    const platform = c.deps.platform;
    // The person runs the apps of a business whose account is someone else's: no business of their own.
    const shop = await business(platform, "Leqaa Owner", ["Leqaa", "Runway", "Bouquet"]);
    const agency = await business(platform, "Agency Owner", ["Madar", "Nawah"]);
    const { user: person } = await registerClient(platform, { name: "Mohamed", email: "mohamed@yallapp.test", whatsapp: "+905446731948", siteUrl: "", password: null }, NOW);
    const ownClient = (await platform.getClientByUserId(person.id))!;
    await platform.createApp({ ...newApp(ownClient.id, null, NOW, "store"), appName: "Own app" });
    await platform.saveTeamMember({ clientId: shop.client.id, userId: person.id, role: "manager", areas: [], appIds: null, addedBy: "o@yallapp.test", createdAt: NOW, updatedAt: NOW });
    // Staff limited to one of the agency's apps: only that one.
    await platform.saveTeamMember({ clientId: agency.client.id, userId: person.id, role: "staff", areas: ["content"], appIds: [agency.apps[1]!.id], addedBy: "o@yallapp.test", createdAt: NOW, updatedAt: NOW });
    const apps = await linkedApps(platform, person.id, NOW);
    expect(apps.map((a) => a.name).sort()).toEqual(["Bouquet", "Leqaa", "Nawah", "Own app", "Runway"]);
    // Its own business first.
    expect(apps[0]!.name).toBe("Own app");
    expect(new Set(apps.map((a) => a.appId)).size).toBe(apps.length);

    // Through the API: the member sees all five on their link and their own profile.
    const me = await joinWithEmail(c, "Mohamed Ali");
    await c.deps.store.base.updateMember(me.id, { yallappUserId: person.id, linkedAt: NOW });
    expect(((await api<{ apps: unknown[] }>(c, "GET", "/me/yallapp-link", { token: me.token })).body.apps).length).toBe(5);
    expect(((await api<{ items: unknown[] }>(c, "GET", `/members/${me.id}/apps`, { token: me.token })).body.items).length).toBe(5);
  });

  it("an account with only team work, and none of its own, still has its apps", async () => {
    const c = await testCommunity();
    const platform = c.deps.platform;
    const shop = await business(platform, "Shop Owner", ["One", "Two"]);
    const helper = await platform.createUser({ email: "helper@yallapp.test", name: "Helper", passwordHash: null, now: NOW });
    await platform.saveTeamMember({ clientId: shop.client.id, userId: helper.id, role: "manager", areas: [], appIds: null, addedBy: "o@yallapp.test", createdAt: NOW, updatedAt: NOW });
    expect((await linkedApps(platform, helper.id, NOW)).map((a) => a.name).sort()).toEqual(["One", "Two"]);
    // The owner's own count is unchanged.
    expect((await linkedApps(platform, shop.user.id, NOW)).map((a) => a.name).sort()).toEqual(["One", "Two"]);
  });
});
