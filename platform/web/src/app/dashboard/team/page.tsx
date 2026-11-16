import type { Metadata } from "next";
import Link from "next/link";
import { cancelInvitationAction, removeMemberAction, resendInvitationAction } from "@/app/actions/team";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitDrawer, KitFact, KitFacts, KitHeader, KitMore, KitPage, KitRow, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
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
/** 64 Activity entries a page. */
const ACTIVITY_PER_PAGE = 50;

const AVATAR = "flex h-11 w-11 flex-none items-center justify-center rounded-full text-[15px] font-bold";

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
  const params = await searchParams;
  const one = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : "");
  const [apps, members, invitations] = await Promise.all([store.listAppsByClient(client.id), store.listTeamMembers(client.id), store.listOpenTeamInvitations(client.id)]);
  // 64 The activity, newest first, a page at a time, of everyone or one person on the team.
  const people = [{ id: user.id, name: user.name }, ...members.map(({ user: person }) => ({ id: person.id, name: person.name }))];
  const person = people.find((p) => p.id === one("person"))?.id ?? null;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one("page") || "1", 10) || 1));
  const activity = await store.listTeamActivity(client.id, { limit: ACTIVITY_PER_PAGE, offset: (page - 1) * ACTIVITY_PER_PAGE, ...(person ? { actorId: person } : {}) });
  const pages = Math.max(1, Math.ceil(activity.total / ACTIVITY_PER_PAGE));
  const activityHref = (to: number) => `/dashboard/team?${new URLSearchParams({ ...(person ? { person } : {}), page: String(to) }).toString()}#team-activity`;
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
  const closeLabel = t("common.close");

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

  // 132.142 The premium kit: inviting is the page's one main action (its form in a drawer); each person a row with their role as a pill,
  // what they may do, changing it and removing them in their own drawer; the invitations waiting as rows; then the activity.
  return (
    <KitPage>
      <KitHeader
        icon="groups"
        title={t("team.title")}
        description={t("team.line")}
        help={t("team.intro")}
        helpLabel={t("studioPage.help")}
        actions={
          <KitDrawer
            title={t("team.invite")}
            description={t("team.inviteText")}
            closeLabel={closeLabel}
            triggerClassName={kit.main}
            trigger={
              <>
                <Icon name="add" size={20} />
                {t("team.invite")}
              </>
            }
          >
            <section aria-label={t("team.invite")} id="invite">
              <InviteForm apps={appChoices} />
            </section>
          </KitDrawer>
        }
      />
      {done ? (
        <KitCallout tone={one("done") === "closed" ? "warn" : "success"} icon={one("done") === "closed" ? "info" : "check_circle"} role="status">
          {done}
        </KitCallout>
      ) : null}

      <KitSection title={t("team.members")} titleId="team-members" flush>
        <ul className="m-0 flex list-none flex-col px-2 sm:px-4" data-testid="team-members">
          <KitRow
            media={
              <span aria-hidden="true" className={`${AVATAR} bg-midnight text-ivory`}>
                <Icon name="key" size={20} />
              </span>
            }
            title={
              <>
                {user.name} <span className="text-[13px] font-normal text-(--sp-muted)">({t("team.you")})</span>
              </>
            }
            meta={<bdi dir="ltr">{user.email}</bdi>}
            aside={<KitStatus tone="info">{roleName("owner")}</KitStatus>}
          />
          {members.map(({ member, user: person }) => (
            <li key={person.id} data-member={person.email} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) px-3 py-1.5 sm:px-4">
              <KitDrawer
                closeLabel={closeLabel}
                title={person.name}
                description={<bdi dir="ltr">{person.email}</bdi>}
                trigger={
                  <>
                    <span aria-hidden="true" className={`${AVATAR} bg-(--sp-tile) text-(--sp-ink)`}>
                      {(person.name.trim()[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[15px] font-semibold break-words">{person.name}</span>
                      <span className="text-[13px] break-words text-(--sp-muted)">
                        {areasLine(member.role, member.areas)}
                        {apps.length > 1 ? ` · ${appNames(member.appIds)}` : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 max-sm:basis-full max-sm:ps-15">
                      <KitStatus tone="neutral">{roleName(member.role)}</KitStatus>
                    </span>
                  </>
                }
                triggerClassName="group -mx-2 flex min-w-0 flex-[1_1_300px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-0 bg-transparent px-2 py-2 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap"
              >
                <KitFacts>
                  <KitFact label={t("team.role")}>{roleName(member.role)}</KitFact>
                  <KitFact label={t("team.canDo")}>{areasLine(member.role, member.areas)}</KitFact>
                  {apps.length > 1 ? <KitFact label={t("team.apps")}>{appNames(member.appIds)}</KitFact> : null}
                  <KitFact label={t("team.dates")}>
                    {t("team.joined", { date: date(member.createdAt) })}
                    <span className="block text-[13px] font-normal text-(--sp-muted)">
                      {person.lastSignInAt ? t("team.lastSignIn", { date: date(person.lastSignInAt) }) : t("team.neverSignedIn")}
                    </span>
                  </KitFact>
                </KitFacts>
                <section aria-label={t("team.editNamed", { name: person.name })} className="flex flex-col gap-1 rounded-2xl bg-(--sp-soft) p-4 sm:p-5">
                  <h3 className="m-0 flex items-center gap-2 text-base font-bold">
                    <Icon name="edit" size={18} />
                    {t("team.edit")}
                  </h3>
                  <MemberForm userId={person.id} apps={appChoices} initial={{ role: member.role, areas: member.areas, appIds: member.appIds }} />
                </section>
                <details className="group rounded-2xl bg-danger-bg">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-danger [&::-webkit-details-marker]:hidden" aria-label={t("team.removeNamed", { name: person.name })}>
                    <Icon name="delete" size={19} />
                    <span className="min-w-0 flex-1">{t("team.remove")}</span>
                    <Icon name="expand_more" size={20} className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <form action={removeMemberAction} className="kit-fold-body flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
                    <input type="hidden" name="userId" value={person.id} />
                    <span className="min-w-0 flex-[1_1_220px] text-sm text-(--sp-ink)">{t("team.removeText", { name: person.name })}</span>
                    <SubmitButton variant="danger" className="h-10 px-4 text-sm">
                      {t("team.removeConfirm")}
                    </SubmitButton>
                  </form>
                </details>
              </KitDrawer>
            </li>
          ))}
          {members.length === 0 ? <li className="border-t border-(--sp-line-soft) px-3 py-4 text-sm text-(--sp-muted) sm:px-4">{t("team.emptyMembers")}</li> : null}
        </ul>
      </KitSection>

      {invitations.length ? (
        <KitSection title={t("team.invitations")} titleId="team-invitations" flush>
          <ul className="m-0 flex list-none flex-col px-2 sm:px-4" data-testid="team-invitations">
            {invitations.map((invitation) => {
              const ended = invitation.expiresAt.getTime() <= now.getTime();
              return (
                <KitRow
                  key={invitation.id}
                  data-invitation={invitation.email}
                  media={<KitThumb icon="mail" size={40} />}
                  title={`${invitation.name} · ${roleName(invitation.role)}`}
                  meta={
                    <>
                      <bdi dir="ltr">{invitation.email}</bdi> · {t("team.sent", { date: date(invitation.sentAt, DATE_TIME) })}
                    </>
                  }
                  aside={
                    ended ? <KitStatus tone="danger">{t("team.expired", { date: date(invitation.expiresAt) })}</KitStatus> : <KitStatus tone="neutral">{t("team.expires", { date: date(invitation.expiresAt) })}</KitStatus>
                  }
                  actions={
                    <>
                      <form action={resendInvitationAction}>
                        <input type="hidden" name="id" value={invitation.id} />
                        <SubmitButton variant="pill" className="h-9 cursor-pointer" aria-label={t("team.resendNamed", { email: invitation.email })}>
                          {t("team.resend")}
                        </SubmitButton>
                      </form>
                      <KitMore label={t("studioPage.more")}>
                        <form action={cancelInvitationAction}>
                          <input type="hidden" name="id" value={invitation.id} />
                          <SubmitButton variant="ghost" className="h-10 w-full justify-start px-3 text-sm" aria-label={t("team.cancelNamed", { email: invitation.email })}>
                            <Icon name="cancel" size={18} />
                            {t("team.cancel")}
                          </SubmitButton>
                        </form>
                      </KitMore>
                    </>
                  }
                />
              );
            })}
          </ul>
        </KitSection>
      ) : null}

      <KitSection title={t("team.activity")} titleId="team-activity" help={t("team.activityText")} helpLabel={t("studioPage.helpSection")} flush>
        {people.length > 1 ? (
          <form method="get" action="/dashboard/team#team-activity" className="flex flex-wrap items-end gap-2 px-5 pb-3 sm:px-8" data-testid="team-activity-filter">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="f-activity-person" className="text-[13px] font-semibold text-(--sp-muted)">
                {t("team.activityPerson")}
              </label>
              <select id="f-activity-person" name="person" defaultValue={person ?? ""} className={`${kit.field} min-w-48`}>
                <option value="">{t("team.activityEveryone")}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={kit.quiet}>
              {t("team.activityShow")}
            </button>
          </form>
        ) : null}
        {activity.items.length ? (
          <ol className="m-0 flex list-none flex-col px-2 sm:px-4" data-testid="team-activity">
            {activity.items.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-(--sp-line-soft) px-3 py-3 first:border-t-0 sm:px-4">
                <time dateTime={entry.at.toISOString()} className="w-32 flex-none text-[13px] text-(--sp-muted) tabular-nums">
                  {date(entry.at, DATE_TIME)}
                </time>
                <span className="min-w-0 flex-[1_1_220px] text-sm text-(--sp-ink)">
                  <span className="font-semibold">{entry.actorName}</span> · {k(entry.summary)}
                  {entry.appId && apps.length > 1 ? <span className="text-(--sp-muted)"> · {appNames([entry.appId])}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 px-5 py-4 text-sm text-(--sp-muted) sm:px-8">{t("team.noActivity")}</p>
        )}
        {pages > 1 ? (
          <nav aria-label={t("team.activityPages")} className="flex items-center justify-between gap-3 border-t border-(--sp-line-soft) px-5 pt-3 text-sm sm:px-8" data-testid="team-activity-pages">
            {page > 1 ? <Link href={activityHref(page - 1)}>{t("listings.newer")}</Link> : <span />}
            <span className="text-(--sp-muted)">{t("common.page", { page, pages })}</span>
            {page < pages ? <Link href={activityHref(page + 1)}>{t("listings.older")}</Link> : <span />}
          </nav>
        ) : null}
      </KitSection>
    </KitPage>
  );
}
