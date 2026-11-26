import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { approveYallappSignin, denyYallappSignin } from "@/lib/community/base/yallapp-signin";
import { communityDeps } from "@/lib/community/deps";
import { appUrl } from "@/lib/env";

/**
 * 231 POST /api/community-link/signin: "Continue" or "Cancel" on
 * yallapp.com.tr/link-community?mode=signin. A plain form post answered
 * with 303, so the browser itself goes to the app's or the site's address
 * (a custom scheme included). Only from Yallapp's own page (its Origin),
 * by the signed-in Yallapp user.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== new URL(appUrl()).origin) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData();
  const signinRequest = String(form.get("request") ?? "");
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/api/community-link/sign-in?mode=signin&request=${encodeURIComponent(signinRequest)}`, appUrl()), 303);
  const deps = await communityDeps({ ip: "" });
  const back = form.get("decision") === "cancel" ? await denyYallappSignin(deps, signinRequest) : await approveYallappSignin(deps, signinRequest, user.id);
  return back ? new NextResponse(null, { status: 303, headers: { location: back } }) : NextResponse.redirect(new URL("/link-community?mode=signin&error=expired", appUrl()), 303);
}
