"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { localeInfo } from "@/lib/i18n/locales";
import { fixHref as studioFixHref } from "@/lib/studio/app-check-links";
import type { AppProblem } from "@/lib/studio/app-check-rules";

/**
 * 182 What the app check found, for the owner: errors first, each in a plain
 * sentence with where it is (the page, the language) and a Fix link that
 * opens Studio on that element. Studio's Publish and Builds show it; the
 * buttons under it (Publish anyway, Build anyway) are the caller's.
 */

/** The fields of the report this list shows (a report sent from the server, its problems as they are). */
export interface AppCheckView {
  problems: AppProblem[];
  errors: number;
  warnings: number;
}

/** The owner's sentence for a problem. */
export function problemSentence(t: ReturnType<typeof useDashT>, p: AppProblem): string {
  return t(`appCheck.${p.rule}` as DashKey, p.values);
}

export function AppCheckList({
  report,
  fixHref = studioFixHref,
  onFix,
  limit = 30,
  intro = true,
  build = false,
}: {
  report: AppCheckView;
  /** Where Fix goes; missing: Studio's editor on the element. */
  fixHref?: (p: AppProblem) => string;
  /** Opens the element where the list is (Studio's editor), instead of following the link. */
  onFix?: (p: AppProblem) => void;
  limit?: number;
  intro?: boolean;
  build?: boolean;
}) {
  const t = useDashT();
  const shown = report.problems.slice(0, limit);
  const rest = report.problems.length - shown.length;
  return (
    <div className="flex flex-col gap-3" data-app-check={report.errors ? "errors" : report.warnings ? "warnings" : "clean"}>
      {intro ? <p className="m-0 text-sm text-(--sp-ink-2)">{t("appCheck.intro")}</p> : null}
      {report.errors ? (
        <p className="m-0 text-sm font-bold text-danger">
          {t("appCheck.errorsTitle", { count: report.errors })}. {t(build ? "appCheck.errorsStopBuild" : "appCheck.errorsStop")}
        </p>
      ) : report.warnings ? (
        <p className="m-0 text-sm text-(--sp-ink-2)">
          <span className="font-bold">{t("appCheck.warningsTitle", { count: report.warnings })}.</span> {t("appCheck.warningsOnly")}
        </p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((p, i) => {
          const sentence = problemSentence(t, p);
          const where = [p.page ? t("appCheck.onPage", { page: p.page }) : p.element ? t("appCheck.onTabs") : null, p.lang ? t("appCheck.inLanguage", { language: localeInfo(p.lang)?.nativeName ?? p.lang }) : null].filter(Boolean).join(" · ");
          return (
            <li key={`${p.rule}-${p.page}-${p.element}-${p.lang}-${i}`} data-problem={p.rule} data-severity={p.severity} data-path={p.path} className="flex items-start gap-3 rounded-2xl border border-(--sp-line) bg-(--sp-surface) p-3">
              <span aria-hidden="true" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${p.severity === "error" ? "bg-danger-bg text-danger" : "bg-(--sp-tile) text-(--sp-muted)"}`}>
                <Icon name={p.severity === "error" ? "error" : "info"} size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-(--sp-ink)">{sentence}</span>
                {where ? <span className="text-xs text-(--sp-muted)">{where}</span> : null}
              </span>
              <Link href={fixHref(p)} onClick={onFix ? (e) => { e.preventDefault(); onFix(p); } : undefined} aria-label={t("appCheck.fixLabel", { problem: sentence })} data-fix={p.element ?? ""} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] border border-(--sp-line) px-3 text-[13px] font-bold text-(--sp-ink) no-underline hover:bg-(--sp-tile)">
                <Icon name="edit" size={16} />
                {t("appCheck.fix")}
              </Link>
            </li>
          );
        })}
      </ul>
      {rest > 0 ? <p className="m-0 text-xs text-(--sp-muted)">{t("appCheck.more", { count: rest })}</p> : null}
    </div>
  );
}
