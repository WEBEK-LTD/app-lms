/** 93.2 The longest address prefix that fits, and its article (no other imports: the browser uses it too). */
export function matchHelp(prefixes: Record<string, string>, pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: string | null = null;
  for (const prefix of Object.keys(prefixes)) {
    if ((path === prefix || path.startsWith(`${prefix}/`)) && (!best || prefix.length > best.length)) best = prefix;
  }
  return best ? prefixes[best]! : null;
}
