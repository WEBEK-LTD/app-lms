import type { StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext } from "../sections";
import { idOf, pad, screen, type DemoInk } from "./parts";

/**
 * 126 Safra (Studio's travel demo), ink and gold as the travel designs were
 * approved: its Explore is the travel template (the question, what the app
 * does, a stay or a flight, then the stays the company features), and its
 * Stays, Flights and Trips are the app's own travel screens
 * (mobile/lib/modules/travel), drawn on the module's paper. 128 In the
 * registry the eight demos are in (this folder's index.ts): its template,
 * its pages' colours (the module's TravelTokens, light and dark), its tabs
 * (its kind's: Explore, Stays, Flights, Trips, Account) and its bar.
 */

/** The travel module's colours (mobile/lib/modules/travel/widgets/travel_ui.dart TravelTokens). */
export const SAFRA_INK: DemoInk = {
  page: "#F7F3EC",
  darkPage: "#0E1424",
  surface: "#FFFFFF",
  darkSurface: "#1B2338",
  ink: "#0E1424",
  darkInk: "#F4EFE6",
  muted: "#5F6472",
  darkMuted: "#B4B8C6",
  line: "#E6DFD2",
  darkLine: "#2A3350",
};
const GOLD = "#C9A063";
const K = SAFRA_INK;

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: value, ...extra };
}

/** A travel app's welcome, as Explore has it: the question, what the app does, a stay or a flight. */
function travelWelcome(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("travelTitle"),
    gap: 10,
    padding: pad(24, 18),
    margin: pad(12, 10),
    radius: 24,
    // 128 By night on the dark surface, never the page's own ink (it vanished into it).
    background: K.ink,
    dark_background: K.darkSurface,
    color: "#FFFFFF",
    children: [
      { id: id(), type: "icon", icon: "travel_explore", icon_size: 30, color: GOLD },
      text(ctx, ctx.w("travelTitle"), { font: { size: 26, weight: 700, line_height: 1.2 } }),
      text(ctx, ctx.w("travelText"), { font: { size: 14 }, opacity: 0.85 }),
      {
        id: id(),
        type: "row",
        gap: 8,
        children: [
          { id: id(), type: "button", text: ctx.w("travelStays"), width: "hug", height: 44, radius: 14, background: GOLD, color: K.ink, font: { weight: 800, size: 14 }, padding: pad(0, 18), action: screen("stays"), motion: { press: "shrink" } },
          { id: id(), type: "button", text: ctx.w("travelFlights"), width: "hug", height: 44, radius: 14, background: K.ink, dark_background: K.darkSurface, border_color: "#FFFFFF", border_width: 1.5, color: "#FFFFFF", font: { weight: 700, size: 14 }, padding: pad(0, 16), action: screen("flights") },
        ],
      },
    ],
  };
}

/** The stays the company features, as cards across. */
function travelStays(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("travelFeatured"),
    gap: 8,
    padding: pad(6, 10),
    children: [
      text(ctx, ctx.w("travelFeatured"), { font: { size: 19, weight: 800 } }),
      { id: id(), type: "items", source: "hotels", layout: "carousel", gap: 12, query: { limit: 6, category_id: null, featured: false, sort: "newest", ids: [] } },
    ],
  };
}

/** A travel app's home: Explore as approved (the welcome, a stay or a flight, the featured stays), drawn by the app; the owner adds to it. */
export function safraHome(ctx: SectionContext): StudioPage {
  return {
    // 128 The ink header by day, the dark surface by night (not the app's lightened blue).
    header: { type: "logo_actions", buttons: ["menu", "notifications", "account"], background: K.ink, color: "#FFFFFF", dark_background: K.darkSurface, dark_color: K.darkInk },
    body: { id: idOf(ctx)(), type: "column", gap: 4, padding: { bottom: 16 }, children: [travelWelcome(ctx), travelStays(ctx)] },
  };
}

/** Safra's pages after its home: the app's own travel screens, nothing over them (they search, book and show the trip themselves). */
export function safraPage(): StudioNode[] | null {
  return null;
}
