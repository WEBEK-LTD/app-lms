import "server-only";
import { appZone, zoneLabel } from "@/lib/analytics/zone";
import { utcToLocal } from "@/lib/bookings/time";
import type { DataStore } from "@/lib/data/store";
import type { App, NotificationCampaign } from "@/lib/data/types";
import type { Lang } from "@/i18n/config";
import { audienceChoices, audienceKinds, INACTIVE_DAYS } from "@/lib/hosted/audiences";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "@/lib/hosted/notify";
import { yallappLinkBase } from "@/lib/links/table";
import type { CampaignChoices, CampaignFormValues } from "./forms";

/** Countries offered besides those the app's phones signed in from: where Yallapp's clients sell. */
const NEARBY = ["TR", "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ", "SY", "PS", "MA", "DZ", "TN", "LY", "SD", "AZ", "KZ", "DE", "NL", "FR", "GB", "US"];

function displayNames(lang: Lang, type: "language" | "region") {
  try {
    const names = new Intl.DisplayNames([lang], { type });
    return (code: string) => names.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
}

/** 85.2 What the campaign form offers for this app. */
export async function campaignChoices(store: DataStore, app: App, lang: Lang, now: Date): Promise<CampaignChoices> {
  const [layout, seen, zone] = await Promise.all([store.getAppLayout(app.id), audienceChoices(store, app), appZone(store, app)]);
  const pages = (layout?.published?.pages ?? layout?.draft.pages ?? []).map((p) => ({ slug: p.slug, title: p.title || p.slug }));
  const appLanguages = layout?.published?.languages?.available ?? layout?.draft.languages?.available ?? [];
  const language = displayNames(lang, "language");
  const region = displayNames(lang, "region");
  const codes = [...new Set([...seen.languages, ...appLanguages])];
  const weekday = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { weekday: "long", timeZone: "UTC" });
  return {
    kinds: audienceKinds(app),
    courses: (app.courseSetup?.courses ?? []).map((c) => ({ id: c.id, title: c.title })),
    pages,
    languages: codes.map((code) => ({ code, name: language(code) })),
    countries: [...seen.countries.map((code) => ({ code, seen: true })), ...NEARBY.filter((c) => !seen.countries.includes(c)).map((code) => ({ code, seen: false }))].map((c) => ({ ...c, name: region(c.code) })),
    // 4 January 1970 was a Sunday.
    weekdays: Array.from({ length: 7 }, (_, i) => weekday.format(new Date(Date.UTC(1970, 0, 4 + i)))),
    inactiveDays: INACTIVE_DAYS,
    titleMax: NOTIFICATION_TITLE_MAX,
    bodyMax: NOTIFICATION_BODY_MAX,
    zone: zoneLabel(zone, now),
    today: utcToLocal(now, zone).date,
  };
}

/** The form's values for a saved campaign (or a new one). */
export function campaignFormValues(app: App, campaign: NotificationCampaign | null, zone: string, platformUrl: string): CampaignFormValues {
  if (!campaign) {
    return { id: null, title: "", body: "", open: "none", page: "", url: "", imageUrl: "", who: "everyone", courseId: "", inactiveDays: "30", languages: [], platforms: [], countries: [], when: "now", date: "", time: "", weekday: "1" };
  }
  const pagePrefix = `${yallappLinkBase(platformUrl, app.id)}/page/`;
  const page = campaign.link?.startsWith(pagePrefix) ? decodeURIComponent(campaign.link.slice(pagePrefix.length)) : "";
  const local = campaign.sendAt ? utcToLocal(campaign.sendAt, zone) : null;
  return {
    id: campaign.id,
    title: campaign.title,
    body: campaign.body,
    open: page ? "page" : campaign.link ? "link" : "none",
    page,
    url: page ? "" : (campaign.link ?? ""),
    imageUrl: campaign.imageUrl ?? "",
    who: campaign.audience.who,
    courseId: campaign.audience.courseId === null ? "" : String(campaign.audience.courseId),
    inactiveDays: String(campaign.audience.inactiveDays ?? 30),
    languages: campaign.audience.languages,
    platforms: campaign.audience.platforms,
    countries: campaign.audience.countries,
    when: campaign.repeat === "weekly" ? "weekly" : campaign.status === "scheduled" ? "later" : "draft",
    date: local?.date ?? "",
    time: campaign.time ?? local?.time ?? "",
    weekday: campaign.weekday === null ? "1" : String(campaign.weekday),
  };
}
