import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { payoutPeriod, payoutsCsv } from "@/lib/studio-market/money";
import { formatUsd } from "@/lib/studio-market/plans";

/**
 * 106.11 GET /admin/market/payouts/export: the bank file, every payout
 * prepared and not sent yet, with each designer's bank details in full
 * (for Yallapp's bank only). `market.payouts` only; each download is in
 * the audit log (how many and how much, never an account).
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const admin = await requireAdmin("market.payouts");
  const store = await getStore();
  const payouts = (await store.listDesignerPayouts({ statuses: ["processing"] })).sort((a, b) => a.preparedAt.getTime() - b.preparedAt.getTime());
  const designers = new Map((await store.listTemplateDesigners([...new Set(payouts.map((p) => p.designerId))])).map((d) => [d.id, d]));
  const csv = payoutsCsv(payouts, designers, encryptionKey());
  const total = payouts.reduce((n, p) => n + p.amountCents, 0);
  await recordAudit({
    actor: admin,
    action: "market.payouts_export",
    target: { type: "market_payout", id: null },
    summary: `Downloaded the bank file: ${payouts.length === 1 ? "1 payout" : `${payouts.length} payouts`}, ${formatUsd(total)} in all`,
    after: { payouts: payouts.map((p) => p.id) },
  });
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yallapp-studio-market-payouts-${payoutPeriod(new Date())}.csv"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
