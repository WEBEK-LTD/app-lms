import type { DataStore } from "../data/store";
import type { App, CourierHubSetting } from "../data/types";
import { demoAppOfType } from "../demo/apps";
import { normalizeEmail } from "../hosted/sign-in-methods";
import { parseAnyPhone } from "../hosted/phone";
import { platformSetting } from "../settings/platform";

/**
 * 104.8.2 The stores' reviewers sign in to Yallapp Courier with the review
 * number (or email) and fixed code of Admin › Settings › Yallapp Courier:
 * no message is sent, and their one company is Studio's demo delivery
 * company, where they are its review account's courier ("App Review", 104.7)
 * with a sample job whenever they have none.
 */

export const NO_COURIER_HUB_SETTING: CourierHubSetting = { reviewPhone: null, reviewEmail: null, reviewCode: null, playUrl: null, appStoreUrl: null };

/** Admin › Settings › Yallapp Courier, or nothing set. */
export async function courierHubSetting(store: DataStore, options: { fresh?: boolean } = {}): Promise<CourierHubSetting> {
  return { ...NO_COURIER_HUB_SETTING, ...((await platformSetting(store, "courierHub", options))?.value ?? {}) };
}

/** The review account as Yallapp Courier keeps an account (E.164, lowercase), when it has a code. */
export function hubReviewWho(setting: CourierHubSetting): { phone: string | null; email: string | null } | null {
  if (!setting.reviewCode) return null;
  const phone = setting.reviewPhone ? (parseAnyPhone(setting.reviewPhone, "")?.e164 ?? null) : null;
  const email = phone ? null : normalizeEmail(setting.reviewEmail);
  return phone || email ? { phone, email } : null;
}

/** Whether the account is the reviewers'. */
export function isHubReview(setting: CourierHubSetting, who: { phone: string | null; email: string | null }): boolean {
  const review = hubReviewWho(setting);
  if (!review) return false;
  return who.phone ? who.phone === review.phone : who.email !== null && who.email === review.email;
}

/** The reviewers' company: Studio's demo delivery company, once the team made the demos. */
export async function hubReviewCompany(store: DataStore): Promise<App | null> {
  const app = await demoAppOfType(store, "delivery");
  return app?.demo === true && app.hostedSettings?.reviewCode ? app : null;
}

/**
 * 104.8.3 The notes for Yallapp Courier's own listing (Google Play › App
 * access, App Store › App Review Information), in English as the reviewers
 * read them; null until the review account is set.
 */
export function hubReviewNotes(setting: CourierHubSetting, company: string | null): string | null {
  const who = hubReviewWho(setting);
  if (!who) return null;
  const login = who.phone ? `the phone number ${who.phone}` : `the email ${who.email}`;
  return [
    "Yallapp Courier is the app couriers of delivery companies on Yallapp work in. A company adds its couriers by mobile number (or email); each courier signs in with it and a one-time code, then picks the company to work for.",
    `Sign in with ${login} and the code ${setting.reviewCode} (no message is sent to it).`,
    `This account is a test courier of ${company ?? "Yallapp's demo delivery company"}, the only company in its list. A sample job is waiting in My jobs (another appears once it is done). Turn on duty, open the job, then move it on: Picked up, On the way, Delivered (the position is shared only while a parcel is on the way, and only while the screen is open).`,
  ].join("\n\n");
}

/** The store links Admin › Settings takes: Google Play's and the App Store's own pages. */
const STORE_LINK = { play: /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+(&[\w=.-]*)*$/, appStore: /^https:\/\/apps\.apple\.com\/[\w/.-]*app\/[\w./-]*id\d+(\?[\w=&.-]*)?$/ };

/** 104.8.2 Admin › Settings › Yallapp Courier's form: the review number or email with its 6-digit code, and (104.8.3) the store links. */
export function parseCourierHubSetting(values: Record<string, string>): { ok: true; value: CourierHubSetting } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const phoneRaw = (values.reviewPhone ?? "").trim();
  const emailRaw = (values.reviewEmail ?? "").trim();
  const reviewCode = (values.reviewCode ?? "").trim();
  const phone = phoneRaw ? parseAnyPhone(phoneRaw, "") : null;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (phoneRaw && !phone) errors.reviewPhone = "Enter the number with its country code, like +20 100 123 4567.";
  if (emailRaw && !email) errors.reviewEmail = "Enter a valid email address.";
  if (phoneRaw && emailRaw) errors.reviewEmail = "Enter a number or an email address, not both.";
  if ((phoneRaw || emailRaw) && !/^\d{6}$/.test(reviewCode)) errors.reviewCode = "Enter the 6-digit code reviewers type.";
  if (!phoneRaw && !emailRaw && reviewCode) errors.reviewPhone = "Enter the number or email address reviewers sign in with, or clear the code.";
  const playUrl = (values.playUrl ?? "").trim();
  const appStoreUrl = (values.appStoreUrl ?? "").trim();
  if (playUrl && !STORE_LINK.play.test(playUrl)) errors.playUrl = "Enter the app's Google Play address, like https://play.google.com/store/apps/details?id=tr.com.yallapp.courier.";
  if (appStoreUrl && !STORE_LINK.appStore.test(appStoreUrl)) errors.appStoreUrl = "Enter the app's App Store address, like https://apps.apple.com/app/yallapp-courier/id1234567890.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      reviewPhone: phone?.e164 ?? null,
      reviewEmail: email,
      reviewCode: phone || email ? reviewCode : null,
      playUrl: playUrl || null,
      appStoreUrl: appStoreUrl || null,
    },
  };
}
