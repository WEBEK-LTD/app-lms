import type { App, Client, User } from "../data/types";
import { reviewNotesFor } from "./review-notes";
import { reviewSignIn } from "./review-account";

/**
 * 102.2 The reviewers' sign-in, sent to the pipeline with the build's keys
 * (`app_review` in GET /builds/{id}/secrets, docs/api/pipeline.yaml) so each
 * iOS build that uploads with the client's App Store Connect key sets the
 * version's App Review Information itself. Google Play has no API for App
 * access: that stays with Yallapp's team (Admin › Publishing).
 *
 * The contact Apple calls is the client: first and last name from the
 * account's name, the phone from its WhatsApp number, the email from the
 * app's support email, else the account's email. Missing ones are null and
 * App Store Connect keeps what it has.
 */
export interface AppReviewSecret {
  kind: "code" | "account";
  /** The phone number, email or user name the reviewers type. */
  demo_user: string;
  /** The fixed code or the account's password. */
  demo_password: string;
  /** The owner's notes for the reviewers (the account's and Publishing's), in English; null for none. */
  notes: string | null;
  contact: { first_name: string | null; last_name: string | null; phone: string | null; email: string | null };
}

/** Apple's limit on App Review notes. */
export const APP_REVIEW_NOTES_MAX = 4000;

function contactOf(app: Pick<App, "supportEmail">, client: Pick<Client, "whatsapp"> | null, user: Pick<User, "name" | "email"> | null): AppReviewSecret["contact"] {
  const words = (user?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const digits = (client?.whatsapp ?? "").replace(/[\s().-]/g, "");
  const phone = /^\+?[1-9]\d{7,14}$/.test(digits) ? (digits.startsWith("+") ? digits : `+${digits}`) : null;
  const email = app.supportEmail?.trim() || user?.email?.trim() || null;
  return {
    first_name: words[0] ?? null,
    last_name: words.length > 1 ? words.slice(1).join(" ") : null,
    phone,
    email,
  };
}

/** The payload, or null when the app has no review sign-in yet (the build then leaves App Review as it is). */
export function appReviewSecret(
  app: App,
  key: Buffer,
  context: { listingNotes: string | null; client: Pick<Client, "whatsapp"> | null; user: Pick<User, "name" | "email"> | null },
): AppReviewSecret | null {
  const signIn = reviewSignIn(app, key);
  if (!signIn) return null;
  const notes = [signIn.notes, reviewNotesFor(app, context.listingNotes)]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
  return {
    kind: signIn.kind,
    demo_user: signIn.who,
    demo_password: signIn.secret,
    notes: notes ? notes.slice(0, APP_REVIEW_NOTES_MAX) : null,
    contact: contactOf(app, context.client, context.user),
  };
}
