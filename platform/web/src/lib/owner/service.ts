import { knownTranslator } from "@/i18n/dashboard";
import { localePath } from "@/i18n/paths";
import * as account from "./account";
import { authenticateRequest, refresh, signIn } from "./auth";
import * as catalog from "./catalog";
import { errorBody, match, OwnerError, route, type OwnerDeps, type OwnerRequest, type OwnerResult, type Route } from "./http";
import * as insights from "./insights";
import { acceptedLang, ownerLang } from "./lang";
import * as library from "./library";
import * as sales from "./sales";
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
  route("GET", "apps/:app_id/users", library.listAppUsers),
  route("GET", "apps/:app_id/analytics", insights.analytics),
  route("GET", "apps/:app_id/notifications", insights.listNotifications),
  route("POST", "apps/:app_id/notifications", insights.sendNotification),
  route("POST", "apps/:app_id/preview", insights.preview),
  route("GET", "apps/:app_id/builds", insights.builds),
  route("GET", "apps/:app_id/license", insights.license),
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
    return await found.route.handler(ctx, found.params);
  } catch (error) {
    if (error instanceof OwnerError) return errorBody(error, k);
    throw error;
  }
}
