/** Up to five web addresses, one a line; each shown by its site's name. Null when one isn't an http(s) address. */
export function profileLinks(raw: string): { label: string; url: string }[] | null {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 5) return null;
  const out: { label: string; url: string }[] = [];
  for (const line of lines) {
    const url = /^https?:\/\//i.test(line) ? line : `https://${line}`;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || url.length > 300) return null;
    const path = u.pathname.replace(/\/$/, "");
    out.push({ label: `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 40), url: u.toString() });
  }
  return out;
}
