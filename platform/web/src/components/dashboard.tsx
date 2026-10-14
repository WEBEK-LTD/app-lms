import Link from "next/link";
import type { ReactNode } from "react";
import type { AppType } from "@/lib/data/types";
import type { AccountState } from "@/lib/license/status";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { Badge } from "./ui";

/** Each app type's icon, the same in the switcher, the overview and the app type cards. */
export const APP_TYPE_ICON: Record<AppType, IconName> = { lms: "school", store: "shopping_bag", booking: "calendar_month", real_estate: "apartment" };

/** An app's state as a badge: Active, Pending activation, Paused (its plan ended) or Suspended. */
export function AppStateBadge({ state }: { state: AccountState }) {
  switch (state) {
    case "active":
      return <Badge tone="success">Active</Badge>;
    case "pending":
      return <Badge tone="warn">Pending activation</Badge>;
    case "expired":
      return <Badge tone="danger">Paused</Badge>;
    case "suspended":
      return <Badge tone="danger">Suspended</Badge>;
  }
}

/** A card that is one link: an icon, a title and a line under it. */
export function LinkCard({ href, icon, title, text, external = false }: { href: string; icon: IconName; title: string; text?: ReactNode; external?: boolean }) {
  const body = (
    <>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-ivory text-midnight">
        <Icon name={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        {text ? <span className="text-[13px] leading-snug text-muted">{text}</span> : null}
      </span>
      <Icon name={external ? "open_in_new" : "chevron_right"} size={20} className="text-muted" />
    </>
  );
  const className =
    "flex min-h-[72px] items-center gap-3.5 rounded-2xl border border-line bg-white px-4 py-3.5 text-midnight no-underline hover:border-midnight hover:text-midnight sm:px-5";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
