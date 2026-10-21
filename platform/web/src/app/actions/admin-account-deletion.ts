"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closeAccountDeletion } from "@/lib/account/deletion";
import { carryOutAccountDeletion } from "@/lib/account/purge";
import { recordAudit } from "@/lib/admin/audit";
import { accountPurgeDeps } from "@/lib/apps/purge-env";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import type { FormState } from "@/lib/forms";

/**
 * 66 Admin › Account deletion: 73 our team deletes an account at once
 * ("Delete now", lib/account/purge.ts: the billing records kept, the rows
 * and files deleted, the person who asked emailed), which the daily job does
 * otherwise once the waiting days are over; or cancels the request (the
 * client changed their mind, or it wasn't theirs). Owners and admins only
 * (`clients.suspend`), and in the audit log.
 */
export async function closeAccountDeletionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.suspend");
  const status = formData.get("status") === "done" ? "done" : "cancelled";
  const note = String(formData.get("note") ?? "");
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  const now = new Date();
  if (status === "done") {
    if (formData.get("confirm") !== "on") return { errors: { confirm: "Tick this to delete the account now." }, values: { note } };
    const request = await store.getAccountDeletionRequest(id);
    const result = await carryOutAccountDeletion(accountPurgeDeps(store, now), id, admin.email);
    if (!result.ok) return { message: result.message, values: { note } };
    await recordAudit({
      actor: admin,
      action: "account_deletion.done",
      target: { type: "account_deletion", id },
      clientId: request?.clientId ?? null,
      summary: `Deleted the account of ${request?.email ?? "a client"} (${result.apps} apps; ${result.kept} paid payments kept for billing)`,
    });
  } else {
    const result = await closeAccountDeletion(
      { store, now, mail: async (key, to, values, lang) => void (await sendTemplate(key, to, values, { lang })) },
      { id, status: "cancelled", by: admin.email, note },
    );
    if (!result.ok) return { message: result.message, values: { note } };
    await recordAudit({
      actor: admin,
      action: "account_deletion.cancelled",
      target: { type: "account_deletion", id: result.request.id },
      clientId: result.request.clientId,
      summary: `Cancelled the request to delete the account of ${result.request.email}`,
    });
  }
  revalidatePath("/admin/account-deletion");
  revalidatePath("/admin", "layout");
  redirect(`/admin/account-deletion?closed=${status}`);
}
