import type { StudioNode, StudioNodeType, StudioScrim } from "../pages/types";
import type { ElementInfo } from "./elements";

/**
 * 129.1–129.8 Studio's premium motion and media (the editor's Premium
 * group): a hero slider and a card carousel (looks of `slider`), stories,
 * a ticker (`marquee`), a video banner (`video_hero`), a photo gallery
 * with a full-screen viewer (`gallery`), before and after (`before_after`)
 * and a parallax banner (`parallax_banner`); each starts as the approved
 * Studio demos draw them (photos under a scrim, big confident type, rounded
 * cards, floating pills), every part of it editable.
 */

/** The sample words a new premium element starts with, in the dashboard's language. */
export type PremiumWord = "kicker" | "headline" | "headline2" | "headline3" | "cta" | "story" | "ticker" | "before" | "after" | "caption" | "videoTitle" | "videoText" | "parallaxTitle" | "parallaxText";

export const PREMIUM_WORDS_EN: Record<PremiumWord, string> = {
  kicker: "New season",
  headline: "Made for the way you live",
  headline2: "Fresh every morning",
  headline3: "Your city, delivered",
  cta: "Discover",
  story: "New",
  ticker: "Free delivery\nNew arrivals every week\nMembers save 10%",
  before: "Before",
  after: "After",
  caption: "Photo",
  videoTitle: "See it in motion",
  videoText: "A minute that says it all.",
  parallaxTitle: "Crafted with care",
  parallaxText: "Every detail, by hand.",
};

/** The Premium group's tiles: a `preset` is a look of an existing element (a slider). */
export const PREMIUM_MOTION_ELEMENTS: readonly ElementInfo[] = [
  { type: "slider", preset: "hero_slider", group: "premium", icon: "view_carousel", keywords: "hero slider slideshow banner autoplay ken burns zoom stories progress premium" },
  { type: "slider", preset: "card_carousel", group: "premium", icon: "view_week", keywords: "carousel cards peek next swipe snap premium" },
];

/** The scrim of a photo with its words at its foot. */
const FOOT_SCRIM: StudioScrim = { color: "#000000", from: 0.25, middle: 0.05, at: 40, to: 0.8 };
const pad = (top: number, end: number, bottom: number, start: number) => ({ top, end, bottom, start });

export interface PremiumNewOptions {
  brand: string;
  newId: () => string;
  words?: (key: PremiumWord) => string;
}

/** A new premium element, or a premium look of an existing one; null when it is neither. */
export function premiumMotionNode(type: StudioNodeType, preset: string | undefined, options: PremiumNewOptions): StudioNode | null {
  const id = options.newId;
  const w = (key: PremiumWord) => options.words?.(key) ?? PREMIUM_WORDS_EN[key];
  const slide = (i: number, height: number, radius: number): StudioNode => ({
    id: id(),
    type: "photo_hero",
    image_url: null,
    height,
    ...(radius ? { radius } : {}),
    background: ["#1F2A37", "#3B2A4F", "#1E3A34"][i % 3]!,
    scrim: FOOT_SCRIM,
    align: "end",
    gap: 8,
    padding: pad(20, 20, radius ? 22 : 44, 20),
    children: [
      ...(radius ? [] : [{ id: id(), type: "text" as const, text: w("kicker"), color: "#F5C451", font: { size: 12, weight: 800 as const, letter_spacing: 1.5, uppercase: true } }]),
      { id: id(), type: "text", text: w((["headline", "headline2", "headline3"] as const)[i % 3]!), color: "#FFFFFF", font: { size: radius ? 20 : 28, weight: 800, line_height: 1.15 } },
      ...(radius
        ? []
        : [
            {
              id: id(),
              type: "button" as const,
              text: w("cta"),
              width: "hug" as const,
              height: 42,
              radius: 21,
              background: "#FFFFFF",
              color: "#0E0D24",
              font: { size: 14, weight: 800 as const },
              padding: pad(0, 20, 0, 20),
              margin: pad(6, 0, 0, 0),
            },
          ]),
    ],
  });
  if (type === "slider" && preset === "hero_slider") {
    // 129.1 Full-width photos under a scrim, a line per slide filling over them, the open one zooming slowly.
    return { id: id(), type, height: 440, per_view: 1, autoplay: true, interval_ms: 5000, indicator: "progress", ken_burns: true, children: [0, 1, 2].map((i) => slide(i, 440, 0)) };
  }
  if (type === "slider" && preset === "card_carousel") {
    // 129.1 Rounded photo cards, the next one peeking, snapping one at a time, the dots in a frosted pill.
    return { id: id(), type, height: 260, per_view: 1.2, gap: 12, indicator: "pill", padding: pad(0, 0, 0, 16), margin: pad(8, 0, 8, 0), children: [0, 1, 2].map((i) => slide(i, 260, 24)) };
  }
  return null;
}
