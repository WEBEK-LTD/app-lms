import { getStore } from "@/lib/data";
import { DEFAULT_LANG, isPrefixedLang } from "@/i18n/config";
import { json } from "@/lib/http";
import { liveFeed } from "@/lib/live-activity/feed";

/**
 * GET /api/live-activity?lang=en|ar|tr: the website's live activity card
 * (components/live-activity.tsx): the team's settings and at most 10 recent
 * cards in the visitor's language, only words already safe to show
 * (lib/live-activity/feed.ts). Public, cached for a minute by browsers and
 * the CDN; without the database (a build, an outage) the card stays off.
 */
export async function GET(request: Request): Promise<Response> {
  const asked = new URL(request.url).searchParams.get("lang");
  const lang = isPrefixedLang(asked) ? asked : DEFAULT_LANG;
  const cache = { "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60", "x-robots-tag": "noindex" };
  try {
    return json(await liveFeed(await getStore(), lang), 200, cache);
  } catch (error) {
    console.error("[live-activity] the feed couldn't be read", error);
    return json({ on: false, items: [] }, 200, { "cache-control": "public, max-age=60" });
  }
}
