import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import "./market.css";

/**
 * The top of a Studio Market page in the dashboard, the designer's area and
 * the admin's queue (106): an eyebrow, the title in the market's display
 * type, a short line and the page's actions. The same markup in both art
 * directions (globals.css `.mk`): ink on the wall in light, light and
 * ember on the night in dark.
 */
export function MarketHeader({ eyebrow, title, lead, actions, back }: { eyebrow: string; title: ReactNode; lead?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-5 pt-1 pb-1 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        {back ? (
          <Link href={back.href} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100">
            <Icon name="arrow_back" size={18} />
            {back.label}
          </Link>
        ) : null}
        <span className="mk-eyebrow">{eyebrow}</span>
        <h1 className="mk-display mk-gradtext m-0 text-[34px] md:text-[46px]">{title}</h1>
        {lead ? <p className="mk-lead m-0 max-w-[640px] md:text-[17px]">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-none flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}
