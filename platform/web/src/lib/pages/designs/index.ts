import { isAppType, kindOf } from "../../app/kinds";
import type { App, AppVertical } from "../../data/types";
import { safeHref } from "../html";
import type { LayoutBlock, LayoutContent, LayoutPage } from "../types";
import { ACADEMY_DESIGNS } from "./academy";
import { BOOKINGS_DESIGNS, CLINIC_DESIGNS, FITNESS_DESIGNS } from "./bookings";
import type { Design } from "./build";
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
export const DESIGNS: readonly Design[] = [
  ...ACADEMY_DESIGNS,
  ...STORE_DESIGNS,
  ...RESTAURANT_DESIGNS,
  ...BOOKINGS_DESIGNS,
  ...CLINIC_DESIGNS,
  ...FITNESS_DESIGNS,
  ...REAL_ESTATE_DESIGNS,
  ...NEWS_DESIGNS,
  ...EVENTS_DESIGNS,
  ...CHARITY_DESIGNS,
];

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

/** `{app}` in the block's texts becomes the app's name; a countdown's `+30d` a date; a Contact block gets the app's details. */
function fillBlock(block: LayoutBlock, name: string, facts: ContactFacts, now: Date): LayoutBlock | null {
  const out = structuredClone(block);
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
  context: { appName: string | null; facts: ContactFacts; current: Pick<LayoutContent, "appearance" | "languages">; now: Date },
): LayoutContent {
  const name = context.appName?.trim() || "our app";
  const pages: LayoutPage[] = design.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    show_title: p.show_title,
    updated_at: context.now.toISOString(),
    blocks: p.blocks.map((b) => fillBlock(b, name, context.facts, context.now)).filter((b): b is LayoutBlock => b !== null),
  }));
  return {
    appearance: { ...context.current.appearance, ...design.look },
    languages: structuredClone(context.current.languages),
    tabs: structuredClone(design.tabs),
    pages,
  };
}
