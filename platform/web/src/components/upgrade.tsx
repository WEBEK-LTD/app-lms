import Link from "next/link";
import type { Plan } from "@/lib/plans";
import { Icon } from "./icon";
import { btn } from "./ui";

/** Where "Upgrade" goes: the License & plugin page with the plan chosen. */
export function upgradeHref(plan: Plan): string {
  return `/dashboard/license?plan=${plan}#change-plan`;
}

/**
 * 13.1 A feature the current app's plan doesn't include: what it does and an
 * "Upgrade" button to the lowest plan that has it.
 */
export function UpgradeHint({
  title,
  children,
  to,
  compact = false,
}: {
  title: string;
  children?: React.ReactNode;
  /** The plan that has it; null when none does (then no button). */
  to: { id: Plan; name: string } | null;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-ivory ${compact ? "px-3.5 py-2.5" : "px-4 py-3.5"}`}
      data-upgrade-hint=""
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon name="lock" size={20} className="mt-0.5 text-muted" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{title}</span>
          {children ? <span className="text-sm text-muted">{children}</span> : null}
        </div>
      </div>
      {to ? (
        <Link href={upgradeHref(to.id)} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
          <Icon name="upgrade" size={18} />
          Upgrade to {to.name}
        </Link>
      ) : null}
    </div>
  );
}

/** "812 / 1,000 app users", with a bar; red from 100%, amber from 80%. */
export function UsageMeter({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  const n = new Intl.NumberFormat("en-US");
  const share = limit === null || limit === 0 ? 0 : Math.min(1, used / limit);
  const tone = limit !== null && used >= limit ? "bg-danger" : share >= 0.8 ? "bg-warn" : "bg-ember";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xl font-extrabold" data-usage="">
        {n.format(used)}
        {limit === null ? "" : ` / ${n.format(limit)}`} <span className="text-base font-semibold text-muted">{label}</span>
      </span>
      {limit === null ? (
        <span className="text-sm text-muted">No limit on your plan.</span>
      ) : (
        <div
          className="h-2 rounded-full bg-ivory"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          aria-label={`${label}: ${n.format(used)} of ${n.format(limit)}`}
        >
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
        </div>
      )}
    </div>
  );
}
