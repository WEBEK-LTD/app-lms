import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeviceFrame, PhoneFrame } from "@/components/device-frame";

/** 19 One phone frame for the site and the dashboard, thin at every size. */
describe("phone frame", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

  it("scales the bezel, the corners and the camera with the phone's width", () => {
    expect(css).toMatch(/\.phone \{\s*container-type: inline-size;/);
    expect(css).toContain("--phone-bezel: clamp(3px, 2.6cqw, 10px);");
    expect(css).toContain("--phone-radius: 14cqw;");
    expect(css).toContain("border-radius: calc(var(--phone-radius) - var(--phone-bezel));");
    expect(css).toMatch(/\.phone-island \{[^}]*width: 28cqw;/);
    // Side buttons only on phones wide enough to show them.
    expect(css).toMatch(/@container \(width < 180px\) \{\s*\.phone-button \{\s*display: none;/);
    expect(css).toContain("--color-phone: #16161a;");
  });

  it("draws a frame with a screen that keeps a phone's proportions, and the camera by default", () => {
    const html = renderToStaticMarkup(createElement(PhoneFrame, { className: "w-[250px]", "aria-hidden": "true" }, createElement("p", null, "Hello")));
    expect(html).toContain('class="phone max-w-full w-[250px]"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="phone-screen aspect-[1080/2340] bg-ivory"');
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain("data-phone-island");
    expect(html.match(/phone-button/g)).toHaveLength(3);
    // No fixed-size bezels or corners left over from the old frame.
    expect(html).not.toMatch(/rounded-\[\d+px\]|p-\[\d+px\]/);
  });

  it("leaves the camera out on request (the live preview has no status bar)", () => {
    const html = renderToStaticMarkup(createElement(PhoneFrame, { island: false, screenClassName: "h-[600px]" }, "x"));
    expect(html).not.toContain("data-phone-island");
    expect(html).toContain('class="phone-screen h-[600px]"');
  });

  it("puts every screenshot in the same frame at its size", () => {
    const html = renderToStaticMarkup(createElement(DeviceFrame, { screen: "academy-home", size: "xs" }));
    expect(html).toContain('class="phone max-w-full w-[136px]"');
    expect(html).toContain('data-screen="academy-home"');
    expect(html).toContain("data-phone-island");
    expect(html).toContain("url=%2Fscreens%2Facademy-home.png");
  });
});
