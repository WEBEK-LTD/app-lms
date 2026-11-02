import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { deliver, pushAudienceOf } from "@/lib/delivery/notify";
import type { PushTarget, ServiceAccount } from "@/lib/hosted/push";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW } from "./helpers";
import { pushRolesStoreSuite } from "./push-roles-store-suite";

const ACCOUNT = { project_id: "nile", client_email: "push@nile.test", private_key: "key" } as ServiceAccount;

/** 112.3 The couriers' and drivers' pushes go to their own app's phones, the customers' to the customers' app's. */
describe("112.3 each app's own pushes", () => {
  pushRolesStoreSuite(() => new MemoryStore());

  it("knows whose app each push is for", () => {
    expect(pushAudienceOf("courier_job")).toBe("second");
    expect(pushAudienceOf("ride_offer")).toBe("second");
    for (const type of ["shipment_update", "food_order_update", "restaurant_order", "ride_update", "announcement", undefined]) expect(pushAudienceOf(type)).toBe("customers");
  });

  it("keeps the role each app sends with its push token, and sends each app its own pushes", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("client-1", null, NOW, "delivery"), backend: "hosted", connector: { kind: "deliveries" } };
    await store.createApp(app);
    const sender = new LogSender();
    // Each sign-in a while after the last, as a new code may be asked for only so often.
    let now = NOW;
    const call = async (method: string, route: string, options: { body?: unknown; token?: string | null } = {}) => {
      const context: HostedContext = { store, app, active: true, now, ip: "203.0.113.9", country: "EG", secret: "test-hosted-secret", sender, push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" };
      const result = await handleHosted(context, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null });
      expectContract(method, route, result);
      return result;
    };
    // One person (a courier who also sends parcels) on the customers' app and the courier app.
    const signIn = async (install: string, name?: string) => {
      const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1005556666" } });
      const requestId = (requested.body as { request_id: string }).request_id;
      const device = { id: install, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
      const verified = (await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+201005556666")!, device } })).body as { signup_token?: string; access_token?: string };
      if (verified.access_token) return verified.access_token;
      return ((await call("POST", "/auth/register", { body: { signup_token: verified.signup_token, name: name ?? "Omar", device } })).body as { access_token: string }).access_token;
    };
    const customers = await signIn("install-customers", "Omar");
    expect((await call("PUT", "/me/push-token", { token: customers, body: { token: "push-customers", role: "customer" } })).status).toBe(204);
    now = new Date(now.getTime() + 10 * 60_000);
    const courier = await signIn("install-courier");
    expect((await call("PUT", "/me/push-token", { token: courier, body: { token: "push-courier", role: "courier" } })).status).toBe(204);
    // A role that isn't one is refused.
    expect((await call("PUT", "/me/push-token", { token: courier, body: { token: "push-courier", role: "admin" } })).status).toBe(400);
    // Sent again without one (as on a token refresh of an older app), the role stays.
    expect((await call("PUT", "/me/push-token", { token: courier, body: { token: "push-courier" } })).status).toBe(204);
    // A customers' app built before sends no role (the account's third phone, as the device limit leaves no room to sign in on it here).
    const user = (await store.getHostedUserByPhone(app.id, "+201005556666"))!;
    const [first] = await store.listHostedDevices(app.id, user.id);
    await store.createHostedDevice({ ...first!, id: "device-before", deviceId: "install-before", pushToken: "push-before", appRole: null });
    const roles = Object.fromEntries((await store.listAppHostedDevices(app.id)).map((d) => [d.pushToken, d.appRole ?? null]));
    expect(roles).toEqual({ "push-customers": "customer", "push-courier": "courier", "push-before": null });

    const sent: string[][] = [];
    const deps = {
      store,
      app,
      account: ACCOUNT,
      now: NOW,
      send: async (_: ServiceAccount, targets: PushTarget[]) => {
        sent.push(targets.map((t) => (typeof t === "string" ? t : t.token)).sort());
        return { sent: targets.length, invalidTokens: [] };
      },
    };
    const words = { title: "A job", body: "Pick it up" };
    await deliver(deps, user.id, words, { type: "courier_job", shipment_id: "1" }, false);
    await deliver(deps, user.id, words, { type: "ride_offer", ride_id: "1" }, false);
    await deliver(deps, user.id, words, { type: "shipment_update", shipment_id: "2" }, true);
    expect(sent).toEqual([
      ["push-before", "push-courier"],
      ["push-before", "push-courier"],
      ["push-before", "push-customers"],
    ]);
  });
});
