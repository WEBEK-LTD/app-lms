import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge } from "@/components/ui";
import { adminCan } from "@/lib/auth/session";
import type { MailCampaignStatus } from "@/lib/mailing/types";

/** 114 Admin › Email campaigns: the status as a badge. */
export const STATUS: Record<MailCampaignStatus, { label: string; tone: "success" | "warn" | "danger" | "neutral" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  sending: { label: "Sending", tone: "warn" },
  paused: { label: "Paused", tone: "warn" },
  sent: { label: "Sent", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function StatusBadge({ status }: { status: MailCampaignStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/email-campaigns", label: "Campaigns", icon: "mail" },
  { href: "/admin/email-campaigns/templates", label: "Templates", icon: "dashboard_customize" },
  { href: "/admin/email-campaigns/audiences", label: "Audiences", icon: "groups" },
  { href: "/admin/email-campaigns/contacts", label: "Contacts", icon: "person" },
  { href: "/admin/email-campaigns/never-mailed", label: "Never mailed", icon: "block" },
];

/** The section's own tabs, under each page's header. Contacts only for the team members who write campaigns. */
export async function MailTabs({ current }: { current: string }) {
  const contacts = await adminCan("marketing.edit");
  return (
    <nav aria-label="Email campaigns" className="flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5">
      {TABS.filter((tab) => contacts || tab.href !== "/admin/email-campaigns/contacts").map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[14px] font-semibold no-underline ${tab.href === current ? "bg-midnight text-ivory hover:text-ivory" : "text-ink-3 hover:bg-sand hover:text-midnight"}`}
        >
          <Icon name={tab.icon} size={19} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function percent(part: number, whole: number): string {
  if (!whole) return "–";
  const value = (part / whole) * 100;
  return `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
}
