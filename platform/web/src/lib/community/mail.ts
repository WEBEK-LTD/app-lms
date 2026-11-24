/**
 * 231 The community's emails (area A's account emails, area C's
 * notification emails): plain text in the member's language, from Yallapp
 * Community. Tests pass a fake that keeps what was sent.
 */
export interface CommunityMail {
  to: string;
  subject: string;
  text: string;
  /** The same message as HTML (area C's notification emails). */
  html?: string;
}

export type CommunityMailer = (mail: CommunityMail) => Promise<void>;

/** A mailer that keeps what it was given (tests, and local runs without mail set up). */
export function memoryMailer(): CommunityMailer & { sent: CommunityMail[] } {
  const sent: CommunityMail[] = [];
  const mailer = (async (mail: CommunityMail) => {
    sent.push(mail);
  }) as CommunityMailer & { sent: CommunityMail[] };
  mailer.sent = sent;
  return mailer;
}
