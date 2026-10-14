import { partnerOAuthCallback } from "../partner-callback";

/** 25 Salla sends store owners back here after they approve Yallapp's Salla app (src/app/oauth/partner-callback.ts). */
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return partnerOAuthCallback(request, "salla");
}
