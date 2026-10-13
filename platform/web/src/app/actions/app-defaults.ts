"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { parseAppDefaults } from "@/lib/pages/validate";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

// 11.9 Defaults for new apps: the look and languages a new app's first layout starts with.

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function saveAppDefaultsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
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
  await store.setPlatformSetting("appDefaults", parsed.value, admin.email, new Date());
  clearPlatformSettingsCache();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Defaults saved. New apps start with them.", values };
}

export async function resetAppDefaultsAction(): Promise<void> {
  const admin = await requireAdmin();
  const store = await getStore();
  await store.setPlatformSetting("appDefaults", null, admin.email, new Date());
  clearPlatformSettingsCache();
  revalidatePath("/admin/settings");
}
