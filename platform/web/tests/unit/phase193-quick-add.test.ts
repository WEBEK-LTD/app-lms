import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { ItemSource, StudioPage } from "@/lib/pages/types";
import { QUICK_ADD_WORDS, quickAddLabel, quickAddOn } from "@/components/studio/quick-add";
import { appString } from "@/lib/i18n/app-strings";

/**
 * 193 Studio's canvas draws the app's Add to cart under each product's card
 * on Leqaa's looks (the gift checkout), in the app's own words.
 */
describe("193 Add to cart on Studio's canvas", () => {
  it("in the app's words, in each of its languages", () => {
    const own = appString("addToCart")!;
    expect(QUICK_ADD_WORDS).toEqual({ en: own.en, ar: own.ar, tr: own.tr });
    expect(quickAddLabel("ar")).toBe("أضف إلى السلة");
    expect(quickAddLabel("fr")).toBe("Add to cart");
  });

  it("on a store whose checkout is the gift checkout only", () => {
    expect(quickAddOn("store", { look: "gift", mode: "gift" })).toBe(true);
    expect(quickAddOn("store", { mode: "gift" })).toBe(true);
    expect(quickAddOn("store", { look: "classic" })).toBe(false);
    expect(quickAddOn("store", null)).toBe(false);
    expect(quickAddOn("food", { look: "gift" })).toBe(false);
  });

  it("under each product's card on the canvas, never under other lists' or without the gift checkout", () => {
    const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
    const page = (source: ItemSource): StudioPage => ({ body: { id: "body", type: "column", children: [{ id: "list", type: "items", source, layout: "grid", columns: 2, query: { limit: 2, category_id: null, featured: false, sort: "newest", ids: [] } }] } });
    const pickable: Pickable = { items: { products: [{ id: "1", title: "Rose jar", price: "MAD 90.00" }, { id: "2", title: "Tulip box", price: "MAD 120.00" }], courses: [{ id: "3", title: "A course", price: "Free" }] }, categories: {} };
    const draw = (source: ItemSource, quickAdd: boolean, lang = "en") =>
      renderToStaticMarkup(createElement(StudioView, { page: page(source), lang: lang as "en", defaultLang: "en", dark: false, look: { name: "App", logoUrl: null, brand: "#8E2445", font: "Cairo", tabs: [], activeTab: null }, pickable, words: WORDS, quickAdd }));
    const count = (html: string) => html.split("data-studio-quick-add").length - 1;
    expect(count(draw("products", true))).toBe(2);
    expect(draw("products", true)).toContain("add_shopping_cart");
    expect(draw("products", true, "ar")).toContain("أضف إلى السلة");
    expect(count(draw("products", false))).toBe(0);
    expect(count(draw("courses", true))).toBe(0);
  });
});
