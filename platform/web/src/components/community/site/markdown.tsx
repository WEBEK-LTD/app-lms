import type { ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/content/markdown";

/**
 * 231 What members write (questions, answers, replies, tutorials), from the
 * site's small Markdown (lib/content/markdown.ts: no HTML, links limited to
 * safe addresses), with every link marked as the member's own:
 * rel="nofollow ugc noopener", so it lends the site's standing to no one
 * and opens nothing with access to this page.
 */
function inline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return <b key={i}>{inline(n.c)}</b>;
      case "em":
        return <em key={i}>{inline(n.c)}</em>;
      case "code":
        return <code key={i}>{n.v}</code>;
      case "br":
        return <br key={i} />;
      case "link":
        return (
          <a key={i} href={n.href} rel="nofollow ugc noopener">
            {inline(n.c)}
          </a>
        );
    }
  });
}

function blocks(list: Block[]): ReactNode {
  return list.map((b, i) => {
    switch (b.t) {
      case "p":
        return <p key={i}>{inline(b.c)}</p>;
      case "h":
        return b.level === 2 ? <h2 key={i}>{inline(b.c)}</h2> : b.level === 3 ? <h3 key={i}>{inline(b.c)}</h3> : <h4 key={i}>{inline(b.c)}</h4>;
      case "ul":
        return <ul key={i}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>;
      case "ol":
        return <ol key={i} start={b.start}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ol>;
      case "quote":
        return <blockquote key={i}>{blocks(b.blocks)}</blockquote>;
      case "pre":
        return <pre key={i}><code>{b.v}</code></pre>;
      case "hr":
        return <hr key={i} />;
    }
  });
}

export function MemberMarkdown({ source }: { source: string }) {
  return <>{blocks(parseMarkdown(source))}</>;
}
