import { describe, expect, it } from "vitest";
import { appShows } from "@/app/studio/editor/publish-state";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedResult } from "@/lib/hosted/service";
import { hasUnpublishedChanges, publishLayout, saveDraft } from "@/lib/pages/layout";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { expectContract } from "./contract";
import { setupClient } from "./helpers";

/**
 * App audit (Kech Flora's home): the bag at the top changed in Studio but not
 * in the app. A Studio change is saved as the draft and reaches the app only
 * once it's published; the bar says which, and the app's `/pages` gets a new
 * version with each publish (the app looks again when it comes back to the
 * screen and reloads on a new one).
 */

const NOW = new Date("2026-11-17T09:00:00Z");
const LATER = new Date("2026-11-17T09:05:00Z");

describe("the Studio bar next to Publish", () => {
  it("says the app doesn't show the canvas while a change isn't saved or isn't published", () => {
    for (const status of ["saving", "unsaved", "invalid"] as const) expect(appShows(status, false, true)).toBe("pending");
    expect(appShows("saved", true, true)).toBe("pending");
    expect(appShows("saved", true, false)).toBe("pending");
  });

  it("says the app shows it once published, and nothing while Studio isn't on the plan", () => {
    expect(appShows("saved", false, true)).toBe("live");
    expect(appShows("saved", false, false)).toBeNull();
  });

  it("has its words in every language", () => {
    for (const dict of [en, ar, tr]) {
      for (const key of ["notInApp", "notInAppHint", "inApp", "inAppHint"] as const) expect(dict[key].trim()).not.toBe("");
    }
  });
});

describe("a Studio header's icon, saved then published", () => {
  const disc = (icon: string): StudioNode => ({
    id: "bag-disc",
    type: "row",
    width: 42,
    height: 42,
    radius: 21,
    align: "center",
    cross: "center",
    border_color: "#FFFFFF",
    border_width: 1,
    surface: { glass: 16, tint: 0.18 },
    action: { type: "screen", screen: "cart" },
    children: [{ id: "bag", type: "icon", icon, icon_size: 21, color: "#FFFFFF" }],
  });
  const layout = (icon: string): LayoutContent =>
    ({
      appearance: { template: "bold", theme_mode: "light", user_can_change_mode: true, secondary_color: "#e8b04b", font: "Outfit", corners: "round", cards: "elevated" },
      languages: { default: "en", available: ["en"] },
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      pages: [
        {
          slug: "home",
          title: "Home",
          show_title: false,
          updated_at: NOW.toISOString(),
          blocks: [],
          studio: { body: { id: "root", type: "column", children: [{ id: "top", type: "row", height: 68, cross: "center", children: [{ id: "word", type: "text", text: "KechFlora", width: "fill" }, disc(icon)] }] } },
        },
      ],
    }) as unknown as LayoutContent;

  it("reaches the app only when published, with a new version of the pages", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted" as const, appName: "KechFlora" };
    await store.createApp(app);
    const first = await publishLayout(store, app, layout("search"), "owner@kech.test", NOW);
    expect(first.ok ? [] : first.errors).toEqual([]);
    const get = async (path: string[]): Promise<HostedResult> => {
      const result = await handleHosted(
        { store, app, active: true, now: LATER, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector: null },
        { method: "GET", path, query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) },
      );
      expectContract("GET", path.length > 1 ? "/pages/{slug}" : "/pages", result);
      return result;
    };
    type Served = { studio: { body: { children: [{ children: [StudioNode, StudioNode] }] } } };
    const icon = async () => ((await get(["pages", "home"])).body as Served).studio.body.children[0].children[1].children![0]!.icon;
    const version = async () => ((await get(["pages"])).body as { version: string }).version;
    const before = await version();
    expect(await icon()).toBe("search");

    // Saved only (the editor's autosave): the app still gets what's published, and the bar says so.
    await saveDraft(store, app, layout("shopping_bag"), LATER);
    expect(hasUnpublishedChanges((await store.getAppLayout(app.id))!)).toBe(true);
    expect(await icon()).toBe("search");
    expect(await version()).toBe(before);

    // Published: the app's pages have a new version, and the bag.
    const published = await publishLayout(store, app, layout("shopping_bag"), "owner@kech.test", LATER);
    expect(published.ok ? [] : published.errors).toEqual([]);
    if (published.ok) expect(hasUnpublishedChanges(published.value)).toBe(false);
    expect(await version()).not.toBe(before);
    expect(await icon()).toBe("shopping_bag");
  });
});
