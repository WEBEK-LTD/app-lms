import type { ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

/** Class names for buttons and button-like links, from the designs. */
export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-[10px] bg-midnight px-5 text-[15px] font-bold text-white no-underline hover:bg-ink-3 hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-white px-5 text-[15px] font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold text-midnight no-underline hover:bg-white/60 hover:text-midnight",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-[10px] border border-danger bg-white px-5 text-[15px] font-semibold text-danger no-underline hover:bg-danger-bg disabled:opacity-60",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>;
}

/**
 * The top of every dashboard page: one h1, a short line about the page and
 * the page's main actions on the right (below on phones).
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A small line above the title, like the app's name. */
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 max-w-[720px] flex-[1_1_320px] flex-col gap-1.5">
        {eyebrow ? <span className="text-sm font-semibold text-muted">{eyebrow}</span> : null}
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
        {description ? <div className="m-0 text-[15px] leading-relaxed text-ink-4">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-end gap-3">{actions}</div> : null}
    </header>
  );
}

/**
 * A white card with a heading: the one section style of the dashboard. The
 * section is named by its heading, so screen readers list it as a region.
 */
export function Section({
  id,
  title,
  titleId,
  description,
  actions,
  children,
  flush = false,
  className = "",
  level = 2,
}: {
  id?: string;
  title: ReactNode;
  /** The heading's id; the section is labelled by it. */
  titleId: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** No padding around the body: for lists that run to the card's edges. */
  flush?: boolean;
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section id={id} aria-labelledby={titleId} className={`flex min-w-0 scroll-mt-6 flex-col rounded-2xl border border-line bg-white ${className}`}>
      <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 ${flush ? "border-b border-line-soft pb-4" : ""}`}>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <Heading id={titleId} className="m-0 text-lg font-bold">
            {title}
          </Heading>
          {description ? <div className="text-sm leading-relaxed text-muted">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={flush ? "flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-4 px-5 pt-4 pb-5 sm:px-6 sm:pb-6"}>{children}</div>
    </section>
  );
}

/** What to show where a list is empty: what will be here, and the first thing to do. */
export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-line-strong bg-sand px-5 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted">
        <Icon name={icon} size={26} />
      </span>
      <p className="m-0 text-base font-bold">{title}</p>
      {children ? <div className="m-0 max-w-[440px] text-sm leading-relaxed text-muted">{children}</div> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** A thin progress bar in Ember (BRAND.md: progress fills). */
export function ProgressBar({ value, max, label, tone = "accent" }: { value: number; max: number; label: string; tone?: "accent" | "warn" | "danger" | "success" }) {
  const share = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const fill = { accent: "bg-ember", warn: "bg-warn", danger: "bg-danger", success: "bg-success" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={label}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${share * 100}%` }} />
    </div>
  );
}

type Tone = "success" | "warn" | "danger" | "neutral" | "info";

const TONE: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-line-soft text-muted",
  info: "bg-peach text-midnight",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-bold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({
  tone = "info",
  icon = "info",
  children,
  role,
}: {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
  role?: "status" | "alert";
}) {
  const colors: Record<Tone, string> = {
    info: "bg-peach text-ink-2",
    success: "bg-success-bg text-ink-2",
    warn: "bg-warn-bg text-ink-2",
    danger: "bg-danger-bg text-ink-2",
    neutral: "bg-sand text-ink-2 border border-line",
  };
  const iconColor: Record<Tone, string> = {
    info: "text-accent",
    success: "text-success",
    warn: "text-warn",
    danger: "text-danger",
    neutral: "text-muted",
  };
  return (
    <div role={role} className={`flex gap-2.5 rounded-xl px-4 py-3.5 text-[15px] leading-relaxed ${colors[tone]}`}>
      <Icon name={icon} size={22} className={iconColor[tone]} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "Not set";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "Not yet";
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}
