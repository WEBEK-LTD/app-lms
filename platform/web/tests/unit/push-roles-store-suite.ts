import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedAppRole } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 112.3 Each of a company's two apps gets its own pushes, the same on every store. */
export function pushRolesStoreSuite(store: () => DataStore) {
  it("112.3 lists the customers' app's phones for the customers' pushes and the second app's for the couriers' and drivers'; phones of apps built before for both", async () => {
    const s = store();
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Nile Express", email: `nile-${suffix}@push.test`, whatsapp: "+201000000196", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "delivery"), backend: "hosted", connector: { kind: "deliveries" } };
    await s.createApp(app);
    const user = (await s.createHostedUser({ appId: app.id, phone: `+2010${suffix.replace(/\D/g, "").padEnd(4, "1").slice(0, 4)}0001`, name: "Omar", email: null, city: null, now: NOW }))!;
    const phone = async (token: string, appRole: HostedAppRole | null) =>
      s.createHostedDevice({
        id: randomUUID(),
        appId: app.id,
        userId: user.id,
        deviceId: randomUUID(),
        platform: "android",
        name: "Phone",
        appVersion: "1.0.0",
        pushToken: `${token}-${suffix}`,
        pushPreferences: null,
        language: null,
        country: null,
        appRole,
        createdAt: NOW,
        lastSeenAt: NOW,
      });
    await phone("customers", "customer");
    await phone("courier", "courier");
    await phone("before", null);
    const tokens = async (audience?: "customers" | "second") => (await s.listHostedPushDevices(app.id, [user.id], audience)).map((d) => d.pushToken!.replace(`-${suffix}`, "")).sort();
    expect(await tokens()).toEqual(["before", "customers"]);
    expect(await tokens("customers")).toEqual(["before", "customers"]);
    expect(await tokens("second")).toEqual(["before", "courier"]);
    expect(await tokens(undefined)).toEqual(["before", "customers"]);
    // Every phone of the app, for everyone: the same.
    expect((await s.listHostedPushDevices(app.id, null, "second")).map((d) => d.appRole ?? null).sort()).toEqual(["courier", null]);
  });
}
