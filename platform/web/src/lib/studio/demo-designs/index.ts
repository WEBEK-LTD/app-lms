import type { LayoutTab, StudioHeader, StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import { translating } from "../demo-templates";
import type { Fits, SectionContext, SectionWord, TemplateInfo } from "../sections";
import { FOOD_PHOTO_PAGE_HEADER, FOOD_PHOTO_TAB_BAR, foodPhotoHome, foodPhotoPage } from "../photo-food";
import { MARKET_PHOTO_TAB_BAR, marketPhotoHome, marketPhotoPage, marketPhotoTabs, marketShopsPage } from "../photo-market";
import { lamhaHome, lamhaPage, LAMHA_INK } from "./lamha-taxi";
import { masarHome, masarPage, MASAR_INK } from "./masar-rides";
import type { DemoInk } from "./parts";
import { safraHome, safraPage, SAFRA_INK } from "./safra-travel";
import { sahmHome, sahmPage, SAHM_INK } from "./sahm-express";
import { schoolTodayHome } from "../school-home";
import { teachersPhotoHome } from "../teachers-home";
import { NAKHLA_LOOK, RAWAQ_LOOK, rawaqTabs, schoolPage } from "./school-looks";
// 130.23 The premium chrome of a demo's pages (lib/studio/demo-designs/chrome.ts).
import { chromedHeader, type DemoChrome } from "./chrome";
// 130 The Signature looks (./signature.ts), each demo's two in its own file.
import { LAMHA_A, LAMHA_B } from "./lamha-signature";
import { MASAR_A, MASAR_B } from "./masar-signature";
import { NAKHLA_A, NAKHLA_B } from "./nakhla-signature";
import { RAWAQ_A, RAWAQ_B } from "./rawaq-signature";
import { SAFRA_A, SAFRA_B } from "./safra-signature";
import { SAHM_A, SAHM_B } from "./sahm-signature";
import { SOFRA_A, SOFRA_B } from "./sofra-signature";
import { UFUQ_A, UFUQ_B } from "./ufuq-signature";
import { ZAD_A, ZAD_B } from "./zad-signature";
// 131.20 Leqaa, the flower shop: A rose hour, B botanical press.
import { LEQAA_A, LEQAA_B } from "./leqaa-signature";
// 208 Lujain, the clothes shop: A LUJAIN the boutique, B NOUN streetwear.
import { LUJAIN_A, NOUN_B } from "./clothes-signature";
// 209 Cosmetics: Velours, A VELOURS plum and gold, B NAQA LAB the clinic.
import { VELOURS_A, NAQA_B } from "./beauty-signature";
import { VELOURS_C, VELOURS_D } from "./beauty-cd-signature";
// 209 Kids' clothes: Toota, A TOOTA soft pastels, B MINIMO playful navy.
import { MINIMO_B, TOOTA_A } from "./kids-signature";
// 209 Toys
// 209 Toot, the toy shop: A Toot playful and colourful, B Mukaab calm and educational.
import { MUKAAB_B, TOOT_A } from "./toys-signature";
// 210 Sakan (home decor), Ghurza (crochet and handmade), Rukn (furniture).
import { DECOR_A, DECOR_B } from "./decor-signature";
import { CROCHET_A, CROCHET_B } from "./crochet-signature";
import { GHURZA_C, GHURZA_D } from "./crochet-cd-signature";
import { FURNITURE_A, FURNITURE_B } from "./furniture-signature";
// 225 Their looks C and D: Rukn's MIZAN the architect and MANZIL room by room, Sakan's ATHAR the gallery and MAZAJ the moodboard.
import { FURNITURE_C } from "./furniture-c-signature";
import { FURNITURE_D } from "./furniture-d-signature";
import { DECOR_C } from "./decor-c-signature";
import { DECOR_D } from "./decor-d-signature";
// 211 Nova, the mobiles shop: A NOVA ink and cobalt, B emerald on stone.
import { EMERALD_B, NOVA_A } from "./mobiles-signature";
// 211 Nawah, computers and gaming: A NAWAH white and blue, B SILICA green on stone.
import { NAWAH_A, SILICA_B } from "./computers-signature";
// 211 Madar, the electronics shop: A MADAR white and deep blue, B NABD lime on near black.
import { MADAR_A, NABD_B } from "./electronics-signature";
import { SIGNATURE_LOOKS, signatureProject, signatureSystem, signatureTemplateId, type SignatureDesign, type SignatureLook } from "./signature";

/**
 * 128 The Studio demos made premium and complete (the owner, 13 November
 * 2026): each demo's home as its approved board, its own template of its
 * kind (offered to every project of the kind, as the demo's home is), and
 * every page after it in the same look: its tabs, its header and background
 * in the demo's colours by day and by night, over the screens of its tabs
 * the demo's own elements (a banner of its photos, the person's order,
 * shipment or ride), the pages of its own a tab opens (Zad's Shops) and its
 * bar. Sofra Eats and Zad (lib/studio/photo-food.ts, photo-market.ts),
 * Sahm Express, Masar Rides and Lamha Taxi (this folder), Nakhla School and
 * Rawaq Academy (lib/studio/school-home.ts, teachers-home.ts, this folder's
 * school-looks.ts) are made the same way, and 126 Safra (this folder's
 * safra-travel.ts: travel's own template, its pages on the travel module's
 * paper, its kind's tabs and the dot bar). The demo app (lib/demo/setup.ts), a project its template starts
 * (lib/studio/start.ts) and its whole design (lib/studio/designs.ts) all
 * make their pages here, through `ctx.demo` (lib/studio/demo-pages.ts), so
 * they stay the same (tests/unit/studio-demo-templates.test.ts).
 */

/** The colours of a demo's pages after its home, by day and by night: the header's, and the page's own (missing, the app's). */
export interface DemoPageLook {
  header: Pick<StudioHeader, "background" | "color" | "dark_background" | "dark_color">;
  background?: string;
  dark_background?: string;
  /** Only on the pages with a header (the account's screen keeps the look its sign-in sets); missing, every page after the home. */
  headed?: boolean;
}

export interface DemoDesign {
  /** The kind's template the demo's home is (lib/studio/demo-templates.ts DEMO_HOME_TEMPLATES), made by `home`. */
  template: { id: string; icon: string; fits: Fits };
  home: (ctx: SectionContext) => StudioPage;
  /** The demo's own elements over one of the app's screens, in place of the usual word; null, the usual ones. */
  over: (screen: string, ctx: SectionContext) => StudioNode[] | null;
  /** The colours of its pages after the home; missing, the usual ones. */
  look?: DemoPageLook;
  /** The demo's tabs from its kind's; missing, its kind's. */
  tabs?: (tabs: readonly LayoutTab[]) => LayoutTab[];
  /** The pages of its own its tabs open (Zad's Shops), after the tabs' pages. */
  pages?: (ctx: SectionContext) => { slug: string; title: SectionWord; studio: StudioPage }[];
  /** Its bar, as approved (lib/demo/screens.ts DEMO_TAB_BARS); missing, the demo's own there (the taxi's dark island). */
  bar?: TabBarStyle;
}

/** A tab opening `screen`, made over. */
function retab(tabs: readonly LayoutTab[], change: (tab: LayoutTab) => LayoutTab | null): LayoutTab[] {
  return structuredClone([...tabs])
    .map(change)
    .filter((t): t is LayoutTab => t !== null);
}

const screenOf = (tab: LayoutTab) => (tab.target.type === "screen" ? tab.target.screen : null);

/** A ride app opening on its home as the Ride tab (the boards' bar: Ride, My rides, Account). */
function rideTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return retab(tabs, (t) => (t.id === "home" ? { ...t, label: "Ride", icon: "local_taxi" } : screenOf(t) === "ride" ? null : screenOf(t) === "my_rides" ? { ...t, icon: "history" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
}

/** The pages after the home in a demo's colours: the header on its surface, the page on its paper. */
function inkLook(k: DemoInk): DemoPageLook {
  return { header: { background: k.surface, color: k.ink, dark_background: k.darkSurface, dark_color: k.darkInk }, background: k.page, dark_background: k.darkPage };
}

/** 119 The demos' bars as approved: across the bottom with the open tab's icon in a soft pill, 128 the open tab in the brand's colour. */
function classicBar(k: DemoInk, active: string): TabBarStyle {
  return { design: "classic", background: k.surface, dark_background: k.darkSurface, active, inactive: k.muted, dark_inactive: k.darkMuted, margin: 0, radius: 0 };
}

const STUDIO_DEMO_DESIGNS: Partial<Record<StudioDemoId, DemoDesign>> = {
  // 128.1 Food, photo first: the cuisines over the restaurants, the order on its way over the orders, the floating pill.
  food: { template: { id: "food_photo", icon: "restaurant", fits: { types: ["food"] } }, home: foodPhotoHome, over: foodPhotoPage, look: { header: FOOD_PHOTO_PAGE_HEADER }, bar: FOOD_PHOTO_TAB_BAR },
  // 128.2 A marketplace, photo tiles: five named tabs, Shops a page of its own.
  marketplace: {
    template: { id: "market_photo", icon: "storefront", fits: { types: ["food"], verticals: ["marketplace"] } },
    home: marketPhotoHome,
    over: marketPhotoPage,
    tabs: marketPhotoTabs,
    pages: (ctx) => [{ slug: "shops", title: "tabShops", studio: marketShopsPage(ctx) }],
    bar: MARKET_PHOTO_TAB_BAR,
  },
  // 128.3–128.5 The courier in the city, the ride at night, the taxi map (the taxi keeps its dark island).
  delivery: {
    template: { id: "delivery_city", icon: "two_wheeler", fits: { types: ["delivery"] } },
    home: sahmHome,
    over: sahmPage,
    look: inkLook(SAHM_INK),
    tabs: (tabs) => retab(tabs, (t) => (screenOf(t) === "send_parcel" ? { ...t, icon: "send" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t)),
    bar: classicBar(SAHM_INK, "#1F6FB2"),
  },
  rides: { template: { id: "ride_night", icon: "nightlife", fits: { types: ["rides"] } }, home: masarHome, over: masarPage, look: inkLook(MASAR_INK), tabs: rideTabs, bar: classicBar(MASAR_INK, "#14857A") },
  taxi: { template: { id: "taxi_map", icon: "map", fits: { types: ["rides"] } }, home: lamhaHome, over: lamhaPage, look: inkLook(LAMHA_INK), tabs: rideTabs },
  // 128.6 128.7 The family's school day; the teachers in circles, its Teachers tab.
  school: { template: { id: "school_today", icon: "family_restroom", fits: { types: ["school"] } }, home: schoolTodayHome, over: schoolPage(NAKHLA_LOOK), look: NAKHLA_LOOK, bar: { design: "classic", background: "#FFFFFF", dark_background: "#122033", active: "#1F4E79", dark_active: "#9CC3EA", inactive: "#56657A", dark_inactive: "#A6B3C3" } },
  // 126 Safra: travel's own template as its Explore, the pages after it on the travel module's paper (its header too), its kind's tabs, the dot under the open tab.
  travel: {
    template: { id: "travel", icon: "travel_explore", fits: { types: ["travel"] } },
    home: safraHome,
    over: safraPage,
    look: { header: { background: SAFRA_INK.page, color: SAFRA_INK.ink, dark_background: SAFRA_INK.darkPage, dark_color: SAFRA_INK.darkInk }, background: SAFRA_INK.page, dark_background: SAFRA_INK.darkPage },
    bar: { design: "dot", active: SAFRA_INK.ink, dark_active: "#C9A063" },
  },
  instructors: { template: { id: "teachers_photo", icon: "co_present", fits: { types: ["lms"], verticals: ["instructors"] } }, home: teachersPhotoHome, over: schoolPage(RAWAQ_LOOK), look: RAWAQ_LOOK, tabs: rawaqTabs, bar: { design: "classic", background: "#FFFFFF", dark_background: "#15221C", active: "#2E5E4E", dark_active: "#8FD1B6", inactive: "#5A665F", dark_inactive: "#A9B7AF" } },
};

// ——— 130 The Signature looks: each demo's two looks, A and B (./signature.ts), in ONE list ———

/**
 * Every Studio demo's looks: A and B, and 223 a shop type's C and D. A
 * demo's main look is the demo itself (C where the demo has it, else A):
 * the demo app, `demo_<demo>`, "Like our demo" and Admin › Demo apps make
 * it (`studioDemoDesign` without a look). A look without tabs of its own
 * has its demo's (128's design's).
 */
const SIGNATURE_DESIGNS: Record<StudioDemoId, Partial<Record<SignatureLook, SignatureDesign>>> = {
  // 130.1 130.2 Sofra Eats: A the editorial menu, B the bento table.
  food: { a: SOFRA_A, b: SOFRA_B },
  // 130.3 130.4 Zad: A the market arches, B the night aisle.
  marketplace: { a: ZAD_A, b: ZAD_B },
  // 130.5 130.6 Sahm Express: A the waybill, B the live route.
  delivery: { a: SAHM_A, b: SAHM_B },
  // 130.7 130.8 Masar Rides, map first: A a living map, B a horizon.
  rides: { a: MASAR_A, b: MASAR_B },
  // 130.9 130.10 Lamha Taxi, taxi yellow and navy: A two inks, B a radar.
  taxi: { a: LAMHA_A, b: LAMHA_B },
  // 130.12 Safra, ink and gold: A a cover story, B a bento atlas.
  travel: { a: SAFRA_A, b: SAFRA_B },
  // 130.13 130.14 Nakhla School: A the morning edition, B the family passes.
  school: { a: NAKHLA_A, b: NAKHLA_B },
  // 130.15 130.16 Rawaq Academy: A the faculty index, B on air.
  instructors: { a: RAWAQ_A, b: RAWAQ_B },
  // 130.17 130.18 Ufuq Academy (the premium academy): A night cinema, B the gold ring.
  premium_academy: { a: UFUQ_A, b: UFUQ_B },
  // 131.20 Leqaa, the flower shop (a store): A rose hour, B botanical press.
  flowers: { a: LEQAA_A, b: LEQAA_B },
  // 208 Lujain, the clothes shop (a store): A the black and white boutique, B NOUN's streetwear.
  clothes: { a: LUJAIN_A, b: NOUN_B },
  // 209 Cosmetics: Velours (a store), A VELOURS plum and gold, B NAQA LAB the clinic; 224 C the ritual clinic (its main template), D the shade studio.
  beauty: { c: VELOURS_C, d: VELOURS_D, a: VELOURS_A, b: NAQA_B },
  // 209 Kids' clothes: Toota (a store): A TOOTA's soft pastels, B MINIMO's playful navy.
  kids: { a: TOOTA_A, b: MINIMO_B },
  // 209 Toys
  // 209 Toot, the toy shop (a store): A Toot, playful and colourful; B Mukaab, calm and educational.
  toys: { a: TOOT_A, b: MUKAAB_B },
  // 210 Sakan, home decor: A the decor magazine, B Teen's warm earth. Ghurza, crochet: A warm handmade, B Habka's colours. Rukn, furniture: A white and wood, B KANAF.
  // 225 Sakan C ATHAR the gallery, D MAZAJ the moodboard; Rukn C MIZAN the architect, D MANZIL room by room.
  decor: { c: DECOR_C, d: DECOR_D, a: DECOR_A, b: DECOR_B },
  // 224 Ghurza, crochet: C the makers' market (its main template), D the cozy studio.
  crochet: { c: GHURZA_C, d: GHURZA_D, a: CROCHET_A, b: CROCHET_B },
  furniture: { c: FURNITURE_C, d: FURNITURE_D, a: FURNITURE_A, b: FURNITURE_B },
  // 211 Madar, the electronics shop (a store): A MADAR in white and deep blue, B NABD in lime on near black.
  electronics: { a: MADAR_A, b: NABD_B },
  // 211 Nova, the mobiles shop (a store): A NOVA's ink and cobalt, B emerald on warm stone.
  mobiles: { a: NOVA_A, b: EMERALD_B },
  // 211 Nawah, computers and gaming (a store): A NAWAH in white and one strong blue, B SILICA in deep green on stone.
  computers: { a: NAWAH_A, b: SILICA_B },
};

/** A look with its demo's own tabs when it has none of its own. */
function withDemoTabs(d: SignatureDesign): SignatureDesign {
  const tabs = d.tabs ?? STUDIO_DEMO_DESIGNS[d.demo]?.tabs;
  return tabs ? { ...d, tabs } : d;
}

/** A demo's look; missing `look`, its main look (the demo: C where it has one, else A). Undefined when the demo has no such look. */
export function signatureDesign(demo: StudioDemoId, look?: SignatureLook): SignatureDesign | undefined {
  const d = SIGNATURE_DESIGNS[demo]?.[look ?? mainLookOf(demo)];
  return d ? withDemoTabs(d) : undefined;
}

/** 223 The looks a demo has in Studio's order (./signature.ts SIGNATURE_LOOKS): C, D, A, B (none for a demo without Signature looks). */
export function signatureLooksOf(demo: StudioDemoId): SignatureLook[] {
  return SIGNATURE_LOOKS.filter((look) => SIGNATURE_DESIGNS[demo]?.[look]);
}

/** 223 A demo's main look, the demo itself: its first look in Studio's order (C for a shop type that has one, else A). */
export function mainLookOf(demo: StudioDemoId): SignatureLook {
  return SIGNATURE_LOOKS.find((look) => SIGNATURE_DESIGNS[demo]?.[look]) ?? "a";
}

/** 223 The template a demo's main look is (`<demo>_signature_<look>`): the demo app's and its own template's home. */
export function mainTemplateOf(demo: StudioDemoId): string {
  return signatureTemplateId(demo, mainLookOf(demo));
}

/** Every demo's looks in Studio's order (C, D, A, B), in the demos' order. */
export function signatureDesigns(): SignatureDesign[] {
  return (Object.keys(SIGNATURE_DESIGNS) as StudioDemoId[]).flatMap((demo) => signatureLooksOf(demo).map((look) => signatureDesign(demo, look)!));
}

/** A look's home: its header (one not lying over its cover) in the look's premium style. */
function chromedHome(d: SignatureDesign, page: StudioPage): StudioPage {
  const header = chromedHeader(page.header, d.chrome.home ?? d.chrome.header);
  return header ? { ...page, header } : page;
}

/**
 * Each look as a template of its demo's kind (`<demo>_signature_<look>`,
 * lib/studio/sections.ts TEMPLATES): its home in the dashboard's language
 * with Studio's others as translations, and the whole project with it
 * (lib/studio/start.ts): every page after the home in the look (`demo`,
 * `look`), its bar, tabs, colours, font, sign-in, account menu and premium
 * system screens (`project`).
 */
export function signatureTemplates(): TemplateInfo[] {
  return signatureDesigns().map(
    (d): TemplateInfo => ({
      id: signatureTemplateId(d.demo, d.variant),
      icon: d.template.icon,
      fits: d.template.fits,
      demo: d.demo,
      look: d.variant,
      recommended: true,
      ...(d.isNew ? { isNew: true } : {}),
      project: signatureProject(d),
      make: (ctx: SectionContext) => {
        const { ctx: words, page } = translating({ ...ctx, demo: d.demo, look: d.variant, ownPages: ctx.demo === d.demo });
        return page(chromedHome(d, d.home(words)));
      },
    }),
  );
}

/** 130.23 A demo's premium chrome: its main look's (the demo is its main look); none for a project not made from a demo. */
export function demoChrome(demo: StudioDemoId | null | undefined): DemoChrome | null {
  if (!demo) return null;
  const d = signatureDesign(demo);
  return d ? { pages: d.chrome.header, system: signatureSystem(d, null) } : null;
}
// ——— end 130 ———

/** The demo's own design, when it has one; 130 its Signature look `look` (missing, its main look: the demo) when it has looks. */
export function studioDemoDesign(demo: StudioDemoId | undefined, look?: SignatureLook): DemoDesign | undefined {
  if (!demo) return undefined;
  return signatureDesign(demo, look) ?? STUDIO_DEMO_DESIGNS[demo];
}


/** A demo's home as a template of its kind (lib/studio/sections.ts TEMPLATES), in the dashboard's language with Studio's others as translations. */
export function demoDesignTemplate(demo: StudioDemoId): TemplateInfo {
  const d = STUDIO_DEMO_DESIGNS[demo]!;
  return {
    id: d.template.id,
    icon: d.template.icon,
    fits: d.template.fits,
    make: (ctx: SectionContext) => {
      const { ctx: words, page } = translating(ctx);
      return page(d.home(words));
    },
  };
}

/** The demo's bar as approved (lib/demo/screens.ts DEMO_TAB_BARS); 130 its look's premium bar when it has looks. */
export function demoDesignBar(demo: StudioDemoId, look?: SignatureLook): TabBarStyle {
  const bar = studioDemoDesign(demo, look)?.bar;
  if (!bar) throw new Error(`The ${demo} demo's design has no bar of its own.`);
  return bar;
}

/** The demo's tabs as its own design has them (the kind's, for a demo without one or a project not made from a demo). */
export function designedTabs(tabs: readonly LayoutTab[], ctx: Pick<SectionContext, "demo" | "look">): readonly LayoutTab[] {
  const own = studioDemoDesign(ctx.demo, ctx.look)?.tabs;
  return own ? own(tabs) : tabs;
}

/**
 * A page after the demo's home in the demo's look: its header and
 * background in the demo's colours, and over its screen the demo's own
 * elements where it has them, in Studio's languages. Pages of projects not
 * made from a demo (`ctx.demo` missing), and of demos without a design of
 * their own, as they are.
 */
export function designedDemoPage<P extends { studio: StudioPage }>(ctx: SectionContext, page: P): P {
  const design = studioDemoDesign(ctx.demo, ctx.look);
  if (!design) return page;
  const { ctx: words, translate } = translating(ctx);
  const own = page.studio.screen ? design.over(page.studio.screen, words) : null;
  const { header: was, ...studio } = page.studio;
  const look = design.look && (!design.look.headed || was) ? design.look : undefined;
  const coloured = was && look ? { ...was, ...look.header } : was;
  // 130.23 The pages after the home in the premium header style of the look (130 a Signature look's), else the demo's.
  const header = chromedHeader(coloured, (design as Partial<SignatureDesign>).chrome?.header ?? demoChrome(ctx.demo)?.pages);
  return {
    ...page,
    studio: {
      ...studio,
      ...(header ? { header } : {}),
      ...(look?.background ? { background: look.background } : {}),
      ...(look?.dark_background ? { dark_background: look.dark_background } : {}),
      // 167 The account's Sign out stays, after the look's own elements.
      body: { ...page.studio.body, children: own ? [...own.map(translate), ...(page.studio.body.children ?? []).filter((n) => n.action?.type === "sign_out")] : page.studio.body.children },
    },
  };
}

/** The pages of its own the demo's tabs open (Zad's Shops), made with `ctx` (its words, in Studio's languages through `translate`). */
export function designedOwnPages(ctx: SectionContext): { slug: string; title: SectionWord; studio: StudioPage }[] {
  return studioDemoDesign(ctx.demo, ctx.look)?.pages?.(ctx) ?? [];
}
