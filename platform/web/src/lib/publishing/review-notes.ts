import type { App } from "../data/types";

/**
 * 29 What store reviewers need to know about the app's kind, added to the
 * notes for them when the client hasn't written their own. Charity apps:
 * donations happen in the browser on iPhone (App Store guideline
 * 3.2.2(iv)), so the reviewer doesn't look for an in-app payment.
 */
export const DONATIONS_REVIEW_NOTE =
  "Donations: this app doesn't take donations inside the iPhone app. The “Donate on our website” button opens the charity's donation page in Safari (App Store guideline 3.2.2(iv)); the payment happens there, into the charity's own payment account. The app has no in-app purchases.";

export function suggestedReviewNotes(app: Pick<App, "appType">): string | null {
  return app.appType === "donations" ? DONATIONS_REVIEW_NOTE : null;
}

/** The notes as saved, else the suggested ones (empty when there are none). */
export function reviewNotesFor(app: Pick<App, "appType">, saved: string | null): string {
  return saved ?? suggestedReviewNotes(app) ?? "";
}
