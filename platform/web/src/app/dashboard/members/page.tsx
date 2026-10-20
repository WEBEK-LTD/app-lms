import type { Metadata } from "next";
import Link from "next/link";
import { cancelMembershipAction } from "@/app/actions/classes";
import { unfreezeMembershipAction } from "@/app/actions/members";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { memberStatus } from "@/lib/bookings/door";
import { FREEZE_AHEAD_DAYS, freezeOf, gymDayOf } from "@/lib/bookings/freeze";
import { addDays } from "@/lib/analytics/days";
import { formatDate as formatIn } from "@/i18n/format";
import { bookingSetup } from "@/lib/bookings/setup";
import { getStore } from "@/lib/data";
import type { HostedUser } from "@/lib/data/types";
import { CreditsForm, GiveMembershipForm } from "../memberships/forms";
import { FreezeForm } from "./freeze-form";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bookings.members") };
}

const TONES = { active: "success", frozen: "info", expired: "neutral", cancelled: "danger" } as const;
const LABELS: Record<"active" | "frozen" | "expired" | "cancelled", DashKey> = { active: "bookings.statusActive", frozen: "freeze.frozen", expired: "bookings.statusEnded", cancelled: "events.cancelled" };

/** 27 Who has which membership: classes left, when it ends, and adding classes or a membership paid another way. */
export default async function MembersPage() {
  const { app } = await requireClient("bookings");
  const { t, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.members")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("bookings.plansNotHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const setup = bookingSetup(app);
  const store = await getStore();
  const now = new Date();
  const memberships = await store.listMemberships({ appId: app.id, limit: 500 });
  const users = new Map<number, HostedUser | null>();
  for (const m of memberships) if (!users.has(m.userId)) users.set(m.userId, await store.getHostedUser(app.id, m.userId));
  // Active ones first (64 frozen ones with them), then the rest, newest first.
  const current = (m: (typeof memberships)[number]) => ["active", "frozen"].includes(memberStatus(m, now));
  const rows = [...memberships].sort((a, b) => Number(!current(a)) - Number(!current(b)));
  // 64 Freezes are in the gym's days.
  const zone = setup.rules.timezone;
  const day = (at: Date) => formatIn(lang, at, { day: "numeric", month: "short", year: "numeric", timeZone: zone });
  const today = gymDayOf(app, now);
  const latest = addDays(today, FREEZE_AHEAD_DAYS);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.members")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("bookings.membersIntro")}</p>
      </div>

      {setup.membershipPlans.length ? (
        <section aria-labelledby="h-give" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-give" className="m-0 text-lg font-bold">
            {t("bookings.addMembership")}
          </h2>
          <GiveMembershipForm plans={setup.membershipPlans} />
        </section>
      ) : (
        <p className="m-0 text-[15px] text-ink-4">
          {richText(t("bookings.plansFirst"), { link: (chunk) => <Link href="/dashboard/memberships">{chunk}</Link> })}
        </p>
      )}

      <section aria-labelledby="h-members" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-members" className="m-0 text-lg font-bold">
          {t("bookings.memberships")}
        </h2>
        {rows.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("bookings.noMemberships")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((m) => {
              const user = users.get(m.userId);
              const name = user?.name ?? t("bookings.deletedAccount");
              const status = memberStatus(m, now);
              const freeze = freezeOf(m, now);
              return (
                <li key={m.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      {name} · {m.planName}
                    </span>
                    <Badge tone={TONES[status]}>{t(LABELS[status])}</Badge>
                  </div>
                  <span className="text-sm text-muted">
                    {[
                      user?.phone ?? user?.email,
                      t("bookings.from", { date: formatDate(m.startsAt, lang) }),
                      m.endsAt ? t("bookings.until", { date: formatDate(m.endsAt, lang) }) : t("bookings.noEnd"),
                      m.creditsLeft === null ? t("bookings.unlimited") : t("bookings.classesLeft", { count: m.creditsLeft }),
                      m.orderId ? t("bookings.boughtInApp") : t("bookings.addedHere"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {freeze ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sand px-3 py-2" data-testid={`frozen-${m.id}`}>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon name="pause_circle" size={18} />
                        {freeze.now
                          ? freeze.until
                            ? t("freeze.frozenUntil", { date: day(freeze.until) })
                            : t("freeze.frozenSince", { date: day(freeze.from) })
                          : [t("freeze.freezesOn", { date: day(freeze.from) }), freeze.until ? t("freeze.backOn", { date: day(freeze.until) }) : null].filter(Boolean).join(" · ")}
                      </span>
                      <form action={unfreezeMembershipAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                          {richText(freeze.now ? t("freeze.unfreeze", { name }) : t("freeze.removeFreeze", { name }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : status === "active" ? (
                    <details className="rounded-xl border border-line px-3.5 py-2">
                      <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-semibold">
                        <Icon name="pause_circle" size={18} />
                        {richText(t("freeze.freeze", { name }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
                      </summary>
                      <FreezeForm id={m.id} today={today} latest={latest} />
                    </details>
                  ) : null}
                  {status === "active" || status === "frozen" ? (
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      {m.creditsLeft !== null ? <CreditsForm id={m.id} name={name} /> : <span />}
                      <form action={cancelMembershipAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          {richText(t("bookings.endMembership", { name }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
