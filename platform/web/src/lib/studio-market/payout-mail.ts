import "server-only";
import { DEFAULT_CONTACT } from "../contact";
import type { DataStore } from "../data/store";
import type { DesignerPayout, TemplateDesigner, User } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { appUrl } from "../env";
import { renderReceiptPdf } from "../receipts/pdf";
import { invoiceLines, receiptAttachment } from "../receipts/service";
import { platformSetting } from "../settings/platform";
import type { Lang } from "@/i18n/config";
import { payoutAmount, payoutDay, payoutMonth, payoutReceipt, payoutReceiptFilename } from "./payout-receipt";

/**
 * 106.11 The designer's emails about their money, in their language: the
 * team's answer to their checks, and each payout's receipt with its PDF.
 * Never fails what the team did: the receipt stays in the designer area.
 */

export const MONEY_PATH = "/designer/money";

async function designerUser(store: DataStore, designer: Pick<TemplateDesigner, "clientId">): Promise<User | null> {
  const client = await store.getClientById(designer.clientId);
  return client ? store.getUserById(client.userId) : null;
}

/** A sent payout's receipt as a PDF, in `lang` (the designer's language unless given). Null before it is sent. */
export async function payoutReceiptPdf(store: DataStore, payout: DesignerPayout, lang?: Lang): Promise<{ pdf: Buffer; filename: string } | null> {
  if (payout.status !== "sent") return null;
  const designer = await store.getTemplateDesigner(payout.designerId);
  if (!designer) return null;
  const user = await designerUser(store, designer);
  const [contact, lines] = await Promise.all([platformSetting(store, "contact"), invoiceLines(store)]);
  const document = payoutReceipt({ lang: lang ?? (user ? emailLangOf(user) : "en"), payout, designer, contact: contact?.value ?? DEFAULT_CONTACT, invoiceLines: lines });
  return { pdf: await renderReceiptPdf(document), filename: payoutReceiptFilename(payout) };
}

/** The receipt email once the team marked the payout sent, its PDF attached. */
export async function sendPayoutReceipt(store: DataStore, payout: DesignerPayout, now: Date): Promise<void> {
  try {
    const designer = await store.getTemplateDesigner(payout.designerId);
    const user = designer ? await designerUser(store, designer) : null;
    if (!designer || !user || !payout.sentOn) return;
    const lang = emailLangOf(user);
    const attachments = await receiptAttachment(() => payoutReceiptPdf(store, payout, lang));
    await sendTemplate(
      "market_payout_sent",
      user.email,
      {
        name: user.name,
        amount: payoutAmount(payout.amountCents),
        month: payoutMonth(payout.period, lang),
        sent_on: payoutDay(payout.sentOn, lang),
        bank_name: payout.bankName,
        account_hint: payout.accountHint,
        bank_reference: payout.bankReference ?? "",
        payout_id: payout.id,
        money_url: `${appUrl()}${MONEY_PATH}/payouts/${payout.id}`,
      },
      { lang, attachments },
    );
    await store.markDesignerPayoutEmailed(payout.id, now);
  } catch (error) {
    console.error("[studio-market] the payout receipt email wasn't sent:", error instanceof Error ? error.message : error);
  }
}

/** The team's answer to the designer's checks: approved, or a fix with the team's note. */
export async function sendDetailsDecision(store: DataStore, designer: Pick<TemplateDesigner, "clientId">, decision: "approve" | "fix", note: string): Promise<void> {
  try {
    const user = await designerUser(store, designer);
    if (!user) return;
    const lang = emailLangOf(user);
    if (decision === "approve") await sendTemplate("market_payout_details_approved", user.email, { name: user.name, money_url: `${appUrl()}${MONEY_PATH}` }, { lang });
    else await sendTemplate("market_payout_details_changes", user.email, { name: user.name, notes: note, details_url: `${appUrl()}${MONEY_PATH}/details` }, { lang });
  } catch (error) {
    console.error("[studio-market] the payout checks email wasn't sent:", error instanceof Error ? error.message : error);
  }
}
