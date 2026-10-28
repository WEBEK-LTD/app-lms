/**
 * 104 A place shared as a maps link (a WhatsApp location, a Google Maps or
 * Apple Maps link): the coordinates it points at. Short links are followed,
 * only to the maps' own addresses, at most a few times; nothing else is
 * fetched.
 */

const MAPS_HOST = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?|maps\.apple\.com|maps\.apple)$/i;
const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PATTERNS = [
  // ".../@30.0444,31.2357,15z"
  new RegExp(`@${NUMBER},${NUMBER}`),
  // "!3d30.0444!4d31.2357"
  new RegExp(`!3d${NUMBER}!4d${NUMBER}`),
  // "?q=30.0444,31.2357", "ll=", "daddr=", "destination=", "coordinate=", "query=", "sll="
  new RegExp(`[?&](?:q|ll|sll|daddr|destination|coordinate|query|center)=(?:loc:)?${NUMBER}(?:,|%2C)\\s*${NUMBER}`, "i"),
  // "geo:30.0444,31.2357"
  new RegExp(`^geo:${NUMBER},${NUMBER}`, "i"),
];

function valid(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** The coordinates written in a link or text, or null. */
export function coordinatesIn(text: string): { lat: number; lng: number } | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  })();
  for (const source of [text, decoded]) {
    for (const pattern of PATTERNS) {
      const match = pattern.exec(source);
      if (!match) continue;
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (valid(lat, lng)) return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
    }
  }
  // Plain "30.0444, 31.2357".
  const plain = new RegExp(`^\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*$`).exec(decoded);
  if (plain && valid(Number(plain[1]), Number(plain[2]))) return { lat: Number(plain[1]), lng: Number(plain[2]) };
  return null;
}

/** Whether the link is one of the maps' own. */
export function isMapsLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && MAPS_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/** The coordinates of a maps link, following short links (at most 4 redirects, to the maps' own hosts). */
export async function locateMapLink(value: string, fetcher: typeof fetch = fetch): Promise<{ lat: number; lng: number } | null> {
  const direct = coordinatesIn(value.trim());
  if (direct) return direct;
  let url = value.trim();
  for (let hop = 0; hop < 4; hop++) {
    if (!isMapsLink(url)) return null;
    let response: Response;
    try {
      response = await fetcher(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "user-agent": "Mozilla/5.0 (compatible; Yallapp)" } });
    } catch {
      return null;
    }
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (!location || response.status < 300 || response.status >= 400) return null;
    const next = new URL(location, url).toString();
    const found = coordinatesIn(next);
    if (found) return found;
    url = next;
  }
  return null;
}
