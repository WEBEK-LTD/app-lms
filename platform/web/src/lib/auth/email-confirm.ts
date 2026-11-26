import { hmacSha256, safeEqual } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { User } from "../data/types";
import { appUrl, signingSecret } from "../env";
import { hitRateLimit } from "../rate-limit";

/**
 * 231 "Confirm your email" for a Yallapp account: a signed link to the
 * account's email, good for 24 hours. Following it (and pressing Confirm)
 * records that the email is theirs (`users.email_verified_at`), which
 * Yallapp Community needs before it trusts that email. Once confirmed, the
 * link does nothing more; it names the email, so it can't confirm another.
 * At most 3 an hour per account.
 */
export const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
const LIMIT = { name: "email-confirm:user", limit: 3, windowSeconds: 60 * 60 };
const WORDS = {
  en: { subject: "Confirm your email for Yallapp", body: "Hello {name},\n\nConfirm that {email} is your email: open this link and press Confirm.\n\n{link}\n\nThe link works for 24 hours. If you didn't ask for it, you can ignore this email.\n\nYallapp" },
  ar: { subject: "تأكيد بريدك الإلكتروني في Yallapp", body: "مرحبًا {name}،\n\nأكّد أن {email} هو بريدك الإلكتروني: افتح هذا الرابط واضغط «تأكيد».\n\n{link}\n\nيعمل الرابط مدة 24 ساعة. إن لم تطلبه، يمكنك تجاهل هذه الرسالة.\n\nYallapp" },
  tr: { subject: "Yallapp için e-postanı onayla", body: "Merhaba {name},\n\n{email} adresinin sana ait olduğunu onayla: bu bağlantıyı aç ve Onayla'ya bas.\n\n{link}\n\nBağlantı 24 saat geçerli. Bunu sen istemediysen bu e-postayı yok sayabilirsin.\n\nYallapp" },
} as const;

function sign(payload: string): string {
  return hmacSha256(signingSecret(), `email-confirm:${payload}`);
}

export function emailConfirmToken(user: Pick<User, "id" | "email">, now: Date): string {
  const payload = Buffer.from(JSON.stringify({ u: user.id, e: user.email.toLowerCase(), x: now.getTime() + CONFIRM_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** The mail with its link, in the person's language; null past the limit or already confirmed. */
export async function emailConfirmMail(store: DataStore, user: User, now: Date): Promise<{ to: string; subject: string; text: string } | null> {
  if (user.emailVerifiedAt) return null;
  if (!(await hitRateLimit(store, LIMIT, user.id, now)).allowed) return null;
  const lang = user.language === "ar" || user.language === "tr" ? user.language : "en";
  const link = `${appUrl()}/confirm-email?lang=${lang}&token=${emailConfirmToken(user, now)}`;
  const fill = (text: string) => text.replace("{name}", user.name).replace("{email}", user.email).replace("{link}", link);
  return { to: user.email, subject: WORDS[lang].subject, text: fill(WORDS[lang].body) };
}

export type ConfirmResult = { ok: true; user: User } | { ok: false; reason: "invalid" | "expired" | "used" };

/** Records the email as theirs, once; a link for another email, or past its 24 hours, does nothing. */
export async function confirmEmail(store: DataStore, token: string, now: Date): Promise<ConfirmResult> {
  const [payload = "", signature = ""] = token.split(".");
  if (!payload || !safeEqual(signature, sign(payload))) return { ok: false, reason: "invalid" };
  let claims: { u?: unknown; e?: unknown; x?: unknown };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof claims;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof claims.u !== "string" || typeof claims.e !== "string" || typeof claims.x !== "number") return { ok: false, reason: "invalid" };
  if (claims.x <= now.getTime()) return { ok: false, reason: "expired" };
  const user = await store.getUserById(claims.u);
  if (!user || user.email.toLowerCase() !== claims.e) return { ok: false, reason: "invalid" };
  if (user.emailVerifiedAt) return { ok: false, reason: "used" };
  await store.updateUser(user.id, { emailVerifiedAt: now }, now);
  return { ok: true, user: { ...user, emailVerifiedAt: now } };
}
