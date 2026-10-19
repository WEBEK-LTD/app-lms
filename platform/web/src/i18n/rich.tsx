import { Fragment, type ReactNode } from "react";

/**
 * 55 A message with marked words, like "See our <link>Refund policy</link>.",
 * as React elements: each `<name>…</name>` (or `<name></name>` for a thing
 * the message only places, like a code sample) is drawn by `tags[name]`.
 * Tags don't nest. Unknown tags are kept as their text.
 */
export function richText(message: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  for (const match of message.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) out.push(message.slice(last, at));
    const render = tags[match[1]!];
    out.push(<Fragment key={at}>{render ? render(match[2]!) : match[2]}</Fragment>);
    last = at + match[0].length;
  }
  if (last < message.length) out.push(message.slice(last));
  return out;
}

/** The tag names a message uses ("link", "b"), for checking translations. */
export function richTags(message: string): string[] {
  return [...message.matchAll(/<(\w+)>/g)].map((m) => m[1]!).sort();
}
