import { DOCS, type DocDefault } from "@/content/docs";
import { PRIVACY, REFUND, TERMS, type LegalDefault } from "@/content/legal";
import { FAQ, SOLUTIONS } from "../marketing";
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

/** The admin's groups. "Guides" holds the documentation's articles (/docs), which replaced the guides. */
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

export const DOC_HINT =
  "Text before the first ## heading is the introduction. A “## Before you start” section becomes the checklist box, every other ## section is a part of the article (numbered in step-by-step articles) and gets its own link, ### starts a smaller heading, > lines are notes, a line of ~~~ before and after shows code as it is, and text after a last --- line ends the article. " +
  MARKDOWN_HINT.replace("Markdown: ", "");

/** The FAQ in code, as the Markdown the admin edits. */
export function faqMarkdown(groups: { title: string; items: { q: string; a: string }[] }[]): string {
  return groups.map((g) => [`## ${g.title}`, ...g.items.map((item) => `### ${item.q}\n\n${item.a}`)].join("\n\n")).join("\n\n") + "\n";
}

function docPage(article: DocDefault): ContentPage {
  return {
    key: article.key,
    group: "Guides",
    title: article.title,
    path: `/docs/${article.slug}`,
    // Article titles are in every documentation page's menu and in its index.
    revalidate: { path: "/docs", type: "layout" },
    fields: [
      { name: "title", label: "Title", kind: "line", max: 120 },
      { name: "description", label: "Description", kind: "text", max: 300, hint: "Shown in the documentation's index, to search engines and in link previews." },
      { name: "body", label: "Article", kind: "markdown", max: 40_000, hint: DOC_HINT },
    ],
    defaults: { title: article.title, description: article.description, body: article.body },
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

/** 20 The editable header of each solution page, by kind (lib/app/kinds.ts); its key, title and address come from the kind. */
const SOLUTION_HEADERS: Record<string, { eyebrow: string; title: string; intro: string }> = {
  academy: {
    eyebrow: "Academy apps",
    title: "Your academy, in your students' pockets",
    intro:
      "Courses, protected lessons, quizzes and progress in your own app, from your WordPress LMS, Teachable, Thinkific, your own API, or courses you add in the dashboard.",
  },
  store: {
    eyebrow: "Store apps",
    title: "Your shop, one tap away",
    intro:
      "Products, a cart and your own checkout in a branded app, from WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, your own API, or products you add in the dashboard with card payments.",
  },
  bookings: {
    eyebrow: "Bookings apps",
    title: "Appointments, booked in your own app",
    intro:
      "Services, your team and real free times, from Amelia, BookingPress, LatePoint, SimplyBook.me, your own API, or a setup in the dashboard. Customers book in seconds and pay at your business.",
  },
  clinic: {
    eyebrow: "Clinic apps",
    title: "Your clinic, booked from your patients' phones",
    intro:
      "Patients choose a doctor and a free time, answer your intake questions and see their visits, in an app with your clinic's name. Only your clinic sees the answers.",
  },
  real_estate: {
    eyebrow: "Real estate apps",
    title: "Your listings, with search, favorites and messages",
    intro: "Add your properties in the dashboard. People search them with filters, save favorites and message your office, in an app with your name on it.",
  },
};

/** A page whose editable part is its header: the label, the title and the introduction. */
function headerPage(key: string, title: string, path: string, defaults: { eyebrow: string; title: string; intro: string }): ContentPage {
  return { key, group: "Pages", title, path, revalidate: { path }, fields: PAGE_HEADER, defaults };
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
      { name: "solutionsTitle", label: "App types: title", kind: "line", max: 120 },
      { name: "solutionsText", label: "App types: text", kind: "text", max: 300 },
      { name: "featuresTitle", label: "Features: title", kind: "line", max: 120 },
      { name: "featuresText", label: "Features: text", kind: "text", max: 300 },
      { name: "integrationsTitle", label: "Integrations: title", kind: "line", max: 120 },
      { name: "integrationsText", label: "Integrations: text", kind: "text", max: 300 },
      { name: "dashboardTitle", label: "Dashboard: title", kind: "line", max: 120 },
      { name: "dashboardText", label: "Dashboard: text", kind: "text", max: 300 },
      { name: "compareTitle", label: "Comparison: title", kind: "line", max: 120 },
      { name: "compareText", label: "Comparison: text", kind: "text", max: 300 },
      { name: "stepsTitle", label: "Steps: title", kind: "line", max: 120 },
      { name: "plansTitle", label: "Plans: title", kind: "line", max: 120 },
      { name: "plansText", label: "Plans: text", kind: "text", max: 300 },
    ],
    defaults: {
      badge: "Apps for academies, stores, bookings and real estate",
      title: "Your business, as your own mobile app.",
      intro:
        "Yallapp builds branded Android and iOS apps from the website you already run, from Shopify and other platforms, or with no website at all. Your name, your colors, your pages, published under your own store accounts.",
      primaryCta: "Get started on WhatsApp",
      secondaryCta: "See how it works",
      solutionsTitle: "One platform, five kinds of apps",
      solutionsText: "Pick the app that fits your business. Each one has its own screens, built for what your customers do.",
      featuresTitle: "Everything your app needs",
      featuresText: "Your brand, your pages and your languages, with sign-in, notifications and payments that follow the store rules.",
      integrationsTitle: "Works with what you already use",
      integrationsText: "Your content stays where it is. The app reads it live from your website or platform, or from the Yallapp dashboard.",
      dashboardTitle: "Run your app from one dashboard",
      dashboardText:
        "Set up your app step by step, build its pages with drag and drop, and download every build. No code, and no new store release for every change.",
      compareTitle: "A typical app builder, and Yallapp",
      compareText: "What you often get elsewhere, next to what every Yallapp app does.",
      stepsTitle: "From sign-up to the app stores in five steps",
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
      title: "Ready to put your business in your customers' pockets?",
      text: "Tell us about your business on WhatsApp, or create your account and start the setup today.",
    },
  },
  headerPage("solutions", "Solutions", "/solutions", {
    eyebrow: "Solutions",
    title: "An app for the way your business works",
    intro: "Academies, stores, bookings businesses and real estate offices each get their own screens, built on the same platform, with or without a website.",
  }),
  ...SOLUTIONS.map((solution) =>
    headerPage(solution.contentKey, `Solutions: ${solution.name}`, `/solutions/${solution.id}`, SOLUTION_HEADERS[solution.kind] ?? { eyebrow: `${solution.name} apps`, title: solution.name, intro: solution.summary }),
  ),
  headerPage("features", "Features", "/features", {
    eyebrow: "Features",
    title: "Everything your app needs, built in",
    intro:
      "Your brand and pages, three languages, sign-in with a code, push notifications, payments and publishing. One app for Android and iOS, changed from your dashboard without a new release.",
  }),
  headerPage("integrations", "Integrations", "/integrations", {
    eyebrow: "Integrations",
    title: "Your content, from wherever it lives",
    intro:
      "WordPress with 11 supported plugins, 7 online platforms, your own API, or no website at all. Your content stays where it is, and your app reads it live.",
  }),
  headerPage("how-it-works", "How it works", "/how-it-works", {
    eyebrow: "How it works",
    title: "From sign-up to the app stores in five steps",
    intro: "You keep running your business as you do today. Yallapp turns it into your own Android and iOS apps.",
  }),
  headerPage("pricing", "Pricing", "/pricing", {
    eyebrow: "Pricing",
    title: "A plan for every app",
    intro: "Start with Android, grow into iOS, and let us publish for you when you are ready. Each app has its own plan. Pay by card in your dashboard, or arrange it with our team on WhatsApp.",
  }),
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
      intro: "Can't find what you're looking for? Read the documentation, or message us on WhatsApp and we'll answer you directly.",
      entries: faqMarkdown(FAQ),
    },
  },
  headerPage("contact", "Contact", "/contact", {
    eyebrow: "Contact",
    title: "Talk to us",
    intro: "Questions about Yallapp, a plan for your business, or help with your apps: we're here.",
  }),
  {
    ...headerPage("docs", "Documentation", "/docs", {
      eyebrow: "Documentation",
      title: "Yallapp documentation",
      intro: "Everything you need to set up, publish and run your app, step by step and in plain words.",
    }),
    // The index's title is in every article's menu.
    revalidate: { path: "/docs", type: "layout" },
  },
  headerPage("developers", "API reference", "/developers", {
    eyebrow: "For developers",
    title: "The Yallapp API reference",
    intro:
      "Every endpoint your app calls, for developers who serve the Yallapp API from their own website. Start with the step-by-step guide, then use this reference.",
  }),
  ...DOCS.map(docPage),
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

/** The text without its code blocks (between ``` or ~~~ lines) and `code`, where any character is shown as it is. */
function withoutCode(value: string): string {
  return value.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(^[ \t]*\1[ \t]*$|(?![\s\S]))/gm, "").replace(/`[^`\n]*`/g, "");
}
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
    // Tags in `code` and in code blocks are shown as they are.
    else if (/<\/?[a-z][^>]*>/i.test(withoutCode(value))) errors[field.name] = "HTML isn't allowed. Use Markdown for bold text and links.";
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
    errors.body = "Add at least one ## section.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, fields };
}
