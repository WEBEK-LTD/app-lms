import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/data";
import { panelCookie, panelStaff } from "@/lib/market/panel";
import { boardAction, boardData } from "@/lib/market/panel-board";

/** 115.7 The vendors' web panel's live board: read every few seconds, and its buttons. Signed in to this app's panel only. */

async function signedIn(appId: string) {
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app || app.connector?.kind !== "restaurants") return null;
  const staff = await panelStaff(store, app, (await cookies()).get(panelCookie(appId))?.value, new Date());
  return staff ? { store, app, staff } : null;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/partner/[appId]/board">) {
  const { appId } = await ctx.params;
  const who = await signedIn(appId);
  if (!who) return NextResponse.json({ code: "invalid_token", message: "Sign in again." }, { status: 401 });
  const data = await boardData(who.store, who.app, who.staff);
  return data ? NextResponse.json(data, { headers: { "cache-control": "no-store" } }) : NextResponse.json({ code: "not_vendor", message: "Sign in again." }, { status: 403 });
}

export async function POST(request: Request, ctx: RouteContext<"/api/partner/[appId]/board">) {
  const { appId } = await ctx.params;
  // Same-site only: the panel's own page calls it.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return NextResponse.json({ code: "forbidden", message: "Not allowed." }, { status: 403 });
  const who = await signedIn(appId);
  if (!who) return NextResponse.json({ code: "invalid_token", message: "Sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ code: "invalid_request", message: "Send the action." }, { status: 400 });
  const result = await boardAction(who.store, who.app, who.staff, body);
  return NextResponse.json(result.body ?? {}, { status: result.status });
}
