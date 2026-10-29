import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhonePreview } from "@/app/dashboard/pages/preview";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import type { LayoutContent } from "@/lib/pages/types";

/** 110 The phone preview keeps a number's order right to left, as the app does. */
describe("phone preview numbers", () => {
  it("gives each number its own direction, so \"10+\" isn't \"+10\" in Arabic", () => {
    const layout: LayoutContent = {
      appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null },
      languages: { default: "ar", available: ["ar"] },
      tabs: [],
      pages: [
        {
          slug: "home",
          title: "الرئيسية",
          show_title: false,
          updated_at: "2026-10-29T10:00:00Z",
          blocks: [{ id: "s", type: "stats", visibility: "everyone", title: null, stats: [{ value: "10+", label: "سنوات" }, { value: "7 أيام", label: "في الأسبوع" }] }],
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(PhonePreview, { layout, page: layout.pages[0]!, lang: "ar", pickable: { items: {}, categories: {} }, app: { name: "نايل", primaryColor: "#123A5C" }, onOpenPage: () => undefined, still: true }),
    );
    expect(html).toContain('dir="rtl"');
    expect(html).toMatch(/<div dir="auto" data-stat-value=""[^>]*>10\+<\/div>/);
    expect(html).toMatch(/<div dir="auto" data-stat-value=""[^>]*>7 أيام<\/div>/);
  });
});
