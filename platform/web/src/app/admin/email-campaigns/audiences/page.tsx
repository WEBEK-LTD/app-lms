import type { Metadata } from "next";
import { DeleteButton } from "@/components/mailing/list-actions";
import { Icon } from "@/components/icon";
import { PageHeader, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { audienceIsEveryone, resolveAudience } from "@/lib/mailing/audience";
import type { MailAudience } from "@/lib/mailing/types";
import { MailTabs } from "../shared";

export const metadata: Metadata = { title: "Audiences" };
export const dynamic = "force-dynamic";

function describe(a: MailAudience): string {
  if (audienceIsEveryone(a)) return a.includeTeam ? "Everyone, with team members" : "Every account owner";
  const parts: string[] = [];
  if (a.states?.length) parts.push(a.states.join(" or "));
  if (a.plans?.length) parts.push(`plan ${a.plans.join(" or ")}`);
  if (a.sections?.length) parts.push(a.sections.join(" or "));
  if (a.appTypes?.length) parts.push(a.appTypes.join(" or "));
  if (a.langs?.length) parts.push(a.langs.map((l) => l.toUpperCase()).join(" or "));
  if (a.countries?.length) parts.push(a.countries.join(", "));
  if (a.signedUpFrom || a.signedUpTo) parts.push(`signed up ${a.signedUpFrom ?? "…"} – ${a.signedUpTo ?? "…"}`);
  if (a.published) parts.push(a.published === "yes" ? "built an app" : "no app built");
  if (a.activeWithinDays) parts.push(`signed in within ${a.activeWithinDays} days`);
  if (a.inactiveForDays) parts.push(`away ${a.inactiveForDays}+ days`);
  if (a.emails?.length) parts.push(`${a.emails.length} chosen addresses`);
  if (a.includeTeam) parts.push("with team members");
  return parts.join(" · ");
}

/** 114 The saved audiences: the filters, and how many people they reach today. */
export default async function AudiencesPage() {
  const admin = await requireAdmin();
  const store = await getStore();
  const segments = await store.listMailSegments();
  const now = new Date();
  const counts = await Promise.all(segments.map(async (s) => (await resolveAudience(store, s.audience, { now, baseUrl: appUrl() })).people.length));
  return (
    <>
      <PageHeader title="Audiences" description="Filters saved from a campaign's Audience step (Save as an audience), to pick again in the next ones." />
      <MailTabs current="/admin/email-campaigns/audiences" />
      {segments.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-line-strong bg-white p-5 text-[14px] text-muted">None yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0">
          {segments.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3.5 first:border-t-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach text-accent">
                <Icon name="groups" size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-midnight">{s.name}</b>
                <span className="text-[13px] text-muted">{describe(s.audience)}</span>
                <span className="text-[12px] text-faint">Saved {formatDateTime(s.updatedAt)}</span>
              </span>
              <span className="text-[14px] font-bold text-midnight tabular-nums">{counts[i]!.toLocaleString("en")} people</span>
              {can(admin.adminRole, "marketing.edit") ? <DeleteButton kind="segment" id={s.id} name={s.name} /> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
