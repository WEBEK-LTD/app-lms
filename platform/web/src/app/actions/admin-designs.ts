"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { addDesignFromApp, deleteTeamDesign, editTeamDesign, setBuiltInDesignHidden, TEAM_DESIGN_LIMITS, type TeamDesignError } from "@/lib/pages/designs/team";

/** 84.4 Admin › Designs: the team's own designs, and the built-in ones it hides. */

const MESSAGES: Record<TeamDesignError, string> = {
  name: `Give the design a name, in up to ${TEAM_DESIGN_LIMITS.nameChars} characters.`,
  description: `Describe it in one line, in up to ${TEAM_DESIGN_LIMITS.descriptionChars} characters.`,
  limit: `There are ${TEAM_DESIGN_LIMITS.max} team designs, the most kept. Delete one first.`,
  app: "No app has this ID. Copy it from the app's section on the client's page.",
  invalid: "The app's draft has a problem to fix first",
  not_found: "This design no longer exists.",
};

const ID = /^[0-9a-f-]{36}$/i;

/** A new design from an app's draft (the page editor is where it's built). */
export async function addDesignAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const appId = String(formData.get("appId") ?? "").trim();
  const values = { appId, name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? "") };
  const app = ID.test(appId) ? await store.getAppById(appId) : null;
  const added = await addDesignFromApp(store, app, values, admin.email, new Date());
  if (!added.ok) {
    const field = added.error === "app" || added.error === "invalid" ? "appId" : added.error === "limit" ? null : added.error;
    const message = added.error === "invalid" ? `${MESSAGES.invalid}: ${added.detail ?? ""}` : MESSAGES[added.error];
    return field ? { errors: { [field]: message }, values } : { message, values };
  }
  await recordAudit({
    actor: admin,
    action: "design.add",
    target: { type: "design", id: added.design.id },
    clientId: app?.clientId ?? null,
    summary: `Added the ${added.design.name} design for ${added.design.kind} apps, from an app's draft`,
    after: { name: added.design.name, kind: added.design.kind, pages: added.design.pages.length },
  });
  revalidatePath("/admin/designs");
  return { ok: true, message: `Added. Owners of ${added.design.kind} apps can choose ${added.design.name} now.` };
}

export async function editDesignAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const id = String(formData.get("id") ?? "");
  const values = { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? "") };
  const edited = await editTeamDesign(await getStore(), id, values, admin.email, new Date());
  if (!edited.ok) return edited.error === "not_found" ? { message: MESSAGES.not_found, values } : { errors: { [edited.error]: MESSAGES[edited.error] }, values };
  await recordAudit({ actor: admin, action: "design.edit", target: { type: "design", id }, summary: `Renamed or described the ${values.name.trim()} design`, after: values });
  revalidatePath("/admin/designs");
  return { ok: true, message: "Saved." };
}

export async function deleteDesignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const id = String(formData.get("id") ?? "");
  if (await deleteTeamDesign(await getStore(), id, admin.email, new Date())) {
    await recordAudit({ actor: admin, action: "design.delete", target: { type: "design", id }, summary: "Deleted a team design (apps that used it keep their pages)" });
  }
  revalidatePath("/admin/designs");
}

export async function hideDesignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const id = String(formData.get("id") ?? "");
  const hidden = formData.get("hidden") === "1";
  if (await setBuiltInDesignHidden(await getStore(), id, hidden, admin.email, new Date())) {
    await recordAudit({ actor: admin, action: "design.hide", target: { type: "design", id }, summary: `${hidden ? "Hid" : "Showed again"} the built-in design ${id}` });
  }
  revalidatePath("/admin/designs");
}
