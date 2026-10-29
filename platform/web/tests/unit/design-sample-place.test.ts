import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { designById } from "@/lib/pages/designs";
import { isSamplePlace, SAMPLE_PLACE } from "@/lib/pages/designs/build";
import { designLayout, loadLayout, publishLayout } from "@/lib/pages/layout";
import { pluginLayout } from "@/lib/pages/plugin";
import type { LayoutContent } from "@/lib/pages/types";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 110.3 A design's Location block starts at a sample place. The editor and
 * the draft preview show it (marked as a sample); a published app, on the
 * hosted API or a WordPress site, never does until the owner moves the pin.
 */

const current: Pick<LayoutContent, "appearance" | "languages"> = { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: { default: "en", available: ["en"] } };

/** The layout with the Contact page's map moved to the owner's own place. */
function movedPin(layout: LayoutContent): LayoutContent {
  return { ...layout, pages: layout.pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => (b.type === "map" ? { ...b, latitude: 30.0444, longitude: 31.2357 } : b)) })) };
}

const mapsOf = (blocks: { type: string }[]) => blocks.filter((b) => b.type === "map");

describe("110.3 the design's sample place", () => {
  it("tells a Location block at the sample place", () => {
    expect(isSamplePlace({ type: "map", ...SAMPLE_PLACE })).toBe(true);
    expect(isSamplePlace({ type: "map", latitude: 30.0444, longitude: 31.2357 })).toBe(false);
    expect(isSamplePlace({ type: "contact", ...SAMPLE_PLACE })).toBe(false);
  });

  it("isn't served by the hosted API, but is in the draft preview, and is once the owner moves the pin", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Lale Flowers" };
    await store.createApp(app);
    const contact = async (draft = false) => {
      const ctx: HostedContext = {
        store,
        app,
        active: true,
        now: NOW,
        ip: "203.0.113.9",
        secret: "test-hosted-secret",
        sender: new LogSender(),
        push: false,
        assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
        platformUrl: "https://yallapp.test",
        connector: connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }),
        ...(draft ? { preview: { draft: true } } : {}),
      };
      const result = await handleHosted(ctx, { method: "GET", path: ["pages", "contact"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) });
      expect(result.status).toBe(200);
      return (result.body as { blocks: { type: string }[] }).blocks;
    };
    const layout = designLayout(app, designById("store-fashion")!, current, NOW);
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const published = await contact();
    expect(mapsOf(published)).toEqual([]);
    // The rest of the page stays.
    expect(published.map((b) => b.type)).toEqual(expect.arrayContaining(["text", "hours", "form"]));
    // The draft still has it, and its preview shows it, so the owner sees what to change.
    expect(mapsOf((await loadLayout(store, app, NOW)).draft.pages.find((p) => p.slug === "contact")!.blocks)).toHaveLength(1);
    expect(mapsOf(await contact(true))).toHaveLength(1);

    expect((await publishLayout(store, app, movedPin(layout), "owner@lale.test", NOW)).ok).toBe(true);
    expect(mapsOf(await contact())).toEqual([expect.objectContaining({ latitude: 30.0444, longitude: 31.2357, name: "Lale Flowers" })]);
  });

  it("never goes to the WordPress plugin until the owner moves the pin", async () => {
    const { store, client, licenseKey } = await setupClient();
    const parsed = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.3.0" });
    if (!parsed.ok) throw new Error("bad site");
    await activateLicense(store, parsed.value, NOW);
    const app = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Nour Academy" };
    await store.createApp(app);
    const contactOf = async () => {
      const result = await pluginLayout(store, parsed.value, null, NOW);
      if (result.status !== 200) throw new Error(`status ${result.status}`);
      return result.body.pages.find((p) => p.slug === "contact")!.blocks;
    };
    const layout = designLayout(app, designById("academy-classic")!, current, NOW);
    expect((await publishLayout(store, app, layout, "owner@academy.test", NOW)).ok).toBe(true);
    const blocks = await contactOf();
    expect(mapsOf(blocks)).toEqual([]);
    expect(blocks.map((b) => b.type)).toEqual(expect.arrayContaining(["text", "hours", "form"]));
    expect((await publishLayout(store, app, movedPin(layout), "owner@academy.test", NOW)).ok).toBe(true);
    expect(mapsOf(await contactOf())).toHaveLength(1);
  });
});
