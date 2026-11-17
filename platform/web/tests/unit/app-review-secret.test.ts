import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { buildSecrets, keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { APP_REVIEW_NOTES_MAX, appReviewSecret } from "@/lib/publishing/app-review-secret";
import { encryptReviewAccount } from "@/lib/publishing/review-account";
import { DONATIONS_REVIEW_NOTE } from "@/lib/publishing/review-notes";
import { KEY, NOW } from "./helpers";

/** 102.2 The reviewers' sign-in sent to the pipeline for the App Store's App Review Information. */
describe("102.2 the review sign-in for the pipeline", () => {
  const site = (patch: Partial<App> = {}): App => ({ ...newApp("c1", "https://academy.test", NOW, "lms"), backend: "wordpress", ...patch });
  const hosted = (patch: Partial<App> = {}) =>
    site({ backend: "hosted", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewPhone: "+905320000000", reviewCode: "246810" }, ...patch });
  const owner = { client: { whatsapp: "905321112233" }, user: { name: "Layla Ahmed Hassan", email: "layla@academy.test" } };

  it("sends the fixed code with the owner's contact for apps Yallapp signs in", () => {
    expect(appReviewSecret(hosted({ supportEmail: "help@academy.test" }), KEY, { listingNotes: "Open My courses.", ...owner })).toEqual({
      kind: "code",
      demo_user: "+905320000000",
      demo_password: "246810",
      notes: "Open My courses.",
      contact: { first_name: "Layla", last_name: "Ahmed Hassan", phone: "+905321112233", email: "help@academy.test" },
    });
  });

  it("sends the site's account with its notes and Publishing's, and the account email without a support email", () => {
    const app = site();
    const saved = { ...app, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewAccount: encryptReviewAccount(app.id, { username: "review@academy.test", password: "s3cret pass", notes: "Try a free course." }, KEY, NOW) } };
    expect(appReviewSecret(saved, KEY, { listingNotes: "No payments in the app.", ...owner })).toMatchObject({
      kind: "account",
      demo_user: "review@academy.test",
      demo_password: "s3cret pass",
      notes: "Try a free course.\n\nNo payments in the app.",
      contact: { email: "layla@academy.test" },
    });
  });

  it("leaves out contact fields it doesn't have, uses the suggested notes, and keeps Apple's limit", () => {
    const secret = appReviewSecret(hosted({ appType: "donations" }), KEY, { listingNotes: null, client: { whatsapp: "not a number" }, user: { name: "Layla", email: "" } });
    expect(secret?.contact).toEqual({ first_name: "Layla", last_name: null, phone: null, email: null });
    expect(secret?.notes).toBe(DONATIONS_REVIEW_NOTE);
    expect(appReviewSecret(hosted(), KEY, { listingNotes: null, client: null, user: null })).toMatchObject({
      notes: null,
      contact: { first_name: null, last_name: null, phone: null, email: null },
    });
    expect(appReviewSecret(hosted(), KEY, { listingNotes: "n".repeat(5000), ...owner })?.notes).toHaveLength(APP_REVIEW_NOTES_MAX);
  });

  it("is null without a review sign-in", () => {
    expect(appReviewSecret(site(), KEY, { listingNotes: "Notes", ...owner })).toBeNull();
    expect(appReviewSecret(site({ backend: "hosted" }), KEY, { listingNotes: null, ...owner })).toBeNull();
  });

  it("goes only to builds that upload with the client's App Store Connect key", () => {
    const base = hosted();
    const keyed = { ...base, ascIssuerId: "69a6de7e-0000-4000-8000-000000000000", ascKeyId: "2X9R4HXF34", ascPrivateKeyEncrypted: encrypt("not a pem", KEY, keyContext.appStore(base.id)) };
    const appReview = (app: App, key: Buffer) => appReviewSecret(app, key, { listingNotes: null, ...owner });
    expect(buildSecrets(keyed, KEY, { autoPublish: true, appReview }).app_review).toMatchObject({ kind: "code", demo_password: "246810" });
    expect(buildSecrets(keyed, KEY, { autoPublish: false, appReview }).app_review).toBeNull();
    expect(buildSecrets(keyed, KEY, { autoPublish: true, ios: false, appReview }).app_review).toBeNull();
    expect(buildSecrets(base, KEY, { autoPublish: true, appReview }).app_review).toBeNull();
    expect(buildSecrets(keyed, KEY, { autoPublish: true }).app_review).toBeNull();
  });
});
