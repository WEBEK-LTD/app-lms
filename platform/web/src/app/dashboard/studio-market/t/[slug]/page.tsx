import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { PageThumb } from "@/components/studio-market/phone";
import { DesignerAvatar, WasPrice } from "@/components/studio-market/parts";
import { Countdown } from "@/components/studio-market/countdown";
import { ApplyForm, DemoButton, PageChips, PlanPicker, TemplateDemo, TemplateStage, type DemoPage, type MineApp, type PlanChoice } from "@/components/studio-market/template-view";
import { Notice, formatDate } from "@/components/ui";
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
import { automaticDiscounts, designerChip, coverView } from "@/lib/studio-market/catalog";
import { bestAutomatic, marketPrice } from "@/lib/studio-market/discounts";
import { templateFits, templateKinds } from "@/lib/studio-market/kinds";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { templateText } from "@/lib/studio-market/templates";
import { formatUsd, ltr, offeredPlans, perMonthCents } from "@/lib/studio-market/plans";
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
  // 106.2 Paid plans: each one's billed price and per month; a licence bought to apply later is applied here.
  // 106.12 At the automatic discounts' prices (a price drop or a flash sale), the plan's own struck through.
  const discounts = (await automaticDiscounts(store, [template.id], now)).get(template.id) ?? [];
  const paid = offeredPlans(template).map((p) => {
    const deal = bestAutomatic(p, discounts, now);
    return { ...p, list: p.cents, cents: deal?.cents ?? p.cents, flashEndsAt: deal?.discount.kind === "flash" ? (deal.discount.endsAt?.toISOString() ?? null) : null };
  });
  const { tag, wasCents } = marketPrice(template, discounts, now);
  const bought = licences.find((l) => l.status === "active" && !l.appId) ?? null;
  const monthly = paid.flatMap((p) => {
    const cents = perMonthCents(p);
    return cents === null ? [] : [{ period: p.period, cents }];
  });
  const bestPlan = monthly.length > 1 ? monthly.reduce((a, b) => (b.cents < a.cents ? b : a)).period : null;
  const planRows: PlanChoice[] = paid.map((p) => {
    const month = perMonthCents(p);
    return {
      period: p.period,
      name: t(`studioMarket.plan_${p.period}`),
      price: ltr(formatUsd(p.cents), lang),
      sub: month === null ? t("studioMarket.lifeHint") : t("studioMarket.perMonth", { price: ltr(formatUsd(month), lang) }),
      best: p.period === bestPlan,
      was: p.cents < p.list ? ltr(formatUsd(p.list), lang) : null,
      flashEndsAt: p.flashEndsAt,
    };
  });
  const tagText = tag.kind === "free" ? t("studioMarket.free") : tag.kind === "from" ? t("studioMarket.perMonth", { price: ltr(formatUsd(tag.cents), lang) }) : t("studioMarket.oncePrice", { price: ltr(formatUsd(tag.cents), lang) });
  const wasText = wasCents ? (tag.kind === "from" ? t("studioMarket.perMonth", { price: ltr(formatUsd(wasCents), lang) }) : ltr(formatUsd(wasCents), lang)) : null;
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
    <nav aria-label={t("studioMarket.nav")} className="flex min-w-0 items-center gap-2 text-sm">
      <Link href="/dashboard/studio-market" className="inline-flex items-center gap-1.5 font-semibold text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100">
        <Icon name="arrow_back" size={18} />
        {t("studioMarket.nav")}
      </Link>
      {kinds[0] ? (
        <>
          <span className="hidden opacity-40 sm:inline">/</span>
          <Link href={`/dashboard/studio-market?kind=${kinds[0].id}`} className="hidden text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100 sm:inline">
            {k(kinds[0].name)}
          </Link>
        </>
      ) : null}
    </nav>
  );

  const used = counts[template.id] ?? 0;
  const intro = (
    <>
      <span className="mk-eyebrow">{kinds.map((x) => k(x.name)).join(" · ")}</span>
      <h1 dir="auto" className={`mk-display mk-gradtext m-0 break-words ${text.title.length > 16 ? "text-[42px] md:text-[60px] lg:text-[68px]" : "text-[54px] md:text-[80px] lg:text-[96px]"}`}>
        {text.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2.5 text-[15px]">
        <DesignerAvatar designer={chip} size="sm" />
        <b dir="auto">{designer.name}</b>
        <span className="opacity-40">·</span>
        <span className="mk-muted">{t("studioMarket.usedBy", { count: used })}</span>
      </div>
      {text.short ? (
        <p dir="auto" className="mk-lead m-0 max-w-[460px] md:text-[17px]">
          {text.short}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <DemoButton className="mk-btn-lg" />
        <span className="mk-muted text-[13px]">{t("studioMarket.updatedOn", { date: formatDate(version.createdAt, lang) })}</span>
      </div>
    </>
  );

  const included: [IconName, string, string][] = [
    ["phone_iphone", String(version.pages), t("studioMarket.screensWord")],
    ["widgets", String(version.elements), t("studioMarket.elementsWord")],
    ["translate", String(languages.length), t("studioMarket.languagesLine", { count: languages.length, names: formatList(lang, names) })],
    ["dark_mode", t("studioMarket.lightDark"), t("studioMarket.bothIncluded")],
    ...(languages.includes("ar") ? ([["format_align_right", t("studioMarket.rtl"), t("studioMarket.rtlHint")]] as [IconName, string, string][]) : []),
    ["storefront", kinds.length === 1 ? k(kinds[0]!.name) : String(kinds.length), t("studioMarket.kindsFit")],
  ];
  const includedSection = (
    <section aria-labelledby="h-included" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="mk-eyebrow">{t("studioMarket.included")}</span>
        <h2 id="h-included" className="mk-h2 text-[28px] md:text-[38px]">
          {t("studioMarket.includedTitle")}
        </h2>
        <p className="mk-muted m-0 text-[15px] leading-relaxed">{t("studioMarket.includedHint")}</p>
      </div>
      <div className="mk-incl grid grid-cols-2 sm:grid-cols-3">
        {included.map(([icon, value, label]) => (
          <div key={icon} className="flex min-w-0 flex-col gap-3 px-4 py-5 md:px-6 md:py-[26px]">
            <span className="mk-tile flex h-12 w-12 items-center justify-center rounded-full text-[var(--mk-accent)]">
              <Icon name={icon} size={24} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <b className="text-[22px] leading-[1.15] tracking-[-0.02em] md:text-[26px]">{value}</b>
              <span className="mk-muted text-sm">{label}</span>
            </span>
          </div>
        ))}
      </div>
      <PageChips />
    </section>
  );

  const paragraphs = text.description.split(/\n{2,}/).filter((x) => x.trim());
  const about = paragraphs.length ? (
    <section aria-labelledby="h-about" className="flex flex-col gap-4">
      <h2 id="h-about" className="mk-eyebrow m-0">
        {t("studioMarket.about")}
      </h2>
      <p dir="auto" className="m-0 text-[20px] leading-[1.45] font-semibold tracking-[-0.01em] whitespace-pre-line md:text-[26px]">
        {paragraphs[0]}
      </p>
      {paragraphs.slice(1).map((para, i) => (
        <p key={i} dir="auto" className="mk-lead m-0 whitespace-pre-line md:text-base">
          {para}
        </p>
      ))}
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
    action = (
      <Notice tone="neutral" icon="lock">
        {t("studioMarket.known.ownerOnly")}
      </Notice>
    );
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
        {paid.length && !bought ? (
          <PlanPicker slug={template.slug} plans={planRows} initial={bestPlan ?? planRows[0]!.period} />
        ) : apps.length ? (
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

  // 106.2 A paid template: no automatic renewal, what happens at the end (the designer's choice), moving, no refunds.
  const know: [IconName, string][] = paid.length
    ? [
        [template.afterEnd === "restore" ? "undo" : "history", t(template.afterEnd === "restore" ? "studioMarket.knowEndRestore" : "studioMarket.knowEndKeep")],
        ["event", t("studioMarket.knowRenew")],
        ["compare", t("studioMarket.knowMove")],
        ["block", t("studioMarket.knowRefund")],
      ]
    : [
        ["new_releases", t("studioMarket.knowFree")],
        ["history", t("studioMarket.knowKeep")],
        ["compare", t("studioMarket.knowMove")],
        ["verified", t("studioMarket.knowReview")],
      ];
  const panel = (
    <aside id="apply" aria-label={t("studioMarket.planLabel")} className="mk-panel flex scroll-mt-6 flex-col gap-[22px] rounded-[28px] px-5 py-6 md:p-[30px]">
      <div className="flex flex-col gap-1">
        <span className="mk-small">{t(paid.length ? "studioMarket.fromWord" : "studioMarket.fromLabel")}</span>
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <b data-price-tag className="text-[40px] leading-none tracking-[-0.04em]">
            {tagText}
          </b>
          {wasText ? <WasPrice text={wasText} className="text-[17px]" /> : null}
        </span>
        {paid.some((p) => p.flashEndsAt) ? (
          <span className="mk-sale-time flex flex-wrap items-center gap-x-2 text-[13px] font-bold">
            <Icon name="bolt" size={17} filled />
            {t("marketDiscounts.flashPill")}
            <Countdown endsAt={paid.flatMap((p) => (p.flashEndsAt ? [p.flashEndsAt] : [])).sort()[0]!} />
          </span>
        ) : null}
      </div>
      {paid.length ? null : (
        <div className="flex flex-col gap-2.5">
          <span className="mk-small">{t("studioMarket.planLabel")}</span>
          <div className="mk-plan" aria-current="true">
            <span className="flex items-center justify-between gap-2">
              <b className="text-[22px] tracking-[-0.02em]">{t("studioMarket.free")}</b>
              <Icon name="check_circle" size={22} filled />
            </span>
            <span className="text-[13px] opacity-75">{t("studioMarket.freePlanHint")}</span>
          </div>
        </div>
      )}
      {action}
      <ul className="m-0 flex list-none flex-col border-t border-[var(--mk-hair)] p-0">
        {know.map(([icon, line]) => (
          <li key={icon} className="flex items-start gap-3 border-b border-[var(--mk-hair2)] py-3 text-sm leading-normal">
            <span className="flex flex-none text-[var(--mk-accent)]">
              <Icon name={icon} size={20} />
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );

  const others = designerTemplates.filter((x) => x.id !== template.id).slice(0, 3);
  const otherVersions = await store.listMarketTemplateVersions(others.flatMap((x) => (x.currentVersionId ? [x.currentVersionId] : [])));
  const designerCard = (
    <section aria-labelledby="h-designer" className="mk-panel grid overflow-hidden rounded-[28px] md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="mk-mono h-[200px] rounded-none md:h-full md:min-h-[320px]">
        <span className="flex h-[118px] w-[118px] items-center justify-center rounded-full text-[44px] font-extrabold tracking-[-0.04em] shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_20px_40px_-14px_rgba(14,13,36,0.6)]" style={{ background: chip.bg, color: chip.fg }} aria-hidden="true">
          {chip.initials}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-4 px-5 py-6 md:px-8 md:py-[30px]">
        <span className="mk-eyebrow">{t("studioMarket.designerEyebrow")}</span>
        <div className="flex flex-col gap-1">
          <h2 id="h-designer" dir="auto" className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">
            {designer.name}
          </h2>
          <span className="mk-muted text-[13px]">{t("studioMarket.designerSince", { country: countryName(designer.country, lang), year: String(designer.createdAt.getUTCFullYear()) })}</span>
        </div>
        {designer.bio ? (
          <p dir="auto" className="m-0 text-base leading-relaxed text-[var(--mk-ink2)]">
            {designer.bio}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-7">
          {(
            [
              [designerTemplates.length, t("studioMarket.templatesWord")],
              [designerTemplates.reduce((n, x) => n + (counts[x.id] ?? 0), 0), t("studioMarket.appsWord")],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className="mk-kpi text-[30px]">{value}</span>
              <span className="mk-small">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {others.map((x) => {
            const v = otherVersions.find((o) => o.id === x.currentVersionId);
            const title = templateText(x, lang).title;
            const cover = v ? coverView(v.cover, v.languages, lang, title) : null;
            return (
              <Link key={x.id} href={`/dashboard/studio-market/t/${x.slug}`} className="flex items-center gap-2 rounded-full border border-[var(--mk-hair)] py-1.5 ps-1.5 pe-3 text-[var(--mk-ink)] no-underline hover:border-[var(--mk-ink)] hover:text-[var(--mk-ink)]">
                <span className="block h-9 w-[26px] flex-none overflow-hidden rounded-md">{cover ? <PageThumb view={cover} width={26} height={36} /> : null}</span>
                <b dir="auto" className="max-w-[160px] truncate text-[13px]">
                  {title}
                </b>
              </Link>
            );
          })}
          <Link href={`/dashboard/studio-market?designer=${designer.slug}`} className="mk-link text-sm">
            {t("studioMarket.seeDesigner", { count: designerTemplates.length })}
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );

  return (
    <TemplateDemo pages={pages} languages={languages.length ? languages : [file.languages.default]} samples={{ items: {}, categories: {}, samples: sampleEntries(now) }} mine={mine} startOpen={query.demo === "1"} title={text.title}>
      <div className="mk mk-bare">
        <section className="mk-wall mk-sec relative overflow-hidden pt-5 md:pt-7">
          <div className="mk-atmos" aria-hidden="true">
            <span className="mk-stars" />
            <span className="mk-g1 -end-[200px] top-[120px]" />
            <span className="mk-g2 -start-[280px] -top-[280px]" />
            <span className="mk-beam start-[52%]" />
            <span className="mk-floor" />
          </div>
          <div className="mk-in relative z-[3]">
            <TemplateStage crumbs={crumbs} intro={intro} />
          </div>
        </section>
        {/* One panel: beside the rest on a computer (it stays in view), first on a phone. */}
        <div className="mk-sec pt-7 pb-16 md:pt-16 md:pb-24">
          <div className="mk-in grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
            <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">{panel}</div>
            <div className="flex min-w-0 flex-col gap-12 md:gap-20 lg:col-start-1 lg:row-start-1">
              {includedSection}
              {about}
              {designerCard}
            </div>
          </div>
        </div>
        {owner && !own && apps.length ? (
          <div className="mk-buybar sticky bottom-0 z-30 flex items-center gap-3 px-5 py-3.5 lg:hidden">
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-lg leading-tight">{tag.kind === "free" ? t("studioMarket.free") : tag.kind === "from" ? t("studioMarket.fromPrice", { price: ltr(formatUsd(tag.cents), lang) }) : t("studioMarket.oncePrice", { price: ltr(formatUsd(tag.cents), lang) })}</b>
              {wasText ? <WasPrice text={wasText} className="text-xs" /> : null}
              <span className="mk-muted truncate text-xs">{t("studioMarket.knowReview")}</span>
            </span>
            <a href="#apply" className="mk-btn mk-btn-ember h-[50px] px-5 text-[15px]">
              {t("studioMarket.apply")}
            </a>
          </div>
        ) : null}
      </div>
    </TemplateDemo>
  );
}
