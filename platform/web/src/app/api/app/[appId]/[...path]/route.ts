import { assetUrl } from "@/lib/assets";
import { storeBillingOn } from "@/lib/store-billing/access";
import { sendMail } from "@/lib/mail";
import { sendAccountDeleted } from "@/lib/hosted/api-webhooks";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, licenseRefreshTestUrl, signingSecret, waabekApiUrl } from "@/lib/env";
import { appOtpSender, recordOwnWhatsappFailure, senderWithFallback } from "@/lib/hosted/app-sender";
import { resolvedOtpSenderConfig } from "@/lib/settings/platform";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { connectorFor } from "@/lib/hosted/connectors";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";
import { countryFromHeaders } from "@/lib/geo";
import { appIsActive } from "@/lib/license/status";
import { newAppointmentMailValues } from "@/lib/bookings/mail";
import { bookingSetup } from "@/lib/bookings/setup";
import type { App, BookingAppointment } from "@/lib/data/types";
import type { DataStore } from "@/lib/data/store";
import { appSignIn, ensureAuthKey, JWKS_MAX_AGE_SECONDS, jwksOf, signingKey, yallappSignsIn } from "@/lib/hosted/app-auth";
import { newInquiryMailValues } from "@/lib/listings/notify";
import { appMailDelivered, emailLangOf, sendTemplate } from "@/lib/email/send";
import { getDashT } from "@/i18n/dashboard";
import { effectivePlans, planOfLicense } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import { hostedDownloadsOn } from "@/lib/courses/downloads";
import { BOUND_MEDIA_HEADER, mediaForApp } from "@/lib/media/hosted";
import { checkAppUserNotices } from "@/lib/notices";
import { withDemoChecked } from "@/lib/demo/apps";
import { demoOfficeReply } from "@/lib/demo/cleanup";
import { corsHeaders, preflight, previewOrigins } from "@/lib/preview/cors";
import { PREVIEW_HEADER, previewKey, verifyPreviewToken } from "@/lib/preview/token";
import { isLanguageCode } from "@/lib/i18n/locales";
import { stringPack } from "@/lib/i18n/packs";
import { etagValues } from "@/lib/pages/plugin";
import { receiveCrashReports } from "@/lib/crashes/service";
import { pushNewBooking, pushNewMessage, pushNewQuestion, pushNewReview, pushReturnRequested } from "@/lib/owner/push";
import { pushOwnerSafely } from "@/lib/owner/push-env";
import { chatPushes } from "@/lib/chat/push-env";
import { chatBusiness } from "@/lib/chat/hosted";
import { getMediaStorage } from "@/lib/media/storage";
import { MEDIA_CHUNK_BYTES } from "@/lib/media/signing";
import { noteAppError } from "@/lib/watch/app-errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The hosted API (docs/api/openapi.yaml, server https://yallapp.com.tr/api/app/{app_id}),
 * for apps whose backend is "hosted".
 */
async function handle(request: Request, context: RouteContext<"/api/app/[appId]/[...path]">): Promise<Response> {
  // 17 The app preview may run on another of the platform's addresses than this API.
  const cors = corsHeaders(request.headers.get("origin"), previewOrigins(appUrl()));
  const response = await answer(request, context).catch((e: unknown) => serverError(e, context));
  for (const [name, value] of Object.entries(cors)) {
    if (name === "vary") response.headers.append("vary", value);
    else response.headers.set(name, value);
  }
  return response;
}

/** 78.4 Anything that failed unexpectedly: logged, counted on the app's errors, and a plain 500. */
async function serverError(e: unknown, { params }: RouteContext<"/api/app/[appId]/[...path]">): Promise<Response> {
  const message = e instanceof Error ? `${e.name}: ${e.message}` : "unknown error";
  const { appId, path } = await params;
  console.error(`[hosted] app ${appId}: /${path.join("/")} failed: ${message.slice(0, 300)}`);
  try {
    const store = await getStore();
    const app = UUID.test(appId) ? await store.getAppById(appId) : null;
    if (app) await noteAppError(store, { clientId: app.clientId, appId: app.id, source: "server", code: `unhandled:${path[0] ?? ""}`, detail: `/${path.join("/")}: ${message}` });
  } catch {
    // The error is in the log either way.
  }
  return errorResponse(500, "server_error", "Something went wrong. Please try again in a moment.");
}

async function answer(request: Request, { params }: RouteContext<"/api/app/[appId]/[...path]">): Promise<Response> {
  const { appId, path } = await params;
  if (!UUID.test(appId)) return errorResponse(404, "not_found", "Not found.");
  const store = await getStore();
  const found = await store.getAppById(appId);
  if (!found) return errorResponse(404, "not_found", "Not found.");
  // 16 Demo sign-in and demo checkout only for the demo account's own demo apps.
  const app = await withDemoChecked(store, found);
  // Each app has its own plan: the API answers while this app's license is active.
  const now = new Date();
  // 34 The public keys that check the access tokens of an own API app Yallapp signs people in to.
  if (path.length === 2 && path[0] === ".well-known" && path[1] === "jwks.json") return jwksResponse(request, app, store, now);
  // 43 The owner's interface strings for a language, for every app (WordPress and own API apps too).
  if (path.length === 2 && path[0] === "strings") return stringPackResponse(request, app, store, path[1]!, now);
  // 46 Crash reports, for every app whatever serves its content.
  if (path.length === 1 && path[0] === "crashes") return crashesResponse(request, app, store, now);
  const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id)]);
  const url = new URL(request.url);
  // Logout and "mark as read" come without a body; anything else sent must be JSON.
  const raw = request.method === "GET" || request.method === "DELETE" ? "" : await request.text();
  let body: unknown;
  if (raw.trim() !== "") {
    if (raw.length > 16_384) return errorResponse(413, "invalid_request", "The request is too large.");
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return errorResponse(400, "invalid_request", "The request body must be JSON.");
    }
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  // 13.1 The app's own plan: its features and limits.
  const plans = await effectivePlans(store);
  const plan = planOfLicense(plans, license, now);
  // 17 The app preview's token, for this app only: the owner's preview, with the draft pages when it asks for them.
  const previewToken = request.headers.get(PREVIEW_HEADER);
  const preview = previewToken ? verifyPreviewToken(previewToken, previewKey(signingSecret()), now, app.id) : null;
  const result = await handleHosted(
    {
      store,
      app,
      // 68 The plan's end date against now: an ended plan pauses the app at once.
      active: appIsActive(license, client, now),
      suspended: client?.status === "suspended",
      plan,
      onUsersCounted: async (count) => {
        // 16 Demo apps have no owner to tell.
        if (client && !app.demo) await checkAppUserNotices({ store, baseUrl: appUrl(), mail: sendTemplate, now }, { app, client, plan, plans, count });
      },
      now,
      ip: ipFromHeaders(request.headers),
      country: countryFromHeaders(request.headers),
      preview: preview?.ok ? { draft: preview.grant.draft } : null,
      secret: hmacSha256(signingSecret(), "hosted-api"),
      // 34 Own API apps Yallapp signs people in to: ES256 tokens with the app's own keys.
      yallappSignIn: yallappSignsIn(app) ? appSignIn(store, app.id, { encryptionKey: encryptionKey(), platformUrl: appUrl(), now: () => now }) : null,
      // 99.4 A form's answers, emailed to the business: its support address, else the owner's.
      onFormAnswers: async ({ title, lines, user, replyTo }) => {
        if (app.demo) return;
        const owner = client ? await store.getUserById(client.userId) : null;
        const to = app.supportEmail?.trim() || owner?.email;
        if (!to) return;
        const lang = owner ? emailLangOf(owner) : "en";
        const t = getDashT(lang);
        const appName = app.appName ?? t("emails.yourAppName");
        const from = user ? t("emails.formFrom", { name: user.name ?? "", email: user.email ? ` (${user.email})` : "" }) : t("emails.formAnonymous");
        const text = [t("emails.formIntro", { form: title, app: appName }), "", ...lines.map((l) => `${l.label}: ${l.value}`), "", from, replyTo ? `\n${t("emails.emailLine", { email: replyTo })}` : ""].join("\n").trim();
        await sendMail({ to, subject: t("emails.formSubject", { app: appName, form: title }).slice(0, 150), text }, { fromName: app.appName?.trim() || undefined });
      },
      // 49 The client's API hears of a deleted account (signed, retried by the webhook job).
      onAccountDeleted: async (sub) => {
        await sendAccountDeleted({ store, encryptionKey: encryptionKey(), platformUrl: appUrl(), now: () => new Date() }, app, sub);
      },
      // 100.3 Store billing: the store keys (encrypted), Google and Apple, and the WordPress site that gives the access.
      billing: { key: encryptionKey(), site: { testSiteUrl: licenseRefreshTestUrl() } },
      // 77 The chat: files on the media server, and pushes for new messages (also through a WordPress site).
      chat: { storage: getMediaStorage(), chunkBytes: MEDIA_CHUNK_BYTES, onMessage: chatPushes(store, chatBusiness(app, assetUrl).name) },
      // 18 The owner's own WhatsApp number when they connected one, else Yallapp's sender.
      // 19 When the own number fails, Yallapp's sender sends that code and the owner is told.
      sender: senderWithFallback(
        appOtpSender(app, encryptionKey(), waabekApiUrl()),
        otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
        () => recordOwnWhatsappFailure({ store, now, baseUrl: appUrl(), mail: sendTemplate }, app.id),
      ),
      sendEmailCode: async ({ to, code, appName, minutes }) => {
        // Without SMTP in production, sendMail drops the message: say the code couldn't be sent instead.
        // 24 The app's own email server counts too: the code goes out through it.
        if (!(await appMailDelivered(store, app))) {
          throw new Error("No email server is set up.");
        }
        await sendTemplate("sign_in_code", to, { app_name: appName, code, minutes: String(minutes) }, { app });
      },
      push: serviceAccountOf(app, encryptionKey()) !== null,
      assetUrl: assetUrl,
      platformUrl: appUrl(),
      connector: connectorFor(app, encryptionKey(), {
        store,
        assetUrl,
        platformUrl: appUrl(),
        cardPayments: hasFeature(plan, "card_payments"),
        // 100.3 Paid courses are bought through the stores when the app sells in the app.
        storeBilling: storeBillingOn(app, plan),
        // 91.4 Loyalty points in shops without a website.
        loyalty: hasFeature(plan, "loyalty"),
        // 104 Delivery and courier apps. Yallapp's own demo apps (checked above) have Studio's project types on any plan.
        delivery: hasFeature(plan, "delivery") || app.demo === true,
        // 105.1 Food delivery apps.
        food: hasFeature(plan, "food") || app.demo === true,
        // 105.2 Ride apps.
        rides: hasFeature(plan, "rides") || app.demo === true,
        // 45 Lessons saved for offline viewing: offline mode in the plan and the owner's choice.
        downloads: hostedDownloadsOn(app, plan),
        // 51 Lesson videos from the Media library, signed for each request.
        // 62 Bound to the student when the app says it can play such links (never for the preview in a browser).
        media: mediaForApp(store, app.id, { bindTo: bearer && !previewToken && request.headers.get(BOUND_MEDIA_HEADER) === "1" ? bearer[1]!.trim() : null }),
        signingSecret: signingSecret(),
        // 91.3 A customer asked to return an order: the owner's phones.
        onReturnRequested: async (order) => {
          await pushOwnerSafely((d) => pushReturnRequested(d, app, order));
        },
        onBooked: async (appointment: BookingAppointment) => {
          if (app.demo) return;
          const owner = client ? await store.getUserById(client.userId) : null;
          if (!owner) return;
          const lang = emailLangOf(owner);
          const appName = app.appName ?? getDashT(lang)("emails.yourAppName");
          const values = newAppointmentMailValues(appointment, bookingSetup(app).rules.timezone, appName, `${appUrl()}/dashboard/appointments`, lang);
          // 58 Also to the owner's phone (Yallapp Business), whatever the email does.
          await pushOwnerSafely((d) => pushNewBooking(d, app, appointment, bookingSetup(app).rules.timezone));
          await sendTemplate("new_appointment", owner.email, values, { lang });
        },
        onInquiry: async ({ inquiry, listing, user, text }) => {
          // 16 A demo office answers at once, so visitors see how replies arrive.
          if (app.demo) return void (await demoOfficeReply(store, app, inquiry, new Date()));
          const owner = client ? await store.getUserById(client.userId) : null;
          if (!owner) return;
          const url = `${appUrl()}/dashboard/inquiries/${inquiry.id}`;
          const lang = emailLangOf(owner);
          const appName = app.appName ?? getDashT(lang)("emails.yourAppName");
          await pushOwnerSafely((d) => pushNewMessage(d, app, { inquiryId: inquiry.id, listing, name: user.name, text }));
          await sendTemplate("new_inquiry", owner.email, newInquiryMailValues({ listing, user, text, appName, url, lang }), { lang });
        },
        // 63 A course question or review reaches the business's phones (Yallapp Business).
        onQuestion: async ({ question, course, user, text, followUp }) => {
          await pushOwnerSafely((d) => pushNewQuestion(d, app, { question, course, name: user.name, text, followUp }));
        },
        onReview: async ({ review, course, user }) => {
          await pushOwnerSafely((d) => pushNewReview(d, app, { review, course, name: user.name }));
        },
      }),
    },
    { method: request.method, path, query: url.searchParams, body, token: bearer?.[1]?.trim() ?? null, headers: request.headers },
  );
  if (result.status === 304) return new Response(null, { status: 304, headers: { "cache-control": "no-store", ...result.headers } });
  if (result.status === 204) return noContent();
  // 99.4 An answer without a body (202 for a form's answers).
  if (result.body === undefined) return new Response(null, { status: result.status, headers: { "cache-control": "no-store", ...result.headers } });
  return json(result.body, result.status, result.headers);
}

/**
 * 34 `GET /.well-known/jwks.json`: the app's public signing keys (the current
 * one, and for a day one it replaced), for the client's API to check access
 * tokens. Public and cacheable for 5 minutes; 404 unless Yallapp signs
 * people in to this app. Served also while the app is paused.
 */
async function jwksResponse(request: Request, app: App, store: DataStore, now: Date): Promise<Response> {
  if (request.method !== "GET") return errorResponse(405, "method_not_allowed", "Use GET.");
  if (!yallappSignsIn(app)) return errorResponse(404, "not_found", "Not found.");
  let keys = await store.listAppAuthKeys(app.id);
  if (!signingKey(keys)) {
    await ensureAuthKey(store, app.id, encryptionKey(), now);
    keys = await store.listAppAuthKeys(app.id);
  }
  return new Response(JSON.stringify(jwksOf(keys, now)), {
    status: 200,
    headers: {
      "content-type": "application/jwk-set+json",
      "cache-control": `public, max-age=${JWKS_MAX_AGE_SECONDS}`,
      "access-control-allow-origin": "*",
    },
  });
}

/**
 * 43 `GET /strings/{language}` (docs/api/openapi.yaml, getStringPack): the
 * owner's translations of the app's interface strings in one language, as
 * published; with `draft=1` and the app preview's token, the draft's. The
 * app gets the address from `Config.languages.list` and keeps the pack for
 * offline use. Served also while the app is paused; never secret.
 */
async function stringPackResponse(request: Request, app: App, store: DataStore, lang: string, now: Date): Promise<Response> {
  if (request.method !== "GET") return errorResponse(405, "method_not_allowed", "Use GET.");
  if (!isLanguageCode(lang)) return errorResponse(404, "not_found", "Not found.");
  let draft = false;
  if (new URL(request.url).searchParams.get("draft") === "1") {
    const token = request.headers.get(PREVIEW_HEADER);
    const preview = token ? verifyPreviewToken(token, previewKey(signingSecret()), now, app.id) : null;
    draft = Boolean(preview?.ok && preview.grant.draft);
  }
  const record = await store.getAppLayout(app.id);
  const pack = stringPack((draft ? record?.draft : record?.published)?.strings, lang);
  const headers = { "cache-control": draft ? "no-store" : "public, max-age=300", etag: `"${pack.version}"`, vary: "X-Yallapp-Preview" };
  if (etagValues(request.headers.get("if-none-match")).includes(pack.version)) return new Response(null, { status: 304, headers });
  return json(pack, 200, headers);
}

/**
 * 46 `POST /crashes`: the app's crash reports, grouped by fingerprint. Rate
 * limited per app and address; 204 also when the owner turned them off.
 */
async function crashesResponse(request: Request, app: App, store: DataStore, now: Date): Promise<Response> {
  if (request.method !== "POST") return errorResponse(405, "method_not_allowed", "Use POST.");
  const answer = await receiveCrashReports(store, app, await request.text(), ipFromHeaders(request.headers), now);
  if (answer.status === 204) return noContent();
  const retry = answer.body.retry_after_seconds;
  return json(answer.body, answer.status, retry ? { "retry-after": String(retry) } : {});
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export function OPTIONS(request: Request): Response {
  return preflight(request.headers.get("origin"), previewOrigins(appUrl()));
}
