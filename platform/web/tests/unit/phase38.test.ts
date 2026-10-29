import { beforeEach, describe, expect, it } from "vitest";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { DEMO_EVENTS } from "@/lib/demo/content";
import { setupDemoApps } from "@/lib/demo/setup";
import { connectorFor } from "@/lib/hosted/connectors";
import { durationLabel, itemWords } from "@/lib/hosted/pages/item-words";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 38 What a demanding user found trying every app type in the preview:
 * cards in English in Arabic and Turkish apps, a café that searched
 * "products" under a shop front, and a Saturday club on a Sunday.
 */

interface Card {
  source?: string;
  title: string;
  subtitle?: string | null;
  price_label?: string | null;
  badge?: string | null;
}

/** English words the hosted API used to write on cards whatever the language. */
const ENGLISH = /\b(Free|min|of|For sale|For rent|Negotiable|month|year|Sold out|left|Online|From|from|Ended|Goal reached|raised|Sale|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Oct|Nov)\b/;

describe("demo apps' cards in the app's language", { timeout: 30_000 }, () => {
  let store: MemoryStore;
  let apps: App[];

  beforeEach(async () => {
    clearPlatformSettingsCache();
    ({ store } = await setupClient());
    const result = await setupDemoApps({
      store,
      encryptionKey: KEY,
      putBlob: async () => {},
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
      actorEmail: "admin@yallapp.test",
      now: NOW,
    });
    apps = (await Promise.all(result.apps.map((a) => store.getAppById(a.appId)))) as App[];
  });

  const context = (app: App): HostedContext => ({
    store,
    app,
    connector: connectorFor(app, KEY, { store, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
    active: true,
    now: NOW,
    ip: "203.0.113.38",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
  });

  async function homeCards(app: App, lang: string): Promise<Card[]> {
    const result = await handleHosted(context(app), {
      method: "GET",
      path: ["pages", "home"],
      query: new URLSearchParams({ platform: "android" }),
      body: undefined,
      token: null,
      headers: new Headers({ "accept-language": lang }),
    });
    expect(result.status).toBe(200);
    const blocks = (result.body as { blocks: { type: string; items?: Card[] }[] }).blocks;
    return blocks.flatMap((b) => (b.type === "items" ? (b.items ?? []) : []));
  }

  it("writes prices, durations, badges and dates in Arabic and Turkish", async () => {
    let checked = 0;
    for (const app of apps) {
      const layout = await store.getAppLayout(app.id);
      const languages = layout?.published?.languages.available ?? ["en"];
      for (const lang of ["ar", "tr"].filter((l) => languages.includes(l as never))) {
        for (const card of await homeCards(app, lang)) {
          // 110.5 A school's news is the school's own words, as it wrote them.
          for (const text of [card.source === "school_news" ? null : card.subtitle, card.price_label, card.badge]) {
            if (!text) continue;
            // Names of people and places stay as written (a venue, a district).
            const words = text.replace(/Kuzey Culture Centre|Main Hall|Studio 2|Zamalek|Maadi|Heliopolis|Garden City|New Cairo|Sheikh Zayed/g, "");
            expect(words, `${app.appName} ${lang}: ${text}`).not.toMatch(ENGLISH);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("keeps English cards as the app shows them: an hour is \"1 h\"", async () => {
    const bookings = apps.find((a) => a.appType === "booking" && !a.vertical)!;
    const subtitles = (await homeCards(bookings, "en")).map((c) => c.subtitle);
    expect(subtitles).toContain("1 h");
    expect(subtitles).not.toContain("60 min");
    expect(durationLabel(90, "en")).toBe("1 h 30 min");
    expect(durationLabel(45, "ar")).toBe("45 د");
    expect(itemWords("xx").free).toBe("Free");
  });
});

describe("a café's first pages", () => {
  it("search the menu under a menu icon", () => {
    const layout = defaultLayout(
      { appType: "store", vertical: "restaurant", backend: "hosted", appName: "Defne Café", template: "bold", font: "Outfit", brandingDoneAt: NOW },
      BUILT_IN_APP_DEFAULTS,
      NOW,
    );
    const menu = layout.tabs.find((t) => t.label === "Menu");
    expect(menu?.icon).toBe("restaurant_menu");
    const search = layout.pages[0]!.blocks.find((b) => b.type === "search") as { placeholder: string } | undefined;
    expect(search?.placeholder).toBe("Search the menu");
    // A shop keeps its own.
    const shop = defaultLayout({ appType: "store", backend: "hosted", appName: "Rose Shop", template: "bold", font: "Outfit", brandingDoneAt: NOW }, BUILT_IN_APP_DEFAULTS, NOW);
    expect(shop.tabs.find((t) => t.label === "Shop")?.icon).toBe("storefront");
    expect((shop.pages[0]!.blocks.find((b) => b.type === "search") as { placeholder: string }).placeholder).toBe("Search products");
  });
});

describe("demo events", () => {
  it("name no weekday: their dates move with the demo", () => {
    for (const event of DEMO_EVENTS) expect(event.title).not.toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });
});
