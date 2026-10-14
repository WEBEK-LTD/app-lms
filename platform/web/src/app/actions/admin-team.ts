"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { isAdminRole, ROLE_LABELS } from "@/lib/admin/permissions";
import { isBootstrapOwner } from "@/lib/admin/team";
import { createPasswordReset } from "@/lib/auth/reset";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import { appUrl } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { sendTemplate } from "@/lib/email/send";
import { inviteAdminSchema } from "@/lib/validation";

export interface InviteState extends FormState {
  /** The set-password link of a new account, shown once to the owner who invited them. */
  link?: string;
}

/**
 * Adds someone to the admin team (roadmap 11.7). An existing account that
 * isn't a client's joins as it is; a new email gets an account without a
 * password and an email with a link to set it.
 */
export async function inviteAdminAction(_: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await requireAdmin("team.manage");
  const values = formValues(formData);
  const parsed = inviteAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { name, email, role } = parsed.data;
  if (isBootstrapOwner(email)) return { errors: { email: "This email is an owner already, from the Netlify variables." }, values };
  const store = await getStore();
  const now = new Date();
  let user = await store.getUserByEmail(email);
  if (user) {
    if (await store.getClientByUserId(user.id)) return { errors: { email: "This email belongs to a client account. Use another email." }, values };
    if (await store.getAdminMember(user.id)) return { errors: { email: "This person is on the team already." }, values };
  } else {
    try {
      user = await store.createUser({ email, name, passwordHash: null, now });
    } catch (error) {
      if (error instanceof DuplicateEmailError) return { errors: { email: "There's already an account with this email." }, values };
      throw error;
    }
  }
  await store.saveAdminMember({ userId: user.id, role, addedBy: admin.email, addedAt: now, updatedAt: now });
  await recordAudit({
    actor: admin,
    action: "team.invite",
    target: { type: "admin", id: user.id },
    summary: `Invited ${user.email} as ${ROLE_LABELS[role]}`,
    after: { email: user.email, role },
  });
  revalidatePath("/admin/team");
  if (user.passwordHash !== null) {
    return { ok: true, message: `${user.email} is on the team as ${ROLE_LABELS[role]}. They sign in with their password.` };
  }
  const reset = await createPasswordReset(store, email, now, { adminEmails: [] });
  if (!reset) return { ok: true, message: `${email} is on the team as ${ROLE_LABELS[role]}.` };
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(reset.token)}`;
  await sendTemplate("password_set", email, { name: user.name, link }).catch((error: unknown) => console.error("[mail] team invitation failed", error));
  return {
    ok: true,
    message: `${email} is on the team as ${ROLE_LABELS[role]}. We emailed them a link to set their password; it works for 1 hour. You can also send it yourself:`,
    link,
  };
}

async function memberFrom(formData: FormData) {
  const admin = await requireAdmin("team.manage");
  const userId = String(formData.get("userId") ?? "");
  const store = await getStore();
  const member = /^[0-9a-f-]{36}$/i.test(userId) ? await store.getAdminMember(userId) : null;
  const user = member ? await store.getUserById(member.userId) : null;
  // Owners from the Netlify variables, and yourself, aren't changed here.
  if (!member || !user || isBootstrapOwner(user.email) || user.id === admin.id) redirect("/admin/team");
  return { admin, store, member, user };
}

export async function changeAdminRoleAction(formData: FormData): Promise<void> {
  const { admin, store, member, user } = await memberFrom(formData);
  const role = formData.get("role");
  if (!isAdminRole(role)) redirect("/admin/team");
  if (role !== member.role) {
    await store.saveAdminMember({ ...member, role, addedBy: admin.email, updatedAt: new Date() });
    await recordAudit({
      actor: admin,
      action: "team.role",
      target: { type: "admin", id: user.id },
      summary: `Changed ${user.email} from ${ROLE_LABELS[member.role]} to ${ROLE_LABELS[role]}`,
      before: { role: member.role },
      after: { role },
    });
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?done=role");
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  const { admin, store, member, user } = await memberFrom(formData);
  await store.deleteAdminMember(user.id);
  await recordAudit({
    actor: admin,
    action: "team.remove",
    target: { type: "admin", id: user.id },
    summary: `Removed ${user.email} (${ROLE_LABELS[member.role]}) from the team`,
    before: { email: user.email, role: member.role },
  });
  revalidatePath("/admin/team");
  redirect("/admin/team?done=removed");
}
