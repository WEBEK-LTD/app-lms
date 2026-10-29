import type {
  Action,
  Appearance,
  Card,
  FaqEntry,
  FormField,
  HoursPeriod,
  ItemSource,
  ItemsSort,
  LayoutBlock,
  LayoutTab,
  NoticeTone,
  Person,
  QuickLink,
  Quote,
  ScreenName,
  Slide,
  Stat,
  Weekday,
} from "../types";

/**
 * 33 Builders for the ready-made designs (lib/pages/designs): short calls
 * that make valid layout blocks, so each design reads like a page outline.
 * `{app}` in a text becomes the app's name when the design is applied.
 */

/** A ready-made design: a whole layout preset for one kind of app. */
export interface Design {
  /** Stable, stored on the app (`apps.design`): `<kind>-<name>`. */
  id: string;
  /** The kind (lib/app/kinds.ts KINDS) it's made for. */
  kind: string;
  name: string;
  /** One line under the name. */
  description: string;
  /** The look: the app's main color stays the owner's; 110.3 with the header of the pages in the tabs (the app's name or logo on the home page). */
  look: Pick<Appearance, "template" | "corners" | "cards" | "font" | "secondary_color"> & Partial<Pick<Appearance, "header">>;
  tabs: LayoutTab[];
  pages: DesignPage[];
  /** 84.2 The side menu: every design gets its About us and Contact pages there (index.ts). */
  menu?: LayoutTab[];
  /** 84.2 Colours that suit it, the first its own; the owner can pick one when choosing it. */
  palettes?: Palette[];
}

/** 84.2 A main and a second colour that go together. */
export interface Palette {
  id: string;
  name: string;
  /** The app's main colour; null keeps the one it has. */
  primary: string | null;
  secondary: string;
}

/** 84.2 Colours offered with the designs, besides each design's own. */
export const PALETTES: readonly Palette[] = [
  { id: "ocean", name: "Ocean", primary: "#0E4C92", secondary: "#38BDF8" },
  { id: "forest", name: "Forest", primary: "#1F5135", secondary: "#A3C46B" },
  { id: "sunset", name: "Sunset", primary: "#B4232A", secondary: "#F59E0B" },
  { id: "berry", name: "Berry", primary: "#6D1A5B", secondary: "#EC4899" },
  { id: "slate", name: "Slate", primary: "#1E293B", secondary: "#14B8A6" },
  { id: "sand", name: "Sand", primary: "#7C4A1E", secondary: "#E9B872" },
];

/** 84.2 Pages most businesses want besides the home page (110.3 the designs have their own: designs/pages.ts). */
export const aboutPage = (): DesignPage => ({
  slug: "about",
  title: "About us",
  show_title: true,
  blocks: [text("story", "<p>We started {app} to do one thing well and do it for people we know by name. Ask us anything: we answer every message ourselves.</p>")],
});

export const contactPage = (): DesignPage => ({
  slug: "contact",
  title: "Contact",
  show_title: true,
  blocks: [text("reach", "<p>Call, write or send us a message here: we answer within a working day.</p>"), contact("Contact us")],
});

export interface DesignPage {
  slug: string;
  title: string;
  show_title: boolean;
  blocks: LayoutBlock[];
}

export const screen = (screen: ScreenName): Action => ({ type: "screen", screen });
export const page = (slug: string): Action => ({ type: "page", page_slug: slug });

export const tab = (id: string, label: string, icon: string, target: Action): LayoutTab => ({ id, label, icon, target });
export const homeTab = tab("home", "Home", "home", page("home"));
export const accountTab = tab("account", "Account", "person", screen("account"));
export const screenTab = (id: string, label: string, icon: string, s: ScreenName) => tab(id, label, icon, screen(s));
export const pageTab = (slug: string, label: string, icon: string) => tab(slug, label, icon, page(slug));

const base = (id: string, type: LayoutBlock["type"], title: string | null = null): LayoutBlock => ({ id, type, visibility: "everyone", title });

export const text = (id: string, html: string): LayoutBlock => ({ ...base(id, "text"), html });

export const search = (source: ItemSource, placeholder: string): LayoutBlock => ({ ...base("search", "search"), source, placeholder });

export function list(
  id: string,
  title: string,
  source: ItemSource,
  layout: "carousel" | "grid" | "list",
  options: { sort?: ItemsSort; limit?: number; featured?: boolean; seeAll?: Action } = {},
): LayoutBlock {
  return {
    ...base(id, "items", title),
    source,
    layout,
    see_all: options.seeAll ?? null,
    query: { category_id: null, featured: options.featured ?? false, sort: options.sort ?? "newest", limit: options.limit ?? 10, ids: [] },
  };
}

export const categories = (title: string, source: ItemSource, style: "chips" | "tiles" = "chips"): LayoutBlock => ({ ...base("categories", "categories", title), source, style });

export const continueLearning = (): LayoutBlock => ({ ...base("continue", "continue_learning", "Continue learning"), visibility: "signed_in" });

export const button = (id: string, label: string, action: Action, style: "filled" | "outlined" | "text" = "filled", icon: string | null = null): LayoutBlock => ({
  ...base(id, "button"),
  label,
  icon,
  style,
  action,
});

export const slide = (heading: string, subheading: string | null, action: Action | null = null): Slide => ({ image_url: null, heading, subheading, action });

export const slider = (slides: Slide[], autoAdvance = true): LayoutBlock => ({ ...base("slider", "slider"), auto_advance: autoAdvance, slides });

export const link = (icon: string, label: string, action: Action): QuickLink => ({ icon, label, action });

export const quickLinks = (links: QuickLink[], style: "grid" | "row" = "grid", title: string | null = null): LayoutBlock => ({ ...base("quick-links", "quick_links", title), style, links });

export const notice = (tone: NoticeTone, message: string, label: string | null = null, action: Action | null = null, id = "notice"): LayoutBlock => ({
  ...base(id, "notice"),
  tone,
  text: message,
  ...(label ? { label } : {}),
  action,
});

/** Ends `days` after the design is applied (`ends_at` is filled in then). */
export const countdown = (heading: string, days: number, endedText: string | null = null, button?: { label: string; action: Action }): LayoutBlock => ({
  ...base("countdown", "countdown"),
  heading,
  subheading: null,
  ends_at: `+${days}d`,
  ended_text: endedText,
  ...(button ? { label: button.label } : {}),
  action: button?.action ?? null,
});

export const quote = (text: string, name: string, role: string | null = null, rating: number | null = 5): Quote => ({ text, name, role, photo_url: null, rating });

export const testimonials = (title: string, quotes: Quote[], id = "testimonials"): LayoutBlock => ({ ...base(id, "testimonials", title), quotes });

export const question = (q: string, answer: string): FaqEntry => ({ question: q, answer });

export const faq = (title: string, questions: FaqEntry[], id = "faq"): LayoutBlock => ({ ...base(id, "faq", title), questions });

/**
 * 110.3 One of Yallapp's drawn pictures (public/design-pictures, drawn by
 * lib/demo/design-art.ts): `picture:<file>` in a design, its address on the
 * platform once applied (index.ts), nothing without one.
 */
export const PICTURE = "picture:";
export const picture = (file: string): string => `${PICTURE}${file}`;

export const person = (name: string, role: string | null, bio: string | null = null, photo: string | null = null): Person => ({ name, role, bio, photo_url: photo ? picture(photo) : null, action: null });

export const team = (title: string, people: Person[], layout: "carousel" | "grid" | "list" = "carousel", id = "team"): LayoutBlock => ({ ...base(id, "team", title), layout, people });

export const stat = (value: string, label: string): Stat => ({ value, label });

export const stats = (values: Stat[], title: string | null = null, id = "stats"): LayoutBlock => ({ ...base(id, "stats", title), stats: values });

// 110.3 Cards, photos, a place on the map and forms (99.4 blocks).

export const card = (title: string, body: string | null, photo: string | null = null, action: Action | null = null): Card => ({ title, text: body, image_url: photo ? picture(photo) : null, action });

export const cards = (id: string, title: string | null, list: Card[], columns: 2 | 3 = 2): LayoutBlock => ({ ...base(id, "cards", title), columns, cards: list });

/** Photos (Yallapp's drawn pictures, by file), with captions or none. */
export const gallery = (id: string, title: string | null, photos: (string | [string, string])[], columns: 2 | 3 = 3): LayoutBlock => ({
  ...base(id, "gallery", title),
  columns,
  images: photos.map((p) => (typeof p === "string" ? { image_url: picture(p), caption: null } : { image_url: picture(p[0]), caption: p[1] })),
});

/** Where the business is: a sample place the owner moves to theirs (the editor marks it). */
export const SAMPLE_PLACE = { latitude: 40.9903, longitude: 29.029 } as const;

export const place = (title: string | null, label: string | null = "Directions", id = "map"): LayoutBlock => ({
  ...base(id, "map", title),
  ...SAMPLE_PLACE,
  name: "{app}",
  address: null,
  ...(label ? { label } : {}),
});

export const field = (id: string, kind: FormField["kind"], label: string, required = false): FormField => ({ id, kind, label, required, options: null });

/** Answers emailed to the business. */
export const form = (id: string, title: string, fields: FormField[], submit: string, success: string): LayoutBlock => ({
  ...base(id, "form", title),
  fields,
  submit_label: submit,
  success_text: success,
  send_to: "email",
});

/** The same hours on several days. */
export function days(list: Weekday[], opens: string, closes: string): HoursPeriod[] {
  return list.map((day) => ({ day, opens, closes }));
}

export const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAYS_ONLY: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export const hours = (title: string, periods: HoursPeriod[], note: string | null = null, id = "hours"): LayoutBlock => ({ ...base(id, "hours", title), hours: periods, closed_dates: [], note });

/** Filled with the app's own contact details when the design is applied, and left out when it has none. */
export const contact = (title = "Contact us", id = "contact"): LayoutBlock => ({
  ...base(id, "contact", title),
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  latitude: null,
  longitude: null,
});
