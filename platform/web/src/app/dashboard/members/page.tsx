import type { Metadata } from "next";
import Link from "next/link";
import { cancelMembershipAction } from "@/app/actions/classes";
import { SubmitButton } from "@/components/form";
import { Badge, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { membershipStatus } from "@/lib/bookings/memberships";
import { bookingSetup } from "@/lib/bookings/setup";
import { getStore } from "@/lib/data";
import type { HostedUser } from "@/lib/data/types";
import { CreditsForm, GiveMembershipForm } from "../memberships/forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bookings.members") };
}

const TONES = { active: "success", expired: "neutral", cancelled: "danger" } as const;
const LABELS: Record<"active" | "expired" | "cancelled", DashKey> = { active: "bookings.statusActive", expired: "bookings.statusEnded", cancelled: "events.cancelled" };

/** 27 Who has which membership: classes left, when it ends, and adding classes or a membership paid another way. */
export default async function MembersPage() {
  const { app } = await requireClient();
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
  // Active ones first, then the rest, newest first.
  const rows = [...memberships].sort((a, b) => Number(membershipStatus(a, now) !== "active") - Number(membershipStatus(b, now) !== "active"));

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
              const status = membershipStatus(m, now);
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
                  {status === "active" ? (
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
