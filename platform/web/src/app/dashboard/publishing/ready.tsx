import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge } from "@/components/ui";
import { formatList } from "@/i18n/format";
import type { DashKey } from "@/i18n/dashboard";
import type { DashboardText } from "@/lib/dashboard-lang";
import { readyToSubmit, type ReadyItem, type ReadyState } from "@/lib/publishing/readiness";

const STATE: Record<ReadyState, { icon: IconName; tone: "success" | "danger" | "info"; label: DashKey; color: string }> = {
  ok: { icon: "check_circle", tone: "success", label: "publishing.ready.stateOk", color: "text-success" },
  missing: { icon: "error", tone: "danger", label: "publishing.ready.stateMissing", color: "text-danger" },
  note: { icon: "info", tone: "info", label: "publishing.ready.stateNote", color: "text-muted" },
};

/** 88.1 Ready to submit: what the stores check, each with where to fix it. */
export function ReadySection({ items, text }: { items: ReadyItem[]; text: DashboardText }) {
  const { t, k, lang } = text;
  const stopping = items.filter((item) => item.state === "missing").length;
  return (
    <section aria-labelledby="h-ready" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-ready={readyToSubmit(items) ? "yes" : "no"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="h-ready" className="m-0 text-lg font-bold">
            {t("publishing.ready.title")}
          </h2>
          <span className="text-sm text-muted">{t("publishing.ready.intro")}</span>
        </div>
        <Badge tone={stopping ? "danger" : "success"}>{stopping ? t("publishing.ready.notReady", { count: stopping }) : t("publishing.ready.allReady")}</Badge>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item) => {
          const state = STATE[item.state];
          const values = { ...item.values, ...(item.values?.rule ? { rule: k(String(item.values.rule)) } : {}), ...(item.items ? { items: formatList(lang, item.items.map(k)) } : {}) };
          return (
            <li key={item.key} data-ready-item={item.key} data-state={item.state} className="flex items-start gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0 last:pb-0">
              <Icon name={state.icon} size={22} className={`mt-0.5 ${state.color}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">{t(`publishing.ready.${item.key}` as DashKey)}</span>
                  <span className="sr-only">{t(state.label)}</span>
                </span>
                <p className="m-0 text-sm leading-relaxed break-words text-ink-4">{t(`publishing.ready.${item.text}` as DashKey, values)}</p>
                {item.key === "deletion" && item.values?.url ? (
                  <code dir="ltr" className="self-start break-all" data-ready-url="">
                    {item.values.url}
                  </code>
                ) : null}
              </div>
              {item.link && item.state !== "ok" ? (
                <Link href={item.link} className="shrink-0 text-sm font-semibold">
                  {item.state === "missing" ? t("publishing.ready.fix") : t("publishing.ready.see")}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
