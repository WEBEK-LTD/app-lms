import { isAppType, kindOf } from "../../app/kinds";
import type { App, AppVertical } from "../../data/types";
import { safeHref } from "../html";
import type { Action, LayoutBlock, LayoutContent, LayoutPage, LayoutTab, ScreenName } from "../types";
import { ACADEMY_DESIGNS } from "./academy";
import { BOOKINGS_DESIGNS, CLINIC_DESIGNS, FITNESS_DESIGNS, SERVICES_DESIGNS } from "./bookings";
import { aboutPage, contactPage, page, PALETTES, tab, type Design, type Palette } from "./build";
import { CHARITY_DESIGNS, EVENTS_DESIGNS, NEWS_DESIGNS, REAL_ESTATE_DESIGNS } from "./more";
import { RESTAURANT_DESIGNS, STORE_DESIGNS } from "./store";

export type { Design } from "./build";
export { blockTexts, sampleTexts } from "./texts";

/**
 * 33 Ready-made designs: three or four whole layouts (tabs, a home page of
 * blocks and a look) for each kind of app, kept as data. The owner picks
 * one in the Branding step or in Pages & look; it replaces the draft, never
 * what's published, and they edit everything after. tests/unit/designs.test.ts
 * checks each against the same validator publishing uses.
 */
const MENU_ICONS: Record<string, string> = { about: "info", contact: "call", offers: "local_offer" };

export const DESIGNS: readonly Design[] = [
  ...ACADEMY_DESIGNS,
  ...STORE_DESIGNS,
  ...RESTAURANT_DESIGNS,
  ...BOOKINGS_DESIGNS,
  ...CLINIC_DESIGNS,
  ...FITNESS_DESIGNS,
  ...SERVICES_DESIGNS,
  ...REAL_ESTATE_DESIGNS,
  ...NEWS_DESIGNS,
  ...EVENTS_DESIGNS,
  ...CHARITY_DESIGNS,
].map(withCompanyPages);

/**
 * 84.2 Every design has an About us and a Contact page besides its own
 * (those it lacks are added), in the side menu with the pages it has that
 * no tab opens; and colours to choose from: its own, then two of PALETTES.
 */
export function withCompanyPages(design: Design, index: number): Design {
  const pages = [...design.pages];
  if (!pages.some((p) => p.slug === "about")) pages.push(aboutPage());
  if (!pages.some((p) => p.slug === "contact")) pages.push(contactPage());
  const inTabs = new Set(design.tabs.map((t) => (t.target.type === "page" ? t.target.page_slug : null)));
  const menu: LayoutTab[] = pages
    .filter((p) => p.slug !== "home" && !inTabs.has(p.slug))
    .map((p) => tab(`menu-${p.slug}`, p.title, MENU_ICONS[p.slug] ?? "info", page(p.slug)));
  // Its own: the app keeps its main colour.
  const own: Palette = { id: "design", name: "The design's colours", primary: null, secondary: design.look.secondary_color ?? PALETTES[0]!.secondary };
  const others = [PALETTES[index % PALETTES.length]!, PALETTES[(index + 3) % PALETTES.length]!];
  return { ...design, pages, ...(menu.length ? { menu } : {}), palettes: [own, ...others] };
}


export function designById(id: unknown): Design | null {
  return DESIGNS.find((d) => d.id === id) ?? null;
}

/** The designs for the app's kind (its engine and vertical). */
export function designsFor(app: Pick<App, "appType"> & { vertical?: AppVertical | null }): Design[] {
  if (!isAppType(app.appType)) return [];
  const kind = kindOf(app).id;
  return DESIGNS.filter((d) => d.kind === kind);
}

/** Whether the design is one of the app's kind's. */
export function designFits(design: Design, app: Pick<App, "appType"> & { vertical?: AppVertical | null }): boolean {
  return designsFor(app).some((d) => d.id === design.id);
}

/** What the app already says publicly about how to reach it: the Contact blocks get these. */
export interface ContactFacts {
  website: string | null;
  email: string | null;
  whatsapp: string | null;
}

export function contactFacts(app: Pick<App, "siteUrl" | "supportEmail" | "hostedSettings">): ContactFacts {
  const site = app.siteUrl ? safeHref(app.siteUrl) : null;
  return {
    website: site && /^https:\/\//i.test(site) ? site : null,
    email: app.supportEmail ?? null,
    whatsapp: app.hostedSettings?.supportWhatsapp ?? null,
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/** 38.21 Whether an action opens a screen the app doesn't have. */
const opensMissing = (action: Action | null | undefined, missing: readonly ScreenName[]) => action?.type === "screen" && action.screen != null && missing.includes(action.screen);

/**
 * `{app}` in the block's texts becomes the app's name; a countdown's `+30d` a date; a Contact block gets the app's details.
 * 38.21 Quick links to screens the app doesn't have are left out (and the block when none is left).
 */
function fillBlock(block: LayoutBlock, name: string, facts: ContactFacts, now: Date, missing: readonly ScreenName[] = []): LayoutBlock | null {
  const out = structuredClone(block);
  if (out.links) {
    out.links = out.links.filter((l) => !opensMissing(l.action, missing));
    if (out.links.length === 0) return null;
  }
  const fill = (text: string, html: boolean) => text.replaceAll("{app}", html ? escapeHtml(name) : name);
  if (out.html) out.html = fill(out.html, true);
  for (const field of ["heading", "subheading", "text", "title"] as const) {
    const value = out[field];
    if (typeof value === "string") out[field] = fill(value, false);
  }
  for (const slide of out.slides ?? []) {
    if (slide.heading) slide.heading = fill(slide.heading, false);
  }
  if (out.type === "countdown") {
    const days = Number(/^\+(\d+)d$/.exec(out.ends_at ?? "")?.[1] ?? 30);
    const ends = new Date(now.getTime() + days * 86_400_000);
    // On the hour, so the countdown reads cleanly.
    ends.setUTCMinutes(0, 0, 0);
    out.ends_at = ends.toISOString().replace(/\.000Z$/, "Z");
  }
  if (out.type === "contact") {
    out.website = facts.website;
    out.email = facts.email;
    out.whatsapp = facts.whatsapp;
    if (!out.website && !out.email && !out.whatsapp && !out.phone && !out.address) return null;
  }
  return out;
}

/**
 * The draft a design makes: its tabs, pages and look on top of the app's
 * current look and languages (the main color is the owner's, from
 * Branding). Texts stay in the default language; nothing is published.
 */
export function applyDesign(
  design: Design,
  context: {
    appName: string | null;
    facts: ContactFacts;
    current: Pick<LayoutContent, "appearance" | "languages">;
    now: Date;
    /** 38.21 Screens this app doesn't have (a hosted academy's wishlist): its tabs and quick links to them are left out. */
    missingScreens?: readonly ScreenName[];
  },
): LayoutContent {
  const missing = context.missingScreens ?? [];
  const name = context.appName?.trim() || "our app";
  const pages: LayoutPage[] = design.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    show_title: p.show_title,
    updated_at: context.now.toISOString(),
    blocks: p.blocks.map((b) => fillBlock(b, name, context.facts, context.now, missing)).filter((b): b is LayoutBlock => b !== null),
  }));
  return {
    appearance: { ...context.current.appearance, ...design.look },
    languages: structuredClone(context.current.languages),
    tabs: structuredClone(design.tabs).filter((t) => !opensMissing(t.target, missing)),
    // 84.2 Its other pages, in the side menu.
    ...(design.menu?.length ? { menu: structuredClone(design.menu) } : {}),
    pages,
  };
}

/** 38.21 The screens an app's designs can't link to: a hosted academy has no wishlist. */
export function missingScreens(app: Pick<App, "connector">): ScreenName[] {
  return app.connector?.kind === "courses" ? ["favorites"] : [];
}
