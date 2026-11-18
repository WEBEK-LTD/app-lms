import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { publishLayout } from "@/lib/pages/layout";
import type { LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { appWords } from "@/lib/studio/app-words";
import { automaticSize, autoSized, backToAutomatic, barWordmark, byHand, isCoverBar, sizedByHand } from "@/lib/studio/auto-size";
import { SECTIONS, TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { updateNode } from "@/lib/studio/edit";
import { findNode } from "@/lib/studio/tree";
import { expectContract } from "./contract";
import { setupClient } from "./helpers";

/**
 * 159 Sizes are automatic, by hand only when the owner wants it. Kech Flora's
 * home (Leqaa's Rose hour): the bar of the search, the wordmark and the bag
 * over the stories had a width in points (a corner drag on Studio's phone,
 * which never became "fill"), so the phone drew the bag about three quarters
 * of the way across. A cover's top bar is at its automatic size, across its
 * cover, unless it was sized by hand; going by hand asks first and keeps the
 * automatic size, which "Back to automatic" puts back.
 */

const NOW = new Date("2026-11-18T09:00:00Z");

function context(): SectionContext {
  let n = 0;
  return { brand: "#8E2445", source: "products", app: "KechFlora", lang: "en", w: appWords("en", "KechFlora"), picture: (f) => `/design-pictures/${f}`, newId: () => `k${++n}`, kind: { type: "store", vertical: null } } as SectionContext;
}

/** Kech Flora's home as the template makes it. */
function roseHome(): StudioPage {
  return TEMPLATES.find((t) => t.id === "flowers_signature_a")!.make(context());
}

/** The stories' stack, its bar and the bar's wordmark. */
function parts(body: StudioNode) {
  const hero = body.children![0]!;
  const bar = hero.children![1]!;
  return { hero, bar, word: bar.children!.find((k) => k.type === "text")! };
}

/** The home with its bar and wordmark changed as apps made from it may have them. */
function withBar(bar: Partial<StudioNode>, word: Partial<StudioNode> = {}): StudioNode {
  const page = roseHome();
  const p = parts(page.body);
  return updateNode(updateNode(page, p.bar.id, bar), p.word.id, word).body;
}

describe("159 a cover's top bar at its automatic size", () => {
  it("is Leqaa's bar over the stories: a row over the first layer with two buttons", () => {
    const { hero, bar, word } = parts(roseHome().body);
    expect(hero.type).toBe("stack");
    expect(isCoverBar(hero, bar)).toBe(true);
    // The template's own: it spans, its wordmark fills.
    expect(bar.width).toBe("fill");
    expect(word.width).toBe("fill");
    expect(barWordmark(bar)).toBeNull();
    // The slides (the first layer) aren't a bar.
    expect(isCoverBar(hero, hero.children![0]!)).toBe(false);
  });

  it("changes nothing in any template or section (the same objects)", () => {
    for (const t of TEMPLATES) {
      const page = t.make(context());
      expect(autoSized(page.body), t.id).toBe(page.body);
    }
    for (const s of SECTIONS) {
      const node = s.make(context());
      const body: StudioNode = { id: "body", type: "column", children: [node] };
      expect(autoSized(body), s.id).toBe(body);
    }
  });

  it("spans the cover whatever width the bar and its wordmark were given, unless sized by hand", () => {
    const cases: [Partial<StudioNode>, Partial<StudioNode>][] = [
      [{ width: 324 }, {}],
      [{ width: 300 }, { width: "hug" }],
      [{ width: "hug" }, { width: "hug" }],
      [{ width: undefined }, { width: undefined }],
      [{ width: 324 }, { width: 200 }],
    ];
    for (const [bar, word] of cases) {
      const drawn = parts(autoSized(withBar(bar, word)));
      expect(drawn.bar.width, JSON.stringify([bar, word])).toBe("fill");
      expect(drawn.word.width, JSON.stringify([bar, word])).toBe("fill");
    }
    // Its tablet width goes with it; the rest of its tablet changes stay.
    const tablet = parts(autoSized(withBar({ width: 324, tablet: { width: 500, gap: 20 } })));
    expect(tablet.bar.width).toBe("fill");
    expect(tablet.bar.tablet).toEqual({ gap: 20 });
    // Sized by hand: the owner's width, and the wordmark's too.
    const hand = parts(autoSized(withBar({ width: 324, manual_size: { width: "fill", height: 68 } }, { width: "hug", manual_size: { width: "fill", height: null } })));
    expect(hand.bar.width).toBe(324);
    expect(hand.word.width).toBe("hug");
    // The bar by hand, its wordmark still automatic: it takes the room between the buttons.
    expect(parts(autoSized(withBar({ width: 324, manual_size: { width: "fill", height: 68 } }, { width: "hug" }))).word.width).toBe("fill");
  });

  it("leaves other layers as they are: the first, one tap, a spot, a strip, a hidden one before it", () => {
    const disc = (id: string, tap = true): StudioNode => ({ id, type: "row", width: 42, ...(tap ? { action: { type: "screen" as const, screen: "cart" as const } } : {}) });
    const bar = (id: string, extra: Partial<StudioNode> = {}): StudioNode => ({ id, type: "row", width: 300, children: [disc(`${id}a`), { id: `${id}t`, type: "text", text: "Hi", width: 120 }, disc(`${id}b`)], ...extra });
    const stack = (children: StudioNode[]): StudioNode => ({ id: "body", type: "column", children: [{ id: "s", type: "stack", children }] });
    const pic: StudioNode = { id: "pic", type: "image" };
    for (const layers of [
      [bar("first"), pic],
      [pic, { ...bar("one"), children: [disc("x"), disc("y", false)] }],
      [pic, bar("spot", { place: { x: 10, y: 10 } })],
      [pic, bar("strip", { scroll: true })],
      [{ ...pic, hidden: true }, bar("after-hidden")],
    ]) {
      const body = stack(layers);
      expect(autoSized(body)).toBe(body);
    }
    // Two texts in the bar: no one wordmark, the bar spans only.
    const two = autoSized(stack([pic, { ...bar("two"), children: [disc("p"), { id: "t1", type: "text", text: "A" }, { id: "t2", type: "text", text: "B" }, disc("q")] }]));
    expect(findNode(two, "two")!.width).toBe("fill");
    expect(findNode(two, "t1")!.width).toBeUndefined();
  });
});

describe("159 going by hand, and back to automatic", () => {
  it("starts from the automatic size, keeps it, and puts it back", () => {
    const body = withBar({ width: 324 }, { width: "hug" });
    const { bar, word } = parts(body);
    // What the canvas draws, and the inspector shows, before any change by hand.
    expect(automaticSize(body, bar.id)).toEqual({ width: "fill", height: 68 });
    expect(automaticSize(body, word.id)).toEqual({ width: "fill", height: undefined });
    expect(sizedByHand(bar)).toBe(false);
    // The owner said so, and asked for 280 wide: by hand from Fill (not the old 324).
    const patch = byHand(automaticSize(body, bar.id), { width: 280 });
    expect(patch).toEqual({ width: 280, height: 68, manual_size: { width: "fill", height: 68 } });
    const page: StudioPage = { body };
    const manual = findNode(updateNode(page, bar.id, patch).body, bar.id)!;
    expect(sizedByHand(manual)).toBe(true);
    expect(parts(autoSized(updateNode(page, bar.id, patch).body)).bar.width).toBe(280);
    // Back to automatic: Fill and 68 again, nothing by hand left (its tablet sizes too).
    const back = findNode(updateNode({ body: updateNode(page, bar.id, { ...patch, tablet: { width: 500, padding: { top: 30 } } }).body }, bar.id, backToAutomatic({ ...manual, tablet: { width: 500, padding: { top: 30 } } })).body, bar.id)!;
    expect(back.width).toBe("fill");
    expect(back.height).toBe(68);
    expect(back.manual_size).toBeUndefined();
    expect(back.tablet).toEqual({ padding: { top: 30 } });
    // An element with no size of its own goes back to none: the layout's.
    const plain: StudioNode = { id: "t", type: "text", text: "Hi", width: 120, manual_size: { width: null, height: null } };
    expect(backToAutomatic(plain)).toEqual({ width: undefined, height: undefined, manual_size: undefined });
  });

  it("is kept by the page's check, and anything else about it is refused", () => {
    const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
    const languages = { default: "en" as const, available: ["en" as const] };
    const page = (manual: unknown): StudioPage => ({ body: { id: "root", type: "column", children: [{ id: "t", type: "text", text: "Hi", width: 120, manual_size: manual } as unknown as StudioNode] } });
    const ok = parseStudioPage(page({ width: "fill", height: null }), app, languages);
    expect(ok.ok && ok.value.body.children![0]!.manual_size).toEqual({ width: "fill", height: null });
    const none = parseStudioPage(page({}), app, languages);
    expect(none.ok && none.value.body.children![0]!.manual_size).toEqual({ width: null, height: null });
    const missing = parseStudioPage(page(undefined), app, languages);
    expect(missing.ok && "manual_size" in missing.value.body.children![0]!).toBe(false);
    expect(parseStudioPage(page("by hand"), app, languages).ok).toBe(false);
    expect(parseStudioPage(page({ width: "wide" }), app, languages).ok).toBe(false);
  });

  it("has its words in English, Egyptian Arabic and Turkish", () => {
    const keys = ["sizeAuto", "sizeAutoHint", "sizeByHand", "sizeByHandHint", "backToAuto", "sizeAutoDone", "byHandTitle", "byHandText", "byHandConfirm"] as const;
    for (const dict of [en, ar, tr]) for (const key of keys) expect(dict[key].trim(), key).not.toBe("");
    expect(en.byHandTitle).toBe("Change this element's size by hand?");
    expect(en.byHandText).toBe("It stops following the automatic layout. You can put it back any time.");
    for (const key of keys) {
      expect(ar[key], key).toMatch(/[؀-ۿ]/);
      expect(tr[key], key).not.toBe(en[key]);
    }
  });
});

describe("159 the hosted API serves a cover's top bar at its automatic size", () => {
  it("across the cover for an app whose bar has a width in points; the owner's when sized by hand", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted" as const, appName: "KechFlora" };
    await store.createApp(app);
    const layout = (body: StudioNode): LayoutContent =>
      ({
        appearance: { template: "bold", theme_mode: "light", user_can_change_mode: true, secondary_color: "#C89B6D", font: "DM Sans", corners: "round", cards: "elevated" },
        languages: { default: "en", available: ["en"] },
        tabs: [
          { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
          { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
        ],
        pages: [{ slug: "home", title: "Home", show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: { body } }],
      }) as unknown as LayoutContent;
    const served = async () => {
      const result = await handleHosted(
        { store, app, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector: null },
        { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) },
      );
      expectContract("GET", "/pages/{slug}", result);
      return parts((result.body as { studio: StudioPage }).studio.body);
    };
    // The template's bar over a photo (the slides' own photos are Yallapp's, served from its address).
    const cover = (body: StudioNode): StudioNode => {
      const { hero, bar } = parts(body);
      return { id: "root", type: "column", children: [{ ...hero, children: [{ id: "photo", type: "image", image_url: "https://files.test/rose.jpg", width: "fill", height: 520 }, bar] }] };
    };
    const published = await publishLayout(store, app, layout(cover(withBar({ width: 324 }, { width: "hug" }))), "owner@kech.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const auto = await served();
    expect(auto.bar.width).toBe("fill");
    expect(auto.word.width).toBe("fill");
    expect(auto.bar.manual_size).toBeUndefined();

    const hand = await publishLayout(store, app, layout(cover(withBar({ width: 324, manual_size: { width: "fill", height: 68 } }))), "owner@kech.test", NOW);
    expect(hand.ok ? [] : hand.errors).toEqual([]);
    const kept = await served();
    expect(kept.bar.width).toBe(324);
    expect(kept.bar.manual_size).toEqual({ width: "fill", height: 68 });
  });
});
