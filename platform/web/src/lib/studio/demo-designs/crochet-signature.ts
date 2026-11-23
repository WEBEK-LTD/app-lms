import type { StudioPage } from "../../pages/types";
import type { SectionContext, SectionInfo } from "../sections";
import { idOf } from "./parts";
import { sides, signatureBar, signatureHeader } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { KIT_MENU_PAGE, kitCategories, kitHomeHeader, kitMenuPage, kitProducts, kitSearch, kitTabs, type KitLook } from "./shop-kit-parts";

/** 210 (stub, replaced with the type's two looks) */
const LOOK_A: KitLook = {
  k: { page: "#F4F1EA", darkPage: "#141613", surface: "#FFFFFF", darkSurface: "#1E211D", ink: "#1F241C", darkInk: "#EEF0E8", muted: "#62675C", darkMuted: "#AEB4A6", line: "#E3DFD4", darkLine: "#30342D", accent: "#4F5D2F", darkAccent: "#B9C98F", fill: "#4F5D2F", darkFill: "#9DB06A", onFill: "#FFFFFF", darkOnFill: "#141613" },
  tint: { day: "#ECE8DD", night: "#252922" },
  family: "IBM Plex Sans Arabic",
  look: "a",
  dir: "crochet-photos",
  radius: 18,
  heavy: 700,
};
const LOOK_B: KitLook = { ...LOOK_A, look: "b" };

function home(l: KitLook) {
  return (ctx: SectionContext): StudioPage => ({
    header: kitHomeHeader(ctx, l, "crWordmark"),
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: { id: idOf(ctx)(), type: "column", padding: sides(0, 0, 96, 0), children: [kitSearch(ctx, l, "skCategories"), kitCategories(ctx, l), kitProducts(ctx, l, { word: "skSeeAll" })] },
  });
}

const pages = (l: KitLook) => (ctx: SectionContext) => [{ slug: KIT_MENU_PAGE, title: "skCategoryMenu" as const, studio: kitMenuPage(ctx, l, { wordmark: "crWordmark", search: "skCategories", quick: [{ word: "skSeeAll", icon: "grid_view" }], contactLine: "skContact" }) }];

const screens = signatureScreens({ style: "photo", photo: "/crochet-photos/hero.jpg", title: { en: "Welcome", ar: "أهلًا بك", tr: "Hoş geldiniz" }, subtitle: { en: "Sign in to follow your orders.", ar: "سجّل الدخول لتتابع طلباتك.", tr: "Siparişlerinizi takip etmek için giriş yapın." }, menu: "cover", first: ["orders", "notifications", "settings", "help", "privacy", "terms"] });

function design(l: KitLook, variant: "a" | "b"): SignatureDesign {
  return {
    demo: "crochet",
    variant,
    template: { id: `crochet_signature_${variant}`, icon: "storefront", fits: { types: ["store"], plain: true } },
    home: home(l),
    over: () => null,
    tabs: kitTabs,
    pages: pages(l),
    bar: signatureBar(l.k, { design: "float", labels: "active", radius: 30, margin: 12 }),
    look: { header: signatureHeader(l.k, "glass"), background: l.k.page, dark_background: l.k.darkPage },
    chrome: { header: "glass", system: "glass" },
    isNew: true,
    project: { appearance: { font_family: l.family, dark_background: l.k.darkPage, dark_surface: l.k.darkSurface }, screens },
  };
}

export const CROCHET_A = design(LOOK_A, "a");
export const CROCHET_B = design(LOOK_B, "b");
export const CROCHET_SECTIONS: readonly SectionInfo[] = [];
