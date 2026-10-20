"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closeAccountDeletion } from "@/lib/account/deletion";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import type { FormState } from "@/lib/forms";

/**
 * 66 Admin › Account deletion: our team marks a request done (once the
 * account was deleted by hand: the person who asked is emailed) or cancels
 * it (the client changed their mind, or it wasn't theirs). Owners and admins
 * only (`clients.suspend`), and in the audit log.
 */
export async function closeAccountDeletionAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.suspend");
  const status = formData.get("status") === "done" ? "done" : "cancelled";
  const note = String(formData.get("note") ?? "");
  if (status === "done" && formData.get("deleted") !== "on") {
    return { errors: { deleted: "Tick this once the account and its files are deleted." }, values: { note } };
  }
  const store = await getStore();
  const result = await closeAccountDeletion(
    { store, now: new Date(), mail: async (key, to, values, lang) => void (await sendTemplate(key, to, values, { lang })) },
    { id: String(formData.get("id") ?? ""), status, by: admin.email, note },
  );
  if (!result.ok) return { message: result.message, values: { note } };
  await recordAudit({
    actor: admin,
    action: status === "done" ? "account_deletion.done" : "account_deletion.cancelled",
    target: { type: "account_deletion", id: result.request.id },
    clientId: result.request.clientId,
    summary: status === "done" ? `Deleted the account of ${result.request.email}` : `Cancelled the request to delete the account of ${result.request.email}`,
  });
  revalidatePath("/admin/account-deletion");
  revalidatePath("/admin", "layout");
  redirect(`/admin/account-deletion?closed=${status}`);
}
