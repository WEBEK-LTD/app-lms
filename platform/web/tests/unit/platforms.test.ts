import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { ConnectorConfig } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import {
  platformConnector,
  platformConnectorConfig,
  platformValues,
  registerPlatform,
  type PlatformDefinition,
  type PlatformDeps,
} from "@/lib/hosted/connectors/platforms";
import { KEY, NOW, setupClient } from "./helpers";

// A platform with a public field, a secret, and an OAuth refresh token it renews.
let lastDeps: PlatformDeps | null = null;
const TEST_PLATFORM: PlatformDefinition = {
  id: "ikas",
  name: "Test platform",
  appType: "store",
  summary: "For the tests.",
  fields: [
    { name: "store", label: "Store name", hint: "", secret: false },
    { name: "apiKey", label: "API key", hint: "", secret: true },
  ],
  normalize: (values) => (values.store ? { values: { ...values, store: values.store.toLowerCase() } } : { errors: { store: "Enter it." } }),
  create: (values, deps) => {
    lastDeps = deps;
    return {
      check: async () => values.store!,
      config: async () => ({ features: { orders: false } }),
      handle: async () => ({ status: 200, body: values }),
    };
  },
};

describe("platform connectors", () => {
  it("store secrets encrypted and give every value back", async () => {
    const { client } = await setupClient();
    const app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted" as const };
    const connector = platformConnectorConfig(app.id, TEST_PLATFORM, { store: "rose", apiKey: "secret-key", refreshToken: "r1" }, KEY);
    expect(connector).toMatchObject({ kind: "platform", platform: "ikas", settings: { store: "rose" } });
    const raw = JSON.stringify(connector);
    expect(raw).not.toContain("secret-key");
    expect(raw).not.toContain("r1");
    expect(platformValues({ ...app, connector }, KEY)).toEqual({ store: "rose", apiKey: "secret-key", refreshToken: "r1" });
    expect(platformValues({ ...app, connector }, Buffer.alloc(32, 9))).toBeNull();
  });

  it("build the app's connector and save renewed secrets", async () => {
    registerPlatform(TEST_PLATFORM);
    const { store, client } = await setupClient();
    const base = newApp(client.id, null, NOW, "store");
    const app = { ...base, backend: "hosted" as const, connector: platformConnectorConfig(base.id, TEST_PLATFORM, { store: "rose", apiKey: "k", refreshToken: "r1" }, KEY) };
    await store.createApp(app);

    const connector = connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" });
    expect(await connector!.handle({ method: "GET", path: ["store", "home"], query: new URLSearchParams(), body: null, user: null, now: NOW })).toEqual({
      status: 200,
      body: { store: "rose", apiKey: "k", refreshToken: "r1" },
    });

    await lastDeps!.saveSecrets({ refreshToken: "r2" });
    const saved = await store.getAppById(app.id);
    expect(platformValues(saved!, KEY)).toEqual({ store: "rose", apiKey: "k", refreshToken: "r2" });
    expect(platformConnector({ ...app, connector: { ...(app.connector as Extract<ConnectorConfig, { kind: "platform" }>), platform: "unknown" } }, KEY, { store })).toBeNull();
  });
});
