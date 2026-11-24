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
  "answer_posted",
  "answer_accepted",
  "official_answer",
  "reply_posted",
  "question_voted",
  "answer_voted",
  "mentioned",
  // People (area A sends these)
  "followed",
  "friend_request",
  "friend_accepted",
  // Trust (this area)
  "badge_granted",
  "badge_revoked",
  "verification_approved",
  "verification_rejected",
  "post_approved",
  "post_rejected",
  "report_resolved",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** The kinds that email by default (the member can turn each off); the rest only reach the list. */
export const EMAILED_BY_DEFAULT: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "answer_posted",
  "answer_accepted",
  "official_answer",
  "friend_request",
  "badge_granted",
  "badge_revoked",
  "verification_approved",
  "verification_rejected",
  "post_rejected",
]);

/** A member's email choices: all emails off, or each kind on or off (missing: its default). */
export interface NotificationPrefs {
  email: boolean;
  kinds: Partial<Record<NotificationKind, boolean>>;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { email: true, kinds: {} };

/** Whether a notification of this kind is emailed to a member with these choices. */
export function emails(kind: NotificationKind, prefs: NotificationPrefs): boolean {
  return prefs.email && (prefs.kinds[kind] ?? EMAILED_BY_DEFAULT.has(kind));
}

/** The member's choices as sent (only the fields sent change), checked. */
export function parsePrefs(input: unknown, current: NotificationPrefs): { ok: true; value: NotificationPrefs } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  const out: NotificationPrefs = { email: current.email, kinds: { ...current.kinds } };
  if (v.email !== undefined) {
    if (typeof v.email !== "boolean") return { ok: false, error: "email must be true or false." };
    out.email = v.email;
  }
  if (v.kinds !== undefined) {
    if (!v.kinds || typeof v.kinds !== "object" || Array.isArray(v.kinds)) return { ok: false, error: "kinds must be an object." };
    for (const [k, on] of Object.entries(v.kinds as Record<string, unknown>)) {
      if (!(NOTIFICATION_KINDS as readonly string[]).includes(k)) return { ok: false, error: `Unknown kind ${k}.` };
      if (typeof on !== "boolean") return { ok: false, error: `${k} must be true or false.` };
      out.kinds[k as NotificationKind] = on;
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
  /** Votes reached (question_voted, answer_voted). */
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
    answer_posted: (d) => `${d.actor} answered your question "${d.title}".`,
    answer_accepted: (d) => `Your answer to "${d.title}" was accepted.`,
    official_answer: (d) => `The Yallapp Team answered "${d.title}".`,
    reply_posted: (d) => `${d.actor} replied to you in "${d.title}".`,
    question_voted: (d) => `Your question "${d.title}" reached ${d.count} votes.`,
    answer_voted: (d) => `Your answer to "${d.title}" reached ${d.count} votes.`,
    mentioned: (d) => `${d.actor} mentioned you in "${d.title}".`,
    followed: (d) => `${d.actor} started following you.`,
    friend_request: (d) => `${d.actor} sent you a friend request.`,
    friend_accepted: (d) => `${d.actor} accepted your friend request.`,
    badge_granted: (d) => `You earned the ${d.badge} badge.`,
    badge_revoked: (d) => `Your ${d.badge} badge was removed.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    verification_approved: () => "Your verification request was approved. You are now a Pro Developer.",
    verification_rejected: (d) => `Your verification request was not approved.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    post_approved: (d) => `Your post "${d.title}" was approved and is now visible.`,
    post_rejected: (d) => `Your post "${d.title}" was not approved.${d.reason ? ` Reason: ${d.reason}` : ""}`,
    report_resolved: () => "Thanks for your report. Our team has reviewed it.",
  },
  ar: {
    answer_posted: (d) => `أجاب ${d.actor} عن سؤالك «${d.title}».`,
    answer_accepted: (d) => `قُبلت إجابتك عن «${d.title}».`,
    official_answer: (d) => `أجاب فريق Yallapp عن «${d.title}».`,
    reply_posted: (d) => `ردّ عليك ${d.actor} في «${d.title}».`,
    question_voted: (d) => `حصل سؤالك «${d.title}» على ${d.count} صوتًا.`,
    answer_voted: (d) => `حصلت إجابتك عن «${d.title}» على ${d.count} صوتًا.`,
    mentioned: (d) => `أشار إليك ${d.actor} في «${d.title}».`,
    followed: (d) => `بدأ ${d.actor} متابعتك.`,
    friend_request: (d) => `أرسل إليك ${d.actor} طلب صداقة.`,
    friend_accepted: (d) => `قبل ${d.actor} طلب صداقتك.`,
    badge_granted: (d) => `حصلت على شارة ${d.badge}.`,
    badge_revoked: (d) => `أُزيلت شارة ${d.badge} من حسابك.${d.reason ? ` السبب: ${d.reason}` : ""}`,
    verification_approved: () => "قُبل طلب التوثيق، وأصبحت الآن مطوّرًا محترفًا.",
    verification_rejected: (d) => `لم يُقبل طلب التوثيق.${d.reason ? ` السبب: ${d.reason}` : ""}`,
    post_approved: (d) => `قُبلت مشاركتك «${d.title}» وأصبحت ظاهرة للجميع.`,
    post_rejected: (d) => `لم تُقبل مشاركتك «${d.title}».${d.reason ? ` السبب: ${d.reason}` : ""}`,
    report_resolved: () => "شكرًا على بلاغك، فقد راجعه فريقنا.",
  },
  tr: {
    answer_posted: (d) => `${d.actor}, "${d.title}" sorunuzu yanıtladı.`,
    answer_accepted: (d) => `"${d.title}" sorusuna verdiğiniz yanıt kabul edildi.`,
    official_answer: (d) => `Yallapp Ekibi "${d.title}" sorusunu yanıtladı.`,
    reply_posted: (d) => `${d.actor}, "${d.title}" içinde size yanıt verdi.`,
    question_voted: (d) => `"${d.title}" sorunuz ${d.count} oya ulaştı.`,
    answer_voted: (d) => `"${d.title}" sorusuna verdiğiniz yanıt ${d.count} oya ulaştı.`,
    mentioned: (d) => `${d.actor}, "${d.title}" içinde sizden bahsetti.`,
    followed: (d) => `${d.actor} sizi takip etmeye başladı.`,
    friend_request: (d) => `${d.actor} size arkadaşlık isteği gönderdi.`,
    friend_accepted: (d) => `${d.actor} arkadaşlık isteğinizi kabul etti.`,
    badge_granted: (d) => `${d.badge} rozetini kazandınız.`,
    badge_revoked: (d) => `${d.badge} rozetiniz kaldırıldı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    verification_approved: () => "Doğrulama başvurunuz onaylandı. Artık bir Profesyonel Geliştiricisiniz.",
    verification_rejected: (d) => `Doğrulama başvurunuz onaylanmadı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    post_approved: (d) => `"${d.title}" gönderiniz onaylandı ve artık görünüyor.`,
    post_rejected: (d) => `"${d.title}" gönderiniz onaylanmadı.${d.reason ? ` Neden: ${d.reason}` : ""}`,
    report_resolved: () => "Bildiriminiz için teşekkürler. Ekibimiz inceledi.",
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
