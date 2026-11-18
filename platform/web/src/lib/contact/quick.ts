import type { Lang } from "@/i18n/config";
import type { ContactSide } from "../data/types";

/**
 * 184 The quick replies on a courier job's chat. They're sent as codes, so
 * each side reads them in its own language: a customer writing in Arabic and
 * a courier reading in English see the same reply. The customer's are the
 * ones the owner named ("Leave it at the door", "Call me"); the courier's say
 * where they are.
 */
export const QUICK_REPLIES = {
  customer: ["leave_at_door", "call_me", "ring_bell", "coming_down"],
  courier: ["at_door", "downstairs", "call_me", "five_minutes", "left_at_door"],
} as const satisfies Record<ContactSide, readonly string[]>;

export type QuickReply = (typeof QUICK_REPLIES)[ContactSide][number];

const WORDS: Record<QuickReply, Record<Lang, string>> = {
  leave_at_door: { en: "Leave it at the door", ar: "اتركه عند الباب", tr: "Kapıya bırakın" },
  call_me: { en: "Call me", ar: "اتصل بي", tr: "Beni arayın" },
  ring_bell: { en: "Please ring the bell", ar: "يُرجى قرع الجرس", tr: "Lütfen zile basın" },
  coming_down: { en: "I'm coming down", ar: "سأنزل إليك الآن", tr: "Aşağı iniyorum" },
  at_door: { en: "I'm at the door", ar: "أنا عند الباب", tr: "Kapıdayım" },
  downstairs: { en: "I'm downstairs", ar: "أنا أسفل المبنى", tr: "Aşağıdayım" },
  five_minutes: { en: "I'm 5 minutes away", ar: "سأصل خلال 5 دقائق", tr: "5 dakikaya oradayım" },
  left_at_door: { en: "I've left it at the door", ar: "تركته عند الباب", tr: "Kapıya bıraktım" },
};

/** Whether `code` is one of this side's quick replies. */
export function isQuickReply(side: ContactSide, code: unknown): code is QuickReply {
  return typeof code === "string" && (QUICK_REPLIES[side] as readonly string[]).includes(code);
}

/** A quick reply's words in a language (English for one the server doesn't know). */
export function quickWords(code: string, lang: Lang): string {
  return WORDS[code as QuickReply]?.[lang] ?? WORDS[code as QuickReply]?.en ?? code;
}
