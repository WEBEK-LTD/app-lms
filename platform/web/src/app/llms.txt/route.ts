import { llmsResponse } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";

/** /llms.txt: Yallapp in a few paragraphs and links, for the assistants' crawlers (lib/llms.ts). Read per request, like robots.txt, so its links follow APP_URL. */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return llmsResponse("en", siteUrl());
}
