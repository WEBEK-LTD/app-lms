import type { Metadata } from "next";
import Link from "next/link";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { applyLicenceAction, moveTemplateAction, restoreTemplateAction, updateTemplateAction } from "@/app/actions/studio-market";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { ConfirmSubmit } from "@/components/studio-market/confirm";
import { Board } from "@/components/studio-market/parts";
import { MarketPhones, TemplatePhone } from "@/components/studio-market/phone";
import { EmptyState, Notice, btn, formatDate } from "@/components/ui";
import { MarketHeader } from "@/components/studio-market/header";
import { appLabel } from "@/lib/app/label";
import { kindOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import type { App } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatList } from "@/i18n";
import { buyerLicences, type LicenceRow, type LicenceState } from "@/lib/studio-market/catalog";
import { appKindId, templateFits } from "@/lib/studio-market/kinds";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { en as words } from "@/i18n/dashboard/studio-market";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.mineTitle") };
}
export const dynamic = "force-dynamic";

type Tab = "all" | "active" | "ended" | "not_applied";

/**
 * 106.1 The buyer's templates, as the owner approved them: the app each one
 * is on, its plan and status, and what to do: apply one to an app of a kind
 * it fits, switch it to another app of the same kind (once every 30 days),
 * go back to the design the app had before, take a newer version. Free
 * templates for now; plans that end come with checkout.
 */
export default async function MyTemplatesPage({ searchParams }: PageProps<"/dashboard/studio-market/mine">) {
  const context = await requireClient("billing");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const params = await searchParams;
  const rows = await buyerLicences(store, context.client.id, context.apps, lang, now);
  const tab: Tab = params.tab === "active" || params.tab === "ended" || params.tab === "not_applied" ? params.tab : "all";
  const notApplied = (r: LicenceRow) => r.state === "not_applied" || r.state === "replaced";
  // 106.2 Ending soon: a plan for a time that ends within 14 days (still active).
  const running = (r: LicenceRow) => r.state === "active" || r.state === "ending";
  const counts = { active: rows.filter((r) => r.state === "active").length, ending: rows.filter((r) => r.state === "ending").length, notApplied: rows.filter(notApplied).length, ended: rows.filter((r) => r.state === "ended").length };
  const shown = rows.filter((r) => tab === "all" || (tab === "active" ? running(r) : tab === "ended" ? r.state === "ended" : notApplied(r)));
  const moving = typeof params.move === "string" ? rows.find((r) => r.licence.id === params.move && running(r)) : rows.find(running);
  const notice = (key: unknown) => (typeof key === "string" && key in words.known ? t(`studioMarket.known.${key as keyof typeof words.known}`) : null);
  const done = notice(params.done);
  const error = notice(params.error);

  const header = (
    <MarketHeader
      eyebrow={t("studioMarket.nav")}
      title={t("studioMarket.mineTitle")}
      lead={t("studioMarket.mineIntro")}
      actions={
        <Link href="/dashboard/studio-market" className="mk-btn mk-btn-ink mk-btn-sm">
          <Icon name="storefront" size={20} />
          {t("studioMarket.browse")}
        </Link>
      }
    />
  );

  if (!rows.length) {
    return (
      <div className="mk mk-page flex flex-col gap-6">
        {header}
        {done ? <Notice tone="success" icon="check_circle" role="status">{done}</Notice> : null}
        <EmptyState
          icon="dashboard_customize"
          title={t("studioMarket.mineEmpty")}
          action={
            <Link href="/dashboard/studio-market" className={`${btn.primary} h-11`}>
              {t("studioMarket.browse")}
            </Link>
          }
        >
          {t("studioMarket.mineEmptyText")}
        </EmptyState>
      </div>
    );
  }

  const stateBadge: Record<LicenceState, [string, string, IconName, string]> = {
    active: ["bg-success-bg", "text-success", "check_circle", t("studioMarket.stateActive")],
    ending: ["bg-warn-bg", "text-warn", "schedule", t("studioMarket.stateEnding")],
    not_applied: ["bg-line-soft", "text-muted", "pause_circle", t("studioMarket.stateNotApplied")],
    replaced: ["bg-line-soft", "text-muted", "history", t("studioMarket.stateReplaced")],
    ended: ["bg-danger-bg", "text-danger", "event_busy", t("studioMarket.stateEnded")],
  };
  const badge = (state: LicenceState) => {
    const [bg, fg, icon, label] = stateBadge[state];
    return (
      <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap ${bg} ${fg}`}>
        <Icon name={icon} size={15} filled />
        {label}
      </span>
    );
  };
  const appChip = (app: App) => {
    const kind = kindOf(app);
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-midnight text-ivory">
          <Icon name={kind.icon} size={17} filled />
        </span>
        <span className="truncate text-sm font-semibold">{appLabel(app)}</span>
      </span>
    );
  };
  const after = (r: LicenceRow): [IconName, string] => {
    // 106.2 Paid plans: until when, and that it doesn't renew by itself.
    if ((r.state === "active" || r.state === "ending") && r.licence.endsAt) return ["event", t("studioMarket.afterPaid", { date: formatDate(r.licence.endsAt, lang) })];
    if ((r.state === "active" || r.state === "ending") && r.licence.plan === "life") return ["workspace_premium", t("studioMarket.afterLife")];
    if (r.state === "ended" && r.licence.endsAt) return [r.licence.afterEnd === "restore" ? "undo" : "history", t(r.licence.afterEnd === "restore" ? "studioMarket.afterEndedRestore" : "studioMarket.afterEndedKeep", { date: formatDate(r.licence.endsAt, lang) })];
    if (r.licence.plan !== "free" && r.state !== "ended") return ["workspace_premium", r.licence.endsAt ? t("studioMarket.afterPaidWaiting", { date: formatDate(r.licence.endsAt, lang) }) : t("studioMarket.afterLife")];
    if (r.state === "active") return ["workspace_premium", t("studioMarket.afterActive")];
    if (r.state === "replaced" && r.replacedBy) return ["info", t("studioMarket.afterReplaced", { name: r.replacedBy.title, date: formatDate(r.replacedBy.at, lang) })];
    if (r.state === "ended") return ["undo", t("studioMarket.afterEnded")];
    return ["workspace_premium", t("studioMarket.afterNotApplied", { kinds: formatList(lang, r.card.kinds.map((x) => k(x.name)), "disjunction") })];
  };
  const fitting = (r: LicenceRow) => context.apps.filter((a) => templateFits(r.template, a) && a.id !== r.licence.appId);
  // 106.2 Renew (a plan for a time), or buy it again once it ended: a new one-time payment at checkout.
  const renewLink = (r: LicenceRow, again: boolean) =>
    r.renewable ? (
      <Link href={`/dashboard/studio-market/t/${r.template.slug}/checkout?renew=${r.licence.id}`} className={`${again ? btn.main : btn.secondary} h-9 px-3.5 text-sm`}>
        <Icon name={again ? "shopping_cart" : "event"} size={18} />
        {t(again ? "studioMarket.buyAgain" : "studioMarket.renew")}
      </Link>
    ) : null;
  const actions = (r: LicenceRow) => {
    if ((r.state === "active" || r.state === "ending") && r.application && r.app) {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {renewLink(r, false)}
          {r.update ? (
            <form action={updateTemplateAction}>
              <input type="hidden" name="application" value={r.application.id} />
              <SubmitButton variant="main" className="h-9 px-3.5 text-sm">
                <Icon name="refresh" size={18} />
                {t("studioMarket.update")}
              </SubmitButton>
            </form>
          ) : null}
          <Link href={`/dashboard/studio-market/mine?move=${r.licence.id}#switch`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            <Icon name="compare" size={18} />
            {t("studioMarket.switchApp")}
          </Link>
          <form action={openStudioProjectAction}>
            <input type="hidden" name="appId" value={r.app.id} />
            <input type="hidden" name="to" value="editor" />
            <button type="submit" className={`${btn.ghost} h-9 cursor-pointer px-3 text-sm`}>
              <Icon name="draw" size={18} />
              {t("studioMarket.openStudio")}
            </button>
          </form>
          <form action={restoreTemplateAction}>
            <input type="hidden" name="application" value={r.application.id} />
            <ConfirmSubmit confirm={t("studioMarket.restoreConfirm", { app: appLabel(r.app), name: r.card.title })} className={`${btn.ghost} h-9 cursor-pointer px-3 text-sm text-danger`}>
              <Icon name="undo" size={18} />
              {t("studioMarket.restore")}
            </ConfirmSubmit>
          </form>
        </div>
      );
    }
    if (r.state === "ended") {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {renewLink(r, true) ?? (
            <Link href={`/dashboard/studio-market/t/${r.template.slug}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
              <Icon name="shopping_cart" size={18} />
              {t("studioMarket.getAgain")}
            </Link>
          )}
          {/* 106.2 The design stayed (the plan ended without updates): the app can still go back to its own. */}
          {r.application && r.app ? (
            <form action={restoreTemplateAction}>
              <input type="hidden" name="application" value={r.application.id} />
              <ConfirmSubmit confirm={t("studioMarket.restoreConfirm", { app: appLabel(r.app), name: r.card.title })} className={`${btn.ghost} h-9 cursor-pointer px-3 text-sm text-danger`}>
                <Icon name="undo" size={18} />
                {t("studioMarket.restore")}
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
      );
    }
    const apps = fitting(r);
    if (!apps.length) {
      return (
        <Link href={`/dashboard/studio-market/t/${r.template.slug}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
          {t("studioMarket.view")}
        </Link>
      );
    }
    return (
      <form action={applyLicenceAction} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="licence" value={r.licence.id} />
        <label className="sr-only" htmlFor={`apply-${r.licence.id}`}>
          {t("studioMarket.chooseApp")}
        </label>
        <select id={`apply-${r.licence.id}`} name="app" className="h-9 max-w-[180px] rounded-[10px] border border-line-strong bg-white px-2 text-sm">
          {apps.map((a) => (
            <option key={a.id} value={a.id}>
              {appLabel(a)}
            </option>
          ))}
        </select>
        <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
          <Icon name="format_paint" size={18} />
          {t("studioMarket.applyToApp")}
        </SubmitButton>
      </form>
    );
  };

  const thumb = (r: LicenceRow) => (
    <Board className="flex h-[70px] w-[54px] flex-none justify-center overflow-hidden rounded-[10px] border border-line-soft pt-[7px]">
      <TemplatePhone view={r.card.cover} width={39} />
    </Board>
  );
  // 106.2 The plan and its end: "3 months · Ends 15 Feb 2027", "Lifetime", "Free".
  const planName = (r: LicenceRow) => (r.licence.plan === "free" ? t("studioMarket.free") : t(`studioMarket.plan_${r.licence.plan}`));
  const endLine = (r: LicenceRow) =>
    r.licence.endsAt
      ? t(r.state === "ended" ? "studioMarket.endedOn" : "studioMarket.endsOn", { date: formatDate(r.licence.endsAt, lang) })
      : t("studioMarket.gotOn", { date: formatDate(r.licence.startsAt, lang) });
  const planCell = (r: LicenceRow) => (
    <span className="flex flex-col">
      <b className="text-sm">{planName(r)}</b>
      <span data-ends className={`text-xs whitespace-nowrap ${r.state === "ending" ? "font-semibold text-warn" : "text-muted"}`}>
        {endLine(r)}
      </span>
    </span>
  );
  const nameCell = (r: LicenceRow) => {
    const [icon, line] = after(r);
    return (
      <div className="flex items-start gap-3.5">
        {thumb(r)}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <Link href={`/dashboard/studio-market/t/${r.template.slug}`} dir="auto" className="text-[15px] font-bold text-midnight no-underline hover:text-midnight">
              {r.card.title}
            </Link>
            {now.getTime() - r.licence.createdAt.getTime() < 3 * 24 * 60 * 60 * 1000 ? <span className="rounded-xl bg-peach px-2 py-0.5 text-xs font-bold text-midnight">{t("studioMarket.newBadge")}</span> : null}
          </span>
          <span className="text-[13px] text-muted">{r.card.designer.name}</span>
          <span className="mt-[3px] flex max-w-[290px] items-start gap-1.5 text-xs text-ink-4">
            <Icon name={icon} size={16} className="text-muted" />
            <span>{line}</span>
          </span>
          {r.update ? <span className="text-xs font-semibold text-accent">{t("studioMarket.updateHint")}</span> : null}
        </div>
      </div>
    );
  };

  const tabs: [Tab, string, number][] = [
    ["all", t("studioMarket.tabAll"), rows.length],
    ["active", t("studioMarket.stateActive"), counts.active],
    ["ended", t("studioMarket.stateEnded"), counts.ended],
    ["not_applied", t("studioMarket.stateNotApplied"), counts.notApplied],
  ];

  const moveFrom = moving?.app ?? null;
  const moveTargets = moving && moveFrom ? context.apps.filter((a) => a.id !== moveFrom.id && appKindId(a) === appKindId(moveFrom) && templateFits(moving.template, a)) : [];

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <div className="mk mk-page flex flex-col gap-6">
        {header}
        {done ? <Notice tone="success" icon="check_circle" role="status">{done}</Notice> : null}
        {error ? (
          <Notice tone="danger" icon="error" role="alert">
            {error}
            {typeof params.detail === "string" ? <span className="mt-1 block text-sm">{k(params.detail)}</span> : null}
          </Notice>
        ) : null}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {(
            [
              ["check_circle", "text-success", counts.active, t("studioMarket.statActive")],
              ["schedule", "text-warn", counts.ending, t("studioMarket.statEnding")],
              ["pause_circle", "text-muted", counts.notApplied, t("studioMarket.statNotApplied")],
              ["event_busy", "text-danger", counts.ended, t("studioMarket.statEnded")],
            ] as [IconName, string, number, string][]
          ).map(([icon, tone, value, label]) => (
            <div key={label} className="flex flex-col gap-1.5 mk-panel px-[18px] py-4">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                <Icon name={icon} size={18} filled className={tone} />
                {label}
              </span>
              <span className="mk-kpi text-[30px] md:text-[36px]">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <nav aria-label={t("studioMarket.mineTitle")} className="flex gap-1 overflow-x-auto border-b border-line">
            {tabs.map(([key, label, count]) => (
              <Link
                key={key}
                href={key === "all" ? "/dashboard/studio-market/mine" : `/dashboard/studio-market/mine?tab=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 pt-2.5 pb-3 text-[15px] whitespace-nowrap no-underline ${tab === key ? "border-ember font-bold text-midnight hover:text-midnight" : "border-transparent font-semibold text-muted hover:text-midnight"}`}
              >
                {label}
                <span className={`rounded-full px-2 py-px text-xs font-bold ${tab === key ? "bg-peach text-accent" : "bg-line-soft text-muted"}`}>{count}</span>
              </Link>
            ))}
          </nav>
          {/* Phones: one card per template. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {shown.map((r) => (
              <article key={r.licence.id} className="flex flex-col gap-3 mk-panel p-3.5">
                <div className="flex items-start gap-3">
                  {thumb(r)}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <b dir="auto" className="truncate text-base">{r.card.title}</b>
                    <span className="text-[13px] text-muted">{r.card.designer.name}</span>
                    <span className="self-start">{badge(r.state)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl bg-[var(--mk-mat)] px-3 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">{t("studioMarket.colApp")}</span>
                    {r.app ? appChip(r.app) : <span className="text-muted">—</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">{t("studioMarket.colPlan")}</span>
                    <span className="font-semibold">
                      {planName(r)} · <span className="font-medium text-ink-4">{endLine(r)}</span>
                    </span>
                  </div>
                </div>
                <span className="flex items-start gap-1.5 text-[13px] text-ink-4">
                  <Icon name={after(r)[0]} size={16} className="text-muted" />
                  <span>{after(r)[1]}</span>
                </span>
                {actions(r)}
              </article>
            ))}
          </div>
          {/* Computers: a table. */}
          <section className="mk-panel hidden overflow-hidden lg:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[t("studioMarket.colTemplate"), t("studioMarket.colApp"), t("studioMarket.colPlan"), t("studioMarket.colStatus")].map((h, i) => (
                    <th key={h} className={`border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-4 py-3 text-start text-[13px] font-semibold whitespace-nowrap text-muted ${i === 0 ? "ps-6" : ""}`}>
                      {h}
                    </th>
                  ))}
                  <th className="border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] py-3 ps-4 pe-6 text-end text-[13px] font-semibold text-muted">{t("studioMarket.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={r.licence.id} data-licence={r.licence.id}>
                    <td className={`py-3.5 ps-6 pe-4 align-middle ${i ? "border-t border-line-soft" : ""}`}>{nameCell(r)}</td>
                    <td className={`px-4 py-3.5 align-middle ${i ? "border-t border-line-soft" : ""}`}>{r.app ? appChip(r.app) : <span className="text-muted">—</span>}</td>
                    <td className={`px-4 py-3.5 align-middle ${i ? "border-t border-line-soft" : ""}`}>{planCell(r)}</td>
                    <td className={`px-4 py-3.5 align-middle ${i ? "border-t border-line-soft" : ""}`}>{badge(r.state)}</td>
                    <td className={`py-3.5 ps-4 pe-6 align-middle ${i ? "border-t border-line-soft" : ""}`}>{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
        {moving && moveFrom ? (
          <section id="switch" aria-labelledby="h-switch" className="mk-panel flex scroll-mt-6 flex-col">
            <div className="border-b border-line-soft px-5 pt-5 pb-4 sm:px-6">
              <h2 id="h-switch" className="m-0 text-lg font-bold">
                {t("studioMarket.switchTitle")}
              </h2>
              <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{t("studioMarket.switchText", { name: moving.card.title, from: appLabel(moveFrom) })}</p>
            </div>
            <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
              {moveTargets.length ? (
                <form action={moveTemplateAction} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <input type="hidden" name="licence" value={moving.licence.id} />
                  <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-line p-3">
                    {appChip(moveFrom)}
                    <span className="ms-auto text-xs text-muted">{t("studioMarket.now")}</span>
                  </div>
                  <Icon name="arrow_forward" size={22} className="self-center text-muted max-lg:rotate-90" />
                  <label className="flex flex-1 items-center gap-2.5 rounded-xl border-2 border-midnight p-[11px]">
                    <span className="sr-only">{t("studioMarket.moveTo")}</span>
                    <select name="to" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none">
                      {moveTargets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {appLabel(a)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SubmitButton disabled={!moving.mayMove} className="h-11">
                    {t("studioMarket.moveIt")}
                  </SubmitButton>
                </form>
              ) : (
                <p className="m-0 text-sm text-muted">{t("studioMarket.noOtherApp", { kind: k(kindOf(moveFrom).name) })}</p>
              )}
              <span className="flex items-center gap-1.5 text-[13px] text-muted">
                <Icon name="info" size={16} />
                {moving.mayMove || !moving.nextMove ? t("studioMarket.moveRule") : t("studioMarket.moveNext", { date: formatDate(moving.nextMove, lang) })}
              </span>
            </div>
          </section>
        ) : null}
    </div>
    </MarketPhones>
  );
}
