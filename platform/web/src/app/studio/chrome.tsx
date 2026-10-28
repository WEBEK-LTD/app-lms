import type { ReactNode } from "react";
import Link from "next/link";
import type { Lang } from "@/i18n/config";
import { Glyph, STUDIO_COLORS as C, StudioMark } from "./editor/shared";
import { ProjectPhone } from "./phone";

/**
 * 103R.3 Pieces of Yallapp Studio's own screens (its home, a new project and
 * a project's dashboard), in the approved design's colours and sizes.
 */

export { Glyph, C };

/** The dark bar on top of every Studio screen: the mark, then the screen's own parts. */
export function StudioBar({ children, home = "/studio" }: { children?: ReactNode; home?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 px-5 py-2.5" style={{ background: C.ink, color: C.ivory }}>
      <Link href={home} className="flex items-center gap-2.5 no-underline" style={{ color: C.ivory }}>
        <StudioMark />
      </Link>
      {children}
    </header>
  );
}

/** The screen around a Studio page: the board colour, the font, the reading direction. */
export function StudioScreen({ dir, lang, children }: { dir: "rtl" | "ltr"; lang: Lang; children: ReactNode }) {
  return (
    <div lang={lang} dir={dir} className="flex min-h-dvh flex-col" style={{ background: C.board, color: C.ink, fontFamily: "var(--font-studio), 'Cairo', system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

/** A project's state on its card and overview. */
export function StateBadge({ published, label }: { published: boolean; label: string }) {
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap" style={published ? { background: "#DDEBD7", color: "#1F5A32" } : { background: C.ivory, color: C.muted }}>
      {label}
    </span>
  );
}

/** "2 hours ago" in the dashboard's language. */
export function ago(iso: string, now: Date, lang: Lang): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}

export { ProjectPhone };
