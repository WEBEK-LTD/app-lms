import type { DataStore } from "../data/store";
import type { App, HostedUser, Teacher } from "../data/types";
import { isReviewCourier, isReviewUser, REVIEW_COURIER_NAME } from "../delivery/review";

/**
 * 105.3 The store reviewers try both sides of an academy with many teachers
 * with the app's review number (or email) from App sign-in: as a student
 * they browse the teachers and courses; as a teacher ("App Review", made the
 * first time they sign in) they see the Teacher tab, make a course and send
 * it for review. Students never see the review teacher in the list of
 * teachers, and its courses wait for the academy like any other.
 */

/** Whether the teacher is the reviewers' (their number or email is the review account's). */
export function isReviewTeacher(app: Pick<App, "hostedSettings">, teacher: Pick<Teacher, "phone" | "email">): boolean {
  return isReviewCourier(app, teacher);
}

/** The review teacher, made the first time the reviewers sign in; null for anyone else. */
export async function reviewTeacherFor(store: DataStore, app: Pick<App, "id" | "hostedSettings">, user: HostedUser, now: Date): Promise<Teacher | null> {
  if (!isReviewUser(app, user)) return null;
  const who = user.phone ? { phone: user.phone, email: null } : { phone: null, email: user.email?.toLowerCase() ?? null };
  const found = await store.findTeacher(app.id, who);
  if (found) return found;
  const made = await store.createTeacher(
    {
      appId: app.id,
      name: REVIEW_COURIER_NAME,
      phone: who.phone,
      email: who.email,
      userId: user.id,
      photoAssetId: null,
      bio: "The store reviewers' test teacher.",
      subjects: [],
      status: "active",
      // The reviewers' sales are test sales: no share.
      shareBp: 0,
      featured: false,
    },
    now,
  );
  return made.ok ? made.teacher : store.findTeacher(app.id, who);
}
