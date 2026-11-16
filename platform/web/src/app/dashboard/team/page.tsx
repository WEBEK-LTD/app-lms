import type { Metadata } from "next";
import Link from "next/link";
import { cancelInvitationAction, removeMemberAction, resendInvitationAction } from "@/app/actions/team";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitDrawer, KitFold, KitHeader, KitMore, KitPage, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorFacts, KitInspectorHead, KitTable, KitTableRow } from "@/components/studio-page/table";
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

  // 132.176 The console's look: inviting is the page's one main action in Ember (its form in a drawer); everyone as one table
  // (the person, their role, their state: on the team, invited or expired), what they may do, changing it and removing them
  // in the inspector; the activity folded under it.
  const activityOpen = "person" in params || "page" in params;
  const avatar = (name: string, dark = false) => (
    <span aria-hidden="true" className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-bold ${dark ? "bg-midnight text-ivory" : "bg-(--sp-tile) text-(--sp-ink)"}`}>
      {dark ? <Icon name="key" size={19} /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
  const appsFact = (ids: readonly string[] | null) => (apps.length > 1 ? ([t("team.apps"), appNames(ids)] as const) : null);
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

      <KitSection title={t("team.members")} titleId="team-members" description={t("team.peopleCount", { count: members.length + 1, invited: invitations.length })} flush>
        <KitTable
          label={t("team.members")}
          closeLabel={closeLabel}
          media
          name={t("team.colPerson")}
          columns={[
            { label: t("team.canDo"), width: "minmax(0,1fr)", wide: true },
            { label: t("team.colRole"), width: "120px" },
          ]}
          end={{ label: t("team.colState"), width: "190px" }}
        >
          <KitTableRow
            id="owner"
            data-owner=""
            media={avatar(user.name, true)}
            name={<span className="min-w-0 truncate">{user.name}</span>}
            // "You" first: the line takes its direction from it, not from the address.
            line={
              <>
                {t("team.you")} · {roleName("owner")}
              </>
            }
            cells={[t("team.everything"), roleName("owner")]}
            end={<KitStatus tone="success">{t("team.stateActive")}</KitStatus>}
            inspector={{ label: user.name, title: t("team.colPerson") }}
          >
            <div className="flex flex-col gap-4" data-inspector-owner="">
              <KitInspectorHead top={avatar(user.name, true)} title={<bdi>{user.name}</bdi>} line={<bdi dir="ltr">{user.email}</bdi>} />
              <KitInspectorFacts
                facts={[
                  [t("team.role"), roleName("owner")],
                  [t("team.canDo"), t("team.everything")],
                  appsFact(null),
                ]}
              />
              <p className="m-0 text-[13px] leading-relaxed text-(--sp-muted)">{t("team.you")}</p>
            </div>
          </KitTableRow>
          {members.map(({ member, user: person }) => (
            <KitTableRow
              key={person.id}
              id={person.id}
              data-member={person.email}
              media={avatar(person.name)}
              name={<span className="min-w-0 truncate">{person.name}</span>}
              line={roleName(member.role)}
              cells={[
                <span key="a" className="block truncate">
                  {areasLine(member.role, member.areas)}
                  {apps.length > 1 ? ` · ${appNames(member.appIds)}` : null}
                </span>,
                roleName(member.role),
              ]}
              end={person.lastSignInAt ? <KitStatus tone="success">{t("team.stateActive")}</KitStatus> : <KitStatus tone="neutral">{t("team.neverSignedIn")}</KitStatus>}
              inspector={{ label: person.name, title: t("team.colPerson") }}
            >
              <div className="flex flex-col gap-4" data-inspector-member={person.email}>
                <KitInspectorHead top={avatar(person.name)} title={<bdi>{person.name}</bdi>} line={<bdi dir="ltr">{person.email}</bdi>} />
                <KitInspectorFacts
                  facts={[
                    [t("team.role"), roleName(member.role)],
                    [t("team.canDo"), areasLine(member.role, member.areas)],
                    appsFact(member.appIds),
                    [t("team.dates"), t("team.joined", { date: date(member.createdAt) })],
                    [t("team.colState"), person.lastSignInAt ? t("team.lastSignIn", { date: date(person.lastSignInAt) }) : t("team.neverSignedIn")],
                  ]}
                />
                <section aria-label={t("team.editNamed", { name: person.name })} className="flex flex-col gap-1">
                  <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
                    <Icon name="edit" size={18} />
                    {t("team.edit")}
                  </h3>
                  <MemberForm userId={person.id} apps={appChoices} initial={{ role: member.role, areas: member.areas, appIds: member.appIds }} />
                </section>
                <details className="group rounded-[14px] bg-danger-bg">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-[14px] px-4 py-2.5 text-sm font-semibold text-danger [&::-webkit-details-marker]:hidden" aria-label={t("team.removeNamed", { name: person.name })}>
                    <Icon name="delete" size={19} />
                    <span className="min-w-0 flex-1">{t("team.remove")}</span>
                    <Icon name="expand_more" size={20} className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <form action={removeMemberAction} className="kit-fold-body flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
                    <input type="hidden" name="userId" value={person.id} />
                    <span className="min-w-0 flex-[1_1_200px] text-sm text-(--sp-ink)">{t("team.removeText", { name: person.name })}</span>
                    <SubmitButton variant="danger" className="h-10 px-4 text-sm">
                      {t("team.removeConfirm")}
                    </SubmitButton>
                  </form>
                </details>
              </div>
            </KitTableRow>
          ))}
          {invitations.map((invitation) => {
            const ended = invitation.expiresAt.getTime() <= now.getTime();
            return (
              <KitTableRow
                key={invitation.id}
                id={invitation.id}
                data-invitation={invitation.email}
                media={<KitThumb icon="mail" size={40} />}
                name={
                  <span className="min-w-0 truncate" dir="auto">
                    {invitation.name}
                  </span>
                }
                line={roleName(invitation.role)}
                cells={[<bdi key="e" dir="ltr" className="block truncate text-(--sp-muted)">{invitation.email}</bdi>, roleName(invitation.role)]}
                end={ended ? <KitStatus tone="danger">{t("team.expired", { date: date(invitation.expiresAt) })}</KitStatus> : <KitStatus tone="warn">{t("team.stateInvited")}</KitStatus>}
                inspector={{
                  label: invitation.name,
                  title: t("team.invitation"),
                  actions: (
                    <KitMore label={t("studioPage.more")} look="row">
                      <form action={cancelInvitationAction}>
                        <input type="hidden" name="id" value={invitation.id} />
                        <button type="submit" className={`${kit.menuItem} text-danger hover:text-danger`} aria-label={t("team.cancelNamed", { email: invitation.email })}>
                          <Icon name="cancel" size={18} />
                          {t("team.cancel")}
                        </button>
                      </form>
                    </KitMore>
                  ),
                  footer: (
                    <form action={resendInvitationAction}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <SubmitButton variant="main" className={`${kit.main} w-full`}>
                        <Icon name="send" size={18} />
                        <span aria-hidden="true">{t("team.resend")}</span>
                        <span className="sr-only">{t("team.resendNamed", { email: invitation.email })}</span>
                      </SubmitButton>
                    </form>
                  ),
                }}
              >
                <div className="flex flex-col gap-4" data-inspector-invitation={invitation.email}>
                  <KitInspectorHead top={<KitThumb icon="mail" size={44} />} title={<bdi>{invitation.name}</bdi>} line={<bdi dir="ltr">{invitation.email}</bdi>} />
                  <KitInspectorFacts
                    facts={[
                      [t("team.role"), roleName(invitation.role)],
                      [t("team.canDo"), areasLine(invitation.role, invitation.areas)],
                      appsFact(invitation.appIds),
                      [t("team.colState"), t("team.sent", { date: date(invitation.sentAt, DATE_TIME) })],
                      [t("team.dates"), ended ? t("team.expired", { date: date(invitation.expiresAt) }) : t("team.expires", { date: date(invitation.expiresAt) })],
                    ]}
                  />
                </div>
              </KitTableRow>
            );
          })}
        </KitTable>
        {members.length === 0 && invitations.length === 0 ? <p className="m-0 border-t border-(--sp-line) px-5 py-4 text-sm text-(--sp-muted)">{t("team.emptyMembers")}</p> : null}
      </KitSection>

      <div id="team-activity" className="scroll-mt-6">
        <KitFold summary={t("team.activity")} icon="history" open={activityOpen}>
          <p className="m-0 text-[13.5px] text-(--sp-muted)">{t("team.activityText")}</p>
          {people.length > 1 ? (
            <form method="get" action="/dashboard/team#team-activity" className="flex flex-wrap items-end gap-2" data-testid="team-activity-filter">
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
            <ol className="m-0 flex list-none flex-col rounded-xl border border-(--sp-line) bg-(--sp-surface) p-0" data-testid="team-activity">
              {activity.items.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-(--sp-line) px-4 py-3 first:border-t-0">
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
            <p className="m-0 text-sm text-(--sp-muted)">{t("team.noActivity")}</p>
          )}
          {pages > 1 ? (
            <nav aria-label={t("team.activityPages")} className="flex items-center justify-between gap-3 text-sm" data-testid="team-activity-pages">
              {page > 1 ? <Link href={activityHref(page - 1)}>{t("listings.newer")}</Link> : <span />}
              <span className="text-(--sp-muted)">{t("common.page", { page, pages })}</span>
              {page < pages ? <Link href={activityHref(page + 1)}>{t("listings.older")}</Link> : <span />}
            </nav>
          ) : null}
        </KitFold>
      </div>
    </KitPage>
  );
}
