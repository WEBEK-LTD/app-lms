import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/** 235 A Community app's /config: `community`, which the API check and the app look for. */
describe("235 the Community app type on the hosted API", () => {
  async function config(appType: "community" | "news") {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, appType);
    const app: App = {
      ...base,
      backend: "hosted",
      appName: "Bakers",
      websiteDoneAt: NOW,
      connector: { kind: appType === "community" ? "community" : "articles" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings },
    };
    await store.createApp(app);
    const result = await handleHosted(
      { store, app, active: true, now: NOW, ip: "203.0.113.9", secret: "s", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", connector: null },
      { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null },
    );
    expectContract("GET", "/config", result);
    return result.body as Record<string, unknown>;
  }

  it("sends `community` for a Community app and not for others", async () => {
    expect((await config("community")).community).toEqual({});
    expect((await config("news")).community).toBeUndefined();
  });
});
