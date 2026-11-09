import type { StudioNode } from "@/lib/pages/types";
import { newNodeId } from "./elements";
import { SECTIONS, type SectionContext, type SectionWord, type TemplateInfo } from "./sections";

/**
 * Editor audit 3.3: pages that start from something, for every project.
 * They sit beside the templates in sections.ts (none of those changes) and
 * are built from the same ready sections, with a few words of their own.
 */
type PageWord =
  | "aboutTitle"
  | "aboutText"
  | "storyTitle"
  | "storyText"
  | "helpTitle"
  | "helpText"
  | "faqMoreTitle"
  | "faqFourQ"
  | "faqFourA"
  | "faqFiveQ"
  | "faqFiveA"
  | "faqSixQ"
  | "faqSixA";

/** The editor's words come from `studio.w_<word>`, so these are looked up like the sections' own. */
function word(ctx: SectionContext, w: PageWord): string {
  return ctx.w(w as unknown as SectionWord);
}

function section(ctx: SectionContext, id: string): StudioNode {
  return SECTIONS.find((s) => s.id === id)!.make(ctx);
}

function text(ctx: SectionContext, value: string, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: (ctx.newId ?? newNodeId)(), type: "text", text: value, ...extra };
}

function body(ctx: SectionContext, children: StudioNode[]): StudioNode {
  return { id: (ctx.newId ?? newNodeId)(), type: "column", gap: 4, padding: { bottom: 16 }, children };
}

/** A title and a few lines under it, on the brand's colour. */
function intro(ctx: SectionContext, title: PageWord, line: PageWord): StudioNode {
  return {
    id: (ctx.newId ?? newNodeId)(),
    type: "column",
    gap: 8,
    padding: { top: 22, end: 18, bottom: 22, start: 18 },
    margin: { top: 12, end: 10, bottom: 12, start: 10 },
    radius: 18,
    background: ctx.brand,
    color: "#FFFFFF",
    children: [text(ctx, word(ctx, title), { font: { size: 24, weight: 800, line_height: 1.25 } }), text(ctx, word(ctx, line), { font: { size: 14, line_height: 1.5 }, opacity: 0.9 })],
  };
}

function questions(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  const qa = (q: PageWord, a: PageWord): StudioNode => ({ id: id(), type: "column", title: word(ctx, q), padding: { top: 0, end: 0, bottom: 8, start: 0 }, children: [text(ctx, word(ctx, a), { font: { size: 14 }, opacity: 0.85 })] });
  return {
    id: id(),
    type: "column",
    gap: 6,
    padding: { top: 8, end: 14, bottom: 8, start: 14 },
    children: [text(ctx, word(ctx, "faqMoreTitle"), { font: { size: 17, weight: 800 } }), { id: id(), type: "accordion", gap: 4, children: [qa("faqFourQ", "faqFourA"), qa("faqFiveQ", "faqFiveA"), qa("faqSixQ", "faqSixA")] }],
  };
}

export const PAGE_TEMPLATES: readonly TemplateInfo[] = [
  {
    id: "about",
    icon: "info",
    make: (ctx) => ({
      header: { type: "logo_center", buttons: ["menu", "notifications"] },
      body: body(ctx, [
        intro(ctx, "aboutTitle", "aboutText"),
        {
          id: (ctx.newId ?? newNodeId)(),
          type: "column",
          gap: 6,
          padding: { top: 8, end: 14, bottom: 8, start: 14 },
          children: [text(ctx, word(ctx, "storyTitle"), { font: { size: 17, weight: 800 } }), text(ctx, word(ctx, "storyText"), { font: { size: 14, line_height: 1.6 }, opacity: 0.85 })],
        },
        section(ctx, "stats"),
        section(ctx, "features"),
        section(ctx, "contact"),
      ]),
    }),
  },
  {
    id: "faq",
    icon: "help",
    make: (ctx) => ({
      header: { type: "logo_center", buttons: ["menu"] },
      body: body(ctx, [intro(ctx, "helpTitle", "helpText"), section(ctx, "faq"), questions(ctx), section(ctx, "contact")]),
    }),
  },
];
