import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { MarketPhones } from "@/components/studio-market/phone";
import { EmptyState, Notice, btn, formatDate, formatDateTime } from "@/components/ui";
import { MarketHeader } from "@/components/studio-market/header";
import { kindOf } from "@/lib/app/kinds";
import { appLabel } from "@/lib/app/label";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import type { App, MarketTemplate } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { loadLayout } from "@/lib/pages/layout";
import type { LanguageCode, LayoutPage } from "@/lib/pages/types";
import type { CoverView } from "@/lib/studio-market/catalog";
import { kindsForEngine } from "@/lib/studio-market/kinds";
import { latestNotes } from "@/lib/studio-market/review";
import { editable, ownProject, stepsDone, type TemplateStep } from "@/lib/studio-market/templates";
import { isStudioProject } from "@/lib/studio/section";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { AfterEndForm, DeleteDraft, KindsForm, PlansForm, ProjectForm, ScreensForm, SendForm, StartForm, StepNumber, StepSection, TextsForm, UpdateForm, type ProjectChoice, type ScreenChoice, type StepState } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.publishTitle") };
}
export const dynamic = "force-dynamic";

/** A project's Studio pages as the app draws them, with its look. */
async function projectViews(app: App, now: Date): Promise<{ pages: ScreenChoice[]; languages: string[] }> {
  const record = await loadLayout(await getStore(), app, now);
  const draft = record.draft;
  const look = (p: LayoutPage): CoverView["look"] => ({
    name: appLabel(app),
    logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
    brand: app.primaryColor,
    font: draft.appearance.font_family ?? draft.appearance.font ?? "Cairo",
    tabs: draft.tabs,
    activeTab: draft.tabs.find((tab) => tab.target.type === "page" && tab.target.page_slug === p.slug)?.id ?? null,
    ...(draft.tab_bar ? { tabBar: draft.tab_bar } : {}),
    accent: draft.appearance.secondary_color ?? null,
  });
  const lang = draft.languages.default as LanguageCode;
  return {
    pages: draft.pages.filter((p) => p.studio).map((p) => ({ slug: p.slug, title: p.title, view: { page: p.studio!, look: look(p), lang, defaultLang: lang } })),
    languages: draft.languages.available.filter((l) => l === "en" || l === "ar" || l === "tr"),
  };
}

/**
 * 106.1 Publish a template, as the owner approved it: seven short steps on
 * one page, a stepper beside them, the draft saved as the designer goes.
 * Free only for now. Reviewed once: a published template's page changes at
 * once, and its design goes live again with "Publish the update".
 */
export default async function PublishTemplatePage({ searchParams }: PageProps<"/designer/publish">) {
  const context = await requireClient("billing");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const designer = await store.getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  const params = await searchParams;
  const template: MarketTemplate | null = typeof params.id === "string" ? await store.getMarketTemplate(params.id) : null;
  if (typeof params.id === "string" && (!template || template.designerId !== designer.id)) redirect("/designer/templates");
  const projects = context.apps.filter(isStudioProject);
  const choices: ProjectChoice[] = await Promise.all(
    projects.map(async (app) => {
      const views = await projectViews(app, now);
      return { id: app.id, name: appLabel(app), meta: t("studioMarket.projectMeta", { kind: k(kindOf(app).name), pages: views.pages.length }), home: views.pages[0]?.view ?? null };
    }),
  );
  const project = template ? ownProject(context.apps, designer, template.sourceAppId) : null;
  const views = project ? await projectViews(project, now) : null;
  const done = template ? stepsDone(template, project) : null;
  const order: Exclude<TemplateStep, "send">[] = ["project", "texts", "screens", "kinds", "plans", "after_end"];
  const current = done ? (order.find((s) => !done[s]) ?? "send") : "project";
  const live = template?.status === "published";
  const locked = template ? !editable(template) : false;
  const state = (step: TemplateStep): StepState => (!template ? (step === "project" ? "cur" : "") : step !== "send" && done![step] ? "done" : current === step ? "cur" : "");
  const notes = template ? await latestNotes(store, template) : null;
  const liveVersion = live && template?.currentVersionId ? await store.getMarketTemplateVersion(template.currentVersionId) : null;

  const labels: [TemplateStep, string, string][] = [
    ["project", t("studioMarket.stepProject"), "step-project"],
    ["texts", t("studioMarket.stepTexts"), "step-texts"],
    ["screens", t("studioMarket.stepScreens"), "step-screens"],
    ["kinds", t("studioMarket.stepKinds"), "step-kinds"],
    ["plans", t("studioMarket.stepPlans"), "step-plans"],
    ["after_end", t("studioMarket.stepAfter"), "step-after"],
    ["send", live ? t("studioMarket.stepUpdate") : t("studioMarket.stepSend"), "step-send"],
  ];
  const stepper = (
    <aside className="mk-panel flex flex-col gap-1 px-[18px] py-5 lg:sticky lg:top-5">
      <span className="px-1.5 pb-2 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">{t("studioMarket.stepsLabel")}</span>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {labels.map(([step, label, anchor], i) => {
          const s = state(step);
          return (
            <li key={step}>
              <a href={`#${anchor}`} aria-current={s === "cur" ? "step" : undefined} className={`flex items-center gap-3 rounded-[10px] px-1.5 py-2 text-sm no-underline ${s === "cur" ? "bg-peach font-bold text-midnight" : s === "done" ? "font-medium text-midnight" : "text-muted"}`}>
                <StepNumber num={i + 1} state={s} small />
                {label}
              </a>
            </li>
          );
        })}
      </ol>
      {template ? (
        <>
          <hr className="my-2.5 h-px border-0 bg-line-soft" />
          <span className="flex items-center gap-1.5 px-1.5 text-[13px] text-muted">
            <Icon name="cloud_done" size={17} className="text-success" />
            {t("studioMarket.draftSaved", { date: formatDateTime(template.updatedAt, lang) })}
          </span>
        </>
      ) : null}
    </aside>
  );

  const header = (
    <MarketHeader
      back={{ href: "/designer/templates", label: t("studioMarket.navTemplates") }}
      eyebrow={t("studioMarket.designerArea")}
      title={template && live ? t("studioMarket.publishEditTitle", { name: template.texts.en?.title ?? template.slug }) : t("studioMarket.publishTitle")}
      lead={live ? t("studioMarket.publishedIntro") : t("studioMarket.publishIntro")}
      actions={
        live && template ? (
          <Link href={`/studio/market/t/${template.slug}`} className="mk-btn mk-btn-ghost mk-btn-sm">
            <Icon name="visibility" size={20} />
            {t("studioMarket.previewPage")}
          </Link>
        ) : undefined
      }
    />
  );

  if (!projects.length) {
    return (
      <>
        {header}
        <EmptyState
          icon="draw"
          title={t("studioMarket.noProjects")}
          action={
            <Link href="/studio/new" className={`${btn.primary} h-11`}>
              {t("studioMarket.startProject")}
            </Link>
          }
        >
          {t("studioMarket.studioStepText")}
        </EmptyState>
      </>
    );
  }

  const muted = !template;
  const pickFirst = <p className="m-0 text-sm text-muted">{t("studioMarket.pickFirst")}</p>;
  const checks = template
    ? [
        { label: t("studioMarket.checkProject", { name: project ? appLabel(project) : "—" }), ok: done!.project },
        { label: t("studioMarket.checkTexts"), ok: done!.texts },
        { label: t("studioMarket.checkScreens"), ok: done!.screens },
        { label: t("studioMarket.checkKinds"), ok: done!.kinds },
        { label: t("studioMarket.checkPlans"), ok: done!.plans },
        { label: t("studioMarket.checkAfter"), ok: done!.after_end },
      ]
    : [];

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      {header}
      {params.error === "project" ? <Notice tone="danger" icon="error" role="alert">{t("studioMarket.known.project")}</Notice> : null}
      {template?.status === "in_review" ? <Notice tone="warn" icon="pending">{t("studioMarket.inReviewNotice")}</Notice> : null}
      {notes ? (
        <Notice tone="danger" icon="forum">
          <b>{t("studioMarket.notesFrom", { date: formatDate(notes.createdAt, lang) })}</b>
          <span className="mt-1 block whitespace-pre-line">{notes.notes}</span>
        </Notice>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
        {stepper}
        <div className="flex min-w-0 flex-col gap-5">
          <StepSection id="step-project" num={1} state={state("project")} title={t("studioMarket.s1Title")} description={t("studioMarket.s1Hint")}>
            {template ? <ProjectForm id={template.id} projects={choices} current={template.sourceAppId} locked={locked || live} /> : <StartForm projects={choices} />}
          </StepSection>
          <StepSection id="step-texts" num={2} state={state("texts")} title={t("studioMarket.s2Title")} description={t("studioMarket.s2Hint")} muted={muted}>
            {template ? <TextsForm id={template.id} texts={template.texts} locked={locked} /> : pickFirst}
          </StepSection>
          <StepSection id="step-screens" num={3} state={state("screens")} title={t("studioMarket.s3Title")} muted={muted}>
            {template && views ? <ScreensForm id={template.id} pages={views.pages} order={template.screens} languages={views.languages} locked={locked} /> : pickFirst}
          </StepSection>
          <StepSection id="step-kinds" num={4} state={state("kinds")} title={t("studioMarket.s4Title")} description={t("studioMarket.s4Hint")} muted={muted}>
            {template && project ? (
              <KindsForm id={template.id} kinds={kindsForEngine(project.appType).map((x) => ({ id: x.id, name: x.name, icon: x.icon }))} chosen={template.kinds} tags={template.tags} locked={locked} />
            ) : (
              pickFirst
            )}
          </StepSection>
          <StepSection id="step-plans" num={5} state={state("plans")} title={t("studioMarket.s5Title")} description={t("studioMarket.s5Hint")} muted={muted}>
            {template ? <PlansForm id={template.id} locked={locked} free={template.free} plans={template.plans} /> : pickFirst}
          </StepSection>
          <StepSection id="step-after" num={6} state={state("after_end")} title={t("studioMarket.s6Title")} description={t("studioMarket.s6Hint")} muted={muted}>
            {template ? <AfterEndForm id={template.id} value={template.afterEnd} locked={locked} /> : pickFirst}
          </StepSection>
          <StepSection id="step-send" num={7} state={state("send")} title={live ? t("studioMarket.stepUpdate") : t("studioMarket.s7Title")} muted={muted}>
            {!template ? (
              pickFirst
            ) : live ? (
              <UpdateForm id={template.id} version={liveVersion ? t("studioMarket.liveVersion", { n: liveVersion.number, date: formatDate(liveVersion.createdAt, lang) }) : ""} />
            ) : template.status === "in_review" ? (
              <p className="m-0 text-sm text-muted">{t("studioMarket.inReviewNotice")}</p>
            ) : (
              <SendForm id={template.id} checks={checks} ready={Object.values(done!).every(Boolean)} note={template.noteToTeam ?? ""} />
            )}
          </StepSection>
          {template && !live && !template.currentVersionId && template.status !== "in_review" ? <DeleteDraft id={template.id} /> : null}
        </div>
      </div>
    </MarketPhones>
  );
}
