import { NextResponse } from "next/server";
import { isLang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl, secureCookies } from "@/lib/env";
import { MARKET_NEXT_COOKIE, MARKET_NEXT_TTL_SECONDS, marketNextPath, type MarketNextTo } from "@/lib/studio-market/public";

/**
 * 106.13 GET /api/studio-market/continue?to=checkout|preview|template&slug=…
 * [&plan=…][&lang=ar][&account=sign-in]: a visitor chose a plan, "Preview
 * it on my app first" or a free template on the website. Signed in, they go
 * straight to it in the dashboard; signed out, the dashboard address is
 * remembered for an hour (lib/studio-market/public.ts) and sign-up opens in
 * their language (or sign-in), which takes them there once they have an
 * account. Anything else goes back to the market.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const lang = params.get("lang") ?? "en";
  const site = isLang(lang) ? lang : "en";
  const to = params.get("to");
  const next = to === "checkout" || to === "preview" || to === "template" ? marketNextPath(to as MarketNextTo, params.get("slug") ?? "", params.get("plan")) : null;
  if (!next) return NextResponse.redirect(new URL(localePath(site, "/templates"), appUrl()), 303);
  if (await getCurrentUser()) return NextResponse.redirect(new URL(next, appUrl()), 303);
  // A link's prefetch never chooses where sign-in goes: only the click the visitor makes does.
  if (isPrefetch(request)) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const response = NextResponse.redirect(new URL(localePath(site, params.get("account") === "sign-in" ? "/sign-in" : "/sign-up"), appUrl()), 303);
  response.cookies.set(MARKET_NEXT_COOKIE, next, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: MARKET_NEXT_TTL_SECONDS });
  return response;
}

/** A browser or Next.js prefetch of the link, not the visitor's click. */
function isPrefetch(request: Request): boolean {
  const h = request.headers;
  return h.get("next-router-prefetch") === "1" || /prefetch/i.test(h.get("sec-purpose") ?? h.get("purpose") ?? "");
}
