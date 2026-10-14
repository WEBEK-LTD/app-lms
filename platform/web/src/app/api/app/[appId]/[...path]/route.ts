import { assetUrl } from "@/lib/assets";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, isProduction, mailCaptureDir, signingSecret, waabekApiUrl } from "@/lib/env";
import { appOtpSender } from "@/lib/hosted/app-sender";
import { resolvedOtpSenderConfig, resolvedSmtpConfig } from "@/lib/settings/platform";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { connectorFor } from "@/lib/hosted/connectors";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";
import { appState } from "@/lib/license/status";
import { newAppointmentMailValues } from "@/lib/bookings/mail";
import { bookingSetup } from "@/lib/bookings/setup";
import type { BookingAppointment } from "@/lib/data/types";
import { newInquiryMailValues } from "@/lib/listings/notify";
import { sendTemplate } from "@/lib/email/send";
import { effectivePlans, planOfLicense } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import { checkAppUserNotices } from "@/lib/notices";
import { withDemoChecked } from "@/lib/demo/apps";
import { demoOfficeReply } from "@/lib/demo/cleanup";
import { corsHeaders, preflight, previewOrigins } from "@/lib/preview/cors";
import { PREVIEW_HEADER, previewKey, verifyPreviewToken } from "@/lib/preview/token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The hosted API (docs/api/openapi.yaml, server https://yallapp.com.tr/api/app/{app_id}),
 * for apps whose backend is "hosted".
 */
async function handle(request: Request, context: RouteContext<"/api/app/[appId]/[...path]">): Promise<Response> {
  // 17 The app preview may run on another of the platform's addresses than this API.
  const cors = corsHeaders(request.headers.get("origin"), previewOrigins(appUrl()));
  const response = await answer(request, context);
  for (const [name, value] of Object.entries(cors)) {
    if (name === "vary") response.headers.append("vary", value);
    else response.headers.set(name, value);
  }
  return response;
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
  const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id)]);
  const now = new Date();
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
      active: client !== null && appState(client, license, now) === "active",
      suspended: client?.status === "suspended",
      plan,
      onUsersCounted: async (count) => {
        // 16 Demo apps have no owner to tell.
        if (client && !app.demo) await checkAppUserNotices({ store, baseUrl: appUrl(), mail: sendTemplate, now }, { app, client, plan, plans, count });
      },
      now,
      ip: ipFromHeaders(request.headers),
      preview: preview?.ok ? { draft: preview.grant.draft } : null,
      secret: hmacSha256(signingSecret(), "hosted-api"),
      // 18 The owner's own WhatsApp number when they connected one, else Yallapp's sender.
      sender: appOtpSender(app, encryptionKey(), waabekApiUrl()) ?? otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
      sendEmailCode: async ({ to, code, appName, minutes }) => {
        // Without SMTP in production, sendMail drops the message: say the code couldn't be sent instead.
        // End-to-end runs keep the email in YALLAPP_MAIL_DIR (never on Netlify), so it isn't lost there.
        if (isProduction() && process.env.YALLAPP_DATA !== "memory" && !mailCaptureDir() && !(await resolvedSmtpConfig(store, encryptionKey()))) {
          throw new Error("No email server is set up.");
        }
        await sendTemplate("sign_in_code", to, { app_name: appName, code, minutes: String(minutes) });
      },
      push: serviceAccountOf(app, encryptionKey()) !== null,
      assetUrl: assetUrl,
      platformUrl: appUrl(),
      connector: connectorFor(app, encryptionKey(), {
        store,
        assetUrl,
        platformUrl: appUrl(),
        cardPayments: hasFeature(plan, "card_payments"),
        onBooked: async (appointment: BookingAppointment) => {
          if (app.demo) return;
          const owner = client ? await store.getUserById(client.userId) : null;
          if (!owner) return;
          const values = newAppointmentMailValues(appointment, bookingSetup(app).rules.timezone, app.appName ?? "your app", `${appUrl()}/dashboard/appointments`);
          await sendTemplate("new_appointment", owner.email, values);
        },
        onInquiry: async ({ inquiry, listing, user, text }) => {
          // 16 A demo office answers at once, so visitors see how replies arrive.
          if (app.demo) return void (await demoOfficeReply(store, app, inquiry, new Date()));
          const owner = client ? await store.getUserById(client.userId) : null;
          if (!owner) return;
          const url = `${appUrl()}/dashboard/inquiries/${inquiry.id}`;
          await sendTemplate("new_inquiry", owner.email, newInquiryMailValues({ listing, user, text, appName: app.appName ?? "your app", url }));
        },
      }),
    },
    { method: request.method, path, query: url.searchParams, body, token: bearer?.[1]?.trim() ?? null, headers: request.headers },
  );
  if (result.status === 304) return new Response(null, { status: 304, headers: { "cache-control": "no-store", ...result.headers } });
  return result.status === 204 ? noContent() : json(result.body, result.status, result.headers);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export function OPTIONS(request: Request): Response {
  return preflight(request.headers.get("origin"), previewOrigins(appUrl()));
}
