import type { DataStore } from "../data/store";
import type { App, DemoPurgeCounts, ListingInquiry } from "../data/types";
import { listDemoApps } from "./apps";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_USER_NAME, demoIdOf } from "./constants";
import { refreshSchoolDay } from "./school";
import { cleanDemoTeacher } from "./teachers";

/**
 * Keeping the demo apps tidy (roadmap 16). Visitors share one account in
 * each demo app, so what they add (orders, bookings, messages, favorites,
 * enrolments, progress; 110.5 a teacher's courses, follows and teacher
 * reviews, what they wrote as the school's teacher) is deleted a day later
 * by the daily job, and their phones are signed out after a day without use.
 */

export interface DemoCleanupReport {
  /** Demo apps cleaned. */
  apps: number;
  /** Rows deleted across them. */
  deleted: number;
}

const total = (counts: DemoPurgeCounts) => Object.values(counts).reduce((sum, n) => sum + n, 0);

/** The daily job's part: only the demo account's demo apps, never another app. */
export async function cleanDemoActivity(store: DataStore, now: Date): Promise<DemoCleanupReport> {
  const before = new Date(now.getTime() - DEMO_RETENTION_HOURS * 3_600_000);
  const report: DemoCleanupReport = { apps: 0, deleted: 0 };
  for (const app of await listDemoApps(store, { fresh: true })) {
    if (app.demo !== true) continue;
    report.deleted += total(await store.purgeDemoActivity(app.id, before));
    // 110.5 What the visitor made as the school's teacher and as the academy's demo teacher; the school day dated from today.
    const id = demoIdOf(app);
    if (id === "school") report.deleted += await refreshSchoolDay(store, app, now);
    if (id === "instructors") report.deleted += await cleanDemoTeacher(store, app, now);
    // The shared account goes back to its name, should anything have changed it.
    const user = await store.getHostedUserByPhone(app.id, DEMO_SIGN_IN.e164);
    if (user && (user.name !== DEMO_USER_NAME || user.email !== null || user.city !== null)) {
      await store.updateHostedUser(app.id, user.id, { name: DEMO_USER_NAME, email: null, city: null }, now);
    }
    report.apps++;
  }
  return report;
}

export const DEMO_OFFICE_REPLY =
  "Thanks for your message! This is a demo office, so nobody reads it. In your own app, your team answers from the Yallapp dashboard and the reply arrives here and as a notification.";

/** A demo real estate office answers each conversation once, at once, so visitors see how a reply looks. */
export async function demoOfficeReply(store: DataStore, app: Pick<App, "id" | "demo">, inquiry: Pick<ListingInquiry, "id">, now: Date): Promise<void> {
  if (!app.demo) return;
  const messages = await store.listListingInquiryMessages(app.id, inquiry.id);
  if (messages.some((m) => m.from === "office")) return;
  const last = messages.reduce((latest, m) => Math.max(latest, m.createdAt.getTime()), now.getTime());
  await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "office", text: DEMO_OFFICE_REPLY, createdAt: new Date(last + 1000) });
}
