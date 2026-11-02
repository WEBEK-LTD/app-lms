import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, signingSecret } from "@/lib/env";
import { checkinSettingsOf, gateCodes, gateSecret } from "@/lib/school/checkin";
import { schoolSettingsOf } from "@/lib/school/settings";

/** Ten minutes of codes, so the gate's screen keeps going a while without the network. */
const WINDOWS = 20;

/**
 * 113.2 GET /api/dashboard/school/gate: the gate's codes for the signed-in
 * client's current school app, this window's and the next ones, and the
 * server's time (the screen shows the code for the server's clock).
 */
export async function GET(): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  if (!contextCan(context, "settings")) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const app = context.app;
  if (!app || app.connector?.kind !== "school") return NextResponse.json({ code: "not_found" }, { status: 404 });
  const store = await getStore();
  const c = checkinSettingsOf(schoolSettingsOf(await store.getSchoolSettings(app.id), app));
  const now = new Date();
  // The hosted API's secret (app/api/app/[appId]/[...path]/route.ts), which the app's check-ins are checked with.
  const secret = gateSecret(hmacSha256(signingSecret(), "hosted-api"), app.id, c.gateKey);
  return NextResponse.json(
    {
      now: now.toISOString(),
      on: c.on && c.methods !== "location",
      codes: gateCodes(secret, now, WINDOWS).map((g) => ({ starts_at: g.startsAt.toISOString(), ends_at: g.endsAt.toISOString(), code: g.code, payload: g.payload })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
