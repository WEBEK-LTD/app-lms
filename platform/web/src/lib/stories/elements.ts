import { APP_WORDS } from "../studio/app-words";
import type { Action, StoriesSource, StoryPart, StudioNode, StudioStory, Translations } from "../pages/types";
import type { AppStory, AppStoryTexts } from "../data/types";

/**
 * 165 The Studio elements that show the app's stories, and how Dashboard ›
 * Stories is served into them:
 *
 * - `stories`: the story rings. Each story is a ring (its photo, the ring's
 *   name under it as `heading`, its icon) opening the full-screen viewer with
 *   its kicker, title, line, video and button (`StudioStory`).
 * - `slider` of story slides (Leqaa's hero): each child a slide drawn the
 *   owner's way; each story gets a copy of one (the n-th, the last for those
 *   after), its photo or video, its texts and its button.
 * - `row` of story chips (Leqaa's B "Who are the flowers for?"): the same
 *   with chips (the ring's name and icon, opening the story's button).
 *
 * In a slide or a chip, `story_part` names what a part shows; a part without
 * one (a design made before 165) is read by its place: in a slide, the texts
 * are the kicker, the title and the line (the title and the line with two,
 * the title with one), its first icon the story's icon and its first button
 * the story's button; in a chip, its icon and its text the ring's.
 */

export type StoryElementKind = "rings" | "slides" | "chips";

/** The flower shop's occasions in each of Yallapp's languages (Leqaa's template names its story elements so). */
const OCCASIONS_NAMES = new Set(Object.values(APP_WORDS).map((w) => w.lqOccasions));
/** Leqaa's B: the column "Who are the flowers for?" over its occasion chips. */
const ASK_NAMES = new Set(Object.values(APP_WORDS).map((w) => w.lqAsk));

const isSlide = (n: StudioNode) => n.type === "photo_hero" || n.type === "video_hero";
const isChip = (n: StudioNode) => n.type === "row" && (n.children ?? []).some((c) => c.type === "text");

/** What kind of story element this is, or null: rings, a slider of slides, a row of chips (with its parent, to know Leqaa's). */
export function storyElementKind(node: StudioNode, parent: StudioNode | null = null): StoryElementKind | null {
  if (node.type === "stories") return "rings";
  const kids = node.children ?? [];
  if (node.type === "slider" && kids.length > 0 && kids.every(isSlide) && (node.stories_source !== undefined || templateElement(node, parent))) return "slides";
  if (node.type === "row" && kids.length > 0 && kids.every(isChip) && (node.stories_source !== undefined || templateElement(node, parent))) return "chips";
  return null;
}

/** One of Leqaa's occasion elements, as its template made them (before 165 they had no source). */
function templateElement(node: StudioNode, parent: StudioNode | null): boolean {
  if (node.type === "stories" || node.type === "slider") return OCCASIONS_NAMES.has(node.name ?? "");
  if (node.type === "row") return Boolean(node.scroll) && parent !== null && ASK_NAMES.has(parent.name ?? "");
  return false;
}

/**
 * Where this story element's stories come from: its own choice, else the
 * dashboard for Leqaa's occasions (the template's default) and as designed
 * for any other.
 */
export function storiesSourceOf(node: StudioNode, parent: StudioNode | null = null): StoriesSource {
  if (node.stories_source) return node.stories_source;
  return templateElement(node, parent) ? "dashboard" : "studio";
}

/** The story elements of a page whose stories come from the dashboard, parents first. */
export function dashboardStoryElements(body: StudioNode): { node: StudioNode; kind: StoryElementKind }[] {
  const out: { node: StudioNode; kind: StoryElementKind }[] = [];
  const walk = (node: StudioNode, parent: StudioNode | null) => {
    const kind = storyElementKind(node, parent);
    if (kind && storiesSourceOf(node, parent) === "dashboard") {
      out.push({ node, kind });
      return;
    }
    for (const child of node.children ?? []) walk(child, node);
    if (node.card) walk(node.card, node);
  };
  walk(body, null);
  return out;
}

// ——— The parts of a slide or a chip ———

/** Every element under `root` (not itself), in order. */
function below(root: StudioNode): StudioNode[] {
  const out: StudioNode[] = [];
  const walk = (n: StudioNode) => {
    for (const child of n.children ?? []) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

/** The ids of the parts of a slide or a chip, by what they show: marked, else by their place. */
export function storyParts(template: StudioNode, kind: "slides" | "chips"): Partial<Record<StoryPart, string>> {
  const all = below(template);
  const parts: Partial<Record<StoryPart, string>> = {};
  for (const n of all) if (n.story_part && !parts[n.story_part]) parts[n.story_part] = n.id;
  if (Object.keys(parts).length) return parts;
  const texts = all.filter((n) => n.type === "text");
  const icon = all.find((n) => n.type === "icon");
  if (icon) parts.icon = icon.id;
  if (kind === "chips") {
    if (texts[0]) parts.ring = texts[0].id;
    return parts;
  }
  const button = all.find((n) => n.type === "button");
  if (button) parts.button = button.id;
  const order: StoryPart[] = texts.length >= 3 ? ["kicker", "title", "line"] : texts.length === 2 ? ["title", "line"] : ["title"];
  order.forEach((part, i) => {
    if (texts[i]) parts[part] = texts[i].id;
  });
  return parts;
}

// ——— Reading the stories a design shows (copied into the dashboard once) ———

/** One story as a design shows it: its photo or video, its texts by language, its icon and its button. */
export interface DesignedStory {
  imageUrl: string | null;
  videoUrl: string | null;
  texts: Record<string, AppStoryTexts>;
  icon: string | null;
  action: Action | null;
}

/** A text of a node in the default language and in each language it has. */
function textsOf(node: StudioNode | undefined, field: "text" | "heading" | "subheading", def: string, own?: { value: string | null | undefined; translations?: Translations }): Record<string, string> {
  const value = own ? own.value : (node?.[field as "text"] as string | null | undefined);
  const translations = own ? own.translations : node?.translations;
  const out: Record<string, string> = {};
  if (typeof value === "string" && value.trim()) out[def] = value.trim();
  for (const [lang, t] of Object.entries(translations ?? {})) {
    const text = t?.[field];
    if (lang !== def && typeof text === "string" && text.trim()) out[lang] = text.trim();
  }
  return out;
}

function putTexts(target: Record<string, AppStoryTexts>, part: keyof AppStoryTexts, byLang: Record<string, string>) {
  for (const [lang, text] of Object.entries(byLang)) target[lang] = { ...target[lang], [part]: text };
}

/** The stories a story element shows as designed (in the default language `def` and the others it has). */
export function designedStories(node: StudioNode, kind: StoryElementKind, def: string): DesignedStory[] {
  if (kind === "rings") {
    return (node.slides ?? []).map((s) => {
      const texts: Record<string, AppStoryTexts> = {};
      putTexts(texts, "ring", textsOf(undefined, "heading", def, { value: s.heading, translations: s.translations }));
      putTexts(texts, "line", textsOf(undefined, "subheading", def, { value: s.subheading, translations: s.translations }));
      return { imageUrl: s.image_url ?? null, videoUrl: s.video_url ?? null, texts, icon: s.icon ?? null, action: s.action ?? null };
    });
  }
  return (node.children ?? []).map((slide) => {
    const parts = storyParts(slide, kind);
    const find = (part: StoryPart) => (parts[part] ? below(slide).find((n) => n.id === parts[part]) : undefined);
    const texts: Record<string, AppStoryTexts> = {};
    for (const part of ["kicker", "title", "line", "ring"] as const) {
      const n = find(part);
      if (n) putTexts(texts, part, textsOf(n, "text", def));
    }
    const button = find("button");
    if (button) putTexts(texts, "button", textsOf(button, "text", def));
    // A chip's name is its ring's; a slide's title names its ring when no chip or ring says otherwise.
    const icon = find("icon")?.icon ?? null;
    return {
      imageUrl: slide.image_url ?? null,
      videoUrl: slide.type === "video_hero" ? (slide.video_url ?? null) : null,
      texts,
      icon,
      action: button?.action ?? slide.action ?? null,
    };
  });
}

// ——— Serving the dashboard's stories into an element ———

/** One story as it is served: its texts in the language asked for, and what its button opens. */
export interface ServedStory {
  id: number;
  imageUrl: string | null;
  videoUrl: string | null;
  kicker: string | null;
  title: string | null;
  line: string | null;
  ring: string | null;
  button: string | null;
  icon: string | null;
  action: Action;
}

/** The story's text in `lang`, else in the app's default language, else in any it has; null without one. */
export function storyText(story: Pick<AppStory, "texts">, part: keyof AppStoryTexts, lang: string, def: string): string | null {
  const pick = (l: string) => story.texts[l]?.[part]?.trim() || null;
  return pick(lang) ?? pick(def) ?? Object.keys(story.texts).map(pick).find((t) => t !== null) ?? null;
}

/** A copy of a slide or chip with ids made its own for the n-th story. */
function copied(node: StudioNode, suffix: string): StudioNode {
  return {
    ...node,
    id: `${node.id}-${suffix}`.slice(0, 64),
    ...(node.children ? { children: node.children.map((c) => copied(c, suffix)) } : {}),
    ...(node.card ? { card: copied(node.card, suffix) } : {}),
  };
}

/** A slide or chip drawn for one story: the template's look with the story's photo or video, texts, icon and button; a part with nothing to show left out. */
function filledTemplate(template: StudioNode, kind: "slides" | "chips", story: ServedStory, own: boolean): StudioNode {
  const parts = storyParts(template, kind);
  const partOf = new Map(Object.entries(parts).map(([part, id]) => [id, part as StoryPart]));
  const fill = (node: StudioNode): StudioNode | null => {
    const part = partOf.get(node.id);
    const kids = node.children?.map(fill).filter((c): c is StudioNode => c !== null);
    let out: StudioNode = { ...node, ...(kids ? { children: kids } : {}) };
    if (part === "icon") {
      if (!story.icon) return null;
      out = { ...out, icon: story.icon };
    } else if (part === "button") {
      out = { ...out, text: story.button ?? out.text ?? null, action: story.action };
    } else if (part) {
      const text = story[part];
      if (!text) return null;
      out = { ...out, text };
    }
    // Its words are the story's, in the language asked for: not the design's other languages (Studio's canvas reads them).
    if (part && part !== "icon") delete out.translations;
    return out;
  };
  const root = fill(template) ?? template;
  const base: StudioNode = { ...root, action: story.action };
  // The first story drawn from a template keeps its ids (Studio's canvas selects the template from it); the others get their own.
  const done = (n: StudioNode) => (own ? n : copied(n, `s${story.id}`));
  if (kind === "chips") return done(base);
  // A video plays muted under the slide's shade (its photo first, and in older apps); a photo grows slowly as before.
  const slide: StudioNode = story.videoUrl
    ? { ...base, type: "video_hero", video_url: story.videoUrl, image_url: story.imageUrl, autoplay: true }
    : { ...base, type: "photo_hero", image_url: story.imageUrl, video_url: undefined };
  if (!story.videoUrl) delete slide.video_url;
  return done(slide);
}

/**
 * A story element with the dashboard's stories in it (already in the
 * language asked for): rings keep the designed rings' look (the n-th's, the
 * last's for those after); a slider's and a row's children are drawn from
 * theirs. Null when there are none to show.
 */
export function withServedStories(node: StudioNode, kind: StoryElementKind, stories: ServedStory[]): StudioNode | null {
  if (!stories.length) return null;
  if (kind === "rings") {
    const looks = node.slides ?? [];
    const slides: StudioStory[] = stories.map((s, i) => {
      const look = looks[Math.min(i, looks.length - 1)];
      return {
        image_url: s.imageUrl,
        // The ring's name under it (as before 165, at most 40 characters).
        heading: (s.ring ?? s.title)?.slice(0, 40) ?? null,
        subheading: null,
        action: s.action,
        ...(look?.ring ? { ring: look.ring } : {}),
        ...(look?.ring_color ? { ring_color: look.ring_color } : {}),
        ...(look?.color ? { color: look.color } : {}),
        ...(s.icon ? { icon: s.icon } : {}),
        ...(s.kicker ? { kicker: s.kicker } : {}),
        ...(s.title ? { title: s.title } : {}),
        ...(s.line ? { line: s.line } : {}),
        ...(s.button ? { button_label: s.button } : {}),
        ...(s.videoUrl ? { video_url: s.videoUrl } : {}),
      };
    });
    return { ...node, slides };
  }
  const templates = node.children ?? [];
  if (!templates.length) return node;
  return {
    ...node,
    children: stories.map((s, i) => {
      const t = Math.min(i, templates.length - 1);
      return filledTemplate(templates[t]!, kind, s, i === t);
    }),
  };
}
