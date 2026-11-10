import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroStage, RotatingWord, type HeroNotice } from "@/site/home-motion";

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

describe("the home page's hero", () => {
  it("renders the first word still, hidden from assistive technology and as wide as the longest word", () => {
    const html = renderToStaticMarkup(createElement(RotatingWord, { words: ["your store", "your taxi company", "your school"] }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-sizer="your taxi company"');
    expect(html).toContain(">your store<");
    expect(html).not.toContain("your school<");
    expect(html).not.toContain("data-entering");
  });

  it("shows the first two notices from the first paint, as decoration", () => {
    const notices: HeroNotice[] = [
      { app: "Zad", text: "Your order is on its way", color: "#1E6B52", ink: "#fff", mark: "Z" },
      { app: "Nakhla School", text: "The bus is 5 minutes from home", color: "#1F4E79", ink: "#fff", mark: "N" },
      { app: "Your store", text: "New order", color: "var(--color-ember)", ink: "var(--color-midnight)", mark: { icon: "storefront" } },
    ];
    const html = renderToStaticMarkup(createElement(HeroStage, { notices, label: "Yallapp apps" }, createElement("i", null, "phones")));
    expect(html).toContain('role="group" aria-label="Yallapp apps"');
    expect(html).toContain("<i>phones</i>");
    expect(html.match(/class="hero-notice"/g)).toHaveLength(2);
    expect(html).toContain("Nakhla School");
    expect(html).not.toContain("Your store");
    expect(html).not.toContain("data-off");
    expect(html).toMatch(/<div aria-hidden="true"><div class="hero-notice"/);
  });

  it("keeps the title as the heading's text, and loads only the centre phone first", () => {
    const home = read("src/site/home.tsx");
    expect(home).toContain('<span className="sr-only">{text.title}</span>');
    expect(home).toContain('<span aria-hidden="true">');
    expect(home).toContain("priority={phone.x === 0}");
    for (const screen of ["taxi-map", "school-today", "zad-home", "store-home", "academy-home"]) expect(home).toContain(`screen: "${screen}"`);
    // The kinds' strip is the Works with strip's marquee: the other way right to left, still with less motion.
    expect(home).toMatch(/className="hero-ticker marquee/);
  });

  it("moves only with transforms and opacity, rests in place, and stands still with reduce motion", () => {
    const css = read("src/app/globals.css");
    const hero = css.slice(css.indexOf("The home page's hero"));
    // Scroll reveals: CSS only, tied to the scroll, with no fill, so nothing is left hidden before or after.
    expect(hero).toMatch(/@supports \(animation-timeline: view\(\)\) \{\s*@media \(prefers-reduced-motion: no-preference\) \{/);
    expect(hero).toContain("animation: home-reveal linear;");
    expect(hero).not.toMatch(/home-reveal linear (both|backwards)/);
    const keyframes = [...hero.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g)].map((m) => m[1]!);
    expect(keyframes.length).toBeGreaterThan(8);
    for (const body of keyframes) {
      const props = [...body.matchAll(/^\s+([a-z-]+):/gm)].map((m) => m[1]);
      for (const prop of props) expect(["transform", "opacity"]).toContain(prop);
    }
    const reduce = hero.slice(hero.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    for (const selector of [".hero-glow", ".hero-ping::after", ".hero-word-item", ".hero-cta::before", ".hero-phone", ".hero-notice"]) expect(reduce).toContain(selector);
    expect(reduce).toContain("animation: none !important;");
  });
});
