import { assetUrl } from "@/lib/assets";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, signingSecret } from "@/lib/env";
import { resolvedOtpSenderConfig } from "@/lib/settings/platform";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { connectorFor } from "@/lib/hosted/connectors";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";
import { accountState } from "@/lib/license/status";
import { newAppointmentMail } from "@/lib/bookings/mail";
import { bookingSetup } from "@/lib/bookings/setup";
import type { BookingAppointment } from "@/lib/data/types";
import { sendMail } from "@/lib/mail";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The hosted API (docs/api/openapi.yaml, server https://yallapp.com.tr/api/app/{app_id}),
 * for apps whose backend is "hosted".
 */
async function handle(request: Request, { params }: RouteContext<"/api/app/[appId]/[...path]">): Promise<Response> {
  const { appId, path } = await params;
  if (!UUID.test(appId)) return errorResponse(404, "not_found", "Not found.");
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app) return errorResponse(404, "not_found", "Not found.");
  const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseByClientId(app.clientId)]);
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
  const result = await handleHosted(
    {
      store,
      app,
      active: client !== null && accountState(client, license, now) === "active",
      now,
      ip: ipFromHeaders(request.headers),
      secret: hmacSha256(signingSecret(), "hosted-api"),
      sender: otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
      push: serviceAccountOf(app, encryptionKey()) !== null,
      assetUrl: assetUrl,
      platformUrl: appUrl(),
      connector: connectorFor(app, encryptionKey(), {
        store,
        assetUrl,
        platformUrl: appUrl(),
        onBooked: async (appointment: BookingAppointment) => {
          const owner = client ? await store.getUserById(client.userId) : null;
          if (!owner) return;
          const mail = newAppointmentMail(appointment, bookingSetup(app).rules.timezone, app.appName ?? "your app", `${appUrl()}/dashboard/appointments`);
          await sendMail({ to: owner.email, ...mail });
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
