import { llmsResponse } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";

/** /ar/llms.txt: the Arabic /llms.txt (lib/llms.ts). There is no Turkish one: /tr/llms.txt is not found. */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }): Promise<Response> {
  const { lang } = await params;
  if (lang !== "ar") return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return llmsResponse("ar", siteUrl());
}
