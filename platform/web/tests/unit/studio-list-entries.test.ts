import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import { ENGINES } from "@/lib/app/kinds";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { demoKind, type DemoId } from "@/lib/demo/constants";
import { pickableContent, type Pickable } from "@/lib/hosted/pages/pickable";
import type { ItemSource, StudioPage } from "@/lib/pages/types";
import { seedDemoSamples } from "@/lib/samples/demo";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW, days, setupClient } from "./helpers";

/**
 * Studio's canvas draws the kinds' own lists (restaurants, delivery
 * services, vehicle types, a school's news, courses) as the app's cards:
 * each entry's picture, line, price and badge; the samples the kind gets
 * while the project has none, never numbered boxes or "Price".
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const page = (source: ItemSource): StudioPage => ({ body: { id: "body", type: "column", children: [{ id: "list", type: "items", source, layout: "grid", columns: 2, query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] } }] } });
const draw = (source: ItemSource, pickable: Pickable, lang = "en") =>
  renderToStaticMarkup(createElement(StudioView, { page: page(source), lang: lang as "en", defaultLang: "en", dark: false, look: { name: "App", logoUrl: null, brand: "#1F7A4D", font: "Cairo", tabs: [], activeTab: null }, pickable, words: WORDS }));

describe("the kinds' lists on the canvas", () => {
  const samples = sampleEntries(NOW);

  it("show the kind's samples, with their drawn pictures, lines, prices and badges, while the project has none", () => {
    const empty: Pickable = { items: {}, categories: {}, samples };
    const food = draw("restaurants", empty);
    expect(food).toContain("Bayt El Koshary");
    expect(food).toMatch(/src="\/design-pictures\/art-dish-[a-z]+\.png"/);
    expect(food).toContain("Egyptian · Desserts");
    const delivery = draw("delivery_services", empty);
    for (const word of ["Same day", "Express", "+EGP 45.00", 'src="/design-pictures/art-service-express.png"']) expect(delivery).toContain(word);
    const courses = draw("courses", empty);
    expect(courses).toContain("UX Design Fundamentals");
    expect(courses).toMatch(/src="\/design-pictures\/art-course-[a-z]+\.png"/);
    expect(courses).toMatch(/TRY\s?[\d,]+\.00|Free/);
    expect(draw("vehicle_types", empty)).toContain("Everyday cars");
    expect(draw("school_news", empty)).toContain("Parents&#x27; evening on Thursday");
    for (const html of [food, delivery, courses]) {
      expect(html).not.toContain("[1]");
      expect(html).not.toContain(">Price<");
    }
    // In the language being edited.
    expect(draw("restaurants", empty, "ar")).toContain("مصري");
  });

  it("show the project's own entries as the app's cards, and never the samples beside them", () => {
    const own: Pickable = { items: { restaurants: [{ id: "7", title: "Our grill", subtitle: "Grill", imageUrl: "https://yallapp.test/a/1", price: null, badge: "★ 4.8" }] }, categories: {}, samples };
    const html = draw("restaurants", own);
    for (const word of ["Our grill", 'src="https://yallapp.test/a/1"', "★ 4.8", "Grill"]) expect(html).toContain(word);
    expect(html).not.toContain("Bayt El Koshary");
  });

  it("are read with each entry's picture, line and badge from a project started from a demo", { timeout: 60_000 }, async () => {
    const { store, client } = await setupClient({ plan: "pro", activeUntil: days(60) });
    const blobs = new Map<string, Buffer>();
    const like = async (demo: DemoId) => {
      const kind = demoKind(demo);
      const base: App = { ...newApp(client.id, null, NOW, kind.engine, kind.vertical), backend: "hosted", siteUrl: null, appName: "Nour" };
      const app: App = { ...base, ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW };
      await store.createApp(app);
      await seedDemoSamples({ store, putBlob: async (key, data) => void blobs.set(key, data), now: NOW }, app.id, demo);
      return (await store.getAppById(app.id))!;
    };
    const deps = { store, key: Buffer.alloc(32), assetUrl: (id: string) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test" };
    const food = await pickableContent(await like("food"), deps, NOW);
    expect(food.items.restaurants!.length).toBeGreaterThan(0);
    expect(food.items.restaurants!.every((r) => !!r.imageUrl && !!r.subtitle)).toBe(true);
    const delivery = await pickableContent(await like("delivery"), deps, NOW);
    expect(delivery.items.delivery_services!.every((s) => !!s.imageUrl)).toBe(true);
    expect(delivery.items.delivery_services!.some((s) => s.badge?.startsWith("+"))).toBe(true);
    const school = await pickableContent(await like("school"), deps, NOW);
    expect(school.items.school_news!.length).toBeGreaterThan(0);
    expect(school.items.school_news!.every((n) => !!n.subtitle && !!n.badge)).toBe(true);
  });
});
