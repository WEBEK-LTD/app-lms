/**
 * The Studio story pages (/yallapp-studio/<story>): one long page per
 * Studio bundle that tells a day with the apps, explains every part of
 * them, compares them with the companies that make such apps and shows the
 * Studio plans. The words are in src/content/stories/<lang>.ts; the shape
 * (icons, screens, photos, numbers) is in ./stories.ts, item by item.
 */

export const STORY_IDS = ["school", "rides", "delivery", "multi-vendor"] as const;
export type StoryId = (typeof STORY_IDS)[number];

export function isStoryId(value: string): value is StoryId {
  return (STORY_IDS as readonly string[]).includes(value);
}

/** A story page's English path. */
export function storyPath(id: StoryId): string {
  return `/yallapp-studio/${id}`;
}

export function storyParams(): { story: StoryId }[] {
  return STORY_IDS.map((story) => ({ story }));
}

/** A notification as the phone shows it, in the app's own words. */
export interface PushText {
  app: string;
  title: string;
  body: string;
}

/** One scene of the story, at its time of day. */
export interface ChapterText {
  time: string;
  kicker: string;
  title: string;
  text: string;
  push?: PushText;
}

/** One app or one side of the system, explained in full. */
export interface SystemText {
  /** "Student", "Driver app". */
  name: string;
  title: string;
  text: string;
  /** [title, what it does], one per feature icon in ./stories.ts. */
  features: [string, string][];
}

/** Everything a story page says, in one language. */
export interface StoryText {
  /** Its name in links and the breadcrumb ("School app"). */
  navName: string;
  metaTitle: string;
  metaDescription: string;
  /** One line for cards and the share image. */
  summary: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** Who is who in the story, and that the screens are the demo's. */
  cast: string;
  chapters: ChapterText[];
  interlude: { quote: string; text: string };
  statsTitle: string;
  /** One label per number in ./stories.ts. */
  stats: string[];
  systemsTitle: string;
  systemsText: string;
  systems: SystemText[];
  bundleTitle: string;
  bundleText: string;
  /** [name, who uses it], one per bundle node. */
  bundleNodes: [string, string][];
  /** What travels between the apps, as short lines. */
  bundleFlows: string[];
  compareTitle: string;
  compareText: string;
  finale: { title: string; text: string };
  /** Each photo slot's description, by its name. */
  photos: Record<string, string>;
}

/** The words every story page shares, in one language. */
export interface StoryUi {
  studio: string;
  tryDemo: string;
  seePlans: string;
  readStory: string;
  scroll: string;
  chapter: string;
  inTheApp: string;
  everything: string;
  realScreen: string;
  plansTitle: string;
  plansText: string;
  allPlans: string;
  compareLabel: string;
  compareChecked: string;
  compareSources: string;
  compareRows: { kind: string; apps: string; ownName: string; pricing: string; published: string; arabic: string };
  yallapp: string;
  agency: string;
  creditsTitle: string;
  creditsText: string;
  creditsNone: string;
  photoBy: string;
  photoSource: string;
  otherStories: string;
  demoTitle: string;
  demoText: string;
  solutionLink: string;
  /** The stories' section on the Yallapp Studio page, and the link on a solution page. */
  fromStudioTitle: string;
  fromStudioText: string;
  storyOfThis: string;
  /** A notification's time: "now". */
  now: string;
  /** The words in the drawn pictures. */
  art: StoryArtText;
}

export interface StoryArtText {
  gate: string;
  gateNote: string;
  present: string;
  late: string;
  absent: string;
  fareParts: [string, string, string, string];
  priceWays: [string, string, string];
  newRide: string;
  secondsLeft: string;
  accept: string;
  running: string;
  runningNote: string;
  weighed: string;
  estimate: string;
  perKg: string;
  liveMap: string;
  /** Five first names in the drawn class register. */
  registerNames: [string, string, string, string, string];
}

export interface StoryCopy {
  ui: StoryUi;
  stories: Record<StoryId, StoryText>;
}
