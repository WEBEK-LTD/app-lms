import type { DataStore } from "../data/store";
import type { User } from "../data/types";
import { superAdminEmails } from "../env";
import type { AdminRole } from "./permissions";

/**
 * The admin team (roadmap 11.7): SUPER_ADMIN_EMAILS are always owners (they
 * start the team and can't be removed from the admin); everyone else is in
 * admin_members with a role.
 */

export function isBootstrapOwner(email: string): boolean {
  return superAdminEmails().includes(email.toLowerCase());
}

/** The user's role in the admin, or null when they aren't on the team. */
export async function adminRoleOf(store: DataStore, user: Pick<User, "id" | "email">): Promise<AdminRole | null> {
  if (isBootstrapOwner(user.email)) return "owner";
  return (await store.getAdminMember(user.id))?.role ?? null;
}

export interface TeamRow {
  /** Null for a SUPER_ADMIN_EMAILS owner who hasn't signed in yet. */
  userId: string | null;
  email: string;
  name: string;
  role: AdminRole;
  /** From SUPER_ADMIN_EMAILS: always an owner, changed in Netlify only. */
  bootstrap: boolean;
  /** Invited and hasn't set a password yet. */
  invited: boolean;
  addedBy: string | null;
  addedAt: Date | null;
  lastSignInAt: Date | null;
}

/** The whole team: SUPER_ADMIN_EMAILS first, then members in the order they joined. */
export async function listTeam(store: DataStore): Promise<TeamRow[]> {
  const rows: TeamRow[] = [];
  for (const email of superAdminEmails()) {
    const user = await store.getUserByEmail(email);
    rows.push({
      userId: user?.id ?? null,
      email,
      name: user?.name ?? "Yallapp admin",
      role: "owner",
      bootstrap: true,
      invited: false,
      addedBy: null,
      addedAt: null,
      lastSignInAt: user?.lastSignInAt ?? null,
    });
  }
  for (const { member, user } of await store.listAdminMembers()) {
    if (isBootstrapOwner(user.email)) continue;
    rows.push({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: member.role,
      bootstrap: false,
      invited: user.passwordHash === null,
      addedBy: member.addedBy,
      addedAt: member.addedAt,
      lastSignInAt: user.lastSignInAt,
    });
  }
  return rows;
}
