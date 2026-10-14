import Link from "next/link";
import type { ReactNode } from "react";
import { headingId, inlineText, parseMarkdown, type Block, type Inline } from "@/lib/content/markdown";

/**
 * Markdown written in the admin, as React elements: text is never read as
 * HTML, and links are already limited to safe addresses by the parser.
 */

export function InlineNodes({ nodes }: { nodes: Inline[] }): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return (
          <b key={i}>
            <InlineNodes nodes={n.c} />
          </b>
        );
      case "em":
        return (
          <em key={i}>
            <InlineNodes nodes={n.c} />
          </em>
        );
      case "code":
        return <code key={i}>{n.v}</code>;
      case "br":
        return <br key={i} />;
      case "link":
        // Pages of this site open in the app's router; files (like /developers/openapi.yaml) and other sites as plain links.
        return n.href.startsWith("/") && !/\.[a-z0-9]+(\?|#|$)/i.test(n.href) ? (
          <Link key={i} href={n.href}>
            <InlineNodes nodes={n.c} />
          </Link>
        ) : (
          <a key={i} href={n.href}>
            <InlineNodes nodes={n.c} />
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
}: {
  blocks: Block[];
  quote?: (children: ReactNode, key: number) => ReactNode;
  /** Gives headings an id from their text, so they can be linked to (documentation). */
  anchors?: boolean;
}): ReactNode {
  return blocks.map((b, i) => {
    switch (b.t) {
      case "p":
        return (
          <p key={i}>
            <InlineNodes nodes={b.c} />
          </p>
        );
      case "h": {
        const Heading = `h${b.level}` as "h2" | "h3" | "h4";
        return (
          <Heading key={i} id={anchors ? headingId(inlineText(b.c)) : undefined} className={anchors ? "scroll-mt-6" : undefined}>
            <InlineNodes nodes={b.c} />
          </Heading>
        );
      }
      case "ul":
        return (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineNodes nodes={item} />
              </li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} start={b.start} className="m-0 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>
                <InlineNodes nodes={item} />
              </li>
            ))}
          </ol>
        );
      case "quote": {
        const inner = <MarkdownBlocks blocks={b.blocks} anchors={anchors} />;
        return quote ? quote(inner, i) : (
          <blockquote key={i} className="m-0 border-l-[3px] border-line pl-4 text-ink-3">
            {inner}
          </blockquote>
        );
      }
      case "pre":
        return (
          <pre
            key={i}
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
export function Markdown({ source }: { source: string }) {
  return <MarkdownBlocks blocks={parseMarkdown(source)} />;
}
