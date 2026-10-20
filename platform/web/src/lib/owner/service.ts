import { knownTranslator } from "@/i18n/dashboard";
import { localePath } from "@/i18n/paths";
import * as account from "./account";
import { authenticateRequest, refresh, signIn } from "./auth";
import * as catalog from "./catalog";
import { errorBody, match, notAllowed, notFound, OwnerError, route, type OwnerDeps, type OwnerRequest, type OwnerResult, type Route } from "./http";
import * as insights from "./insights";
import { acceptedLang, ownerLang } from "./lang";
import * as library from "./library";
import * as community from "./community";
import * as members from "./members";
import * as sales from "./sales";
import * as team from "./team";
import { teamCan } from "../team/permissions";
import { getPlans } from "../settings/platform";

/**
 * 58 The Owner API (docs/api/owner.yaml), the server side of Yallapp
 * Business: `https://yallapp.com.tr/api/owner/v1/…`. Sign-in, renewing and
 * the password link answer without a token; everything else needs the
 * access token of a signed-in device, and every `/apps/{app_id}` path only
 * the client's own apps.
 */

const ROUTES: Route[] = [
  route("POST", "auth/sign-out", account.signOut, { anyState: true }),
  route("POST", "auth/sign-out-all", account.signOutAll, { anyState: true }),
  route("GET", "me", account.getMe, { anyState: true }),
  route("PUT", "me/language", account.setLanguage, { anyState: true }),
  // 60 Someone on several businesses works on another one.
  route("PUT", "me/business", account.setBusiness, { anyState: true }),
  route("GET", "me/devices", account.listDevices, { anyState: true }),
  route("DELETE", "me/devices/:device_id", account.signOutDevice, { anyState: true }),
  route("PUT", "me/push-token", account.setPushToken, { anyState: true }),
  route("DELETE", "me/push-token", account.deletePushToken, { anyState: true }),
  route("GET", "me/push-preferences", account.getPushPreferences, { anyState: true }),
  route("PUT", "me/push-preferences", account.setPushPreferences, { anyState: true }),
  route("GET", "updates", account.listUpdates),
  route("POST", "updates/read", account.markUpdates),
  route("GET", "apps/:app_id", async (ctx, params) => {
    const { app } = sales.appScope(ctx, params.app_id);
    return { status: 200, body: account.appSummaryJson(ctx, app, await getPlans(ctx.deps.store)) };
  }),
  route("GET", "apps/:app_id/today", sales.today),
  route("GET", "apps/:app_id/orders", sales.listOrders),
  route("GET", "apps/:app_id/orders/:order_id", sales.getOrder),
  route("POST", "apps/:app_id/orders/:order_id/status", sales.changeOrder),
  route("POST", "apps/:app_id/orders/:order_id/refunds", sales.refund),
  route("GET", "apps/:app_id/appointments", sales.listAppointments),
  route("POST", "apps/:app_id/appointments/:appointment_id/status", sales.changeAppointment),
  route("GET", "apps/:app_id/appointments/:appointment_id/times", sales.listRescheduleTimes),
  route("POST", "apps/:app_id/appointments/:appointment_id/reschedule", sales.rescheduleOne),
  route("GET", "apps/:app_id/events", sales.listEvents),
  route("POST", "apps/:app_id/check-in", sales.checkInTicket),
  route("GET", "apps/:app_id/donations", sales.listDonations),
  route("GET", "apps/:app_id/products", catalog.listProducts),
  route("PATCH", "apps/:app_id/products/:product_id", catalog.updateProduct),
  route("GET", "apps/:app_id/courses", catalog.listCourses),
  route("PATCH", "apps/:app_id/courses/:course_id", catalog.updateCourse),
  route("POST", "apps/:app_id/courses/:course_id/topics/:topic_id/lessons", catalog.addLesson),
  route("GET", "apps/:app_id/articles", catalog.listArticles),
  route("PATCH", "apps/:app_id/articles/:article_id", catalog.updateArticle),
  route("GET", "apps/:app_id/listings", catalog.listListings),
  route("PATCH", "apps/:app_id/listings/:listing_id", catalog.updateListing),
  route("GET", "apps/:app_id/media", library.listMedia),
  route("POST", "apps/:app_id/media/uploads", library.startMediaUpload),
  route("POST", "apps/:app_id/media/uploads/:media_id/resume", library.resumeMediaUpload),
  route("POST", "apps/:app_id/media/uploads/:media_id/complete", library.completeMediaUpload),
  route("DELETE", "apps/:app_id/media/:media_id", library.deleteMediaFile),
  route("GET", "apps/:app_id/inquiries", library.listInquiries),
  route("GET", "apps/:app_id/inquiries/:inquiry_id", library.getInquiry),
  route("POST", "apps/:app_id/inquiries/:inquiry_id/replies", library.replyInquiry),
  // 63 Course questions and reviews, and a gym's members at the door.
  route("GET", "apps/:app_id/questions", community.listQuestions),
  route("GET", "apps/:app_id/questions/:question_id", community.getQuestion),
  route("POST", "apps/:app_id/questions/:question_id/answers", community.answerQuestion),
  route("GET", "apps/:app_id/reviews", community.listReviews),
  route("PATCH", "apps/:app_id/reviews/:review_id", community.updateReview),
  route("PUT", "apps/:app_id/reviews/:review_id/reply", community.replyReview),
  route("DELETE", "apps/:app_id/reviews/:review_id/reply", community.deleteReviewReply),
  route("GET", "apps/:app_id/members", members.listMembers),
  route("POST", "apps/:app_id/members/check-in", members.checkInMember),
  route("GET", "apps/:app_id/members/check-ins", members.listCheckIns),
  // 64 Frozen memberships; hiding a question or an answer.
  route("PUT", "apps/:app_id/members/:membership_id/freeze", members.freezeMember),
  route("DELETE", "apps/:app_id/members/:membership_id/freeze", members.unfreezeMember),
  route("PATCH", "apps/:app_id/questions/:question_id", community.updateQuestion),
  route("PATCH", "apps/:app_id/questions/:question_id/answers/:answer_id", community.updateAnswer),
  route("GET", "apps/:app_id/users", library.listAppUsers),
  route("GET", "apps/:app_id/analytics", insights.analytics),
  route("GET", "apps/:app_id/notifications", insights.listNotifications),
  route("POST", "apps/:app_id/notifications", insights.sendNotification),
  route("GET", "apps/:app_id/notifications/scheduled", insights.listScheduled),
  route("POST", "apps/:app_id/notifications/scheduled", insights.schedule),
  route("PUT", "apps/:app_id/notifications/scheduled/:scheduled_id", insights.editScheduled),
  route("DELETE", "apps/:app_id/notifications/scheduled/:scheduled_id", insights.cancelScheduled),
  route("POST", "apps/:app_id/preview", insights.preview),
  route("GET", "apps/:app_id/builds", insights.builds),
  route("GET", "apps/:app_id/license", insights.license, { permission: "billing" }),
  // 60 The owner's team.
  route("GET", "team", team.getTeam, { permission: "team" }),
  route("POST", "team/invitations", team.invite, { permission: "team" }),
  route("POST", "team/invitations/:invitation_id/resend", team.resend, { permission: "team" }),
  route("DELETE", "team/invitations/:invitation_id", team.cancel, { permission: "team" }),
  route("PATCH", "team/members/:user_id", team.update, { permission: "team" }),
  route("DELETE", "team/members/:user_id", team.remove, { permission: "team" }),
];

/** Paths that answer without a token. */
async function open(deps: OwnerDeps, req: OwnerRequest): Promise<OwnerResult | null> {
  const path = req.path.join("/");
  if (path === "auth/sign-in" && req.method === "POST") return signIn(deps, req);
  if (path === "auth/refresh" && req.method === "POST") return refresh(deps, req);
  if (path === "auth/password-reset" && req.method === "GET") {
    return { status: 200, body: { url: `${deps.baseUrl}${localePath(ownerLang(null, acceptedLang(req.acceptLanguage)), "/forgot-password")}` } };
  }
  if (path === "auth/sign-in" || path === "auth/refresh" || path === "auth/password-reset") throw new OwnerError(405, "method_not_allowed", "The request isn't valid.");
  return null;
}

export async function handleOwner(deps: OwnerDeps, req: OwnerRequest): Promise<OwnerResult> {
  // Before sign-in, the request's language; after it, the person's.
  let k = knownTranslator(ownerLang(null, acceptedLang(req.acceptLanguage)));
  try {
    const answered = await open(deps, req);
    if (answered) return answered;
    const found = match(ROUTES, req.method, req.path);
    if (found === 404) throw new OwnerError(404, "not_found", "Not found.");
    if (found === 405) throw new OwnerError(405, "method_not_allowed", "The request isn't valid.");
    const ctx = await authenticateRequest(deps, req);
    k = ctx.k;
    if (!found.route.anyState) account.requireActive(ctx);
    // 60 What the route needs, on its app when it has one (an app outside the person's apps is 404, as another client's).
    const permission = found.route.permission;
    if (permission) {
      const appId = found.params.app_id;
      if (appId && !ctx.apps.some((a) => a.id === appId)) throw notFound();
      if (!teamCan(ctx.access, permission, appId)) throw notAllowed();
    }
    return await found.route.handler(ctx, found.params);
  } catch (error) {
    if (error instanceof OwnerError) return errorBody(error, k);
    throw error;
  }
}
