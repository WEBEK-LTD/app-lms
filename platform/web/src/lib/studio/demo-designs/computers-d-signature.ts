import type { Action, FormField, LayoutTab, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { COMPUTERS_COUPON_CODE, computersTabs } from "./computers-signature";

/**
 * 227 Nawah's look D, the workstation (the computers type's second look):
 * clean light blue-grey, serious and dense, for companies and
 * professionals. Under the title and its search, three facts in one strip,
 * the workstations as a spec sheet (one hairline row each: photo, name,
 * full specs, price), the shop by processor, memory and storage, two
 * machines compared in a table, and the business quote request (the `form`
 * element, emailed to the shop). Alexandria, small radii, no shadows, a bar
 * across the bottom with a line over the open tab. Its own parts, built
 * only from Studio's elements.
 */

/** D · the workstation: blue-grey and white by day, deep slate by night, one steel blue. */
export const WORKSTATION_INK: SignatureInk = {
  page: "#E8EDF3",
  darkPage: "#0B1119",
  surface: "#FFFFFF",
  darkSurface: "#131B26",
  ink: "#0F1E33",
  darkInk: "#E6ECF4",
  muted: "#52627A",
  darkMuted: "#97A6BA",
  line: "#D3DBE6",
  darkLine: "#243244",
  accent: "#2A5885",
  darkAccent: "#8CBBEA",
  fill: "#2A5885",
  darkFill: "#4F86C0",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const K = WORKSTATION_INK;
const SOFT = { day: "#F2F5F9", night: "#172130" };
const ALEX = "Alexandria";
const R = 10;

const P = (name: string) => `/computers-photos/${name}.jpg`;
const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const DESK_MENU_PAGE = "menu";
export const DESK_QUOTE_PAGE = "business-quote";
export const DESK_COMPARE_PAGE = "compare";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: ALEX, size, weight: 600, line_height: 1.3, ...extra });
const say = (ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, K, ctx.w(word), font, extra);

/** A sheet: white with a hairline edge and small corners, no shadow. */
function sheet(extra: Partial<StudioNode> = {}): Partial<StudioNode> {
  return { radius: R, background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, ...extra };
}

/** A section's title in small capitals-like weight, its link in steel blue. */
function head(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, padding: StudioSides = sides(18, 16, 8, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding,
    children: [
      { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, title, face(14.5, { letter_spacing: 0.3 }), { max_lines: 1 }), ...(line ? [say(ctx, line, { family: ALEX, size: 11.5, weight: 400 }, { muted: true, max_lines: 1 })] : [])] },
      ...(link ? [say(ctx, link.word, { family: ALEX, size: 12, weight: 500 }, { accent: true, max_lines: 1, action: link.action })] : []),
    ],
  };
}

/** Three facts in one strip, a hairline between them. */
function factStrip(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const cell = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 4,
    padding: sides(10, 10, 10, 10),
    background: K.surface,
    dark_background: K.darkSurface,
    children: [{ id: id(), type: "icon", icon, icon_size: 20, color: K.accent, dark_color: K.darkAccent }, say(ctx, word, { family: ALEX, size: 11.5, weight: 500, line_height: 1.3 }, { max_lines: 2 })],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("pwKpiDelivery"),
    gap: 1,
    radius: R,
    padding: sides(1, 1, 1, 1),
    margin: sides(12, 16, 0, 16),
    background: K.line,
    dark_background: K.darkLine,
    children: [cell("local_shipping", "pwKpiDelivery"), cell("build", "pwKpiWarranty"), cell("inventory_2", "pwKpiBulk")],
  };
}

/** The spec sheet: products as hairline rows (photo, name, full specs, price), in one sheet. */
function specSheet(ctx: SectionContext, name: SectionWord, sort: "newest" | "popular", limit = 5): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "list",
    gap: 1,
    radius: R,
    padding: sides(1, 1, 1, 1),
    margin: sides(0, 16, 0, 16),
    background: K.line,
    dark_background: K.darkLine,
    query: { limit, category_id: null, featured: false, sort, ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 12, 10, 12),
      background: K.surface,
      dark_background: K.darkSurface,
      children: [
        { id: id(), type: "image", bind: "image", width: 64, height: 48, radius: 6, fit: "cover", background: SOFT.day, dark_background: SOFT.night },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 2,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: { family: ALEX, size: 13, weight: 600 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: { family: ALEX, size: 11, weight: 400 } },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "text", bind: "price", max_lines: 1, color: K.accent, dark_color: K.darkAccent, font: { family: ALEX, size: 12.5, weight: 600 } },
                { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: { family: ALEX, size: 10.5 } },
              ],
            },
          ],
        },
        { id: id(), type: "icon", icon: "chevron_right", icon_size: 18, color: K.muted, dark_color: K.darkMuted },
      ],
    },
  };
}

/** The shop by a spec (`spec_filter`) as a dense sheet: its title, then the values as chips. */
function specFilter(ctx: SectionContext, spec: "cpu" | "ram" | "storage", title: SectionWord): StudioNode {
  const t = sigTexts(ctx, { text: title });
  return { id: idOf(ctx)(), type: "spec_filter", name: ctx.w(title), text: t.text, translations: t.translations, tech: { spec, accent: K.fill, rows: 6 }, color: K.ink, dark_color: K.darkInk, ...sheet(), padding: sides(10, 12, 10, 12), margin: sides(8, 16, 0, 16) };
}

/** Two machines in a table (`compare`). */
function compareTable(ctx: SectionContext, margin = sides(0, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "compare", name: ctx.w("pwCompare"), tech: { accent: K.fill, rows: 6 }, color: K.ink, dark_color: K.darkInk, ...sheet(), padding: sides(12, 12, 12, 12), margin };
}

/** The business quote request: the `form` element, its answers emailed to the shop. Written in the project's main language, as the editor's forms are. */
function quoteForm(ctx: SectionContext, margin = sides(10, 0, 0, 0)): StudioNode {
  const fields: { kind: FormField["kind"]; label: SectionWord; required: boolean }[] = [
    { kind: "text", label: "pwQuoteCompany", required: true },
    { kind: "text", label: "pwQuoteName", required: true },
    { kind: "email", label: "pwQuoteEmail", required: true },
    { kind: "phone", label: "pwQuotePhone", required: false },
    { kind: "number", label: "pwQuoteQty", required: true },
    { kind: "long_text", label: "pwQuoteNeeds", required: false },
  ];
  return {
    id: idOf(ctx)(),
    type: "form",
    name: ctx.w("pwQuoteTitle"),
    form: { fields: fields.map((f, i) => ({ id: `q${i + 1}`, kind: f.kind, label: ctx.w(f.label), required: f.required, options: null })), submit_label: ctx.w("pwQuoteSend"), success_text: ctx.w("pwQuoteDone"), send_to: "email" },
    color: K.ink,
    dark_color: K.darkInk,
    margin,
  };
}

/** The quote card: a steel line at its start, its title and line, the form. */
function quoteCard(ctx: SectionContext, withForm: boolean): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("pwQuoteTitle"),
    gap: 4,
    padding: sides(14, 14, 14, 14),
    margin: sides(16, 16, 0, 16),
    ...sheet(),
    corners: { top_start: 4, bottom_start: 4, top_end: R, bottom_end: R },
    children: [
      { id: id(), type: "row", gap: 8, cross: "center", children: [{ id: id(), type: "icon", icon: "description", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, "pwQuoteTitle", face(15), { width: "fill", max_lines: 2 })] },
      say(ctx, "pwQuoteLine", { family: ALEX, size: 12, weight: 400, line_height: 1.55 }, { muted: true, max_lines: 4 }),
      ...(withForm
        ? [quoteForm(ctx)]
        : [
            <StudioNode>{
              id: id(),
              type: "button",
              name: ctx.w("pwQuoteButton"),
              text: ctx.w("pwQuoteButton"),
              icon: "arrow_forward",
              icon_position: "end",
              width: "fill",
              height: 42,
              radius: 7,
              margin: sides(8, 0, 0, 0),
              background: K.fill,
              dark_background: K.darkFill,
              color: K.onFill,
              dark_color: K.darkOnFill,
              font: { family: ALEX, size: 13.5, weight: 600 },
              action: ownPage(ctx, DESK_QUOTE_PAGE),
            },
          ]),
    ],
  };
}

/** The home's header: the title with its search under it (the look's `search` chrome), the menu and the cart. */
function homeHeader(ctx: SectionContext): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "pwWordmark" });
  return { type: "title_search", title: t.title, translations: t.translations, buttons: ["menu", "cart"], menu_page: DESK_MENU_PAGE, background: K.surface, dark_background: K.darkSurface, color: K.ink, dark_color: K.darkInk };
}

export function deskHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: homeHeader(ctx),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        factStrip(ctx),
        head(ctx, "pwStations", { word: "pwSpecs", action: shop }, "pwStationsLine"),
        specSheet(ctx, "pwStations", "popular"),
        head(ctx, "pwByCpu", null),
        { ...specFilter(ctx, "cpu", "pwByCpu"), margin: sides(0, 16, 0, 16) },
        specFilter(ctx, "ram", "pwByRam"),
        specFilter(ctx, "storage", "pwByStorage"),
        head(ctx, "pwCompare", { word: "pwChange", action: ownPage(ctx, DESK_COMPARE_PAGE) }, "pwCompareLine"),
        compareTable(ctx),
        quoteCard(ctx, true),
        head(ctx, "pwNew", { word: "pwSpecs", action: shop }),
        specSheet(ctx, "pwNew", "newest", 4),
      ],
    },
  };
}

// ——— The pages after the home ———

/** A row of the menu's sheet: its icon, its word and a chevron, a hairline under it. */
function menuRow(ctx: SectionContext, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 12,
    cross: "center",
    padding: sides(12, 12, 12, 12),
    background: K.surface,
    dark_background: K.darkSurface,
    action,
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, color: K.accent, dark_color: K.darkAccent },
      say(ctx, word, { family: ALEX, size: 13, weight: 500 }, { width: "fill", max_lines: 1 }),
      { id: id(), type: "icon", icon: "chevron_right", icon_size: 18, color: K.muted, dark_color: K.darkMuted },
    ],
  };
}

/** The catalogue (the header's menu button opens it): the search, every main category a row of cards that slides, then the account's rows in one sheet. */
export function deskMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pwMenu" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search", "cart"], ...signatureHeader(K, "search") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "categories", name: ctx.w("pwMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 8, numbers: true }, color: K.ink, dark_color: K.darkInk, padding: sides(6, 0, 6, 0) },
        {
          id: id(),
          type: "column",
          gap: 1,
          radius: R,
          padding: sides(1, 1, 1, 1),
          margin: sides(14, 16, 0, 16),
          background: K.line,
          dark_background: K.darkLine,
          children: [menuRow(ctx, "pwAccount", "person", screen("account")), menuRow(ctx, "pwOrders", "receipt_long", screen("orders")), menuRow(ctx, "pwWishlist", "bookmark", screen("favorites")), menuRow(ctx, "pwLanguage", "language", screen("settings")), menuRow(ctx, "pwContact", "support_agent", screen("account"))],
        },
        { ...say(ctx, "pwContactLine", { family: ALEX, size: 11.5, weight: 400 }, { muted: true, max_lines: 2 }), padding: sides(8, 18, 0, 18) },
      ],
    },
  };
}

/** The quote page: the three facts, then the whole quote request. */
export function deskQuotePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pwQuotePage" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(K, "search") },
    background: K.page,
    dark_background: K.darkPage,
    body: { id: id(), type: "column", padding: sides(0, 0, 32, 0), children: [factStrip(ctx), quoteCard(ctx, true)] },
  };
}

/** The compare page: two machines in a table, then the first one's whole spec sheet. */
export function deskComparePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pwComparePage" });
  const s = sigTexts(ctx, { text: "pwSpecs" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(K, "search") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, "pwCompareLine", { family: ALEX, size: 13, weight: 400 }, { muted: true }), padding: sides(10, 16, 8, 16) },
        compareTable(ctx),
        head(ctx, "pwSpecs", null),
        { id: id(), type: "spec_table", name: ctx.w("pwSpecs"), text: s.text, translations: s.translations, tech: { rows: 14 }, color: K.ink, dark_color: K.darkInk, ...sheet(), padding: sides(10, 12, 10, 12), margin: sides(0, 16, 0, 16) },
      ],
    },
  };
}

/** Over the shop: the catalogue's title, the categories as chips, the filters and the shop by processor. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "column", gap: 1, padding: sides(8, 16, 4, 16), children: [say(ctx, "pwShopKicker", { family: ALEX, size: 11, weight: 500, letter_spacing: 0.6 }, { accent: true, max_lines: 1 }), say(ctx, "pwShopTitle", face(16), { max_lines: 2 })] },
    { id: id(), type: "categories", name: ctx.w("pwMenu"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, padding: sides(4, 12, 4, 12) },
    { id: id(), type: "listing_filters", name: ctx.w("pwShopTitle"), color: K.ink, dark_color: K.darkInk, padding: sides(2, 16, 2, 16) },
    { ...specFilter(ctx, "cpu", "pwByCpu"), margin: sides(4, 16, 8, 16) },
  ];
}

function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("pcCoupon"), code: COMPUTERS_COUPON_CODE, coupon: { look: "classic", bind: "public" }, radius: R, color: K.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w("pwQuoteButton"),
      gap: 10,
      cross: "center",
      padding: sides(12, 12, 12, 12),
      margin: sides(8, 16, 4, 16),
      action: ownPage(ctx, DESK_QUOTE_PAGE),
      ...sheet(),
      children: [{ id: id(), type: "icon", icon: "description", icon_size: 20, color: K.accent, dark_color: K.darkAccent }, say(ctx, "pwQuoteTitle", { family: ALEX, size: 12.5, weight: 600 }, { width: "fill", max_lines: 2 }), { id: id(), type: "icon", icon: "chevron_right", icon_size: 18, color: K.muted, dark_color: K.darkMuted }],
    },
    { id: id(), type: "column", padding: sides(4, 16, 4, 16), children: [installmentsTag(ctx, { color: K.muted, dark_color: K.darkMuted, background: K.surface, dark_background: K.darkSurface })] },
  ];
}

function ordersTop(ctx: SectionContext): StudioNode[] {
  const entry = (title: SectionWord, text: SectionWord, highlight = false) => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "pcTrack", null, undefined, sides(10, 16, 8, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("pcTrack"),
      timeline: { style: "horizontal", source: "latest_order" },
      color: K.ink,
      dark_color: K.darkInk,
      ...sheet(),
      padding: sides(14, 12, 14, 12),
      margin: sides(0, 16, 6, 16),
      entries: [entry("pcTrack1", "pcTrack1Text", true), entry("pcTrack2", "pcTrack2Text"), entry("pcTrack3", "pcTrack3Text"), entry("pcTrack4", "pcTrack4Text")],
    },
  ];
}

function deskOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "search":
      return shopTop(ctx);
    case "cart":
      return cartTop(ctx);
    case "orders":
      return ordersTop(ctx);
    default:
      return null;
  }
}

/** The workstation's tabs: the computers shop's five, in office icons. */
export function deskTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return computersTabs(tabs).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "dashboard" };
    if (target === "search") return { ...t, icon: "list_alt" };
    if (target === "cart") return { ...t, icon: "shopping_cart" };
    if (target === "orders") return { ...t, icon: "receipt_long" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
}

const DESK_SCREENS = signatureScreens({
  style: "minimal",
  photo: P("desk-coder"),
  title: { en: "{app} for business", ar: "{app} للأعمال", tr: "{app} kurumsal" },
  subtitle: { en: "Sign in for your orders, invoices and quotes.", ar: "سجّل الدخول لطلباتك وفواتيرك وعروض الأسعار.", tr: "Siparişleriniz, faturalarınız ve teklifleriniz için giriş yapın." },
  menu: "plain",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** D's bar: across the bottom, white, a steel line over the open tab. */
export const DESK_BAR = signatureBar(K, { design: "line", background: K.surface, dark_background: K.darkSurface, active: K.fill, dark_active: K.darkAccent, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always", radius: 0, margin: 0 });

export const DESK_D: SignatureDesign = {
  demo: "computers",
  variant: "d",
  template: { id: "computers_signature_d", icon: "work", fits: { types: ["store"], plain: true } },
  home: deskHome,
  over: deskOver,
  tabs: deskTabs,
  pages: (ctx) => [
    { slug: DESK_MENU_PAGE, title: "pwMenu", studio: deskMenuPage(ctx) },
    { slug: DESK_QUOTE_PAGE, title: "pwQuotePage", studio: deskQuotePage(ctx) },
    { slug: DESK_COMPARE_PAGE, title: "pwComparePage", studio: deskComparePage(ctx) },
  ],
  bar: DESK_BAR,
  look: { header: signatureHeader(K, "search"), background: K.page, dark_background: K.darkPage },
  chrome: { header: "search", home: "search", system: "large" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: K.ink, font: "Plus Jakarta Sans", font_family: ALEX, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: DESK_SCREENS,
  },
};

