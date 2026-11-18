"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { imageType } from "@/lib/images";
import { DETAILS_LIMITS, DETAILS_MESSAGES, readPayoutDetails, savePayoutDetails } from "@/lib/studio-market/payout-details";

/**
 * 106.11 The designer's checks before their first payout, sent from the
 * designer area: their ID (its number encrypted, a photo or PDF of it kept
 * where only Yallapp's team with `market.payouts` opens it) and their bank
 * for SWIFT (the IBAN or account number encrypted). The account's owner
 * only, on their own designer profile. Nothing typed into the ID number or
 * the account is echoed back to the form or logged.
 */

/** The form's fields that are secrets: never sent back to the browser. */
const SECRET_FIELDS = new Set(["idNumber", "account"]);

export async function savePayoutDetailsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context: ClientContext | null = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const store = await getStore();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const now = new Date();
  const text = (name: string) => String(formData.get(name) ?? "");
  const fields = ["legalName", "country", "idType", "idNumber", "holderName", "accountKind", "account", "swift", "bankCode", "bankName", "bankCountry", "address"] as const;
  const values: Record<string, string> = {};
  for (const name of fields) if (!SECRET_FIELDS.has(name)) values[name] = text(name).slice(0, 400);

  // The ID document: a photo (PNG, JPEG) or a PDF, by its first bytes, up to 5 MB.
  const file = formData.get("document");
  let document: { data: Buffer; contentType: string; extension: string } | null = null;
  let documentError = false;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > DETAILS_LIMITS.documentBytes) documentError = true;
    else {
      const data = Buffer.from(await file.arrayBuffer());
      const image = imageType(data);
      const pdf = data.subarray(0, 5).toString("latin1") === "%PDF-";
      if (image) document = { data, ...image };
      else if (pdf) document = { data, contentType: "application/pdf", extension: "pdf" };
      else documentError = true;
    }
  }

  const existing = await store.getDesignerPayoutDetails(designer.id);
  const read = readPayoutDetails(
    {
      legalName: text("legalName"),
      country: text("country"),
      idType: text("idType"),
      idNumber: text("idNumber"),
      holderName: text("holderName"),
      accountKind: text("accountKind"),
      account: text("account"),
      swift: text("swift"),
      bankCode: text("bankCode"),
      bankName: text("bankName"),
      bankCountry: text("bankCountry"),
      address: text("address"),
      confirm: formData.get("confirm") === "on",
      hasDocument: document !== null,
    },
    existing,
  );
  const errors = read.ok ? {} : { ...read.errors };
  if (documentError) errors.document = DETAILS_MESSAGES.document;
  if (!read.ok || Object.keys(errors).length) return { errors, values };

  let assetId: string | null = null;
  if (document) {
    assetId = newId();
    // In the account's own folder: it goes with the account when it is deleted (lib/account/purge.ts).
    const blobKey = `assets/${context.client.id}/${assetId}.${document.extension}`;
    await getBlobStore().put(blobKey, document.data, document.contentType);
    await store.createAsset({ id: assetId, clientId: context.client.id, kind: "designer_id_document", blobKey, contentType: document.contentType, size: document.data.length, createdAt: now });
  }
  await savePayoutDetails({ store, key: encryptionKey(), now }, designer, read.value, assetId);
  // The document it replaced isn't needed any more.
  if (assetId && existing?.idDocumentAssetId) {
    const old = await store.getAsset(existing.idDocumentAssetId);
    if (old && old.kind === "designer_id_document" && old.clientId === context.client.id) {
      await getBlobStore().delete(old.blobKey).catch(() => undefined);
      await store.deleteAsset(old.id);
    }
  }
  revalidatePath("/designer", "layout");
  revalidatePath("/admin/market/payouts", "layout");
  redirect("/designer/money?details=sent");
}
