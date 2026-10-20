import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";
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
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("door.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("door.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}</p>
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
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("door.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("door.intro")}</p>
      </div>

      <section aria-labelledby="h-door" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-door" className="m-0 text-lg font-bold">
          {t("door.checkIn")}
        </h2>
        <MemberCheckIn timeZone={zone} />
      </section>

      <section aria-labelledby="h-by-name" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-by-name" className="m-0 text-lg font-bold">
          {t("door.byName")}
        </h2>
        <form method="get" className="flex gap-2" role="search">
          <label htmlFor="f-member-q" className="sr-only">
            {t("door.search")}
          </label>
          <input id="f-member-q" name="q" defaultValue={query} className="input min-w-0 flex-1" placeholder={t("door.search")} maxLength={100} />
          <button type="submit" className="inline-flex h-12 items-center rounded-[10px] bg-midnight px-5 text-[15px] font-bold text-white">
            {t("door.find")}
          </button>
        </form>
        {found ? (
          found.items.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">{t("door.noMembers")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="member-matches">
              {found.items.map((row) => {
                const name = row.user?.name ?? t("bookings.deletedAccount");
                return (
                  <li key={row.membership.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[15px] font-bold">
                        {name} <span className="font-normal text-muted">· {row.membership.planName}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {row.checkedInAt ? <Badge tone="info">{t("door.inAt", { time: time(row.checkedInAt) })}</Badge> : null}
                        <Badge tone={TONES[row.status]}>{statusLabel[row.status]}</Badge>
                      </span>
                    </div>
                    {row.user?.phone ? (
                      <span className="text-[13px] text-muted" dir="ltr">
                        {row.user.phone}
                      </span>
                    ) : null}
                    <NameCheckIn membershipId={row.membership.id} name={name} timeZone={zone} />
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </section>

      <section aria-labelledby="h-today" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-today" className="m-0 text-lg font-bold">
            {t("door.today")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4" data-testid="member-count">
            {visits.length ? t("door.todayCount", { count: visits.length }) : t("door.nobodyYet")}
          </p>
        </div>
        {visits.length ? (
          <ol className="m-0 flex list-none flex-col p-0" data-testid="member-visits">
            {visits.map((v) => (
              <li key={v.checkIn.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-line-soft py-2.5 first:border-t-0">
                <time dateTime={v.checkIn.at.toISOString()} className="w-16 flex-none text-[14px] font-semibold">
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
        <Link href="/dashboard/members" className="text-sm font-semibold">
          {t("door.membersLink")}
        </Link>
      </section>
    </div>
  );
}
