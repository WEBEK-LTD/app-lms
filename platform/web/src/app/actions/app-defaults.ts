"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { parseAppDefaults } from "@/lib/pages/validate";
import { clearPlatformSettingsCache, platformSetting } from "@/lib/settings/platform";

// 11.9 Defaults for new apps: the look and languages a new app's first layout starts with.

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function saveAppDefaultsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const languages = formData.getAll("languages").map(String);
  const values: Record<string, string> = {
    template: str(formData, "template"),
    theme_mode: str(formData, "theme_mode"),
    user_can_change_mode: formData.get("user_can_change_mode") === "on" ? "on" : "",
    font: str(formData, "font"),
    corners: str(formData, "corners"),
    cards: str(formData, "cards"),
    default_language: str(formData, "default_language"),
    languages: languages.join(","),
  };
  const parsed = parseAppDefaults({
    appearance: {
      template: values.template,
      theme_mode: values.theme_mode,
      user_can_change_mode: values.user_can_change_mode === "on",
      font: values.font,
      corners: values.corners,
      cards: values.cards,
    },
    languages: { default: values.default_language, available: languages },
  });
  if (!parsed.ok) return { message: parsed.errors.join(" "), values };
  const store = await getStore();
  const before = (await platformSetting(store, "appDefaults", { fresh: true }))?.value ?? null;
  await store.setPlatformSetting("appDefaults", parsed.value, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action: "settings.save",
    target: { type: "setting", id: "appDefaults" },
    summary: "Saved the defaults for new apps",
    before,
    after: parsed.value,
  });
  revalidatePath("/admin/settings", "layout");
  return { ok: true, message: "Defaults saved. New apps start with them.", values };
}

export async function resetAppDefaultsAction(): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const before = (await platformSetting(store, "appDefaults", { fresh: true }))?.value ?? null;
  await store.setPlatformSetting("appDefaults", null, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action: "settings.reset",
    target: { type: "setting", id: "appDefaults" },
    summary: "Removed the defaults for new apps",
    before,
  });
  revalidatePath("/admin/settings", "layout");
}
