import { GUIDES, type GuideDefault } from "@/content/guides";
import { PRIVACY, REFUND, TERMS, type LegalDefault } from "@/content/legal";
import { FAQ } from "../marketing";
import { inlineText, parseMarkdown, type Block, type Inline } from "./markdown";

/**
 * yallapp.com.tr's texts the team edits in the admin (Website content). Each
 * page or section has its fields with defaults equal to the text in code, so
 * a page shows exactly what it did until someone saves an edit; an edit is
 * kept per page in `site_content` and "Back to the default text" removes it.
 */

/** "line": one line; "text": a short paragraph; "markdown": a long text in Markdown (lib/content/markdown.ts). */
export type ContentFieldKind = "line" | "text" | "markdown";

export interface ContentField {
  name: string;
  label: string;
  kind: ContentFieldKind;
  max: number;
  hint?: string;
}

export type ContentGroup = "Home page" | "Pages" | "Guides" | "Legal pages";

export interface ContentPage {
  key: string;
  group: ContentGroup;
  title: string;
  /** Where the text shows, for the preview link. */
  path: string;
  /** What a save rebuilds: one page, or with "layout" every page under the path. */
  revalidate: { path: string; type?: "page" | "layout" };
  fields: ContentField[];
  defaults: Record<string, string>;
}

const PAGE_HEADER: ContentField[] = [
  { name: "eyebrow", label: "Label above the title", kind: "line", max: 40 },
  { name: "title", label: "Title", kind: "line", max: 120 },
  { name: "intro", label: "Introduction", kind: "text", max: 400 },
];

const CONTACT_HINT = "{{contact_email}}, {{contact_whatsapp}} and {{contact_whatsapp_url}} show the contact details from Settings.";

const MARKDOWN_HINT =
  "Markdown: a blank line between paragraphs, ## for a heading, - for a list, **bold**, *italic*, `code` and [a link](https://…). HTML isn't allowed.";

export const FAQ_HINT =
  "## starts a group of questions, ### a question, and the text under it is the answer (Markdown). " + MARKDOWN_HINT.replace("Markdown: ", "");

export const GUIDE_HINT =
  "Text before the first ## heading is the introduction. A “## Before you start” section becomes the checklist box, every other ## section is a numbered step, > lines inside a step are its note, and text after a last --- line ends the guide. " +
  MARKDOWN_HINT.replace("Markdown: ", "");

/** The FAQ in code, as the Markdown the admin edits. */
export function faqMarkdown(groups: { title: string; items: { q: string; a: string }[] }[]): string {
  return groups.map((g) => [`## ${g.title}`, ...g.items.map((item) => `### ${item.q}\n\n${item.a}`)].join("\n\n")).join("\n\n") + "\n";
}

function guidePage(guide: GuideDefault): ContentPage {
  return {
    key: `guide-${guide.slug}`,
    group: "Guides",
    title: guide.title,
    path: `/guides/${guide.slug}`,
    // Guide titles are in every guide's menu.
    revalidate: { path: "/guides/[slug]", type: "page" },
    fields: [
      { name: "title", label: "Title", kind: "line", max: 120 },
      { name: "description", label: "Description", kind: "text", max: 300, hint: "For search engines and link previews." },
      { name: "body", label: "Guide", kind: "markdown", max: 30_000, hint: GUIDE_HINT },
    ],
    defaults: { title: guide.title, description: guide.description, body: guide.body },
  };
}

function legalPage(page: LegalDefault): ContentPage {
  return {
    key: page.key,
    group: "Legal pages",
    title: page.title,
    path: page.path,
    revalidate: { path: page.path },
    fields: [
      { name: "title", label: "Title", kind: "line", max: 120 },
      { name: "updated", label: "Last updated", kind: "line", max: 40, hint: "Shown under the title, like 12 October 2026." },
      { name: "body", label: "Text", kind: "markdown", max: 50_000, hint: `${MARKDOWN_HINT} ${CONTACT_HINT}` },
    ],
    defaults: { title: page.title, updated: page.updated, body: page.body },
  };
}

export const CONTENT_PAGES: ContentPage[] = [
  {
    key: "home",
    group: "Home page",
    title: "Home page",
    path: "/",
    revalidate: { path: "/" },
    fields: [
      { name: "badge", label: "Label above the title", kind: "line", max: 60 },
      { name: "title", label: "Title", kind: "line", max: 120 },
      { name: "intro", label: "Introduction", kind: "text", max: 400 },
      { name: "primaryCta", label: "WhatsApp button", kind: "line", max: 40 },
      { name: "secondaryCta", label: "Second button", kind: "line", max: 40, hint: "Opens How it works." },
      { name: "featuresTitle", label: "Features: title", kind: "line", max: 120 },
      { name: "featuresText", label: "Features: text", kind: "text", max: 300 },
      { name: "stepsTitle", label: "Steps: title", kind: "line", max: 120 },
      { name: "plansTitle", label: "Plans: title", kind: "line", max: 120 },
      { name: "plansText", label: "Plans: text", kind: "text", max: 300 },
    ],
    defaults: {
      badge: "For WordPress LMS academies",
      title: "Your Tutor LMS academy, as a mobile app.",
      intro:
        "Turn your WordPress site into branded Android and iOS apps. Students sign in with Digits OTP, watch protected lessons and track their progress, all synced with your website.",
      primaryCta: "Get started on WhatsApp",
      secondaryCta: "See how it works",
      featuresTitle: "Everything your students need",
      featuresText: "Branded apps that read your courses live from your website, with nothing to copy or maintain twice.",
      stepsTitle: "From website to app stores in four steps",
      plansTitle: "Two plans",
      plansText: "Publish the apps yourself with our guides, or let us publish them for you.",
    },
  },
  {
    key: "contact-band",
    group: "Home page",
    title: "Closing band on every page",
    path: "/",
    revalidate: { path: "/", type: "layout" },
    fields: [
      { name: "title", label: "Title", kind: "line", max: 120 },
      { name: "text", label: "Text", kind: "text", max: 300 },
    ],
    defaults: {
      title: "Ready to put your academy in your students' pockets?",
      text: "Tell us about your site on WhatsApp. We'll set up your account and get your apps building.",
    },
  },
  {
    key: "features",
    group: "Pages",
    title: "Features",
    path: "/features",
    revalidate: { path: "/features" },
    fields: PAGE_HEADER,
    defaults: {
      eyebrow: "Features",
      title: "Everything your students need, in their pocket",
      intro: "Your courses, lessons and quizzes stay in your LMS plugin. The app reads them live, so there's nothing to copy or maintain twice.",
    },
  },
  {
    key: "how-it-works",
    group: "Pages",
    title: "How it works",
    path: "/how-it-works",
    revalidate: { path: "/how-it-works" },
    fields: PAGE_HEADER,
    defaults: {
      eyebrow: "How it works",
      title: "From website to app stores in four steps",
      intro: "You keep running your website as you do today. Yallapp turns it into your own Android and iOS apps.",
    },
  },
  {
    key: "pricing",
    group: "Pages",
    title: "Pricing",
    path: "/pricing",
    revalidate: { path: "/pricing" },
    fields: PAGE_HEADER,
    defaults: {
      eyebrow: "Pricing",
      title: "Simple plans for your academy",
      intro: "Payments are arranged directly with our team on WhatsApp. We activate your account as soon as your plan is confirmed.",
    },
  },
  {
    key: "faq",
    group: "Pages",
    title: "FAQ",
    path: "/faq",
    revalidate: { path: "/faq" },
    fields: [...PAGE_HEADER, { name: "entries", label: "Questions and answers", kind: "markdown", max: 30_000, hint: FAQ_HINT }],
    defaults: {
      eyebrow: "FAQ",
      title: "Questions, answered",
      intro: "Can't find what you're looking for? Message us on WhatsApp and we'll answer you directly.",
      entries: faqMarkdown(FAQ),
    },
  },
  {
    key: "contact",
    group: "Pages",
    title: "Contact",
    path: "/contact",
    revalidate: { path: "/contact" },
    fields: PAGE_HEADER,
    defaults: {
      eyebrow: "Contact",
      title: "Talk to us",
      intro: "Questions about Yallapp, a plan for your academy, or help with your apps: we're here.",
    },
  },
  ...GUIDES.map(guidePage),
  ...[PRIVACY, TERMS, REFUND].map(legalPage),
];

export function contentPage(key: string): ContentPage | undefined {
  return CONTENT_PAGES.find((p) => p.key === key);
}

/** A page's texts: the saved edit over the defaults (fields the edit lacks keep their default). */
export function contentWith(page: ContentPage, saved: Record<string, string> | null | undefined): Record<string, string> {
  const fields: Record<string, string> = { ...page.defaults };
  for (const field of page.fields) {
    const value = saved?.[field.name];
    if (typeof value === "string" && value.trim() !== "") fields[field.name] = value;
  }
  return fields;
}

export interface FaqEntry {
  question: string;
  answer: Block[];
}

export interface FaqSection {
  title: string;
  items: FaqEntry[];
}

/** The FAQ Markdown as groups of questions: ## a group, ### a question, the blocks under it its answer. */
export function parseFaq(source: string): FaqSection[] {
  const groups: FaqSection[] = [];
  for (const block of parseMarkdown(source)) {
    if (block.t === "h" && block.level === 2) {
      groups.push({ title: inlineText(block.c), items: [] });
      continue;
    }
    if (block.t === "h" && block.level >= 3) {
      if (!groups.length) groups.push({ title: "Questions", items: [] });
      groups[groups.length - 1]!.items.push({ question: inlineText(block.c), answer: [] });
      continue;
    }
    const items = groups[groups.length - 1]?.items;
    items?.[items.length - 1]?.answer.push(block);
  }
  return groups.filter((g) => g.items.length > 0);
}

export interface GuideStepDoc {
  title: string;
  body: Block[];
  notice: Block[] | null;
}

export interface GuideDoc {
  intro: Block[];
  /** The "Before you start" checklist. */
  before: { title: string; items: Inline[][] } | null;
  steps: GuideStepDoc[];
  outro: Block[];
}

/** A guide's Markdown as the guide page's parts (see GUIDE_HINT). */
export function parseGuide(source: string): GuideDoc {
  const blocks = parseMarkdown(source);
  const doc: GuideDoc = { intro: [], before: null, steps: [], outro: [] };
  // Text after the last rule, once there are steps, closes the guide.
  const lastRule = blocks.map((b) => b.t).lastIndexOf("hr");
  let section: "intro" | "before" | "step" | "outro" = "intro";
  blocks.forEach((block, index) => {
    if (index === lastRule && doc.steps.length) {
      section = "outro";
      return;
    }
    if (block.t === "h" && block.level === 2 && section !== "outro") {
      const title = inlineText(block.c).trim();
      if (/^before you start$/i.test(title) && !doc.before) {
        doc.before = { title, items: [] };
        section = "before";
      } else {
        doc.steps.push({ title, body: [], notice: null });
        section = "step";
      }
      return;
    }
    if (section === "intro") doc.intro.push(block);
    else if (section === "outro") doc.outro.push(block);
    else if (section === "before") {
      if (block.t === "ul" || block.t === "ol") doc.before!.items.push(...block.items);
      else if (block.t === "p") doc.before!.items.push(block.c);
    } else {
      const step = doc.steps[doc.steps.length - 1]!;
      if (block.t === "quote") step.notice = [...(step.notice ?? []), ...block.blocks];
      else step.body.push(block);
    }
  });
  return doc;
}

const PLACEHOLDER_IN_TEXT = /\{\{([^{}]*)\}\}/g;
const CONTACT_VALUES = ["contact_email", "contact_whatsapp", "contact_whatsapp_url"];

/** Checks the admin's form for a page; the fields to save, or an error per field. */
export function readContentForm(
  page: ContentPage,
  input: Record<string, string>,
): { ok: true; fields: Record<string, string> } | { ok: false; errors: Record<string, string> } {
  const fields: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of page.fields) {
    const raw = (input[field.name] ?? "").replace(/\r\n?/g, "\n");
    const value = field.kind === "markdown" ? raw.trim() + "\n" : raw.replace(/\s+/g, " ").trim();
    if (!value.trim()) errors[field.name] = `Enter the ${field.label.toLowerCase()}.`;
    else if (value.length > field.max) errors[field.name] = `Use at most ${field.max.toLocaleString("en-US")} characters.`;
    // Tags in `code` are shown as they are.
    else if (/<\/?[a-z][^>]*>/i.test(value.replace(/`[^`\n]*`/g, ""))) errors[field.name] = "HTML isn't allowed. Use Markdown for bold text and links.";
    else {
      const unknown = [...value.matchAll(PLACEHOLDER_IN_TEXT)].map((m) => m[1]!).find((name) => !CONTACT_VALUES.includes(name) || page.group !== "Legal pages");
      if (unknown !== undefined) errors[field.name] = `{{${unknown}}} isn't a value this page can show.`;
    }
    fields[field.name] = value;
  }
  if (!errors.entries && page.key === "faq" && parseFaq(fields.entries!).length === 0) {
    errors.entries = "Add at least one ## group with a ### question.";
  }
  if (!errors.body && page.group === "Guides" && parseGuide(fields.body!).steps.length === 0) {
    errors.body = "Add at least one ## step.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, fields };
}
