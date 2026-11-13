import type { Action, LayoutTab, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import { newNodeId } from "./elements";
import { liveOrderCard, sectionHead, yallappPhoto } from "./photo-food";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 128 A marketplace, photo tiles (Zad's home as the owner approved it on
 * 13 November 2026, light and dark): where it delivers with the soonest
 * time and the search on a green bar, this week's offer on a market photo,
 * the departments as four photo tiles with their captions, and the places
 * near you as small chips; a bar of five tabs (Home, Shops, Cart, Orders,
 * Account), Shops a page of its own with every place. Every part an
 * ordinary Studio element: the bar and the places are the marketplace's
 * own data (`market`), the photos Yallapp's (public/demo-photos, free
 * licences in its CREDITS.json).
 */

export const MARKET_PHOTO_COLORS = {
  brand: "#1E6B52",
  amber: "#F2A93B",
  paper: "#F6F3EE",
  night: "#0D1712",
  surface: "#FFFFFF",
  nightSurface: "#16231C",
  ink: "#14231B",
  nightInk: "#EAF3EE",
  muted: "#5D6B63",
  nightMuted: "#A9BAB0",
  line: "#E5E0D6",
  nightLine: "#26352D",
  accentText: "#1E6B52",
  nightAccentText: "#7FD3AE",
  shade: "#0E281E",
} as const;
const C = MARKET_PHOTO_COLORS;

/** The approved bar: every tab named, the open one in a soft pill in the brand's green, 128 on the board's surface by day and by night. */
export const MARKET_PHOTO_TAB_BAR: TabBarStyle = { design: "classic", background: C.surface, dark_background: C.nightSurface, active: C.brand, dark_active: C.nightAccentText, inactive: C.muted, dark_inactive: C.nightMuted, labels: "always" };

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });
// The search across every place, which every marketplace has (the demo's Shops page is on its bar).
const shops: Action = { type: "screen", screen: "search" };

/** This week's offer on a photo, its words over a shade from the start. */
function offerBanner(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "stack",
    name: ctx.w("mpOffer"),
    height: 150,
    radius: 22,
    margin: { top: 14, end: 16, bottom: 0, start: 16 },
    image_background_url: yallappPhoto(ctx, "/demo-photos/cover-market.jpg"),
    scrim: { color: C.shade, from: 0.85, middle: 0.2, at: 70, to: 0.2, angle: 90 },
    action: shops,
    children: [
      {
        id: id(),
        type: "column",
        gap: 6,
        cross: "start",
        padding: { top: 18, end: 120, bottom: 0, start: 16 },
        color: "#FFFFFF",
        children: [
          { id: id(), type: "text", text: ctx.w("mpKicker"), font: { size: 12, weight: 800, letter_spacing: 1.7, uppercase: true }, color: C.amber },
          { id: id(), type: "text", text: ctx.w("mpOffer"), max_lines: 2, font: { size: 22, weight: 800, line_height: 1.1 }, color: "#FFFFFF" },
          {
            id: id(),
            type: "button",
            text: ctx.w("mpShopNow"),
            width: "hug",
            height: 32,
            radius: 16,
            background: "#FFFFFF",
            color: C.brand,
            font: { size: 12, weight: 800 },
            padding: pad(0, 12),
            margin: { top: 6, end: 0, bottom: 0, start: 0 },
            action: shops,
          },
        ],
      },
    ],
  };
}

/** The departments as four photo tiles, each with its name and a line under it over a shade at its foot. */
function departmentTiles(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  const tiles: [SectionWord, SectionWord, string][] = [
    ["mpFruit", "mpFruitText", "/demo-photos/fruit.jpg"],
    ["mpVeg", "mpVegText", "/demo-photos/vegetables.jpg"],
    ["mpBakery", "mpBakeryText", "/demo-photos/bakery.jpg"],
    ["mpDairy", "mpDairyText", "/demo-photos/dairy.jpg"],
  ];
  return {
    id: id(),
    type: "grid",
    name: ctx.w("mpFruit"),
    columns: 2,
    gap: 10,
    padding: { top: 14, end: 16, bottom: 0, start: 16 },
    children: tiles.map(([name, line, photo]) => ({
      id: id(),
      type: "stack",
      height: 112,
      radius: 20,
      image_background_url: yallappPhoto(ctx, photo),
      scrim: { color: "#000000", from: 0, middle: 0, at: 40, to: 0.7 },
      action: shops,
      children: [
        {
          id: id(),
          type: "column",
          height: 112,
          align: "end",
          padding: { top: 0, end: 12, bottom: 10, start: 12 },
          color: "#FFFFFF",
          children: [
            { id: id(), type: "text", text: ctx.w(name), max_lines: 1, font: { size: 15, weight: 800 }, color: "#FFFFFF" },
            { id: id(), type: "text", text: ctx.w(line), max_lines: 1, font: { size: 11 }, opacity: 0.9, color: "#FFFFFF" },
          ],
        },
      ],
    })),
  };
}

/** The approved home: the bar with the search, this week's offer, the departments and the places near you. */
export function marketPhotoHome(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      padding: { top: 0, end: 0, bottom: 24, start: 0 },
      children: [
        { id: id(), type: "market", market: { section: "address", style: "bar" }, text: ctx.w("mpSearch"), color: C.brand },
        offerBanner(ctx),
        departmentTiles(ctx),
        sectionHead(ctx, "mpNear", shops, { ink: C.ink, nightInk: C.nightInk, accent: C.accentText, nightAccent: C.nightAccentText }, { top: 16, end: 16, bottom: 8, start: 16 }, 17),
        { id: id(), type: "market", market: { section: "vendors", style: "chips", sort: "nearest", limit: 6 } },
      ],
    },
  };
}

/** Shops: a page of its own (a tab opens it), the kinds, every place as a card, and the club. */
export function marketShopsPage(ctx: SectionContext): StudioPage {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    header: { type: "title", title: ctx.w("tabShops"), buttons: ["search", "notifications"] },
    background: C.paper,
    dark_background: C.night,
    body: {
      id: id(),
      type: "column",
      padding: { top: 0, end: 0, bottom: 24, start: 0 },
      children: [
        { id: id(), type: "market", market: { section: "kinds" }, margin: { top: 8, end: 0, bottom: 0, start: 0 } },
        { id: id(), type: "market", market: { section: "vendors", style: "cards", sort: "nearest", limit: 20 }, title: ctx.w("mpShopsTitle"), margin: { top: 22, end: 0, bottom: 0, start: 0 } },
        { id: id(), type: "market", market: { section: "club" }, title: ctx.w("mClubFree"), text: ctx.w("mClubFreeText"), margin: { top: 10, end: 0, bottom: 0, start: 0 } },
      ],
    },
  };
}

/** Over a tab's screen: the order on its way over the orders. */
export function marketPhotoPage(screen: string, ctx: SectionContext): StudioNode[] | null {
  if (screen === "food_orders") return [{ ...liveOrderCard(ctx, "market_order", C.brand), margin: { top: 10, end: 16, bottom: 6, start: 16 } }];
  return null;
}

/**
 * The approved bar's tabs: Home, Shops (its own page), Cart, Orders and
 * Account, in place of the marketplace's Search and Club (the club is on
 * Shops, the search on the home).
 */
export function marketPhotoTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const home = tabs.find((t) => t.id === "home");
  const orders = tabs.find((t) => t.target.type === "screen" && (t.target.screen === "food_orders" || t.target.screen === "orders"));
  const account = tabs.find((t) => t.target.type === "screen" && t.target.screen === "account");
  const out: LayoutTab[] = [];
  if (home) out.push(structuredClone(home));
  out.push({ id: "shops", label: "Shops", icon: "grid_view", target: { type: "page", page_slug: "shops" } });
  out.push({ id: "cart", label: "Cart", icon: "shopping_bag", target: { type: "screen", screen: "cart" } });
  if (orders) out.push({ ...structuredClone(orders), icon: "receipt_long" });
  if (account) out.push({ ...structuredClone(account), icon: "person" });
  return out;
}
