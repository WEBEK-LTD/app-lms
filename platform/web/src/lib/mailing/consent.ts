/**
 * 114 Who said no to marketing emails: the unsubscribe link (and the inbox's
 * own one-click button), the switch in the account's settings, bounces and
 * complaints. One list of addresses, kept forever: an address on it gets no
 * campaign from any account it belongs to. Emails about the account itself
 * (sign-in codes, receipts, plan reminders) are not marketing and still go.
 * The admin's contacts are on the same list: an address a contact unsubscribed
 * gets no campaign as an account either, and the other way round; the contact
 * is marked unsubscribed too (Admin › Email campaigns › Contacts shows it).
 */

import type { DataStore } from "../data/store";
import { readRecipientToken } from "./tokens";
import type { MailLang, MailRecipient } from "./types";

export interface TokenRecipient {
  recipient: MailRecipient;
  lang: MailLang;
}

export async function recipientOfToken(store: DataStore, token: string, secret: string): Promise<TokenRecipient | null> {
  const id = readRecipientToken(token, secret);
  if (id === null) return null;
  const recipient = await store.getMailRecipient(id);
  return recipient ? { recipient, lang: recipient.lang } : null;
}

/** The link's unsubscribe (the page's button or the inbox's one-click POST). Safe to repeat. */
export async function unsubscribeRecipient(store: DataStore, recipient: MailRecipient, now: Date): Promise<void> {
  const already = await store.getMailSuppression(recipient.email);
  if (!already) {
    await store.suppressMail({ email: recipient.email, reason: "unsubscribed", campaignId: recipient.campaignId, createdAt: now });
    await store.addMailEvent({ campaignId: recipient.campaignId, email: recipient.email, kind: "unsubscribe", url: null, at: now });
  }
  await markContactUnsubscribed(store, recipient.email, now);
}

/** The contact with this address (if one is) is marked unsubscribed, once. */
async function markContactUnsubscribed(store: DataStore, email: string, now: Date): Promise<void> {
  const contacts = await store.findMailContacts([email.toLowerCase()]);
  if (contacts.some((c) => !c.unsubscribedAt)) await store.setMailContactUnsubscribed(email, now);
}

/** Undoes an unsubscribe (the page's "Subscribe again"); bounces and complaints stay. */
export async function resubscribe(store: DataStore, email: string): Promise<boolean> {
  const found = await store.getMailSuppression(email);
  if (!found || found.reason !== "unsubscribed") return false;
  await store.unsuppressMail(email);
  await store.setMailContactUnsubscribed(email, null);
  return true;
}

/** Whether the address gets marketing emails (the account settings' switch). */
export async function marketingAllowed(store: DataStore, email: string): Promise<boolean> {
  return (await store.getMailSuppression(email)) === null;
}

/** The account settings' switch. Turning it on again undoes an unsubscribe only, never a bounce. */
export async function setMarketingAllowed(store: DataStore, email: string, allowed: boolean, now: Date): Promise<boolean> {
  if (allowed) {
    await resubscribe(store, email);
    return marketingAllowed(store, email);
  }
  await store.suppressMail({ email: email.toLowerCase(), reason: "unsubscribed", campaignId: null, createdAt: now });
  await markContactUnsubscribed(store, email, now);
  return false;
}

export const UNSUBSCRIBE_TEXT: Record<MailLang, {
  title: string;
  ask: string;
  button: string;
  done: string;
  doneBody: string;
  again: string;
  againDone: string;
  invalid: string;
  test: string;
  note: string;
  /** For a contact (no Yallapp account): no account emails, no settings. */
  doneBodyContact: string;
  noteContact: string;
}> = {
  en: {
    title: "Unsubscribe",
    ask: "Stop getting Yallapp's marketing emails at {email}?",
    button: "Unsubscribe",
    done: "You're unsubscribed",
    doneBody: "{email} won't get Yallapp's marketing emails any more. Emails about your account, like sign-in codes and receipts, still come.",
    again: "Subscribe again",
    againDone: "You're subscribed again. Welcome back.",
    invalid: "This link doesn't work any more. You can turn marketing emails off in your account's settings.",
    test: "This was a test email: its unsubscribe link doesn't do anything.",
    note: "You can change this any time in your account's settings.",
    doneBodyContact: "{email} won't get Yallapp's marketing emails any more.",
    noteContact: "Changed your mind? Subscribe again from this page.",
  },
  ar: {
    title: "إلغاء الاشتراك",
    ask: "هل تريد إيقاف الرسائل التسويقية من Yallapp إلى {email}؟",
    button: "إلغاء الاشتراك",
    done: "تم إلغاء اشتراكك",
    doneBody: "لن تصل الرسائل التسويقية من Yallapp إلى {email} بعد الآن. أما رسائل حسابك، مثل رموز الدخول والإيصالات، فستظل تصلك.",
    again: "الاشتراك مجددًا",
    againDone: "تم الاشتراك مجددًا. مرحبًا بعودتك.",
    invalid: "هذا الرابط لم يعد صالحًا. يمكنك إيقاف الرسائل التسويقية من إعدادات حسابك.",
    test: "كانت هذه رسالة تجريبية: رابط إلغاء الاشتراك فيها لا يفعل شيئًا.",
    note: "يمكنك تغيير ذلك في أي وقت من إعدادات حسابك.",
    doneBodyContact: "لن تصل الرسائل التسويقية من Yallapp إلى {email} بعد الآن.",
    noteContact: "غيّرت رأيك؟ يمكنك الاشتراك مجددًا من هذه الصفحة.",
  },
  tr: {
    title: "Abonelikten çık",
    ask: "{email} adresine Yallapp pazarlama e-postaları gelmesin mi?",
    button: "Abonelikten çık",
    done: "Abonelikten çıktınız",
    doneBody: "{email} adresine artık Yallapp pazarlama e-postaları gelmeyecek. Giriş kodları ve makbuzlar gibi hesabınızla ilgili e-postalar gelmeye devam eder.",
    again: "Yeniden abone ol",
    againDone: "Yeniden abone oldunuz. Tekrar hoş geldiniz.",
    invalid: "Bu bağlantı artık çalışmıyor. Pazarlama e-postalarını hesap ayarlarınızdan kapatabilirsiniz.",
    test: "Bu bir test e-postasıydı: abonelikten çıkma bağlantısı bir şey yapmaz.",
    note: "Bunu istediğiniz zaman hesap ayarlarınızdan değiştirebilirsiniz.",
    doneBodyContact: "{email} adresine artık Yallapp pazarlama e-postaları gelmeyecek.",
    noteContact: "Fikrinizi mi değiştirdiniz? Bu sayfadan yeniden abone olabilirsiniz.",
  },
};
