import { compareVersions, parseVersion } from "../semver";
import { LAYOUT_LIMITS, type BlockType, type EntryList, type TRANSLATABLE, type TRANSLATABLE_ENTRIES } from "./types";

/**
 * 83.1 One definition per block: what the editor calls it and where it sits
 * in "Add a block", the longest each of its texts can be, how many entries
 * its lists take, the first app version that shows it and what older apps
 * show instead. The validator (lib/pages/validate.ts), the editor's form
 * (block-settings.tsx) and the preview read it, so a new block is added
 * here once.
 */

export type BlockGroup = "Content" | "Lists" | "Engage" | "Contact" | "Layout";
/** A block's own texts, the ones that can carry translations. */
export type BlockText = (typeof TRANSLATABLE.block)[number];
/** A block's lists: the ones whose entries have texts, and the others. */
export type BlockList = EntryList | "profiles" | "hours" | "closed_dates";

/** What an app older than the block's `since` shows: today, nothing (it leaves the block out). */
export type OlderApps = "nothing";

export interface BlockDefinition {
  /** Its name in the dashboard (translated there) and in the validator's messages. */
  label: string;
  hint: string;
  /** Its icon in "Add a block" and the block list (Material Symbols). */
  icon: string;
  group: BlockGroup;
  /** Its own texts and the longest each can be; every block has a title. */
  texts: Partial<Record<BlockText, number>>;
  /** How many entries each of its lists takes. */
  lists?: Partial<Record<BlockList, { min: number; max: number }>>;
  /** The first version of the app that shows it. */
  since: string;
  olderApps: OlderApps;
}

/** The app's first version: the blocks it shows. */
export const FIRST_APP_VERSION = "1.0.0";

const TITLE = 80;
const base = { since: FIRST_APP_VERSION, olderApps: "nothing" } as const;

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  banner: { label: "Banner", hint: "A wide image with a heading", icon: "image", group: "Content", texts: { title: TITLE, heading: 120, subheading: 200 }, ...base },
  slider: { label: "Slider", hint: "Banners people swipe through", icon: "view_carousel", group: "Content", texts: { title: TITLE }, lists: { slides: { min: 1, max: 8 } }, ...base },
  text: { label: "Text", hint: "Paragraphs, headings and links", icon: "title", group: "Content", texts: { title: TITLE, html: LAYOUT_LIMITS.htmlChars }, ...base },
  image: { label: "Image", hint: "One image, optionally a link", icon: "photo_library", group: "Content", texts: { title: TITLE }, ...base },
  video: { label: "Video", hint: "An MP4, YouTube or Vimeo video", icon: "smart_display", group: "Content", texts: { title: TITLE }, ...base },
  button: { label: "Button", hint: "A button that opens something", icon: "touch_app", group: "Content", texts: { title: TITLE, label: 40 }, ...base },
  notice: { label: "Notice", hint: "A colored announcement bar", icon: "campaign", group: "Content", texts: { title: TITLE, text: 200, label: 40 }, ...base },
  // 31 The editor names this app's own lists instead (lib/pages/sources.ts, listHint).
  items: { label: "List", hint: "Entries from your app", icon: "list", group: "Lists", texts: { title: TITLE }, ...base },
  categories: { label: "Categories", hint: "Category chips or tiles", icon: "category", group: "Lists", texts: { title: TITLE }, ...base },
  search: { label: "Search box", hint: "A search box", icon: "search", group: "Lists", texts: { title: TITLE, placeholder: 60 }, ...base },
  continue_learning: { label: "Continue learning", hint: "The course a student is taking", icon: "play_circle", group: "Lists", texts: { title: TITLE }, ...base },
  quick_links: { label: "Quick links", hint: "Icon tiles that open screens and pages", icon: "apps", group: "Lists", texts: { title: TITLE }, lists: { links: { min: 1, max: 12 } }, ...base },
  team: { label: "Team", hint: "People with a photo and a role", icon: "groups", group: "Lists", texts: { title: TITLE }, lists: { people: { min: 1, max: 20 } }, ...base },
  stats: { label: "Numbers", hint: "Two to four big numbers", icon: "monitoring", group: "Lists", texts: { title: TITLE }, lists: { stats: { min: 2, max: 4 } }, ...base },
  testimonials: { label: "Testimonials", hint: "What your customers say", icon: "format_quote", group: "Engage", texts: { title: TITLE }, lists: { quotes: { min: 1, max: 10 } }, ...base },
  faq: { label: "Questions", hint: "Questions with answers that open", icon: "help", group: "Engage", texts: { title: TITLE }, lists: { questions: { min: 1, max: 20 } }, ...base },
  countdown: { label: "Countdown", hint: "Time left until a date", icon: "timer", group: "Engage", texts: { title: TITLE, heading: 120, subheading: 200, ended_text: 120, label: 40 }, ...base },
  contact: { label: "Contact", hint: "Call, WhatsApp, email, directions", icon: "call", group: "Contact", texts: { title: TITLE, address: 200 }, ...base },
  hours: { label: "Opening hours", hint: "Your hours, with Open now", icon: "schedule", group: "Contact", texts: { title: TITLE, note: 300 }, lists: { hours: { min: 0, max: 21 }, closed_dates: { min: 0, max: 30 } }, ...base },
  social: { label: "Social links", hint: "Buttons to your social profiles", icon: "share", group: "Contact", texts: { title: TITLE }, lists: { profiles: { min: 1, max: 9 } }, ...base },
  embed: { label: "Web page", hint: "A web page inside the app", icon: "web", group: "Layout", texts: { title: TITLE }, ...base },
  spacer: { label: "Space", hint: "Empty space between blocks", icon: "space_bar", group: "Layout", texts: { title: TITLE }, ...base },
};

/** "Add a block" in groups, in this order; a group shows the blocks the app has. */
export const BLOCK_GROUP_ORDER: BlockGroup[] = ["Content", "Lists", "Engage", "Contact", "Layout"];

/** The texts of a list's entries and the longest each can be, the same in every block with that list. */
export const ENTRY_TEXT_LIMITS: { [L in EntryList]: Record<(typeof TRANSLATABLE_ENTRIES)[L][number], number> } = {
  slides: { heading: 120, subheading: 200 },
  links: { label: 24 },
  quotes: { text: 400, name: 60, role: 60 },
  questions: { question: 200, answer: 1000 },
  people: { name: 60, role: 60, bio: 300 },
  stats: { value: 12, label: 40 },
};

/** The longest a block's own text can be; 0 for a text the block doesn't have. */
export function blockTextLimit(type: BlockType, text: BlockText): number {
  return BLOCK_DEFINITIONS[type].texts[text] ?? 0;
}

/** How many entries a block's list takes. */
export function blockListLimits(type: BlockType, list: BlockList): { min: number; max: number } {
  const limits = BLOCK_DEFINITIONS[type].lists?.[list];
  if (!limits) throw new Error(`${type} blocks have no ${list}.`);
  return limits;
}

/** Whether an app at `version` (like 1.4.0) shows blocks of `type`; an unknown version shows them all. */
export function appShowsBlock(type: BlockType, version: string | null | undefined): boolean {
  return !version || !parseVersion(version) || compareVersions(version, BLOCK_DEFINITIONS[type].since) >= 0;
}
