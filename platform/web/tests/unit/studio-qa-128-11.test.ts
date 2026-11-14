import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW } from "./helpers";

/**
 * 128.11 QA of the Studio demos: on Studio's canvas a transparent header over a cover stays at the top of the screen,
 * its background fading in once the page scrolls under it (tests/e2e/studio-setup.spec.ts scrolls it), as the app
 * draws it (mobile studio_page.dart); over anything else, and every other header, as before.
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Rawaq Academy", logoUrl: null, brand: "#1E3A2F", font: "Alexandria", tabs: [], activeTab: null };

const draw = (page: StudioPage) => renderToStaticMarkup(createElement(StudioView, { page, lang: "en", defaultLang: "en", dark: false, look: LOOK, pickable: { items: {}, categories: {}, samples: sampleEntries(NOW) }, words: WORDS }));
const page = (children: StudioNode[], header: StudioPage["header"]): StudioPage => ({ header, background: "#F7F4EC", body: { id: "root", type: "column", children } });
const text = (id: string): StudioNode => ({ id, type: "text", text: `Text ${id}` });
const cover: StudioNode = { id: "photo", type: "stack", height: 240, image_background_url: "https://x.test/library.jpg", scrim: { color: "#0E221B", from: 0.2, to: 0.9 }, children: [text("on")] };
const transparent = { type: "transparent" as const, buttons: ["notifications" as const] };

describe("128.11 a transparent header over a cover on the canvas", () => {
  it("stays at the top of the screen, see-through until the page scrolls under it", () => {
    const html = draw(page([cover, text("next")], transparent));
    expect(html).toContain('data-studio-header-over-cover="top"');
    expect(html).toMatch(/<div style="position:sticky;top:0;height:0;z-index:2" data-studio-header-over-cover="top"><span aria-hidden="true" data-studio-header-under="" style="[^"]*background:transparent/);
    expect(html).toContain("Rawaq Academy");
  });

  it("leaves every other header as it was", () => {
    for (const html of [draw(page([text("first")], transparent)), draw(page([cover], { type: "logo_actions", buttons: ["search"] })), draw(page([cover], null))]) {
      expect(html).not.toContain("data-studio-header-over-cover");
      expect(html).not.toContain("position:sticky");
    }
  });
});
