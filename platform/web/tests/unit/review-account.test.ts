import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { CONTEXT_TEMPLATES } from "@/lib/jobs/rekey";
import { encryptReviewAccount, hasReviewSignIn, parseReviewAccountForm, reviewAccountContext, reviewAccountPassword, reviewSignIn, reviewSignInKind } from "@/lib/publishing/review-account";
import { KEY, NOW } from "./helpers";

/** 102 The account the store reviewers sign in with, required for every app. */
describe("102 the store review account", () => {
  const site = (patch: Partial<App> = {}): App => ({ ...newApp("c1", "https://academy.test", NOW, "lms"), backend: "wordpress", ...patch });

  it("asks for a user name and a password, and keeps the saved password when it's left empty", () => {
    expect(parseReviewAccountForm({ username: " review@academy.test ", password: "s3cret pass", notes: " Open My courses. " }, false)).toEqual({
      ok: true,
      value: { username: "review@academy.test", password: "s3cret pass", notes: "Open My courses." },
    });
    expect(parseReviewAccountForm({ username: "", password: "", notes: "" }, false)).toEqual({
      ok: false,
      errors: { username: "Enter the user name or email the reviewers sign in with.", password: "Enter the password of this account." },
    });
    expect(parseReviewAccountForm({ username: "review", password: "", notes: "" }, true)).toEqual({ ok: true, value: { username: "review", password: null, notes: null } });
    expect(parseReviewAccountForm({ username: "a\nb", password: "x".repeat(201), notes: "n".repeat(1001) }, false)).toMatchObject({
      ok: false,
      errors: { username: expect.stringContaining("one line"), password: expect.stringContaining("200"), notes: expect.stringContaining("1,000") },
    });
  });

  it("keeps the password encrypted for this app only", () => {
    const app = site();
    const account = encryptReviewAccount(app.id, { username: "review@academy.test", password: "s3cret pass", notes: null }, KEY, NOW);
    expect(account.passwordEncrypted).not.toContain("s3cret");
    expect(reviewAccountPassword(app.id, account, KEY)).toBe("s3cret pass");
    // Another app's context can't read it.
    expect(reviewAccountPassword("another-app", account, KEY)).toBeNull();
    const saved = { ...app, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewAccount: account } };
    expect(hasReviewSignIn(saved)).toBe(true);
    expect(reviewSignIn(saved, KEY)).toEqual({ kind: "account", who: "review@academy.test", secret: "s3cret pass", notes: null });
    expect(hasReviewSignIn(app)).toBe(false);
    expect(reviewSignIn(app, KEY)).toBeNull();
    // A new encryption key moves it too.
    expect(CONTEXT_TEMPLATES).toContain(reviewAccountContext);
  });

  it("uses App sign-in's fixed review number or email where Yallapp signs people in", () => {
    const hosted = site({ backend: "hosted", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewPhone: "+905320000000", reviewCode: "246810" } });
    expect(reviewSignInKind(hosted)).toBe("code");
    expect(reviewSignIn(hosted, KEY)).toEqual({ kind: "code", who: "+905320000000", secret: "246810", notes: null });
    // A review account saved before the app moved to the hosted API doesn't count there.
    const moved = { ...hosted, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewAccount: encryptReviewAccount(hosted.id, { username: "r", password: "p", notes: null }, KEY, NOW) } };
    expect(hasReviewSignIn(moved)).toBe(false);
    expect(reviewSignInKind(site({ backend: "custom_api", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp" } }))).toBe("code");
    expect(reviewSignInKind(site({ backend: "custom_api" }))).toBe("account");
    expect(reviewSignInKind(site({ backend: "setup_requested" }))).toBe("account");
  });
});
