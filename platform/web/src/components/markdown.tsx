import Link from "next/link";
import type { ReactNode } from "react";
import { headingId, inlineText, parseMarkdown, type Block, type Inline } from "@/lib/content/markdown";
import { DEFAULT_LANG, type Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

/**
 * Markdown written in the admin, as React elements: text is never read as
 * HTML, and links are already limited to safe addresses by the parser.
 * 55 With `lang`, links to the site's pages go to that language's version.
 */

export function InlineNodes({ nodes, lang = DEFAULT_LANG }: { nodes: Inline[]; lang?: Lang }): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return (
          <b key={i}>
            <InlineNodes nodes={n.c} lang={lang} />
          </b>
        );
      case "em":
        return (
          <em key={i}>
            <InlineNodes nodes={n.c} lang={lang} />
          </em>
        );
      case "code":
        return <code key={i}>{n.v}</code>;
      case "br":
        return <br key={i} />;
      case "link":
        // Pages of this site open in the app's router; files (like /developers/openapi.yaml) and other sites as plain links.
        return n.href.startsWith("/") && !/\.[a-z0-9]+(\?|#|$)/i.test(n.href) ? (
          <Link key={i} href={localePath(lang, n.href)}>
            <InlineNodes nodes={n.c} lang={lang} />
          </Link>
        ) : (
          <a key={i} href={n.href}>
            <InlineNodes nodes={n.c} lang={lang} />
          </a>
        );
    }
  });
}

/** Blocks with the page's own styles (DocLayout styles h2, p and ul). `quote` renders a > note. */
export function MarkdownBlocks({
  blocks,
  quote,
  anchors = false,
  lang = DEFAULT_LANG,
}: {
  blocks: Block[];
  lang?: Lang;
  quote?: (children: ReactNode, key: number) => ReactNode;
  /** Gives headings an id from their text, so they can be linked to (documentation). */
  anchors?: boolean;
}): ReactNode {
  return blocks.map((b, i) => {
    switch (b.t) {
      case "p":
        return (
          <p key={i}>
            <InlineNodes nodes={b.c} lang={lang} />
          </p>
        );
      case "h": {
        const Heading = `h${b.level}` as "h2" | "h3" | "h4";
        return (
          <Heading key={i} id={anchors ? headingId(inlineText(b.c)) : undefined} className={anchors ? "scroll-mt-6" : undefined}>
            <InlineNodes nodes={b.c} lang={lang} />
          </Heading>
        );
      }
      case "ul":
        return (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineNodes nodes={item} lang={lang} />
              </li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} start={b.start} className="m-0 ps-5">
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineNodes nodes={item} lang={lang} />
              </li>
            ))}
          </ol>
        );
      case "quote": {
        const inner = <MarkdownBlocks blocks={b.blocks} anchors={anchors} lang={lang} />;
        return quote ? quote(inner, i) : (
          <blockquote key={i} className="m-0 border-s-[3px] border-line ps-4 text-ink-3">
            {inner}
          </blockquote>
        );
      }
      case "pre":
        return (
          <pre
            key={i}
            dir="ltr"
            data-lang={b.lang || undefined}
            className="m-0 max-w-full overflow-x-auto rounded-xl bg-midnight px-4 py-3.5 font-mono text-[13px] leading-relaxed whitespace-pre text-ivory"
          >
            <code>{b.v}</code>
          </pre>
        );
      case "hr":
        return <hr key={i} className="border-line-soft" />;
    }
  });
}

/** Markdown source as page content. */
export function Markdown({ source, lang = DEFAULT_LANG }: { source: string; lang?: Lang }) {
  return <MarkdownBlocks blocks={parseMarkdown(source)} lang={lang} />;
}
