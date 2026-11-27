import { appEmailHtml, cardRow, escapeHtml, heading, paragraph, pill } from "../../email/app-email-shell";
import type { CommunityBadge } from "./badges";

/**
 * 231 Yallapp Community: notifications (area C). Each one goes to the
 * member's list in the app and on the site; the ones that matter most also
 * by email, unless the member turned that kind's emails off (push comes in
 * phase 2). In the member's language: English by default, Arabic (MSA) or
 * Turkish when they chose one.
 */

export const COMMUNITY_LANGS = ["en", "ar", "tr"] as const;
export type CommunityLang = (typeof COMMUNITY_LANGS)[number];

export const NOTIFICATION_KINDS = [
  // Q&A and tutorials (area B sends these)
  "answer",
  "answer_accepted",
  "official_answer",
  "reply",
  "vote_milestone",
  "mention",
  // People (area A sends these)
  "follow",
  "friend_request",
  "friend_accepted",
  // Trust (this area)
  "badge_granted",
  "badge_revoked",
  "verification_approved",
  "verification_rejected",
  "post_approved",
  "post_removed",
  "report_resolved",
  // Area A sends this when the member links their Yallapp account.
  "yallapp_linked",
  // 232–234 Area A: groups, hire requests, jobs.
  "group_request",
  "group_joined",
  "hire_request",
  "hire_update",
  "pro_review",
  "job_application",
  // 232–233 Posts, showcase and the academy (area B sends these)
  "post_comment",
  "comment_reply",
  "post_liked",
  "showcase_comment",
  "course_certificate",
  // 233–234 Challenges and events (this area)
  "challenge_won",
  "event_tomorrow",
  "event_soon",
  "event_cancelled",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** The kinds that email by default (the member can turn each off); the rest only reach the list. */
export const EMAILED_BY_DEFAULT: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "answer",
  "answer_accepted",
  "official_answer",
  "friend_request",
  "badge_granted",
  "badge_revoked",
  "verification_approved",
  "verification_rejected",
  "post_removed",
  "hire_request",
  "job_application",
  "course_certificate",
  "challenge_won",
  "event_tomorrow",
  "event_soon",
  "event_cancelled",
]);

/** A member's email choices (`NotificationSettings.email`): each kind on or off; a kind missing takes its default. */
/** The member's choices: a kind's key for email, `push.<kind>` for push (232). Missing: the default. */
export type NotificationPrefs = Partial<Record<NotificationKind | `push.${NotificationKind}`, boolean>>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {};

/** Whether a notification of this kind is emailed to a member with these choices. */
export function emails(kind: NotificationKind, prefs: NotificationPrefs): boolean {
  return prefs[kind] ?? EMAILED_BY_DEFAULT.has(kind);
}

/** 232 Whether a notification of this kind is pushed to the member's phones: on for every kind until they turn it off. */
export function pushes(kind: NotificationKind, prefs: NotificationPrefs): boolean {
  return prefs[`push.${kind}`] ?? true;
}

/** 232 Every kind with whether it is pushed. */
export function pushPrefsView(prefs: NotificationPrefs): Record<NotificationKind, boolean> {
  return Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k, pushes(k, prefs)])) as Record<NotificationKind, boolean>;
}

/** Every kind with whether it emails, as `GET /notifications/settings` gives them. */
export function prefsView(prefs: NotificationPrefs): Record<NotificationKind, boolean> {
  return Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k, emails(k, prefs)])) as Record<NotificationKind, boolean>;
}

/** The member's choices as sent (`{ email: { kind: true|false }, push: { kind: true|false } }`, only the kinds sent change), checked. */
export function parsePrefs(input: unknown, current: NotificationPrefs): { ok: true; value: NotificationPrefs } | { ok: false; error: string } {
  const v = (input ?? {}) as { email?: unknown; push?: unknown };
  if (v.email === undefined && v.push === undefined) return { ok: false, error: "email must be an object of kinds." };
  const out: NotificationPrefs = { ...current };
  for (const channel of ["email", "push"] as const) {
    const given = v[channel];
    if (given === undefined) continue;
    if (!given || typeof given !== "object" || Array.isArray(given)) return { ok: false, error: `${channel} must be an object of kinds.` };
    for (const [k, on] of Object.entries(given as Record<string, unknown>)) {
      if (!(NOTIFICATION_KINDS as readonly string[]).includes(k)) return { ok: false, error: `Unknown kind ${k}.` };
      if (typeof on !== "boolean") return { ok: false, error: `${k} must be true or false.` };
      out[channel === "email" ? (k as NotificationKind) : (`push.${k}` as `push.${NotificationKind}`)] = on;
    }
  }
  return { ok: true, value: out };
}

/** What a notification is about, as its words need it. */
export interface NotificationData {
  /** Who did it (a member's display name); missing for the Community's own. */
  actor?: string | null;
  /** The question or tutorial's title. */
  title?: string | null;
  badge?: CommunityBadge | null;
  /** An admin's reason, shown to the member (a rejection, a revoke). */
  reason?: string | null;
  /** Votes reached (vote_milestone). */
  count?: number | null;
}

export const BADGE_NAMES: Record<CommunityLang, Record<CommunityBadge, string>> = {
  en: { gold: "Pro Developer", green: "Verified Business", blue: "Active Member" },
  ar: { gold: "مطوّر محترف", green: "نشاط تجاري موثّق", blue: "عضو نشط" },
  tr: { gold: "Profesyonel Geliştirici", green: "Doğrulanmış İşletme", blue: "Aktif Üye" },
};

type Words = Record<NotificationKind, (d: Required<{ [K in keyof NotificationData]: NonNullable<NotificationData[K]> }>) => string>;

const WORDS: Record<CommunityLang, Words> = {
  en: {
    answer: (d) => `${d.actor} answered your question "${d.title}".`,
    answer_accepted: (d) => `Your answer to "${d.title}" was accepted.`,
    official_answer: (d) => `The Yallapp Team answered "${d.title}".`,
    reply: (d) => `${d.actor} replied to you in "${d.title}".`,
    vote_milestone: (d) => `Your post "${d.title}" reached ${d.count} votes.`,
    mention: (d) => `${d.actor} mentioned you in "${d.title}".`,
    follow: (d) => `${d.actor} started following you.`,
    friend_request: (d) => `${d.actor} sent you a friend request.`,
    friend_accepted: (d) => `${d.actor} accepted your friend request.`,
    badge_granted: (d) => `You earned the ${d.badge} badge.`,
    badge_revoked: (d) => `Your ${d.badge} badge was removed.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    verification_approved: () => "Your verification request was approved. You are now a Pro Developer.",
    verification_rejected: (d) => `Your verification request was not approved.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    post_approved: (d) => `Your post "${d.title}" was approved and is now visible.`,
    post_removed: (d) => `Your post "${d.title}" was not approved.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    report_resolved: () => "Thanks for your report. Our team has reviewed it.",
    yallapp_linked: () => "Your Yallapp account is now linked. Your apps show on your profile.",
    group_request: (d) => `${d.actor} asked to join your group "${d.title}".`,
    group_joined: (d) => `You're now a member of the group "${d.title}".`,
    hire_request: (d) => `${d.actor} sent you a hire request.`,
    hire_update: (d) => `Your hire request with ${d.actor} is now ${d.title}.`,
    pro_review: (d) => `${d.actor} reviewed your work.`,
    job_application: (d) => `${d.actor} applied to your job "${d.title}".`,
    post_comment: (d) => `${d.actor} commented on your post "${d.title}".`,
    comment_reply: (d) => `${d.actor} replied to your comment on "${d.title}".`,
    post_liked: (d) => `Your post "${d.title}" reached ${d.count} likes.`,
    showcase_comment: (d) => `${d.actor} commented on your app "${d.title}".`,
    course_certificate: (d) => `You completed "${d.title}". Your certificate is ready.`,
    challenge_won: (d) => `You placed ${d.count} in the challenge "${d.title}".`,
    event_tomorrow: (d) => `Tomorrow: "${d.title}". You're going.`,
    event_soon: (d) => `"${d.title}" starts in an hour.`,
    event_cancelled: (d) => `"${d.title}" was cancelled.`,
  },
  ar: {
    answer: (d) => `أجاب ${d.actor} عن سؤالك «${d.title}».`,
    answer_accepted: (d) => `قُبلت إجابتك عن «${d.title}».`,
    official_answer: (d) => `أجاب فريق Yallapp عن «${d.title}».`,
    reply: (d) => `ردّ عليك ${d.actor} في «${d.title}».`,
    vote_milestone: (d) => `حصلت مشاركتك «${d.title}» على ${d.count} صوتًا.`,
    mention: (d) => `أشار إليك ${d.actor} في «${d.title}».`,
    follow: (d) => `بدأ ${d.actor} متابعتك.`,
    friend_request: (d) => `أرسل إليك ${d.actor} طلب صداقة.`,
    friend_accepted: (d) => `قبل ${d.actor} طلب صداقتك.`,
    badge_granted: (d) => `حصلت على شارة ${d.badge}.`,
    badge_revoked: (d) => `أُزيلت شارة ${d.badge} من حسابك.${d.reason ? ` السبب: ${d.reason}` : ""}`,
    verification_approved: () => "قُبل طلب التوثيق، وأصبحت الآن مطوّرًا محترفًا.",
    verification_rejected: (d) => `لم يُقبل طلب التوثيق.${d.reason ? ` السبب: ${d.reason}` : ""}`,
    post_approved: (d) => `قُبلت مشاركتك «${d.title}» وأصبحت ظاهرة للجميع.`,
    post_removed: (d) => `لم تُقبل مشاركتك «${d.title}».${d.reason ? ` السبب: ${d.reason}` : ""}`,
    report_resolved: () => "شكرًا على بلاغك، فقد راجعه فريقنا.",
    yallapp_linked: () => "رُبط حسابك في Yallapp، وتظهر تطبيقاتك الآن في ملفك الشخصي.",
    group_request: (d) => `طلب ${d.actor} الانضمام إلى مجموعتك «${d.title}».`,
    group_joined: (d) => `أصبحت عضوًا في مجموعة «${d.title}».`,
    hire_request: (d) => `أرسل إليك ${d.actor} طلب توظيف.`,
    hire_update: (d) => `تغيّرت حالة طلب التوظيف مع ${d.actor} إلى: ${d.title}.`,
    pro_review: (d) => `كتب ${d.actor} تقييمًا لعملك.`,
    job_application: (d) => `تقدّم ${d.actor} إلى وظيفتك «${d.title}».`,
    post_comment: (d) => `علّق ${d.actor} على منشورك «${d.title}».`,
    comment_reply: (d) => `ردّ ${d.actor} على تعليقك في «${d.title}».`,
    post_liked: (d) => `حصل منشورك «${d.title}» على ${d.count} إعجابًا.`,
    showcase_comment: (d) => `علّق ${d.actor} على تطبيقك «${d.title}».`,
    course_certificate: (d) => `أتممت «${d.title}»، وشهادتك جاهزة.`,
    challenge_won: (d) => `حصلت على المركز ${d.count} في تحدّي «${d.title}».`,
    event_tomorrow: (d) => `غدًا: «${d.title}». أنت من الحاضرين.`,
    event_soon: (d) => `تبدأ «${d.title}» بعد ساعة.`,
    event_cancelled: (d) => `أُلغيت «${d.title}».`,
  },
  tr: {
    answer: (d) => `${d.actor}, "${d.title}" sorunuzu yanıtladı.`,
    answer_accepted: (d) => `"${d.title}" sorusuna verdiğiniz yanıt kabul edildi.`,
    official_answer: (d) => `Yallapp Ekibi "${d.title}" sorusunu yanıtladı.`,
    reply: (d) => `${d.actor}, "${d.title}" içinde size yanıt verdi.`,
    vote_milestone: (d) => `"${d.title}" gönderiniz ${d.count} oya ulaştı.`,
    mention: (d) => `${d.actor}, "${d.title}" içinde sizden bahsetti.`,
    follow: (d) => `${d.actor} sizi takip etmeye başladı.`,
    friend_request: (d) => `${d.actor} size arkadaşlık isteği gönderdi.`,
    friend_accepted: (d) => `${d.actor} arkadaşlık isteğinizi kabul etti.`,
    badge_granted: (d) => `${d.badge} rozetini kazandınız.`,
    badge_revoked: (d) => `${d.badge} rozetiniz kaldırıldı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    verification_approved: () => "Doğrulama başvurunuz onaylandı. Artık bir Profesyonel Geliştiricisiniz.",
    verification_rejected: (d) => `Doğrulama başvurunuz onaylanmadı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    post_approved: (d) => `"${d.title}" gönderiniz onaylandı ve artık görünüyor.`,
    post_removed: (d) => `"${d.title}" gönderiniz onaylanmadı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    report_resolved: () => "Bildiriminiz için teşekkürler. Ekibimiz inceledi.",
    yallapp_linked: () => "Yallapp hesabınız bağlandı. Uygulamalarınız artık profilinizde görünüyor.",
    group_request: (d) => `${d.actor}, "${d.title}" grubunuza katılmak istiyor.`,
    group_joined: (d) => `Artık "${d.title}" grubunun üyesisiniz.`,
    hire_request: (d) => `${d.actor} size bir iş teklifi gönderdi.`,
    hire_update: (d) => `${d.actor} ile iş teklifinizin durumu: ${d.title}.`,
    pro_review: (d) => `${d.actor} çalışmanızı değerlendirdi.`,
    job_application: (d) => `${d.actor}, "${d.title}" ilanınıza başvurdu.`,
    post_comment: (d) => `${d.actor}, "${d.title}" gönderinize yorum yaptı.`,
    comment_reply: (d) => `${d.actor}, "${d.title}" içindeki yorumunuza yanıt verdi.`,
    post_liked: (d) => `"${d.title}" gönderiniz ${d.count} beğeniye ulaştı.`,
    showcase_comment: (d) => `${d.actor}, "${d.title}" uygulamanıza yorum yaptı.`,
    course_certificate: (d) => `"${d.title}" kursunu tamamladınız. Sertifikanız hazır.`,
    challenge_won: (d) => `"${d.title}" yarışmasında ${d.count}. oldunuz.`,
    event_tomorrow: (d) => `Yarın: "${d.title}". Katılıyorsunuz.`,
    event_soon: (d) => `"${d.title}" bir saat sonra başlıyor.`,
    event_cancelled: (d) => `"${d.title}" iptal edildi.`,
  },
};

/** The member's language, English when they chose none or one the Community hasn't. */
export function communityLang(lang: string | null | undefined): CommunityLang {
  const code = (lang ?? "").toLowerCase().split(/[-_]/)[0];
  return (COMMUNITY_LANGS as readonly string[]).includes(code ?? "") ? (code as CommunityLang) : "en";
}

/** A notification's line in `lang`. */
export function notificationText(kind: NotificationKind, data: NotificationData, lang: CommunityLang): string {
  const badge = data.badge ? BADGE_NAMES[lang][data.badge] : "";
  return WORDS[lang][kind]({ actor: data.actor ?? "", title: data.title ?? "", badge: badge as never, reason: data.reason ?? "", count: data.count ?? 0 });
}

const EMAIL_WORDS: Record<CommunityLang, { open: string; footer: string; settings: string }> = {
  en: { open: "Open in Yallapp Community", footer: "Yallapp Community", settings: "You can choose which emails you get in Settings > Notifications." },
  ar: { open: "افتح في مجتمع Yallapp", footer: "مجتمع Yallapp", settings: "يمكنك اختيار الرسائل التي تصلك من الإعدادات > الإشعارات." },
  tr: { open: "Yallapp Community'de aç", footer: "Yallapp Community", settings: "Hangi e-postaları alacağınızı Ayarlar > Bildirimler'den seçebilirsiniz." },
};

/** The Community's colour (the design's orange). */
export const COMMUNITY_BRAND = "#FF5A1F";

/** A notification's email: its subject, text and HTML, in the member's language, linking to it in the Community. */
export function notificationEmail(kind: NotificationKind, data: NotificationData, lang: CommunityLang, link: string, logoUrl: string | null): { subject: string; text: string; html: string } {
  const line = notificationText(kind, data, lang);
  const w = EMAIL_WORDS[lang];
  const subject = line.length > 120 ? `${line.slice(0, 117)}…` : line;
  const text = `${line}\n\n${w.open}: ${link}\n\n${w.settings}`;
  const rows = [
    cardRow(lang, heading(escapeHtml(line)), "32px 32px 8px"),
    cardRow(lang, `<a href="${escapeHtml(link)}" style="text-decoration:none">${pill(COMMUNITY_BRAND, escapeHtml(w.open))}</a>`, "8px 32px 24px"),
    cardRow(lang, paragraph(escapeHtml(w.settings), { muted: true, size: 13 }), "0 32px 28px"),
  ].join("");
  const html = appEmailHtml({ lang, appName: w.footer, logoUrl, brand: COMMUNITY_BRAND, title: subject, preheader: line, rows, footer: w.footer });
  return { subject, text, html };
}
