import type { Metadata } from "next";
import { cancelInvitationAction, removeMemberAction, resendInvitationAction } from "@/app/actions/team";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { isTeamArea } from "@/lib/team/permissions";
import { InviteForm, MemberForm, type TeamAppChoice } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("team.title") };
}

const DATE_TIME: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

/**
 * 60 Dashboard › Team, for the owner: invite people, see who is on the team
 * and what each may do, change it or remove them, the invitations waiting
 * (send again, cancel), and the activity: who did what.
 */
export default async function TeamPage({ searchParams }: PageProps<"/dashboard/team">) {
  const { client, user } = await requireClient("team");
  const { t, k, date } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const [apps, members, invitations, activity] = await Promise.all([
    store.listAppsByClient(client.id),
    store.listTeamMembers(client.id),
    store.listOpenTeamInvitations(client.id),
    store.listTeamActivity(client.id, { limit: 50 }),
  ]);
  const appChoices: TeamAppChoice[] = apps.map((a) => ({ id: a.id, label: appLabel(a) === "Untitled app" ? k("Untitled app") : appLabel(a) }));
  const appNames = (ids: readonly string[] | null) => (ids ? appChoices.filter((a) => ids.includes(a.id)).map((a) => a.label).join(", ") : t("team.allApps"));
  const areasLine = (role: string, areas: readonly string[]) =>
    role === "staff"
      ? areas
          .filter(isTeamArea)
          .map((a) => t(`team.areas.${a}` as DashKey))
          .join(", ")
      : t("team.everything");
  const roleName = (role: string) => t(`team.roles.${role}` as DashKey);

  const params = await searchParams;
  const one = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : "");
  const done =
    one("done") === "resent"
      ? t("team.done.resent", { email: one("email") })
      : one("done") === "cancelled"
        ? t("team.done.cancelled")
        : one("done") === "removed"
          ? t("team.done.removed", { name: one("name") })
          : one("done") === "closed"
            ? k("This invitation isn't open any more.")
            : null;

  return (
    <>
      <PageHeader title={t("team.title")} description={t("team.intro")} />
      {done ? (
        <Notice tone={one("done") === "closed" ? "warn" : "success"} icon={one("done") === "closed" ? "info" : "check_circle"} role="status">
          {done}
        </Notice>
      ) : null}

      <Section id="invite" title={t("team.invite")} titleId="team-invite" description={t("team.inviteText")}>
        <InviteForm apps={appChoices} />
      </Section>

      <Section title={t("team.members")} titleId="team-members" flush>
        <ul className="m-0 flex list-none flex-col p-0" data-testid="team-members">
          <li className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-peach text-accent" aria-hidden="true">
              <Icon name="key" size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">
                {user.name} <span className="text-sm font-normal text-muted">({t("team.you")})</span>
              </span>
              <span className="truncate text-sm text-muted" dir="ltr">
                {user.email}
              </span>
            </div>
            <Badge tone="info">{roleName("owner")}</Badge>
          </li>
          {members.map(({ member, user: person }) => (
            <li key={person.id} data-member={person.email} className="flex flex-col gap-2 border-b border-line-soft px-5 py-4 last:border-b-0 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sand text-sm font-bold text-ink-3" aria-hidden="true">
                  {(person.name.trim()[0] ?? "?").toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{person.name}</span>
                  <span className="truncate text-sm text-muted" dir="ltr">
                    {person.email}
                  </span>
                </div>
                <Badge tone="neutral">{roleName(member.role)}</Badge>
              </div>
              <p className="m-0 text-sm text-ink-4">{areasLine(member.role, member.areas)}</p>
              {apps.length > 1 ? <p className="m-0 text-sm text-muted">{appNames(member.appIds)}</p> : null}
              <p className="m-0 text-[13px] text-muted">
                {t("team.joined", { date: date(member.createdAt) })} · {person.lastSignInAt ? t("team.lastSignIn", { date: date(person.lastSignInAt) }) : t("team.neverSignedIn")}
              </p>
              <div className="flex flex-col gap-2">
                <details className="group rounded-xl border border-line px-3.5 py-2.5">
                  <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-semibold" aria-label={t("team.editNamed", { name: person.name })}>
                    <Icon name="edit" size={18} />
                    {t("team.edit")}
                  </summary>
                  <MemberForm userId={person.id} apps={appChoices} initial={{ role: member.role, areas: member.areas, appIds: member.appIds }} />
                </details>
                <details className="rounded-xl border border-line px-3.5 py-2.5">
                  <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-semibold text-danger" aria-label={t("team.removeNamed", { name: person.name })}>
                    <Icon name="delete" size={18} />
                    {t("team.remove")}
                  </summary>
                  <form action={removeMemberAction} className="flex flex-wrap items-center justify-between gap-3 pt-3">
                    <input type="hidden" name="userId" value={person.id} />
                    <span className="text-sm text-ink-4">{t("team.removeText", { name: person.name })}</span>
                    <SubmitButton variant="danger" className="h-10 px-4 text-sm">
                      {t("team.removeConfirm")}
                    </SubmitButton>
                  </form>
                </details>
              </div>
            </li>
          ))}
          {members.length === 0 ? <li className="px-5 py-4 text-sm text-muted sm:px-6">{t("team.emptyMembers")}</li> : null}
        </ul>
      </Section>

      {invitations.length ? (
        <Section title={t("team.invitations")} titleId="team-invitations" flush>
          <ul className="m-0 flex list-none flex-col p-0" data-testid="team-invitations">
            {invitations.map((invitation) => {
              const ended = invitation.expiresAt.getTime() <= now.getTime();
              return (
                <li key={invitation.id} data-invitation={invitation.email} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4 last:border-b-0 sm:px-6">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sand text-ink-3" aria-hidden="true">
                    <Icon name="mail" size={20} />
                  </span>
                  <div className="flex min-w-0 flex-[1_1_220px] flex-col">
                    <span className="font-semibold">
                      {invitation.name} · {roleName(invitation.role)}
                    </span>
                    <span className="truncate text-sm text-muted" dir="ltr">
                      {invitation.email}
                    </span>
                    <span className="text-[13px] text-muted">
                      {t("team.sent", { date: date(invitation.sentAt, DATE_TIME) })} ·{" "}
                      {ended ? <span className="font-semibold text-danger">{t("team.expired", { date: date(invitation.expiresAt) })}</span> : t("team.expires", { date: date(invitation.expiresAt) })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={resendInvitationAction}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <SubmitButton variant="secondary" className="h-10 px-3 text-sm" aria-label={t("team.resendNamed", { email: invitation.email })}>
                        {t("team.resend")}
                      </SubmitButton>
                    </form>
                    <form action={cancelInvitationAction}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <SubmitButton variant="secondary" className="h-10 px-3 text-sm" aria-label={t("team.cancelNamed", { email: invitation.email })}>
                        {t("team.cancel")}
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title={t("team.activity")} titleId="team-activity" description={t("team.activityText")} flush>
        {activity.items.length ? (
          <ol className="m-0 flex list-none flex-col p-0" data-testid="team-activity">
            {activity.items.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line-soft px-5 py-3 last:border-b-0 sm:px-6">
                <time dateTime={entry.at.toISOString()} className="w-32 flex-none text-[13px] text-muted">
                  {date(entry.at, DATE_TIME)}
                </time>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{entry.actorName}</span> · {k(entry.summary)}
                  {entry.appId && apps.length > 1 ? <span className="text-muted"> · {appNames([entry.appId])}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 px-5 py-4 text-sm text-muted sm:px-6">{t("team.noActivity")}</p>
        )}
      </Section>
    </>
  );
}
