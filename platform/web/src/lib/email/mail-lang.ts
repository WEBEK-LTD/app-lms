import { langOf, type Lang } from "@/i18n/config";

/**
 * 56 The options for an email to someone: their language when they chose
 * Arabic or Turkish for the dashboard; nothing for English, the default.
 * Spread as the mailer's last argument (lib/email/send.ts sendTemplate).
 */
export function mailOptions(user: { language?: string | null }): [] | [{ lang: Lang }] {
  const lang = langOf(user.language);
  return lang === "en" ? [] : [{ lang }];
}
