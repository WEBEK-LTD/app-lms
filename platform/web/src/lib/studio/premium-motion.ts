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
export type PremiumWord = "kicker" | "headline" | "headline2" | "headline3" | "cta" | "story" | "story2" | "story3" | "story4" | "ticker" | "before" | "after" | "caption" | "videoTitle" | "videoText" | "parallaxTitle" | "parallaxText";

export const PREMIUM_WORDS_EN: Record<PremiumWord, string> = {
  kicker: "New season",
  headline: "Made for the way you live",
  headline2: "Fresh every morning",
  headline3: "Your city, delivered",
  cta: "Discover",
  story: "New",
  story2: "Offers",
  story3: "Today",
  story4: "Tips",
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
  { type: "stories", group: "premium", icon: "amp_stories", keywords: "stories rings circles story viewer full screen highlights premium" },
  { type: "video_hero", group: "premium", icon: "movie", keywords: "video hero banner background loop muted poster play cover premium" },
  { type: "parallax_banner", group: "premium", icon: "wallpaper", keywords: "parallax banner photo scroll depth glass frosted panel premium" },
  { type: "before_after", group: "premium", icon: "compare", keywords: "before after compare slider divider photos transformation premium" },
  { type: "gallery", group: "premium", icon: "photo_library", keywords: "gallery photos masonry bento filmstrip lightbox full screen zoom captions premium" },
  { type: "marquee", group: "premium", icon: "text_rotation_none", keywords: "marquee ticker scrolling words logos band news running text premium" },
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
  if (type === "video_hero" || type === "parallax_banner") {
    // 129.4 A muted looping video (its poster first) under a scrim, its words and buttons over it;
    // 129.7 a photo moving slower than the page, its words in a frosted panel.
    const video = type === "video_hero";
    return {
      id: id(),
      type,
      ...(video ? { video_url: null, autoplay: true } : { parallax: { speed: 0.5 }, glass: true }),
      image_url: null,
      height: video ? 440 : 320,
      ...(video ? {} : { radius: 26, margin: pad(8, 16, 8, 16) }),
      background: video ? "#10131F" : "#1F2A37",
      scrim: video ? FOOT_SCRIM : { color: "#000000", from: 0.1, to: 0.45 },
      align: video ? "end" : "center",
      gap: 10,
      padding: video ? pad(24, 22, 40, 22) : pad(22, 22, 22, 22),
      children: [
        { id: id(), type: "text", text: w(video ? "videoTitle" : "parallaxTitle"), color: "#FFFFFF", font: { size: video ? 30 : 24, weight: 800, line_height: 1.15 } },
        { id: id(), type: "text", text: w(video ? "videoText" : "parallaxText"), color: "#FFFFFF", opacity: 0.9, font: { size: 15 } },
        { id: id(), type: "button", text: w("cta"), width: "hug", height: 44, radius: 22, background: "#FFFFFF", color: "#0E0D24", font: { size: 14, weight: 800 }, padding: pad(0, 22, 0, 22), margin: pad(6, 0, 0, 0) },
      ],
    };
  }
  if (type === "before_after") {
    // 129.6 Two of the owner's photos with a divider to drag, labelled; they're added in the inspector.
    return { id: id(), type, images: [], aspect_ratio: 1.33, radius: 22, margin: pad(8, 16, 8, 16) };
  }
  if (type === "gallery") {
    // 129.5 A bento of the owner's photos with a full-screen viewer; it needs its first photo to be saved.
    return { id: id(), type, gallery: { layout: "bento", radius: 18 }, images: [], gap: 8, padding: pad(8, 16, 8, 16) };
  }
  if (type === "marquee") {
    // 129.3 A dark band of words running toward the start, a gold star between them, light by night.
    return {
      id: id(),
      type,
      text: w("ticker"),
      icon: "star",
      icon_size: 16,
      gap: 18,
      background: "#0E0D24",
      color: "#FFFFFF",
      dark_background: "#F4EFE6",
      dark_color: "#0E0D24",
      font: { size: 15, weight: 700 },
      padding: pad(12, 0, 12, 0),
      margin: pad(8, 0, 8, 0),
      marquee: { speed: 40 },
    };
  }
  if (type === "stories") {
    // 129.2 Round photos in rings that open full screen, one after another; their photos are the owner's to add.
    return {
      id: id(),
      type,
      interval_ms: 5000,
      padding: pad(10, 16, 10, 16),
      slides: (["story", "story2", "story3", "story4"] as const).map((key) => ({ image_url: null, heading: w(key), subheading: null, action: null })),
    };
  }
  return null;
}
