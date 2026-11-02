import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, PageHeader, Section, btn } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { requireClient } from "@/lib/auth/session";
import { dayVisits, findMembers, gymDay } from "@/lib/bookings/door";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatDate } from "@/i18n/format";
import { richText } from "@/i18n/rich";
import { MemberCheckIn, NameCheckIn } from "./member-check-in";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("door.title") };
}

const TONES = { active: "success", frozen: "info", expired: "neutral", cancelled: "danger" } as const;

/** 63 A gym's door: members checked in by their member code or by name, and who came in today. */
export default async function MemberCheckInPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { app } = await requireClient("bookings");
  const { t, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "bookings" || app.vertical !== "fitness") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("door.title")} description={richText(t("door.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })} />
      </div>
    );
  }
  const query = ((await searchParams).q ?? "").trim().slice(0, 100);
  const store = await getStore();
  const now = new Date();
  const { day, zone } = gymDay(app, now);
  const [visits, found] = await Promise.all([dayVisits(store, app, day), query ? findMembers(store, app, { query, now, offset: 0, limit: 20 }) : Promise.resolve(null)]);
  const time = (at: Date) => formatDate(lang, at, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const statusLabel = { active: t("bookings.statusActive"), frozen: t("door.frozen"), expired: t("bookings.statusEnded"), cancelled: t("events.cancelled") };

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the door and the search side by side, then today's visits. */}
      <PageHeader back={{ href: "/dashboard/members", label: t("bookings.members") }} title={t("door.title")} description={t("door.intro")} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section titleId="h-door" title={t("door.checkIn")}>
          <MemberCheckIn timeZone={zone} />
        </Section>

        <Section titleId="h-by-name" title={t("door.byName")} flush>
          <form method="get" className="flex gap-2 px-5 py-4 sm:px-6" role="search">
            <label htmlFor="f-member-q" className="sr-only">
              {t("door.search")}
            </label>
            <input id="f-member-q" name="q" defaultValue={query} className="input min-w-0 flex-1" placeholder={t("door.search")} maxLength={100} />
            <button type="submit" className={`${btn.primary} h-12`}>
              <Icon name="search" size={20} />
              {t("door.find")}
            </button>
          </form>
          {found ? (
            found.items.length === 0 ? (
              <p className="m-0 border-t border-line-soft px-5 py-5 text-[15px] text-muted sm:px-6">{t("door.noMembers")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col border-t border-line-soft p-0" data-testid="member-matches">
                {found.items.map((row, i) => {
                  const name = row.user?.name ?? t("bookings.deletedAccount");
                  return (
                    <li key={row.membership.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                        <Thumb icon="person" shape="round" tint={i} />
                        <span className="flex min-w-0 flex-[1_1_160px] flex-col gap-0.5">
                          <span className="text-[15px] font-bold break-words">
                            {name} <span className="font-normal text-muted">· {row.membership.planName}</span>
                          </span>
                          {row.user?.phone ? (
                            <span className="text-[13px] text-muted" dir="ltr">
                              {row.user.phone}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          {row.checkedInAt ? <Badge tone="info">{t("door.inAt", { time: time(row.checkedInAt) })}</Badge> : null}
                          <Badge tone={TONES[row.status]}>{statusLabel[row.status]}</Badge>
                        </span>
                      </div>
                      <NameCheckIn membershipId={row.membership.id} name={name} timeZone={zone} />
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </Section>
      </div>

      <Section
        titleId="h-today"
        title={t("door.today")}
        description={
          <span data-testid="member-count" className="text-[15px] text-ink-4">
            {visits.length ? t("door.todayCount", { count: visits.length }) : t("door.nobodyYet")}
          </span>
        }
        actions={
          <Link href="/dashboard/members" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("door.membersLink")}
          </Link>
        }
        flush
      >
        {visits.length ? (
          <ol className="m-0 flex list-none flex-col p-0" data-testid="member-visits">
            {visits.map((v) => (
              <li key={v.checkIn.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
                <time dateTime={v.checkIn.at.toISOString()} className="w-16 flex-none text-[14px] font-bold tabular-nums">
                  {time(v.checkIn.at)}
                </time>
                <span className="min-w-0 flex-1 text-[15px]">
                  <b>{v.name || t("bookings.deletedAccount")}</b> · {v.planName}
                </span>
                <span className="text-[13px] text-muted">{t("door.by", { name: v.checkIn.byName })}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>
    </div>
  );
}
