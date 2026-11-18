import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, HostedDevice } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "../hosted/notify";
import { pushTarget, sendPush } from "../hosted/push";
import { clubPayLink, sendClubReminders, type ClubReminderSend } from "./club";
import { formatMinor } from "./currency";

/**
 * 115.62 The club's renewal reminder (`club_renewal`, D6): in the member's
 * inbox and on their phones, 3 days before the end of the period and on its
 * last day, with a payment link at the owner's price. Nothing is charged by
 * itself. The words are the app's (Modern Standard Arabic for Arabic).
 */

export interface ClubNotifyDeps {
  store: DataStore;
  now: Date;
  /** The platform's address, for the payment link. */
  platformUrl: string;
  /** For the app's push account; without it the inbox still has the reminder. */
  key?: Buffer;
  send?: typeof sendPush;
}

type Words = { title: string; body: string };

const TEXT: Record<ClubReminderSend["which"], Record<Lang, (v: { plan: string; date: string; price: string }) => Words>> = {
  "3d": {
    en: (v) => ({ title: "Your club membership ends in 3 days", body: `${v.plan} ends on ${v.date}. Tap to pay ${v.price} for the next period; nothing is charged by itself.` }),
    ar: (v) => ({ title: "تنتهي عضويتك في النادي بعد 3 أيام", body: `تنتهي عضوية ${v.plan} في ${v.date}. اضغط لدفع ${v.price} للفترة التالية، ولا يُخصم شيء تلقائيًا.` }),
    tr: (v) => ({ title: "Kulüp üyeliğiniz 3 gün sonra bitiyor", body: `${v.plan} ${v.date} tarihinde bitiyor. Sonraki dönem için ${v.price} ödemek üzere dokunun; hiçbir şey kendiliğinden çekilmez.` }),
  },
  last: {
    en: (v) => ({ title: "Your club membership ends today", body: `Pay ${v.price} to keep ${v.plan} from today's end; nothing is charged by itself.` }),
    ar: (v) => ({ title: "تنتهي عضويتك في النادي اليوم", body: `ادفع ${v.price} لتستمر عضوية ${v.plan} بعد نهايتها اليوم، ولا يُخصم شيء تلقائيًا.` }),
    tr: (v) => ({ title: "Kulüp üyeliğiniz bugün bitiyor", body: `${v.plan} üyeliğinizi sürdürmek için ${v.price} ödeyin; hiçbir şey kendiliğinden çekilmez.` }),
  },
};

function langOf(devices: HostedDevice[], fallback: Lang): Lang {
  const lang = devices.find((d) => d.language === "en" || d.language === "ar" || d.language === "tr")?.language;
  return (lang as Lang | undefined) ?? fallback;
}

/** The reminder's words, for a plan, its end date and price, in the member's language and the app's time zone. */
export function clubRenewalText(which: ClubReminderSend["which"], lang: Lang, input: { plan: string; paidUntil: Date; price: number; currency: string; zone: string }): Words {
  const date = formatDate(lang, input.paidUntil, { day: "numeric", month: "long", timeZone: input.zone });
  return TEXT[which][lang]({ plan: input.plan, date, price: formatMinor(input.price, input.currency, lang) });
}

/** The daily job's reminders for one marketplace app. */
export async function remindClubRenewals(deps: ClubNotifyDeps, app: App, zone: string): Promise<number> {
  const { store, now } = deps;
  const fallback = await appLang(store, app.id);
  const account = deps.key ? serviceAccountOf(app, deps.key) : null;
  return sendClubReminders(store, app.id, now, async ({ member, which }) => {
    const plan = member.planId ? await store.getMarketClubPlan(app.id, member.planId) : null;
    if (!plan || !member.paidUntil) return;
    const devices = await store.listHostedPushDevices(app.id, [member.userId]);
    const lang = langOf(devices, fallback);
    const words = clubRenewalText(which, lang, { plan: plan.name, paidUntil: member.paidUntil, price: plan.price, currency: plan.currency, zone });
    const url = plan.price > 0 ? await clubPayLink(store, { appId: app.id, platformUrl: deps.platformUrl, userId: member.userId, lang, plan }, now) : null;
    const title = words.title.slice(0, NOTIFICATION_TITLE_MAX);
    const body = words.body.slice(0, NOTIFICATION_BODY_MAX);
    const data: Record<string, string> = { type: "club_renewal", plan_id: String(plan.id), reminder: which, ...(url ? { url } : {}) };
    await store.createHostedNotification({ appId: app.id, userId: member.userId, title, body, data, createdAt: now });
    const targets = devices.filter((d) => d.pushPreferences?.announcements !== false).map(pushTarget);
    if (!account || targets.length === 0) return;
    try {
      const result = await (deps.send ?? sendPush)(account, targets, { title, body, data }, { now });
      for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    } catch {
      // The inbox has it either way.
    }
  });
}
