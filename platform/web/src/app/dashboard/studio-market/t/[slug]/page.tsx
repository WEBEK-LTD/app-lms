import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { DesignerAvatar, FreePrice, KindTag } from "@/components/studio-market/parts";
import { ApplyForm, DemoButton, TemplateDemo, TemplateGallery, type DemoPage, type MineApp } from "@/components/studio-market/template-view";
import { Notice, btn, formatDate } from "@/components/ui";
import { countryName } from "@/lib/account/country";
import { appLabel } from "@/lib/app/label";
import { assetUrl } from "@/lib/assets";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl, encryptionKey } from "@/lib/env";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { formatList } from "@/i18n";
import { designerChip, coverView } from "@/lib/studio-market/catalog";
import { templateFits, templateKinds } from "@/lib/studio-market/kinds";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { templateText } from "@/lib/studio-market/templates";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata({ params }: PageProps<"/dashboard/studio-market/t/[slug]">): Promise<Metadata> {
  const template = await (await getStore()).getMarketTemplateBySlug((await params).slug);
  const { t, lang } = await dashboardText();
  return { title: template ? templateText(template, lang).title : t("studioMarket.nav") };
}
export const dynamic = "force-dynamic";

const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: { en: "English", ar: "Arabic", tr: "Turkish" },
  ar: { en: "إنجليزي", ar: "عربي", tr: "تركي" },
  tr: { en: "İngilizce", ar: "Arapça", tr: "Türkçe" },
};

/**
 * 106.1 A template's page, as the owner approved it: its pages drawn in
 * phones (light, dark, each language), what it includes, about it, the
 * designer; the plan (free for now) and "Apply to my app" for one of the
 * owner's Studio projects of a kind it fits, "Preview it on my app first",
 * and the demo.
 */
export default async function TemplatePage({ params, searchParams }: PageProps<"/dashboard/studio-market/t/[slug]">) {
  const context = await requireClient("settings");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const template = await store.getMarketTemplateBySlug((await params).slug);
  const own = template?.clientId === context.client.id;
  if (!template || !template.currentVersionId || (template.status !== "published" && !own)) notFound();
  const [designer, version] = await Promise.all([store.getTemplateDesigner(template.designerId), store.getMarketTemplateVersion(template.currentVersionId)]);
  const file = version ? await versionDesign(getBlobStore(), version) : null;
  if (!designer || !version || !file) notFound();
  if (!own) await store.addMarketTemplateView(template.id);
  const text = templateText(template, lang);
  const kinds = templateKinds(template);
  const owner = contextCan(context, "billing");
  const fitting = owner ? context.apps.filter((a) => templateFits(template, a)) : [];
  const licences = owner ? await store.listTemplateLicences({ clientId: context.client.id, templateId: template.id }) : [];
  const onApp = context.apps.find((a) => licences.some((l) => l.status === "active" && l.appId === a.id)) ?? null;
  const apps = fitting.filter((a) => a.id !== onApp?.id);
  const counts = await store.countTemplateLicences();
  const designerTemplates = (await store.listMarketTemplates({ designerId: designer.id, statuses: ["published"] })).filter((x) => x.currentVersionId);
  const chip = designerChip(designer);

  const pageTitle = (p: (typeof file.pages)[number]) => (p.translations?.[lang as "ar"]?.title as string | undefined) || p.title;
  const pages: DemoPage[] = file.pages.flatMap((p) => {
    const view = coverView(version.cover ? { ...version.cover, page: p.studio } : { page: p.studio, lang: file.languages.default, font: file.look?.font ?? "Cairo", brand: file.look?.primary_color ?? "#0E0D24", accent: file.look?.secondary_color ?? null, tabs: file.look?.tabs ?? [] }, version.languages, lang, text.title);
    return view ? [{ slug: p.slug, title: pageTitle(p), view }] : [];
  });
  // "Preview it on my app first": the app's name and logo, and its own entries when Yallapp keeps its content.
  const mine: MineApp[] = await Promise.all(
    apps.slice(0, 5).map(async (a, i) => ({
      id: a.id,
      name: appLabel(a),
      logoUrl: a.logoAssetId ? assetUrl(a.logoAssetId) : null,
      pickable: i < 3 && a.backend === "hosted" ? await pickableContent(a, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now).catch(() => null) : null,
    })),
  );
  const query = await searchParams;
  const languages = version.languages.filter((l) => l === "en" || l === "ar" || l === "tr");
  const names = languages.map((l) => LANGUAGE_NAMES[lang]?.[l] ?? l);

  const crumbs = (
    <nav aria-label={t("studioMarket.nav")} className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <Link href="/dashboard/studio-market" className="inline-flex items-center gap-1 font-semibold text-muted no-underline hover:text-midnight">
        <Icon name="arrow_back" size={18} />
        {t("studioMarket.nav")}
      </Link>
      {kinds[0] ? (
        <>
          <span className="hidden text-faint sm:inline">/</span>
          <Link href={`/dashboard/studio-market?kind=${kinds[0].id}`} className="hidden text-muted no-underline hover:text-midnight sm:inline">
            {k(kinds[0].name)}
          </Link>
        </>
      ) : null}
      <span className="hidden text-faint sm:inline">/</span>
      <span aria-current="page" dir="auto" className="hidden font-semibold text-midnight sm:inline">
        {text.title}
      </span>
    </nav>
  );

  const included: [IconName, string, string][] = [
    ["phone_iphone", String(version.pages), t("studioMarket.screensWord")],
    ["widgets", String(version.elements), t("studioMarket.elementsWord")],
    ["translate", String(languages.length), t("studioMarket.languagesLine", { count: languages.length, names: formatList(lang, names) })],
    ["dark_mode", t("studioMarket.lightDark"), t("studioMarket.bothIncluded")],
    ...(languages.includes("ar") ? ([["format_align_right", t("studioMarket.rtl"), t("studioMarket.rtlHint")]] as [IconName, string, string][]) : []),
    ["storefront", formatList(lang, kinds.map((x) => k(x.name))), t("studioMarket.kindsFit")],
  ];
  const includedSection = (
    <section aria-labelledby="h-included" className="flex flex-col rounded-2xl border border-line bg-white">
      <div className="px-5 pt-5 sm:px-6">
        <h2 id="h-included" className="m-0 text-lg font-bold">
          {t("studioMarket.included")}
        </h2>
        <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{t("studioMarket.includedHint")}</p>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {included.map(([icon, value, label]) => (
            <div key={icon} className="flex items-center gap-3 rounded-xl border border-line-soft bg-sand px-3.5 py-3">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-peach text-accent">
                <Icon name={icon} size={21} />
              </span>
              <span className="flex min-w-0 flex-col">
                <b className="text-[15px]">{value}</b>
                <span className="text-xs text-muted">{label}</span>
              </span>
            </div>
          ))}
        </div>
        <ul aria-label={t("studioMarket.pagesList")} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {pages.map((p) => (
            <li key={p.slug} className="rounded-xl bg-line-soft px-2.5 py-1 text-xs font-semibold text-muted">
              {p.title}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const about = text.description ? (
    <section aria-labelledby="h-about" className="flex flex-col rounded-2xl border border-line bg-white">
      <h2 id="h-about" className="m-0 px-5 pt-5 text-lg font-bold sm:px-6">
        {t("studioMarket.about")}
      </h2>
      <div className="px-5 pt-4 pb-6 sm:px-6">
        {text.description.split(/\n{2,}/).map((para, i) => (
          <p key={i} dir="auto" className="m-0 mb-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-3 last:mb-0">
            {para}
          </p>
        ))}
      </div>
    </section>
  ) : null;

  let action: React.ReactNode;
  if (own) {
    action = (
      <Notice tone="info" icon="draw">
        <b>{t("studioMarket.ownTemplate")}</b>
        <br />
        {t("studioMarket.ownTemplateText")}{" "}
        <Link href={`/designer/publish?id=${template.id}`} className="font-semibold">
          {t("studioMarket.editInDesigner")}
        </Link>
      </Notice>
    );
  } else if (!owner) {
    action = <Notice tone="neutral" icon="lock">{t("studioMarket.known.ownerOnly")}</Notice>;
  } else {
    action = (
      <div className="flex flex-col gap-2.5">
        {onApp ? (
          <Notice tone="success" icon="check_circle">
            <b>{t("studioMarket.onApp", { app: appLabel(onApp) })}</b>
            <br />
            {t("studioMarket.onAppText")}{" "}
            <Link href="/dashboard/studio-market/mine" className="font-semibold">
              {t("studioMarket.navMine")}
            </Link>
          </Notice>
        ) : null}
        {apps.length ? (
          <ApplyForm slug={template.slug} apps={apps.map((a) => ({ id: a.id, name: appLabel(a) }))} label={{ apply: t("studioMarket.apply") }} />
        ) : onApp ? null : (
          <Notice tone="neutral" icon="smartphone">
            <b>{t("studioMarket.noFittingApp")}</b>
            <br />
            {t("studioMarket.noFittingAppText", { kinds: formatList(lang, kinds.map((x) => k(x.name)), "disjunction") })}{" "}
            <Link href="/studio/new" className="font-semibold">
              {t("studioMarket.newProject")}
            </Link>
          </Notice>
        )}
      </div>
    );
  }

  const panel = (
    <aside className="flex flex-col gap-[18px] rounded-[20px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(14,13,36,0.04),0_8px_24px_-16px_rgba(14,13,36,0.18)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {kinds.map((kind, i) => (
          <span key={kind.id} className="inline-flex items-center gap-2">
            {i ? <span className="text-faint">·</span> : null}
            <KindTag kind={kind} />
          </span>
        ))}
        <span className="text-faint">·</span>
        <span className="text-xs text-muted">{t("studioMarket.updatedOn", { date: formatDate(version.createdAt, lang) })}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <h1 dir="auto" className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.6px] sm:text-[34px]">{text.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <DesignerAvatar designer={chip} size="sm" />
          <span dir="auto" className="font-semibold">{designer.name}</span>
          <span className="text-faint">·</span>
          <span className="text-muted">{t("studioMarket.usedBy", { count: counts[template.id] ?? 0 })}</span>
        </div>
        {text.short ? <p dir="auto" className="m-0 text-sm leading-relaxed text-ink-4">{text.short}</p> : null}
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold">{t("studioMarket.planLabel")}</span>
        <div className="flex flex-col gap-[3px] rounded-[14px] border-2 border-midnight bg-sand px-[13px] py-[11px]">
          <span className="flex items-center justify-between gap-1.5">
            <FreePrice big />
            <span aria-hidden="true" className="h-[18px] w-[18px] rounded-full border-[5.5px] border-midnight bg-white" />
          </span>
          <span className="text-xs text-muted">{t("studioMarket.freePlanHint")}</span>
        </div>
      </div>
      {action}
      <Notice tone="neutral" icon="history">
        <b>{t("studioMarket.freeNotice")}</b>
        <br />
        {t("studioMarket.freeNoticeText")}
      </Notice>
    </aside>
  );

  const designerCard = (
    <section aria-label={designer.name} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white px-4 py-[18px] sm:px-6 sm:py-[22px]">
      <div className="flex items-center gap-3.5">
        <DesignerAvatar designer={chip} size="xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <span dir="auto" className="text-lg font-extrabold">{designer.name}</span>
          <span className="text-[13px] text-muted">{t("studioMarket.designerSince", { country: countryName(designer.country, lang), year: String(designer.createdAt.getUTCFullYear()) })}</span>
        </div>
      </div>
      {designer.bio ? <p dir="auto" className="m-0 text-sm leading-relaxed text-ink-4">{designer.bio}</p> : null}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand p-3 text-center">
        <span className="flex flex-col">
          <b className="text-base">{designerTemplates.length}</b>
          <span className="text-xs text-muted">{t("studioMarket.templatesWord")}</span>
        </span>
        <span className="flex flex-col">
          <b className="text-base">{designerTemplates.reduce((n, x) => n + (counts[x.id] ?? 0), 0)}</b>
          <span className="text-xs text-muted">{t("studioMarket.appsWord")}</span>
        </span>
      </div>
      <Link href={`/dashboard/studio-market?designer=${designer.slug}`} className={`${btn.secondary} h-9 w-full text-sm`}>
        {t("studioMarket.seeDesigner", { count: designerTemplates.length })}
        <Icon name="arrow_forward" size={18} />
      </Link>
    </section>
  );

  return (
    <TemplateDemo pages={pages} languages={languages.length ? languages : [file.languages.default]} samples={{ items: {}, categories: {}, samples: sampleEntries(now) }} mine={mine} startOpen={query.demo === "1"} title={text.title}>
      {crumbs}
      {/* One panel: beside the pictures on a computer, under them on a phone. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_408px] lg:grid-rows-[auto_auto_1fr] lg:gap-x-7">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <TemplateGallery />
        </div>
        <DemoButton className="w-full lg:hidden" />
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          {panel}
          {designerCard}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">{includedSection}</div>
        {about ? <div className="min-w-0 lg:col-start-1 lg:row-start-3">{about}</div> : null}
      </div>
    </TemplateDemo>
  );
}
