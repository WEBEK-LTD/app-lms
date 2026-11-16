import type { Lang } from "@/i18n/config";
import type { MarketAfterEnd, MarketPlanPeriod } from "../data/types";

/**
 * 106.2 The lines of Studio Market's buyer emails (the receipt, the
 * reminders before a plan ends, the end), in the buyer's email language:
 * English, Arabic (Modern Standard, as every email) and Turkish. The
 * emails themselves are lib/email/templates.ts's, editable by the team;
 * these fill their placeholders.
 */

type Lines = {
  plan: Record<MarketPlanPeriod, string>;
  paid: string;
  paidAbout: string;
  runsUntil: string;
  forGood: string;
  onApp: string;
  applyLater: string;
  notApplied: string;
  renewed: string;
  earlyOnApp: string;
  early: string;
  lastOnApp: string;
  last: string;
  ifKeep: string;
  ifRestore: string;
  ifNone: string;
  ended: string;
  endedKeep: string;
  endedRestore: string;
  endedNone: string;
};

const LINES: Record<Lang, Lines> = {
  en: {
    plan: { "1m": "1 month", "3m": "3 months", "6m": "6 months", "1y": "1 year", "2y": "2 years", life: "Lifetime" },
    paid: "{amount} by card through {provider}",
    paidAbout: "{amount} (about {usd}) by card through {provider}",
    runsUntil: "Your plan runs until {date}. It doesn't renew by itself: we remind you 14 days before.",
    forGood: "It's yours for good: it never ends.",
    onApp: "It's on {app} now.",
    applyLater: "Apply it to one of your apps from My templates when you're ready.",
    notApplied: "It couldn't go on {app} yet: apply it from My templates.",
    renewed: "Thank you for renewing.",
    earlyOnApp: "Your plan for {template} on {app} ends in {days} days, on {date}.",
    early: "Your plan for {template} ends in {days} days, on {date}.",
    lastOnApp: "Today is the last day of your plan for {template} on {app}.",
    last: "Today is the last day of your plan for {template}.",
    ifKeep: "If you don't renew, the design stays on your app as it is, without updates.",
    ifRestore: "If you don't renew, your app goes back to the design it had before the template.",
    ifNone: "If you don't renew, you can't apply it to an app anymore.",
    ended: "Your plan for {template} ended on {date}.",
    endedKeep: "The design stays on {app} as it is now, without updates.",
    endedRestore: "{app} went back to the design it had before the template.",
    endedNone: "It wasn't on any of your apps.",
  },
  ar: {
    plan: { "1m": "شهر واحد", "3m": "3 أشهر", "6m": "6 أشهر", "1y": "سنة واحدة", "2y": "سنتان", life: "مدى الحياة" },
    paid: "{amount} بالبطاقة عبر {provider}",
    paidAbout: "{amount} (نحو {usd}) بالبطاقة عبر {provider}",
    runsUntil: "تستمر خطتك حتى {date}. لا تتجدد تلقائيًا: سنذكّرك قبل انتهائها بأربعة عشر يومًا.",
    forGood: "أصبح لك مدى الحياة: لا ينتهي أبدًا.",
    onApp: "أصبح الآن على {app}.",
    applyLater: "طبّقه على أحد تطبيقاتك من «تمبلتاتي» حين تكون مستعدًا.",
    notApplied: "تعذّر تطبيقه على {app} الآن: طبّقه من «تمبلتاتي».",
    renewed: "شكرًا لتجديدك.",
    earlyOnApp: "تنتهي خطتك لـ{template} على {app} بعد {days} يومًا، في {date}.",
    early: "تنتهي خطتك لـ{template} بعد {days} يومًا، في {date}.",
    lastOnApp: "اليوم هو آخر يوم في خطتك لـ{template} على {app}.",
    last: "اليوم هو آخر يوم في خطتك لـ{template}.",
    ifKeep: "إن لم تجدّدها، يبقى التصميم على تطبيقك كما هو، دون تحديثات.",
    ifRestore: "إن لم تجدّدها، يعود تطبيقك إلى التصميم الذي كان عليه قبل التمبلت.",
    ifNone: "إن لم تجدّدها، لن تستطيع تطبيقه على أي تطبيق بعد ذلك.",
    ended: "انتهت خطتك لـ{template} في {date}.",
    endedKeep: "يبقى التصميم على {app} كما هو الآن، دون تحديثات.",
    endedRestore: "عاد {app} إلى التصميم الذي كان عليه قبل التمبلت.",
    endedNone: "لم يكن على أي من تطبيقاتك.",
  },
  tr: {
    plan: { "1m": "1 ay", "3m": "3 ay", "6m": "6 ay", "1y": "1 yıl", "2y": "2 yıl", life: "Ömür boyu" },
    paid: "{amount}, {provider} üzerinden kartla",
    paidAbout: "{amount} (yaklaşık {usd}), {provider} üzerinden kartla",
    runsUntil: "Planınız {date} tarihine kadar sürer. Kendiliğinden yenilenmez: bitmeden 14 gün önce size hatırlatırız.",
    forGood: "Artık sizin: hiç bitmez.",
    onApp: "Şu an {app} üzerinde.",
    applyLater: "Hazır olduğunuzda Şablonlarım’dan uygulamalarınızdan birine uygulayın.",
    notApplied: "Henüz {app} üzerine uygulanamadı: Şablonlarım’dan uygulayın.",
    renewed: "Yenilediğiniz için teşekkürler.",
    earlyOnApp: "{app} üzerindeki {template} planınız {days} gün sonra, {date} tarihinde bitiyor.",
    early: "{template} planınız {days} gün sonra, {date} tarihinde bitiyor.",
    lastOnApp: "Bugün {app} üzerindeki {template} planınızın son günü.",
    last: "Bugün {template} planınızın son günü.",
    ifKeep: "Yenilemezseniz tasarım uygulamanızda olduğu gibi, güncellemesiz kalır.",
    ifRestore: "Yenilemezseniz uygulamanız şablondan önceki tasarımına döner.",
    ifNone: "Yenilemezseniz onu artık bir uygulamaya uygulayamazsınız.",
    ended: "{template} planınız {date} tarihinde bitti.",
    endedKeep: "Tasarım {app} üzerinde şimdiki haliyle, güncellemesiz kalıyor.",
    endedRestore: "{app}, şablondan önceki tasarımına döndü.",
    endedNone: "Uygulamalarınızdan hiçbirinde değildi.",
  },
};

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

export function marketMailLines(lang: Lang) {
  const l = LINES[lang] ?? LINES.en;
  return {
    plan: (period: MarketPlanPeriod) => l.plan[period],
    paid: (amount: string, provider: string, usd: string | null) => fill(usd ? l.paidAbout : l.paid, { amount, provider, usd: usd ?? "" }),
    ends: (date: string | null) => (date ? fill(l.runsUntil, { date }) : l.forGood),
    app: (outcome: "applied" | "later" | "failed" | "renewed", app: string) =>
      fill(outcome === "applied" ? l.onApp : outcome === "later" ? l.applyLater : outcome === "failed" ? l.notApplied : l.renewed, { app }),
    reminder: (which: "early" | "last", template: string, app: string | null, date: string, days = 14) =>
      fill(which === "early" ? (app ? l.earlyOnApp : l.early) : app ? l.lastOnApp : l.last, { template, app: app ?? "", date, days: String(days) }),
    ifNotRenewed: (afterEnd: MarketAfterEnd | null, onApp: boolean) => (!onApp ? l.ifNone : afterEnd === "restore" ? l.ifRestore : l.ifKeep),
    ended: (template: string, date: string) => fill(l.ended, { template, date }),
    afterEnded: (outcome: "keep" | "restore" | "none", app: string) => fill(outcome === "keep" ? l.endedKeep : outcome === "restore" ? l.endedRestore : l.endedNone, { app }),
  };
}
