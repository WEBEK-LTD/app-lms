import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { KitFold, KitSection, KitStatus, kit } from "@/components/studio-page";
import { formatList } from "@/i18n/format";
import type { DashKey } from "@/i18n/dashboard";
import type { DashboardText } from "@/lib/dashboard-lang";
import { readyToSubmit, type ReadyItem, type ReadyState } from "@/lib/publishing/readiness";

const STATE: Record<ReadyState, { icon: IconName; label: DashKey; tile: string }> = {
  ok: { icon: "check_circle", label: "publishing.ready.stateOk", tile: "bg-success-bg text-success" },
  missing: { icon: "error", label: "publishing.ready.stateMissing", tile: "bg-danger-bg text-danger" },
  note: { icon: "info", label: "publishing.ready.stateNote", tile: "bg-(--sp-tile) text-(--sp-muted)" },
};

/**
 * 88.1 Ready to submit: what the stores check, each with where to fix it.
 * 132.140 What stops the review and what to know first, each a row with its
 * one action; what's ready already folded behind one line.
 */
export function ReadySection({ items, text }: { items: ReadyItem[]; text: DashboardText }) {
  const { t, k, lang } = text;
  const stopping = items.filter((item) => item.state === "missing").length;
  const row = (item: ReadyItem) => {
    const state = STATE[item.state];
    const values = { ...item.values, ...(item.values?.rule ? { rule: k(String(item.values.rule)) } : {}), ...(item.items ? { items: formatList(lang, item.items.map(k)) } : {}) };
    return (
      <li key={item.key} data-ready-item={item.key} data-state={item.state} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-(--sp-line-soft) py-3.5 first:border-t-0">
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${state.tile}`}>
          <Icon name={state.icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-(--sp-ink)">{t(`publishing.ready.${item.key}` as DashKey)}</span>
            <span className="sr-only">{t(state.label)}</span>
          </span>
          <p className="m-0 text-sm leading-relaxed break-words text-(--sp-muted)">{t(`publishing.ready.${item.text}` as DashKey, values)}</p>
          {item.key === "deletion" && item.values?.url ? (
            <code dir="ltr" className="self-start break-all" data-ready-url="">
              {item.values.url}
            </code>
          ) : null}
        </div>
        {item.link && item.state !== "ok" ? (
          <Link href={item.link} className={`${kit.row} max-sm:ms-14`}>
            {item.state === "missing" ? t("publishing.ready.fix") : t("publishing.ready.see")}
          </Link>
        ) : null}
      </li>
    );
  };
  const open = items.filter((item) => item.state !== "ok");
  const ok = items.filter((item) => item.state === "ok");
  return (
    <KitSection
      titleId="h-ready"
      title={t("publishing.ready.title")}
      description={t("publishing.ready.intro")}
      actions={<KitStatus tone={stopping ? "danger" : "success"}>{stopping ? t("publishing.ready.notReady", { count: stopping }) : t("publishing.ready.allReady")}</KitStatus>}
      data-ready={readyToSubmit(items) ? "yes" : "no"}
    >
      {open.length ? <ul className="m-0 flex list-none flex-col p-0">{open.map(row)}</ul> : null}
      {ok.length ? (
        <KitFold summary={t("publishing.ready.okCount", { count: ok.length })} icon="check_circle">
          <ul className="m-0 flex list-none flex-col p-0">{ok.map(row)}</ul>
        </KitFold>
      ) : null}
    </KitSection>
  );
}
