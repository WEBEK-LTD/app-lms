import type { LayoutTab, StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo, screen, type DemoInk } from "./parts";
import { filler, inked, inkIcon, roundOf, type SignatureDesign, type SignatureLooks } from "./signature";

/**
 * 130.12 Safra's Signature looks (the R2-Safra boards), ink and gold: A
 * "Cover story", the resort's pool under the night sky with "SAFRA", the
 * search, the account and Explore, Trips, Flights and Saved in a frosted
 * pill, then the person's next trip over it, its city large over the
 * first flight as a boarding pass (130.11 `trip` `ticket`), the stays with
 * their photos, stay + flight for less and Safra Air's flights from Cairo;
 * B "Bento atlas", "Where next?" under the greeting, the next trip's days
 * large over its legs (`trip` `card`), the stays as a bento, stay + flight
 * at one price and the departures from Cairo as a board. The demo's own
 * hotels, flights and bundle discount (lib/travel/samples.ts); light and
 * dark as the boards.
 */

type Ink = { color: string; dark: string };

const NAVY = "#0E1424";
const GOLD = "#E6C58C";
const WHITE: Ink = { color: "#FFFFFF", dark: "#FFFFFF" };
const MONO = "JetBrains Mono";

/** The travel module's Explore tab opens this page; Trips, Flights and Saved their screens. */
const NAV: { word: SectionWord; screen: string | null }[] = [
  { word: "acTabExplore", screen: null },
  { word: "travTabTrips", screen: "trips" },
  { word: "travTabFlights", screen: "flights" },
  { word: "travTabSaved", screen: "saved" },
];

/** The demo's flights from Cairo (lib/travel/samples.ts): where, its code, how and when. */
const DEPARTURES: { number: string; to: string; city: SectionWord; how: SectionWord; time: string }[] = [
  { number: "SFR 251", to: "IST", city: "sigIstanbul", how: "sigNonstop", time: "06:30" },
  { number: "SFR 361", to: "JTR", city: "sigSantorini", how: "sigViaAth", time: "08:40" },
  { number: "SFR 141", to: "DXB", city: "sigDubai", how: "sigNonstop", time: "10:15" },
];

// ——— A: Cover story ———

const A: DemoInk = {
  page: "#F7F3EC",
  darkPage: "#0B0F1A",
  surface: "#FFFFFF",
  darkSurface: "#151C2E",
  ink: NAVY,
  darkInk: "#F3EEE4",
  muted: "#5A5F6E",
  darkMuted: "#AEB2BF",
  line: "#DCD5C8",
  darkLine: "#2A3148",
};
const A_INK: Ink = { color: A.ink, dark: A.darkInk };
const A_MUTED: Ink = { color: A.muted, dark: A.darkMuted };
const A_GOLD: Ink = { color: "#7A5C24", dark: "#D8B57A" };

/** A frosted round button over the photo. */
function glassRound(ctx: SectionContext, icon: string, action: StudioNode["action"]): StudioNode {
  return roundOf(ctx, icon, action, { ink: WHITE, overlay: { color: "#FFFFFF", opacity: 0.16 }, border_color: "#7C8090", border_width: 1 });
}

/** The company's stays as photo tiles: the photo under a shade, the badge, the name, where and the price a night. */
function stayTiles(ctx: SectionContext, ink: Ink): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("sigStaysWithUs"),
    source: "hotels",
    layout: "carousel",
    gap: 10,
    padding: { top: 0, end: 16, bottom: 0, start: 16 },
    query: { limit: 6, category_id: null, featured: false, sort: "newest", ids: [] },
    card: {
      id: id(),
      type: "stack",
      width: 150,
      height: 128,
      radius: 20,
      shadow: "medium",
      children: [
        { id: id(), type: "image", bind: "image", width: "fill", height: 128, scrim: { color: NAVY, from: 0, middle: 0, at: 30, to: 0.9 } },
        {
          id: id(),
          type: "column",
          width: "fill",
          height: "fill",
          align: "end",
          gap: 1,
          padding: { top: 8, end: 10, bottom: 10, start: 12 },
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 2, font: { size: 13, weight: 800, line_height: 1.2 }, color: "#FFFFFF", dark_color: "#FFFFFF" },
            {
              id: id(),
              type: "row",
              gap: 4,
              children: [
                { id: id(), type: "text", bind: "price", font: { size: 11, weight: 800 }, color: "#FFFFFF", dark_color: "#FFFFFF" },
                { id: id(), type: "text", text: ctx.w("sigANight"), max_lines: 1, font: { size: 11, weight: 600 }, color: "#DDE0EA", dark_color: "#DDE0EA" },
              ],
            },
          ],
        },
      ],
    },
    color: ink.color,
    dark_color: ink.dark,
  };
}

/** "Stays with us" and "See all". */
function staysHead(ctx: SectionContext, ink: Ink, gold: Ink, word: SectionWord = "sigStaysWithUs"): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    cross: "end",
    padding: { top: 20, end: 16, bottom: 10, start: 20 },
    children: [inked(ctx, ctx.w(word), ink, { size: 18, weight: 800, letter_spacing: -0.2 }, { width: "fill" }), inked(ctx, ctx.w("acSeeAll"), gold, { size: 13, weight: 700 }, { action: screen("stays") })],
  };
}

function safraAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const nav: StudioNode = {
    id: id(),
    type: "row",
    name: ctx.w("acTabExplore"),
    width: "hug",
    height: 44,
    radius: 22,
    gap: 2,
    cross: "center",
    padding: pad(0, 4),
    background: "#2C3142",
    dark_background: "#2C3142",
    children: NAV.map((n, i) => ({
      id: id(),
      type: "row",
      height: 36,
      radius: 18,
      cross: "center",
      self_align: "center",
      padding: pad(0, i === 0 ? 14 : 12),
      ...(i === 0 ? { background: "#F4F4F6" } : {}),
      ...(n.screen ? { action: screen(n.screen as Parameters<typeof screen>[0]) } : {}),
      children: [inked(ctx, ctx.w(n.word), i === 0 ? { color: NAVY, dark: NAVY } : WHITE, { size: 13, weight: 700 })],
    })),
  };
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 96 },
      children: [
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("sigNextTrip"),
          image_url: photo(ctx, "/travel-photos/room.jpg"),
          height: 330,
          background: NAVY,
          scrim: { color: NAVY, from: 0.72, middle: 0.4, at: 40, to: 0.92 },
          gap: 18,
          padding: { top: 8, end: 16, bottom: 20, start: 16 },
          overlap: 150,
          children: [
            {
              id: id(),
              type: "row",
              gap: 10,
              cross: "center",
              padding: { start: 4 },
              children: [
                inked(ctx, ctx.w("brandName"), WHITE, { size: 17, weight: 800, letter_spacing: 6.5, uppercase: true }, { width: "fill" }),
                glassRound(ctx, "search", screen("stays")),
                glassRound(ctx, "person", screen("account")),
              ],
            },
            nav,
            // Signed out, the question over the photo; signed in, the person's next trip over it, its ticket over the photo's foot.
            inked(ctx, ctx.w("travelTitle"), WHITE, { size: 30, weight: 800, line_height: 1.08, letter_spacing: -0.6 }, { visibility: "signed_out", padding: { top: 24, end: 4, bottom: 0, start: 4 } }),
            { id: id(), type: "tracking", tracking: { kind: "trip", style: "ticket" }, visibility: "signed_in", color: "#FFFFFF", dark_color: "#FFFFFF", padding: { top: 14, end: 0, bottom: 0, start: 4 }, margin: { top: 0, end: 16, bottom: 0, start: 16 } },
          ],
        },
        staysHead(ctx, A_INK, A_GOLD),
        stayTiles(ctx, A_INK),
        {
          id: id(),
          type: "row",
          name: ctx.w("sigBundleTitle"),
          height: 64,
          radius: 20,
          gap: 14,
          cross: "center",
          margin: { top: 14, end: 16, bottom: 0, start: 16 },
          padding: { top: 0, end: 12, bottom: 0, start: 16 },
          background: NAVY,
          dark_background: "#151C2E",
          border_color: NAVY,
          dark_border_color: "#5C5032",
          border_width: 1,
          shadow: "medium",
          action: screen("stays"),
          children: [
            inked(ctx, ctx.w("sigBundlePercent"), { color: GOLD, dark: GOLD }, { size: 38, weight: 800, letter_spacing: -0.8 }),
            {
              id: id(),
              type: "column",
              width: "fill",
              children: [inked(ctx, ctx.w("sigBundleTitle"), WHITE, { size: 13, weight: 800 }), inked(ctx, ctx.w("sigBundleText"), { color: "#E7E9F0", dark: "#E7E9F0" }, { size: 13, weight: 600, line_height: 1.3 }, { max_lines: 2 })],
            },
            { id: id(), type: "row", width: 40, height: 40, radius: 20, align: "center", cross: "center", self_align: "center", background: GOLD, children: [inkIcon(ctx, "arrow_forward", 22, { color: NAVY, dark: NAVY })] },
          ],
        },
        inked(ctx, ctx.w("sigSafraAirFrom"), A_GOLD, { size: 10, weight: 800, letter_spacing: 2, uppercase: true }, { margin: { top: 18, end: 20, bottom: 8, start: 20 } }),
        {
          id: id(),
          type: "row",
          name: ctx.w("sigSafraAirFrom"),
          gap: 8,
          scroll: true,
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          children: DEPARTURES.map((f) => ({
            id: id(),
            type: "row",
            width: "hug",
            height: 40,
            radius: 20,
            gap: 8,
            cross: "center",
            padding: pad(0, 14),
            background: A.surface,
            dark_background: A.darkSurface,
            border_color: A.line,
            dark_border_color: A.darkLine,
            border_width: 1,
            action: screen("flights"),
            children: [
              inked(ctx, "CAI", A_INK, { size: 12, weight: 700, family: MONO }),
              inkIcon(ctx, "arrow_forward", 16, A_GOLD),
              inked(ctx, f.to, A_INK, { size: 12, weight: 700, family: MONO }),
              inked(ctx, ctx.w(f.city), A_MUTED, { size: 12, weight: 600 }),
              inked(ctx, f.time, A_MUTED, { size: 12, weight: 600, family: MONO }),
            ],
          })),
        },
      ],
    },
  };
}

/** Over the trips, the person's next trip on navy; the travel screens search and book themselves. */
function tripOver(ctx: SectionContext, style: "card" | "ticket"): StudioNode[] {
  return [
    {
      id: idOf(ctx)(),
      type: "tracking",
      tracking: { kind: "trip", style },
      visibility: "signed_in",
      color: "#F3EEE4",
      dark_color: "#F3EEE4",
      background: NAVY,
      dark_background: "#151C2E",
      radius: 26,
      padding: pad(16, 16),
      margin: { top: 12, end: 16, bottom: 4, start: 16 },
    },
  ];
}

const A_BAR: TabBarStyle = {
  design: "dock",
  margin: 16,
  radius: 28,
  background: NAVY,
  dark_background: "#151C2E",
  active: GOLD,
  dark_active: GOLD,
  inactive: "#D7DAE3",
  dark_inactive: "#AEB2BF",
};

const COVER_STORY: SignatureDesign = {
  template: { id: "travel_signature_a", icon: "photo_camera", fits: { types: ["travel"] } },
  home: safraAHome,
  over: (screenName, ctx) => (screenName === "trips" ? tripOver(ctx, "card") : null),
  look: { header: { background: A.page, color: A.ink, dark_background: A.darkPage, dark_color: A.darkInk }, background: A.page, dark_background: A.darkPage },
  bar: A_BAR,
  screens: {
    style: "photo",
    photo: "/travel-photos/room.jpg",
    title: { en: "Where does the next story begin?", ar: "من أين تبدأ حكايتك القادمة؟", tr: "Sıradaki hikâye nerede başlıyor?" },
    subtitle: {
      en: "Sign in to book hotels and flights, together for one price.",
      ar: "سجّل الدخول لتحجز الفنادق والطيران معًا بسعر واحد.",
      tr: "Otelleri ve uçuşları tek fiyata birlikte ayırtmak için giriş yapın.",
    },
    menu: "night",
    accent: "#D8B57A",
  },
  chrome: { header: "photo", screens: "photo" },
};

// ——— B: Bento atlas ———

const B: DemoInk = {
  page: "#F4EFE6",
  darkPage: "#0B0F1A",
  surface: "#FFFFFF",
  darkSurface: "#151C2E",
  ink: NAVY,
  darkInk: "#F3EEE4",
  muted: "#5A5F6E",
  darkMuted: "#AEB2BF",
  line: "#D8D2C7",
  darkLine: "#2A3148",
};
const B_INK: Ink = { color: B.ink, dark: B.darkInk };
const B_MUTED: Ink = { color: B.muted, dark: B.darkMuted };
const B_GOLD: Ink = { color: "#7A5C24", dark: "#D8B57A" };

function safraBHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { top: 8, bottom: 100 },
      children: [
        {
          id: id(),
          type: "row",
          gap: 10,
          cross: "center",
          padding: { top: 0, end: 16, bottom: 0, start: 20 },
          children: [
            { id: id(), type: "greeting", width: "fill", color: B.muted, dark_color: B.darkMuted, font: { size: 14, weight: 600 } },
            roundOf(ctx, "search", screen("stays"), { ink: B_INK, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
            roundOf(ctx, "person", screen("account"), { ink: { color: "#F7F3EC", dark: NAVY }, background: NAVY, dark_background: "#D8B57A" }),
          ],
        },
        inked(ctx, ctx.w("sigWhereNext"), B_INK, { size: 40, weight: 600, letter_spacing: -1.6, line_height: 1 }, { margin: { top: 6, end: 20, bottom: 14, start: 20 } }),
        {
          id: id(),
          type: "column",
          name: ctx.w("sigNextTrip"),
          visibility: "signed_in",
          radius: 26,
          padding: pad(16, 16),
          margin: { top: 0, end: 16, bottom: 14, start: 16 },
          background: NAVY,
          dark_background: "#151C2E",
          border_color: NAVY,
          dark_border_color: "#4E4530",
          border_width: 1,
          shadow: "strong",
          children: [{ id: id(), type: "tracking", tracking: { kind: "trip", style: "card" }, visibility: "signed_in", color: "#F3EEE4", dark_color: "#F3EEE4" }],
        },
        {
          id: id(),
          type: "bento",
          name: ctx.w("sigStaysWithUs"),
          columns: 2,
          gap: 10,
          radius: 22,
          bento: { caption: "plain", row: 92 },
          margin: { top: 0, end: 16, bottom: 0, start: 16 },
          entries: [
            { title: ctx.w("sigStayOne"), subtitle: ctx.w("sigSantorini"), text: ctx.w("sigStayOneText"), image_url: photo(ctx, "/travel-photos/oia.jpg"), size: "tall", action: screen("stays") },
            { title: ctx.w("sigStayTwo"), text: ctx.w("sigStayTwoText"), image_url: photo(ctx, "/travel-photos/skyline.jpg"), size: "small", action: screen("stays") },
            { title: ctx.w("sigStayThree"), text: ctx.w("sigStayThreeText"), image_url: photo(ctx, "/travel-photos/city.jpg"), size: "small", action: screen("stays") },
          ],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("sigBundleOne"),
          height: 60,
          radius: 20,
          gap: 12,
          cross: "center",
          margin: { top: 12, end: 16, bottom: 0, start: 16 },
          padding: { top: 0, end: 12, bottom: 0, start: 10 },
          background: B.surface,
          dark_background: B.darkSurface,
          border_color: "#D9C9A6",
          dark_border_color: "#5C5032",
          border_width: 1,
          action: screen("stays"),
          children: [
            { id: id(), type: "row", width: 40, height: 40, radius: 20, align: "center", cross: "center", self_align: "center", background: NAVY, children: [inkIcon(ctx, "flight", 18, { color: GOLD, dark: GOLD })] },
            {
              id: id(),
              type: "column",
              width: "fill",
              gap: 1,
              children: [inked(ctx, ctx.w("sigBundleOne"), B_INK, { size: 14, weight: 800 }), inked(ctx, ctx.w("sigBundleLess"), B_MUTED, { size: 12, weight: 600 }, { max_lines: 1 })],
            },
            inkIcon(ctx, "arrow_forward", 22, B_MUTED),
          ],
        },
        {
          id: id(),
          type: "row",
          cross: "end",
          padding: { top: 18, end: 16, bottom: 6, start: 20 },
          children: [inked(ctx, ctx.w("sigDepartures"), B_INK, { size: 16, weight: 800 }, { width: "fill" }), inked(ctx, ctx.w("brandName"), B_GOLD, { size: 10, weight: 700, letter_spacing: 1.4, uppercase: true, family: MONO })],
        },
        {
          id: id(),
          type: "column",
          name: ctx.w("sigDepartures"),
          padding: { top: 0, end: 16, bottom: 0, start: 16 },
          children: DEPARTURES.map((f) => ({
            id: id(),
            type: "row",
            height: 38,
            gap: 10,
            cross: "center",
            padding: pad(0, 4),
            border_color: B.line,
            dark_border_color: B.darkLine,
            action: screen("flights"),
            children: [
              inked(ctx, f.number, B_MUTED, { size: 11, weight: 500, family: MONO }, { width: 58 }),
              inked(ctx, f.to, B_INK, { size: 15, weight: 700, family: MONO }, { width: 38 }),
              { id: id(), type: "row", width: "fill", gap: 4, children: [inked(ctx, ctx.w(f.city), B_MUTED, { size: 12, weight: 600 }), inked(ctx, "·", B_MUTED, { size: 12 }), inked(ctx, ctx.w(f.how), B_MUTED, { size: 12, weight: 600 })] },
              inked(ctx, f.time, B_INK, { size: 15, weight: 700, family: MONO }),
            ],
          })),
        },
      ],
    },
  };
}

/** B's tabs, as its bar: Explore, Trips, Flights and the account (the stays a tap away on Explore). */
function bentoTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const order = ["home", "trips", "flights", "account"];
  return structuredClone([...tabs])
    .filter((t) => order.includes(t.id) || (t.target.type === "screen" && t.target.screen === "account"))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

const B_BAR: TabBarStyle = {
  design: "float",
  margin: 16,
  radius: 30,
  labels: "always",
  background: NAVY,
  dark_background: "#151C2E",
  active: GOLD,
  dark_active: GOLD,
  inactive: "#D7DAE3",
  dark_inactive: "#D7DAE3",
};

const BENTO_ATLAS: SignatureDesign = {
  template: { id: "travel_signature_b", icon: "dashboard", fits: { types: ["travel"] } },
  home: safraBHome,
  over: (screenName, ctx) => (screenName === "trips" ? tripOver(ctx, "card") : null),
  look: { header: { background: B.page, color: B.ink, dark_background: B.darkPage, dark_color: B.darkInk }, background: B.page, dark_background: B.darkPage },
  tabs: bentoTabs,
  bar: B_BAR,
  screens: {
    style: "premium",
    photo: "/travel-photos/oia.jpg",
    title: { en: "Where next?", ar: "إلى أين بعد ذلك؟", tr: "Sırada neresi var?" },
    subtitle: {
      en: "Your stays, flights and boarding passes, in one place.",
      ar: "إقاماتك ورحلاتك الجوية وبطاقات صعودك في مكان واحد.",
      tr: "Konaklamalarınız, uçuşlarınız ve biniş kartlarınız tek bir yerde.",
    },
    menu: "night",
    accent: "#D8B57A",
  },
  chrome: { header: "large", screens: "large" },
};

export const SAFRA_LOOKS: SignatureLooks = { a: COVER_STORY, b: BENTO_ATLAS };
