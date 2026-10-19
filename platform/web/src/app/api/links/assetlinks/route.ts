import { getStore } from "@/lib/data";
import { assetLinksResponse } from "@/lib/links/files";

/** 46 Yallapp's `/.well-known/assetlinks.json` (rewritten here in next.config.ts): Android App Links for every app. */
export async function GET(): Promise<Response> {
  return assetLinksResponse(await getStore());
}
