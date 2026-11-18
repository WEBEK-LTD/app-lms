import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { fileUnavailableReason, planNeededFor } from "@/lib/builds/view";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { appPlanActive } from "@/lib/license/status";
import { KEY, NOW, days } from "./helpers";

/**
 * 187 No plan, no app: an app is downloaded, and a request to publish it
 * reaches our team, only while its plan is paid and running.
 */

async function anApp() {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Ada", email: `ada-${Math.random().toString(36).slice(2)}@shop.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW), appName: "Ada Shop" };
  await store.createApp(app);
  return { store, client, app };
}

describe("187 an app's paid plan", () => {
  it("is running only between the team's activation (or a payment) and its end", async () => {
    const { store, client, app } = await anApp();
    expect(await appPlanActive(store, app, NOW)).toBe(false);
    await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    expect(await appPlanActive(store, app, days(1))).toBe(true);
    expect(await appPlanActive(store, app, days(31))).toBe(false);
    // Another app of the same account has its own plan, or none.
    const other: App = { ...newApp(client.id, null, NOW), appName: "Ada Two" };
    await store.createApp(other);
    expect(await appPlanActive(store, other, days(1))).toBe(false);
    // A suspended account: none of its apps.
    await store.updateClient(client.id, { status: "suspended" }, days(2));
    expect(await appPlanActive(store, app, days(2))).toBe(false);
  });
});

describe("187 the app's files", () => {
  const build = { artifacts: (["apk", "aab", "ipa", "keystore", "store_assets"] as const).map((kind) => ({ kind, url: `files/${kind}`, size: 1 })) } as never;

  it("the app itself and its store files need the plan; the upload key stays the owner's", () => {
    expect(["apk", "aab", "ipa", "store_assets"].every(planNeededFor)).toBe(true);
    expect(planNeededFor("keystore")).toBe(false);
    for (const kind of ["apk", "aab", "ipa", "store_assets"] as const) {
      expect(fileUnavailableReason({ kind, build, hasAppStoreKey: true, linkProblem: null, planActive: false })).toBe("Choose a plan for this app to download it");
      expect(fileUnavailableReason({ kind, build, hasAppStoreKey: true, linkProblem: null, planActive: true })).toBeNull();
    }
    expect(fileUnavailableReason({ kind: "keystore", build, hasAppStoreKey: true, linkProblem: null, planActive: false })).toBeNull();
    // Not said (other callers): as before.
    expect(fileUnavailableReason({ kind: "apk", build, hasAppStoreKey: true, linkProblem: null })).toBeNull();
  });
});
