import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { FreePrice, KindTag } from "@/components/studio-market/parts";
import { MarketPhones, PageThumb } from "@/components/studio-market/phone";
import { EmptyState, Notice, PageHeader, btn, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import type { MarketTemplate, MarketTemplateStatus } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { sellerTemplates, type SellerRow } from "@/lib/studio-market/catalog";
import { latestNotes } from "@/lib/studio-market/review";
import { stepsDone } from "@/lib/studio-market/templates";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.sellerTitle") };
}
export const dynamic = "force-dynamic";

type Tab = "all" | MarketTemplateStatus;

/**
 * 106.1 A designer's templates, as the owner approved them: how a template
 * goes (draft, in review, published, or changes requested with the team's
 * notes), each one's status, price, views, apps that took it and what it
 * earned, and what to do next. Reviewed once: updates go live at once.
 */
export default async function DesignerTemplatesPage({ searchParams }: PageProps<"/designer/templates">) {
  const context = await requireClient("billing");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const params = await searchParams;
  const rows = await sellerTemplates(store, designer, lang);
  const tab: Tab = params.tab === "draft" || params.tab === "in_review" || params.tab === "changes_requested" || params.tab === "published" ? params.tab : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const shown = rows.filter((r) => (tab === "all" || r.template.status === tab) && (!q || r.title.toLowerCase().includes(q.toLowerCase())));
  const notes = new Map(await Promise.all(rows.filter((r) => r.template.status === "changes_requested").map(async (r) => [r.template.id, await latestNotes(store, r.template)] as const)));
  const count = (status: MarketTemplateStatus) => rows.filter((r) => r.template.status === status).length;

  const status: Record<MarketTemplateStatus, [string, IconName, string]> = {
    published: ["bg-success-bg text-success", "check_circle", t("studioMarket.statusPublished")],
    in_review: ["bg-warn-bg text-warn", "pending", t("studioMarket.statusReview")],
    changes_requested: ["bg-danger-bg text-danger", "edit_note", t("studioMarket.statusChanges")],
    draft: ["bg-line-soft text-muted", "edit", t("studioMarket.statusDraft")],
  };
  const badge = (s: MarketTemplateStatus) => (
    <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold whitespace-nowrap ${status[s][0]}`}>
      <Icon name={status[s][1]} size={15} filled />
      {status[s][2]}
    </span>
  );

  const fixInStudio = (template: MarketTemplate, primary = true) =>
    template.sourceAppId ? (
      <form action={openStudioProjectAction}>
        <input type="hidden" name="appId" value={template.sourceAppId} />
        <input type="hidden" name="to" value="editor" />
        <button type="submit" className={`${primary ? btn.primary : btn.secondary} h-[30px] cursor-pointer gap-[5px] rounded-lg px-2.5 text-[13px]`}>
          <Icon name="draw" size={16} />
          {t("studioMarket.fixInStudio")}
        </button>
      </form>
    ) : null;
  const action = (r: SellerRow) => {
    const id = r.template.id;
    if (r.template.status === "changes_requested") return fixInStudio(r.template);
    if (r.template.status === "in_review")
      return (
        <Link href={`/designer/publish?id=${id}`} className={`${btn.secondary} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
          <Icon name="visibility" size={16} />
          {t("studioMarket.preview")}
        </Link>
      );
    if (r.template.status === "draft")
      return (
        <Link href={`/designer/publish?id=${id}`} className={`${btn.secondary} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
          {t("studioMarket.continueStep")}
          <Icon name="arrow_forward" size={16} />
        </Link>
      );
    return (
      <>
        <Link href={`/designer/publish?id=${id}`} className={`${btn.secondary} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
          <Icon name="edit" size={16} />
          {t("studioMarket.editTemplate")}
        </Link>
        <Link href={`/dashboard/studio-market/t/${r.template.slug}`} className={`${btn.ghost} h-[30px] rounded-lg px-2`}>
          <Icon name="open_in_new" size={16} />
          <span className="sr-only">{t("studioMarket.openPage")}</span>
        </Link>
      </>
    );
  };
  const lastChange = (r: SellerRow) => {
    if (r.template.status === "in_review" || r.template.status === "changes_requested") return t("studioMarket.sentOn", { date: formatDate(r.template.submittedAt, lang) });
    if (r.template.status === "draft") {
      const done = Object.values(stepsDone(r.template, context.apps.find((a) => a.id === r.template.sourceAppId) ?? null)).filter(Boolean).length;
      return t("studioMarket.stepOfSeven", { n: Math.min(7, done + 1) });
    }
    return formatDate(r.template.updatedAt, lang);
  };

  const header = (
    <PageHeader
      eyebrow={
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
          <Icon name="palette" size={18} filled />
          {t("studioMarket.designerArea")}
        </span>
      }
      title={t("studioMarket.sellerTitle")}
      description={t("studioMarket.sellerIntro")}
      actions={
        <Link href="/designer/publish" className={`${btn.main} h-11`}>
          <Icon name="add" size={20} />
          {t("studioMarket.publishTemplate")}
        </Link>
      }
    />
  );

  const flow = (
    <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-white px-5 py-4">
      <span className="text-sm font-bold">{t("studioMarket.howItGoes")}</span>
      {(
        [
          ["draft", t("studioMarket.flowDraft")],
          ["in_review", t("studioMarket.flowReview")],
          ["published", t("studioMarket.flowPublished")],
        ] as [MarketTemplateStatus, string][]
      ).map(([s, line], i) => (
        <span key={s} className="flex items-center gap-2">
          {i ? <Icon name="arrow_forward" size={18} className="text-faint" /> : null}
          {badge(s)}
          <span className="text-[13px] text-muted">{line}</span>
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="text-faint">{t("studioMarket.or")}</span>
        {badge("changes_requested")}
        <span className="text-[13px] text-muted">{t("studioMarket.flowChanges")}</span>
      </span>
    </div>
  );

  const tabs: [Tab, string, number][] = [
    ["all", t("studioMarket.tabAll"), rows.length],
    ["published", t("studioMarket.tabPublished"), count("published")],
    ["in_review", t("studioMarket.tabReview"), count("in_review")],
    ["changes_requested", t("studioMarket.tabChanges"), count("changes_requested")],
    ["draft", t("studioMarket.tabDrafts"), count("draft")],
  ];

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      {header}
      {params.sent === "1" ? <Notice tone="success" icon="send" role="status">{t("studioMarket.known.sent")}</Notice> : null}
      {params.deleted === "1" ? <Notice tone="success" icon="check_circle" role="status">{t("studioMarket.known.deleted")}</Notice> : null}
      {flow}
      {rows.length ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label={t("studioMarket.sellerTitle")} className="flex gap-1 overflow-x-auto">
              {tabs.map(([key, label, n]) => (
                <Link
                  key={key}
                  href={key === "all" ? "/designer/templates" : `/designer/templates?tab=${key}`}
                  aria-current={tab === key ? "page" : undefined}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 pt-2.5 pb-3 text-[15px] whitespace-nowrap no-underline ${tab === key ? "border-ember font-bold text-midnight hover:text-midnight" : "border-transparent font-semibold text-muted hover:text-midnight"}`}
                >
                  {label}
                  <span className={`rounded-full px-2 py-px text-xs font-bold ${tab === key ? "bg-peach text-accent" : "bg-line-soft text-muted"}`}>{n}</span>
                </Link>
              ))}
            </nav>
            <form action="/designer/templates" method="get" role="search" className="flex h-[42px] w-full items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3 sm:w-[260px]">
              <Icon name="search" size={20} className="text-muted" />
              <label htmlFor="find-template" className="sr-only">
                {t("studioMarket.findTemplate")}
              </label>
              <input id="find-template" name="q" type="search" defaultValue={q} placeholder={t("studioMarket.findTemplate")} className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
              {tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
            </form>
          </div>
          {shown.length ? (
            <section className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-line-soft bg-sand py-3 ps-6 pe-4 text-start text-[13px] font-semibold text-muted">{t("studioMarket.colTemplate")}</th>
                    <th className="border-b border-line-soft bg-sand px-4 py-3 text-start text-[13px] font-semibold text-muted">{t("studioMarket.colStatus")}</th>
                    <th className="border-b border-line-soft bg-sand px-4 py-3 text-start text-[13px] font-semibold text-muted">{t("studioMarket.colPrice")}</th>
                    <th className="border-b border-line-soft bg-sand px-4 py-3 text-end text-[13px] font-semibold text-muted">{t("studioMarket.colViews")}</th>
                    <th className="border-b border-line-soft bg-sand px-4 py-3 text-end text-[13px] font-semibold text-muted">{t("studioMarket.colSales")}</th>
                    <th className="border-b border-line-soft bg-sand px-4 py-3 text-end text-[13px] font-semibold text-muted">{t("studioMarket.colNet")}</th>
                    <th className="border-b border-line-soft bg-sand py-3 ps-4 pe-6 text-end text-[13px] font-semibold text-muted">{t("studioMarket.colChange")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => {
                    const note = notes.get(r.template.id) ?? null;
                    const live = r.template.status === "published";
                    const line = i ? "border-t border-line-soft" : "";
                    return (
                      <Fragment key={r.template.id}>
                      <tr data-template={r.template.id} className={note ? "bg-danger-bg/35" : undefined}>
                        <td className={`py-3.5 ps-6 pe-4 align-middle ${line}`}>
                          <span className="flex items-center gap-3">
                            <span className="h-[54px] w-10 flex-none overflow-hidden rounded-[9px] border border-line">{r.cover ? <PageThumb view={r.cover} width={40} height={54} /> : null}</span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <b dir="auto" className="text-[15px]">{r.title}</b>
                              {r.kinds[0] ? <KindTag kind={r.kinds[0]} /> : null}
                            </span>
                          </span>
                        </td>
                        <td className={`px-4 py-3.5 align-middle ${line}`}>{badge(r.template.status)}</td>
                        <td className={`px-4 py-3.5 align-middle ${line}`}>
                          <FreePrice />
                        </td>
                        <td className={`px-4 py-3.5 text-end align-middle tabular-nums ${line}`}>{live ? r.template.views : <span className="text-faint">—</span>}</td>
                        <td className={`px-4 py-3.5 text-end align-middle tabular-nums ${line}`}>{live ? t("studioMarket.salesFree", { count: r.applies }) : <span className="text-faint">—</span>}</td>
                        <td className={`px-4 py-3.5 text-end align-middle font-bold tabular-nums ${line}`}>{live ? <bdi dir="ltr">$0.00</bdi> : <span className="text-faint">—</span>}</td>
                        <td className={`py-3.5 ps-4 pe-6 align-middle ${line}`}>
                          <span className="flex justify-end gap-1.5">{action(r)}</span>
                          <span className="mt-1 block text-end text-xs text-muted">{lastChange(r)}</span>
                        </td>
                      </tr>
                      {note ? (
                        <tr className="bg-danger-bg/35">
                          <td colSpan={7} className="px-6 pb-[18px]">
                            <div className="flex flex-col gap-3 rounded-[14px] bg-danger-bg px-[18px] py-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-[15px] font-bold">
                                  <Icon name="forum" size={20} className="text-danger" />
                                  {t("studioMarket.notesFrom", { date: formatDate(note.createdAt, lang) })}
                                </span>
                                <span className="text-[13px] text-muted">{t("studioMarket.notesHint")}</span>
                              </div>
                              <p className="m-0 text-sm leading-relaxed whitespace-pre-line text-ink-2">{note.notes}</p>
                              <div className="flex flex-wrap gap-2.5">
                                {fixInStudio(r.template)}
                                <Link href={`/designer/publish?id=${r.template.id}#step-send`} className={`${btn.secondary} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
                                  <Icon name="send" size={16} />
                                  {t("studioMarket.sendAgain")}
                                </Link>
                                <Link href={`/designer/publish?id=${r.template.id}#note`} className={`${btn.ghost} h-[30px] gap-[5px] rounded-lg px-2.5 text-[13px]`}>
                                  <Icon name="chat" size={16} />
                                  {t("studioMarket.replyTeam")}
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : (
            <p role="status" className="m-0 text-sm text-muted">
              {t("studioMarket.noMatch", { query: q })}
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          icon="dashboard_customize"
          title={t("studioMarket.sellerEmpty")}
          action={
            <Link href="/designer/publish" className={`${btn.main} h-11`}>
              <Icon name="add" size={20} />
              {t("studioMarket.publishTemplate")}
            </Link>
          }
        >
          {t("studioMarket.sellerEmptyText")}
        </EmptyState>
      )}
    </MarketPhones>
  );
}
