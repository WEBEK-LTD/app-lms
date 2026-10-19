import { safeEqual } from "./crypto/tokens";
import { trustedProxySecret } from "./env";

/**
 * The visitor's country, from the request as it arrived (44 analytics, 52
 * Yallapp's prices). In order: our reverse proxy's `X-Yallapp-Client-Country`
 * (only with its shared secret), Netlify's `x-nf-geo` (JSON, base64 or
 * plain) and `x-country`, then Cloudflare's `cf-ipcountry`. The IP itself is
 * never kept. "XX" and "T1" (unknown, Tor) count as no country.
 */

const COUNTRY = /^[A-Z]{2}$/;

function valid(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();
  return code && COUNTRY.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

function geoCountry(header: string): string | null {
  for (const text of [Buffer.from(header, "base64").toString("utf8"), header]) {
    try {
      const parsed = JSON.parse(text) as { country?: { code?: string } } | null;
      const code = valid(parsed?.country?.code);
      if (code) return code;
    } catch {
      // Not this encoding: try the next one.
    }
  }
  return null;
}

export function countryFromHeaders(list: Headers, proxySecret: string | undefined = trustedProxySecret()): string | null {
  if (proxySecret) {
    const sent = list.get("x-yallapp-proxy-secret");
    if (sent && safeEqual(sent, proxySecret)) {
      const proxied = valid(list.get("x-yallapp-client-country"));
      if (proxied) return proxied;
    }
  }
  const geo = list.get("x-nf-geo");
  const fromGeo = geo ? geoCountry(geo) : null;
  return fromGeo ?? valid(list.get("x-country")) ?? valid(list.get("cf-ipcountry"));
}

/**
 * The region of the browser's preferred language that has one, highest
 * weight first: "ar-EG,ar;q=0.9" is EG. Only a hint, for when the host
 * sends no country.
 */
export function acceptLanguageRegion(header: string | null | undefined): string | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .slice(0, 20)
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag!.trim(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((t) => t.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of tags) {
    // language[-script]-REGION; a numeric region (419) isn't a country.
    const region = tag.split("-").slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
    const code = valid(region);
    if (code) return code;
  }
  return null;
}

/** 52 The country for prices: the host's (or our proxy's), else the browser's language region; null when neither says. */
export function visitorCountry(list: Headers, proxySecret: string | undefined = trustedProxySecret()): string | null {
  return countryFromHeaders(list, proxySecret) ?? acceptLanguageRegion(list.get("accept-language"));
}
