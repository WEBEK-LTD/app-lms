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
