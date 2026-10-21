"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { parseInvoiceLines } from "@/lib/receipts/invoice-setting";
import { clearPlatformSettingsCache, platformSetting } from "@/lib/settings/platform";

// 71 Settings › Invoices: the lines under Yallapp's name on the receipts of its plans.

export async function saveInvoiceSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const text = String(formData.get("lines") ?? "");
  const parsed = parseInvoiceLines(text);
  if (!parsed.ok) return { errors: { lines: parsed.error }, values: { lines: text } };
  const store = await getStore();
  const before = (await platformSetting(store, "invoice", { fresh: true }))?.value ?? null;
  const value = parsed.lines.length ? { lines: parsed.lines } : null;
  await store.setPlatformSetting("invoice", value, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action: value ? "settings.save" : "settings.reset",
    target: { type: "setting", id: "invoice" },
    summary: value ? "Saved the lines on Yallapp's receipts" : "Removed the lines on Yallapp's receipts",
    before,
    after: value,
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: value ? "Saved. Receipts made from now on show these lines." : "Removed. Receipts show Yallapp's name, city and contact details only.", values: { lines: parsed.lines.join("\n") } };
}
