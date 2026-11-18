import { getStore } from "@/lib/data";
import { handleTwilioCallback } from "@/lib/contact/phone-call";
import { signingSecret } from "@/lib/env";

/** 184.5 Twilio's callbacks for a masked phone call, at the address the server signed when it placed it (lib/contact/phone-call.ts). */
export const dynamic = "force-dynamic";

const MAX_BYTES = 16_384;

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BYTES) return new Response("", { status: 413 });
  const result = await handleTwilioCallback(await getStore(), new URL(request.url), new URLSearchParams(raw), signingSecret(), new Date());
  return new Response(result.body, { status: result.status, headers: { "content-type": result.type, "cache-control": "no-store" } });
}
