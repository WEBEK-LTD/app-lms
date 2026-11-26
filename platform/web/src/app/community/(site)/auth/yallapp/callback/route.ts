import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cmLinks } from "@/components/community/site/links";
import { SITE_SIGNIN_PATH } from "@/lib/community/base/yallapp-signin";
import { communitySiteUrl } from "@/lib/community/deps";
import { setCommunityCookies } from "@/lib/community/session";
import { communityApi } from "@/lib/community/site-client";
import { safeNext, YALLAPP_COOKIE } from "@/lib/community/site-yallapp";

/**
 * 231 Back from Yallapp's approval page with a one-time code: checked
 * against the state this browser kept, exchanged with its verifier for the
 * member's session (their cookies), then the page they came from.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const jar = await cookies();
  let kept: { state?: string; verifier?: string; next?: string } = {};
  try {
    kept = JSON.parse(jar.get(YALLAPP_COOKIE)?.value ?? "{}") as typeof kept;
  } catch {
    kept = {};
  }
  jar.delete(YALLAPP_COOKIE);
  const failed = (reason: string) => NextResponse.redirect(new URL(`${cmLinks.signIn()}?error=${reason}`, url), 303);
  const code = url.searchParams.get("code");
  if (!kept.state || !kept.verifier || url.searchParams.get("state") !== kept.state) return failed("yallapp");
  if (!code) return failed(url.searchParams.get("error") === "access_denied" ? "yallapp_cancelled" : "yallapp");
  const r = await communityApi<{ access_token: string; access_expires_at: string; refresh_token: string; refresh_expires_at: string; error?: { code: string } }>("POST", "/auth/yallapp", {
    body: { code, code_verifier: kept.verifier, redirect_uri: `${communitySiteUrl()}${SITE_SIGNIN_PATH}`, device: { platform: "web", name: "Website" } },
  });
  if (r.status !== 200 && r.status !== 201) return failed(r.body.error?.code === "email_taken" ? "yallapp_email_taken" : "yallapp");
  await setCommunityCookies(r.body);
  return NextResponse.redirect(new URL(safeNext(kept.next ?? null), url), 303);
}
