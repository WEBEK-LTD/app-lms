"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { BANK_REFERENCE_MAX, recordBankTransfer } from "@/lib/billing/bank-transfer";
import { sendPlanPaidMail } from "@/lib/billing/plan-mail";
import { formatAmount } from "@/lib/billing/prices";
import { receiptNumber } from "@/lib/billing/receipt";
import { CATALOG_CURRENCIES, parsePrice } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { CatalogCurrency } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { PLANS } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";

// 95.2 Admin › Invoices: a client paid an app's plan into Yallapp's bank account.

const bankTransferSchema = z.object({
  clientId: z.string().uuid(),
  // Empty: the account's first app, not made yet.
  appId: z.union([z.literal(""), z.string().uuid("Choose the app the transfer pays for.")]),
  plan: z.enum(PLANS, "Choose a plan."),
  months: z.enum(["1", "12"], "Choose how long it pays for."),
  amount: z.string().trim().min(1, "Enter the amount that arrived."),
  currency: z.enum(CATALOG_CURRENCIES as [CatalogCurrency, ...CatalogCurrency[]], "Choose the currency."),
  reference: z
    .string()
    .trim()
    .min(2, "Enter the bank's reference for the transfer.")
    .max(BANK_REFERENCE_MAX, `Keep the reference under ${BANK_REFERENCE_MAX} characters.`),
});

export async function recordBankTransferAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const values = formValues(formData);
  const parsed = bankTransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const amountCents = parsePrice(parsed.data.amount);
  if (!amountCents) return { errors: { amount: "Enter the amount that arrived, for example 1500." }, values };

  const store = await getStore();
  const client = await store.getClientById(parsed.data.clientId);
  if (!client) return { message: "This client no longer exists.", values };
  const apps = await store.listAppsByClient(client.id);
  // Before the first app the payment waits for it; once there are apps, it pays for one of them.
  const app = parsed.data.appId ? (apps.find((a) => a.id === parsed.data.appId) ?? null) : null;
  if (apps.length > 0 && !app) return { errors: { appId: "Choose one of this client's apps." }, values };

  const now = new Date();
  const outcome = await recordBankTransfer(
    store,
    {
      client,
      app,
      plan: parsed.data.plan,
      months: parsed.data.months === "1" ? 1 : 12,
      amountCents,
      currency: parsed.data.currency,
      reference: parsed.data.reference,
      recordedBy: admin.email,
    },
    encryptionKey(),
    now,
  );
  const plans = await getPlans(store);
  const user = await store.getUserById(client.userId);
  await recordAudit({
    actor: admin,
    action: "payments.bank_transfer",
    target: app ? { type: "app", id: app.id } : { type: "client", id: client.id },
    clientId: client.id,
    summary: `Recorded a bank transfer of ${formatAmount(amountCents, parsed.data.currency)} (${parsed.data.reference}) from ${user?.name ?? "the client"} for ${app ? appLabel(app) : "the account's first app"}: invoice ${receiptNumber(outcome.payment)}, ${plans[outcome.change.plan].name} until ${outcome.activeUntil.toISOString().slice(0, 10)}`,
    after: { invoice: receiptNumber(outcome.payment), plan: outcome.change.plan, expiresAt: outcome.activeUntil },
  });
  // The activation or renewal email with the invoice as a PDF, as after a card payment.
  await sendPlanPaidMail(store, client, outcome);
  if (app) refreshSitesSoon([app.id]);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${client.id}`);
  redirect(`/admin/invoices?recorded=${outcome.payment.id}`);
}
