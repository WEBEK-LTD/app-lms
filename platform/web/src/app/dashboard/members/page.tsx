import type { Metadata } from "next";
import Link from "next/link";
import { cancelMembershipAction } from "@/app/actions/classes";
import { unfreezeMembershipAction } from "@/app/actions/members";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section, formatDate } from "@/components/ui";
import { LinkCards, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, SheetButton } from "@/components/page-kit-client";
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
      <div className="flex flex-col gap-6">
        <PageHeader title={t("bookings.members")} description={richText(t("bookings.plansNotHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
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

  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  const count = (status: keyof typeof TONES) => rows.filter((m) => memberStatus(m, now) === status).length;
  const fitness = app.vertical === "fitness";

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the door and plans, adding a membership, then the members. */}
      <PageHeader
        title={t("bookings.members")}
        description={t("bookings.membersIntro")}
        actions={
          setup.membershipPlans.length ? (
            <SheetButton target="add-membership" icon="add">
              {t("bookings.addMembership")}
            </SheetButton>
          ) : null
        }
      />

      {rows.length ? (
        <StatRow label={t("bookings.memberships")}>
          <Stat icon="card_membership" tone="success" label={t("bookings.statusActive")} value={count("active")} />
          <Stat icon="pause_circle" tone="accent" label={t("freeze.frozen")} value={count("frozen")} />
          <Stat icon="event_busy" tone="neutral" label={t("bookings.statusEnded")} value={count("expired") + count("cancelled")} />
        </StatRow>
      ) : null}

      <LinkCards
        label={t("bookings.membersTools")}
        items={[
          ...(fitness ? [{ href: "/dashboard/members/check-in", icon: "qr_code_scanner" as const, label: t("door.title"), hint: t("bookings.checkInHint") }] : []),
          { href: "/dashboard/memberships", icon: "card_membership", label: t("bookings.plansTitle"), hint: t("bookings.plansCount", { count: setup.membershipPlans.length }) },
        ]}
      />

      {setup.membershipPlans.length ? (
        <Section id="add-membership" titleId="h-give" title={t("bookings.addMembership")} description={t("bookings.giveHint")}>
          <GiveMembershipForm plans={setup.membershipPlans} />
        </Section>
      ) : (
        <Notice tone="info" icon="info">
          {richText(t("bookings.plansFirst"), { link: (chunk) => <Link href="/dashboard/memberships">{chunk}</Link> })}
        </Notice>
      )}

      <Section titleId="h-members" title={t("bookings.memberships")} flush>
        {rows.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="card_membership" title={t("bookings.noMemberships")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("bookings.membersSearch")}
            noMatch={t("bookings.membersNoMatch")}
            filters={(["active", "frozen", "expired", "cancelled"] as const).map((value) => ({ value, label: t(LABELS[value]) }))}
            items={rows.map((m, i) => {
              const user = users.get(m.userId);
              const name = user?.name ?? t("bookings.deletedAccount");
              const status = memberStatus(m, now);
              const freeze = freezeOf(m, now);
              return {
                id: m.id,
                text: [name, user?.phone, user?.email, m.planName].filter(Boolean).join(" "),
                group: status,
                node: (
                  <li className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                      <Thumb icon="person" shape="round" tint={i} />
                      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                        <span className="text-[15px] font-bold break-words">
                          {name} · {m.planName}
                        </span>
                        <span className="text-[13px] text-muted" dir="auto">
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
                      </span>
                      <Badge tone={TONES[status]}>{t(LABELS[status])}</Badge>
                    </div>
                    {freeze ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand px-4 py-2.5" data-testid={`frozen-${m.id}`}>
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
                            {richText(freeze.now ? t("freeze.unfreeze", { name }) : t("freeze.removeFreeze", { name }), sr)}
                          </SubmitButton>
                        </form>
                      </div>
                    ) : null}
                    {status === "active" || status === "frozen" ? (
                      <div className="flex flex-wrap items-end gap-3">
                        {m.creditsLeft !== null ? <CreditsForm id={m.id} name={name} /> : null}
                        {!freeze && status === "active" ? (
                          <details className="group min-w-0 flex-[1_1_260px] rounded-xl border border-line-soft">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                              <Icon name="pause_circle" size={18} className="text-muted" />
                              <span className="flex-1">{richText(t("freeze.freeze", { name }), sr)}</span>
                              <Icon name="expand_more" size={18} className="text-muted transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="border-t border-line-soft px-3.5 pb-3.5">
                              <FreezeForm id={m.id} today={today} latest={latest} />
                            </div>
                          </details>
                        ) : null}
                        <form action={cancelMembershipAction} className="ms-auto">
                          <input type="hidden" name="id" value={m.id} />
                          <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                            {richText(t("bookings.endMembership", { name }), sr)}
                          </SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </li>
                ),
              };
            })}
          />
        )}
      </Section>
    </div>
  );
}
