import type {
  Action,
  Appearance,
  FaqEntry,
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
  /** The look: the app's main color stays the owner's. */
  look: Pick<Appearance, "template" | "corners" | "cards" | "font" | "secondary_color">;
  tabs: LayoutTab[];
  pages: DesignPage[];
}

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

export const notice = (tone: NoticeTone, message: string, label: string | null = null, action: Action | null = null): LayoutBlock => ({
  ...base("notice", "notice"),
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

export const testimonials = (title: string, quotes: Quote[]): LayoutBlock => ({ ...base("testimonials", "testimonials", title), quotes });

export const question = (q: string, answer: string): FaqEntry => ({ question: q, answer });

export const faq = (title: string, questions: FaqEntry[]): LayoutBlock => ({ ...base("faq", "faq", title), questions });

export const person = (name: string, role: string | null, bio: string | null = null): Person => ({ name, role, bio, photo_url: null, action: null });

export const team = (title: string, people: Person[], layout: "carousel" | "grid" | "list" = "carousel"): LayoutBlock => ({ ...base("team", "team", title), layout, people });

export const stat = (value: string, label: string): Stat => ({ value, label });

export const stats = (values: Stat[], title: string | null = null): LayoutBlock => ({ ...base("stats", "stats", title), stats: values });

/** The same hours on several days. */
export function days(list: Weekday[], opens: string, closes: string): HoursPeriod[] {
  return list.map((day) => ({ day, opens, closes }));
}

export const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAYS_ONLY: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export const hours = (title: string, periods: HoursPeriod[], note: string | null = null): LayoutBlock => ({ ...base("hours", "hours", title), hours: periods, closed_dates: [], note });

/** Filled with the app's own contact details when the design is applied, and left out when it has none. */
export const contact = (title = "Contact us"): LayoutBlock => ({
  ...base("contact", "contact", title),
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  latitude: null,
  longitude: null,
});
