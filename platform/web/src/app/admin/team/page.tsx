import type { Metadata } from "next";
import { changeAdminRoleAction, removeAdminAction, resetTeamTwoStepAction, setTeamTwoStepAction } from "@/app/actions/admin-team";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, formatDate, formatDateTime } from "@/components/ui";
import { ADMIN_ROLES, can, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/admin/permissions";
import { listTeam } from "@/lib/admin/team";
import { requireAdmin, teamTwoStepRequired } from "@/lib/auth/session";
import { hasTwoStep } from "@/lib/auth/two-step";
import { getStore } from "@/lib/data";
import { InviteForm } from "./forms";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

const DONE: Record<string, string> = {
  role: "Role changed.",
  removed: "Removed from the team. They can no longer open the admin.",
  // 70 Two-step sign-in
  required: "Two-step sign-in is now required: everyone without it sets it up before they can open the admin.",
  optional: "Two-step sign-in is no longer required. Those who have it keep it.",
  own_first: "Turn on two-step sign-in for yourself first (Your account), then require it for the team.",
  two_step_reset: "Their two-step sign-in was reset, and we emailed them. They sign in with their password only, then set it up again when the team must use it.",
};

/** The admin team and their roles (roadmap 11.7). Owners manage it; everyone sees it. */
export default async function TeamPage({ searchParams }: PageProps<"/admin/team">) {
  const admin = await requireAdmin();
  const manage = can(admin.adminRole, "team.manage");
  const { done } = await searchParams;
  const store = await getStore();
  const team = await listTeam(store);
  // 70 Who has two-step sign-in, and whether the team must use it.
  const twoStep = new Map(await Promise.all(team.filter((m) => m.userId).map(async (m) => [m.userId!, await hasTwoStep(store, m.userId!)] as const)));
  const required = await teamTwoStepRequired();

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Team</h1>
        <span className="text-[15px] text-muted">
          Who can open the admin, and what they can change. Owners from the Netlify variables (SUPER_ADMIN_EMAILS) are always owners.
        </span>
      </div>
      {typeof done === "string" && DONE[done] ? (
        <Notice tone={done === "own_first" ? "warn" : "success"} icon={done === "own_first" ? "shield" : "check_circle"} role="status">
          {DONE[done]}
        </Notice>
      ) : null}

      <section aria-labelledby="h-team-two-step" className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5">
        <h2 id="h-team-two-step" className="m-0 text-[17px] font-bold">
          Two-step sign-in
        </h2>
        <p className="m-0 text-sm text-muted">
          {required
            ? "Required: everyone on the team signs in with a code from an authenticator app after their password. Someone without it sets it up in Your account before opening anything else."
            : "Optional: each team member chooses in Your account. Requiring it makes everyone without it set it up at their next visit."}
        </p>
        {manage ? (
          <form action={setTeamTwoStepAction} className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[15px] font-semibold">
              <input type="checkbox" name="required" defaultChecked={required} className="h-[18px] w-[18px] accent-midnight" />
              Require two-step sign-in for the team
            </label>
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
              Save
            </SubmitButton>
          </form>
        ) : null}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="Team members" className="min-w-0 flex-[999_1_560px] overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Member</th>
                <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3 font-semibold">Added</th>
                <th scope="col" className="px-4 py-3 font-semibold">Two-step</th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => {
                const editable = manage && !m.bootstrap && m.userId !== null && m.userId !== admin.id;
                return (
                  <tr key={m.email} className="border-t border-line-soft">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold">{m.name}</span>
                        <span className="text-xs break-all text-muted">{m.email}</span>
                        <span className="text-xs text-muted">
                          {m.invited ? "Invited, no password yet" : `Last sign-in ${formatDateTime(m.lastSignInAt)}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {editable ? (
                        <form action={changeAdminRoleAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="userId" value={m.userId!} />
                          <label>
                            <span className="sr-only">Role of {m.email}</span>
                            <select name="role" defaultValue={m.role} className="input input-sm w-auto">
                              {ADMIN_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                            <span>
                              Change<span className="sr-only"> the role of {m.email}</span>
                            </span>
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge tone={m.role === "owner" ? "info" : "neutral"}>{ROLE_LABELS[m.role]}</Badge>
                          {m.bootstrap ? <span className="text-xs text-muted">Netlify variable</span> : null}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{m.addedAt ? `${formatDate(m.addedAt)} by ${m.addedBy}` : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={m.userId && twoStep.get(m.userId) ? "success" : "neutral"}>{m.userId && twoStep.get(m.userId) ? "On" : "Off"}</Badge>
                        {manage && m.userId && m.userId !== admin.id && twoStep.get(m.userId) ? (
                          <form action={resetTeamTwoStepAction}>
                            <input type="hidden" name="userId" value={m.userId} />
                            <SubmitButton variant="secondary" className="h-8 px-2.5 text-xs">
                              <span>
                                Reset<span className="sr-only"> the two-step sign-in of {m.email}</span>
                              </span>
                            </SubmitButton>
                          </form>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {editable ? (
                        <form action={removeAdminAction}>
                          <input type="hidden" name="userId" value={m.userId!} />
                          <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                            <span>
                              Remove<span className="sr-only"> {m.email}</span>
                            </span>
                          </SubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <aside aria-labelledby="h-invite" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
          <h2 id="h-invite" className="m-0 text-[17px] font-bold">
            {manage ? "Invite someone" : "Roles"}
          </h2>
          {manage ? (
            <InviteForm roles={ADMIN_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r], text: ROLE_DESCRIPTIONS[r] }))} />
          ) : (
            <dl className="m-0 flex flex-col gap-2 text-sm">
              {ADMIN_ROLES.map((r) => (
                <div key={r}>
                  <dt className="font-semibold">{ROLE_LABELS[r]}</dt>
                  <dd className="m-0 text-muted">{ROLE_DESCRIPTIONS[r]}</dd>
                </div>
              ))}
            </dl>
          )}
        </aside>
      </div>
    </>
  );
}
