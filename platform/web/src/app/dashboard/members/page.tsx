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

export const metadata: Metadata = { title: "Members" };

const TONES = { active: "success", expired: "neutral", cancelled: "danger" } as const;
const LABELS = { active: "Active", expired: "Ended", cancelled: "Cancelled" } as const;

/** 27 Who has which membership: classes left, when it ends, and adding classes or a membership paid another way. */
export default async function MembersPage() {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Members</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Memberships are for businesses without a website. To sell them here, choose &quot;I don&apos;t have a website&quot; on the{" "}
          <Link href="/dashboard/setup?step=website">Website step</Link>.
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
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Members</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Who has which membership. Members bought in the app start at once; add one here for someone who paid at your desk.
        </p>
      </div>

      {setup.membershipPlans.length ? (
        <section aria-labelledby="h-give" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-give" className="m-0 text-lg font-bold">
            Add a membership
          </h2>
          <GiveMembershipForm plans={setup.membershipPlans} />
        </section>
      ) : (
        <p className="m-0 text-[15px] text-ink-4">
          Add your plans on the <Link href="/dashboard/memberships">Membership plans</Link> page first.
        </p>
      )}

      <section aria-labelledby="h-members" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-members" className="m-0 text-lg font-bold">
          Memberships
        </h2>
        {rows.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No memberships yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((m) => {
              const user = users.get(m.userId);
              const name = user?.name ?? "A deleted account";
              const status = membershipStatus(m, now);
              return (
                <li key={m.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      {name} · {m.planName}
                    </span>
                    <Badge tone={TONES[status]}>{LABELS[status]}</Badge>
                  </div>
                  <span className="text-sm text-muted">
                    {[user?.phone ?? user?.email, `From ${formatDate(m.startsAt)}`, m.endsAt ? `until ${formatDate(m.endsAt)}` : "no end date", m.creditsLeft === null ? "unlimited classes" : `${m.creditsLeft} ${m.creditsLeft === 1 ? "class" : "classes"} left`, m.orderId ? "bought in the app" : "added here"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {status === "active" ? (
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      {m.creditsLeft !== null ? <CreditsForm id={m.id} name={name} /> : <span />}
                      <form action={cancelMembershipAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          End membership<span className="sr-only"> of {name}</span>
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
