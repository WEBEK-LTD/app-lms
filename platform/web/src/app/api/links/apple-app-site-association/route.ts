import { getStore } from "@/lib/data";
import { appleAssociationResponse } from "@/lib/links/files";

/** 46 Yallapp's `/.well-known/apple-app-site-association` (rewritten here in next.config.ts): Universal Links, each app for `/a/<app_id>/*`. */
export async function GET(): Promise<Response> {
  return appleAssociationResponse(await getStore());
}
