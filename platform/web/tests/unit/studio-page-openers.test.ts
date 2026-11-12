import { describe, expect, it } from "vitest";
import { studioPageOpeners } from "@/lib/studio/tree";
import type { StudioNode } from "@/lib/pages/types";

/** 124 Studio's "Delete this page": what still opens the page. */
describe("124 studioPageOpeners", () => {
  const button = (slug: string): StudioNode => ({ id: "b", type: "button", action: { type: "page", page_slug: slug } } as unknown as StudioNode);
  const body = (children: StudioNode[]): StudioNode => ({ id: "root", type: "column", children } as unknown as StudioNode);
  it("names the tabs, the side menu and the other pages that open it, never the page itself", () => {
    const layout = {
      tabs: [{ label: "Promo", target: { type: "page", page_slug: "promo" } }, { label: "Home", target: { type: "page", page_slug: "home" } }],
      menu: [{ label: "Offers", target: { type: "page", page_slug: "promo" } }],
      pages: [
        { slug: "home", title: "Home", studio: { body: body([button("promo")]) } },
        { slug: "promo", title: "Promo", studio: { body: body([button("promo")]) } },
        { slug: "about", title: "About", blocks: [{ action: { type: "page", page_slug: "promo" } }] },
      ],
    };
    expect(studioPageOpeners(layout, "promo")).toEqual([
      { kind: "tab", name: "Promo" },
      { kind: "menu", name: "Offers" },
      { kind: "page", name: "Home" },
      { kind: "page", name: "About" },
    ]);
    expect(studioPageOpeners({ tabs: [], pages: layout.pages }, "about")).toEqual([]);
  });
});
