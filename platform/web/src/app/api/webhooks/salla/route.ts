import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { handleSallaWebhook, SALLA_WEBHOOK_MAX_BYTES } from "@/lib/hosted/connectors/salla-webhook";

/** 25 Webhooks from Yallapp's Salla app: new tokens for connected stores (lib/hosted/connectors/salla-webhook.ts). */
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > SALLA_WEBHOOK_MAX_BYTES) return Response.json({ ok: false, message: "Empty or too large." }, { status: 400 });
  const result = await handleSallaWebhook(raw, request.headers.get("x-salla-signature"), { store: await getStore(), encryptionKey: encryptionKey(), now: new Date() });
  return Response.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
