import { wordsOf } from "../app/kinds";
import type { App, PublishingListing } from "../data/types";
import { reviewCodeWho, reviewSignInKind } from "./review-account";
import { listingMissing } from "./steps";

/**
 * 88.1 Ready to submit: one look at what Google Play and the App Store ask
 * before they accept an app. Each item is fine ("ok"), stops the review
 * ("missing", with where to fix it) or is for the owner to know ("note").
 * The words are keys of the Publishing page's `ready` texts, in the
 * dashboard's language; the listing's missing items are the known texts of
 * `listingMissing`.
 */

export type ReadyKey = "review" | "privacy" | "deletion" | "ios" | "listing" | "screenshots";
export type ReadyState = "ok" | "missing" | "note";

export interface ReadyItem {
  key: ReadyKey;
  state: ReadyState;
  /** The text, a key of `publishing.ready`. */
  text: string;
  values?: Record<string, string | number>;
  /** The listing's missing items (English known texts). */
  items?: string[];
  /** Where to fix it or read it. */
  link?: string;
}

/** What the Listing step of App setup holds; the rest is on the Publishing page. */
const SETUP_ITEMS = ["App name on the stores", "Short description", "Full description", "Support email"];

/** Google Play asks for 2 to 8 phone screenshots; the App Store for 1 to 10 at 6.9 inches. */
export const PLAY_SCREENSHOTS_MIN = 2;
export const IPHONE_SCREENSHOTS_MIN = 1;

export interface ReadyInput {
  app: App;
  /** The listing details from the request to publish for the client; null when publishing themselves. */
  listing: PublishingListing | null;
  /** Whether the iPhone app goes to the App Store (the plan has it). */
  ios: boolean;
  /** Yallapp's team publishes it (and takes the screenshots when there are none). */
  managed: boolean;
  /** The platform's address, for the app's account deletion page. */
  platformUrl: string;
}

/** The page where the app's users can ask to delete their account without the app (Google Play's Data safety form asks for it). */
export function accountDeletionUrl(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/a/${appId}/delete-account`;
}

export function readiness({ app, listing, ios, managed, platformUrl }: ReadyInput): ReadyItem[] {
  const out: ReadyItem[] = [];
  // 102 Reviewers sign in without a code sent to them: the fixed review number or email of App sign-in, or the account the owner made for them.
  if (reviewSignInKind(app) === "code") {
    const who = reviewCodeWho(app);
    out.push(
      who
        ? { key: "review", state: "ok", text: "reviewOk", values: { who } }
        : { key: "review", state: "missing", text: "reviewMissing", link: "/dashboard/app-sign-in" },
    );
  } else {
    const account = app.hostedSettings?.reviewAccount;
    out.push(
      account
        ? { key: "review", state: "ok", text: "reviewAccountOk", values: { who: account.username } }
        : { key: "review", state: "missing", text: "reviewAccountMissing", link: REVIEW_LINK },
    );
  }

  // A privacy policy on a public https page.
  if (!app.privacyUrl) out.push({ key: "privacy", state: "missing", text: "privacyMissing", link: "/dashboard/setup?step=listing" });
  else if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(app.privacyUrl)) out.push({ key: "privacy", state: "missing", text: "privacyHttps", link: "/dashboard/setup?step=listing" });
  else out.push({ key: "privacy", state: "ok", text: "privacyOk", values: { url: app.privacyUrl } });

  // Deleting an account: in the app (Account screen) and on a page without it.
  out.push({ key: "deletion", state: "ok", text: "deletionOk", values: { url: accountDeletionUrl(platformUrl, app.id) } });

  // No prices on iPhone: the app follows Apple's rule for its kind.
  if (ios) {
    const rule = wordsOf(app).iphone;
    out.push({ key: "ios", state: "ok", text: rule ? "iosRule" : "iosOk", ...(rule ? { values: { rule } } : {}) });
  }

  // The listing: texts, support email and, publishing for the client, the categories (the privacy page is above).
  const asked = listing ?? { playCategory: "-", appStoreCategory: "-", contentRatingNotes: "-", reviewNotes: null };
  const missing = listingMissing(app, asked).filter((item) => item !== "Privacy policy URL");
  out.push(
    missing.length
      ? { key: "listing", state: "missing", text: "listingMissing", items: missing, link: missing.some((item) => SETUP_ITEMS.includes(item)) ? "/dashboard/setup?step=listing" : "#h-listing" }
      : { key: "listing", state: "ok", text: listing ? "listingOk" : "listingOkSelf" },
  );

  // Screenshots: Google Play's phone ones, the App Store's iPhone ones.
  const play = app.phoneScreenshotIds.length;
  const apple = app.iphoneScreenshotIds.length;
  const short = play < PLAY_SCREENSHOTS_MIN || (ios && apple < IPHONE_SCREENSHOTS_MIN);
  if (!short) out.push({ key: "screenshots", state: "ok", text: ios ? "shotsOk" : "shotsOkAndroid", values: { play, apple } });
  else if (managed) out.push({ key: "screenshots", state: "note", text: "shotsWeTake", values: { play, apple }, link: "/dashboard/setup?step=listing" });
  else out.push({ key: "screenshots", state: "missing", text: ios ? "shotsMissing" : "shotsMissingAndroid", values: { play, apple, playMin: PLAY_SCREENSHOTS_MIN }, link: "/dashboard/setup?step=listing" });

  return out;
}

/** 102 Where the owner enters the account for the store reviewers. */
export const REVIEW_LINK = "/dashboard/publishing#h-review";

/** Ready when nothing stops the review. */
export function readyToSubmit(items: readonly ReadyItem[]): boolean {
  return items.every((item) => item.state !== "missing");
}
