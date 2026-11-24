import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AccountLink } from "@/components/account-link";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { JsonLdScript } from "@/components/json-ld";
import { ContactBand } from "@/components/marketing";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Countdown } from "@/components/studio-market/countdown";
import { DesignerAvatar, PriceTagView, TemplateCardView, WasPrice } from "@/components/studio-market/parts";
import { MarketPhones, PageThumb, TemplatePhone } from "@/components/studio-market/phone";
import { DemoButton, PageChips, PlanPicker, TemplateDemo, TemplateStage, type DemoPage } from "@/components/studio-market/template-view";
import { formatDate, formatList, formatMessage, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { kindNameFor } from "@/lib/marketing-lang";
import { breadcrumbLd, NO_INDEX, siteMetadata, siteUrl } from "@/lib/seo";
import { automaticDiscounts, coverView, designerChip, filterCards, flashStrip, marketCatalog, readMarketQuery, type MarketQuery, type TemplateCard } from "@/lib/studio-market/catalog";
import { marketPrice } from "@/lib/studio-market/discounts";
import { templateKinds } from "@/lib/studio-market/kinds";
import { knowLines, planChoices, planPrices, priceWords, soonestFlashEnd } from "@/lib/studio-market/listing";
import { continueHref, MARKET_PATH, marketItemListLd, marketNextPath, publicTemplate, templatePath, templateProductLd } from "@/lib/studio-market/public";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { designerPath, designersBase, publicProfile } from "@/lib/studio-market/designer-page";
import { templateRatings } from "@/lib/studio-market/designer-public";
import { RatingLine } from "@/components/studio-market/parts";
import { safePhotoUrl } from "@/lib/studio-market/photo-url";
import { RatingList } from "@/components/studio-market/ratings";
import { designersText } from "./designers-text";
import { ratingWords } from "./designers";
import { templateText } from "@/lib/studio-market/templates";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { templatesText } from "./templates-text";
import { VisitorOnly } from "./templates-visitor";
import { marketCatalogFor, marketT } from "./templates-words";

/**
 * 106.13 Studio Market on the website, for visitors who aren't signed in:
 * the market (/templates) and a template's page (/templates/<slug>), in
 * English, Arabic (Modern Standard Arabic, right to left) and Turkish. The
 * dashboard's market in the website's chrome: the same cards, prices
 * (lib/studio-market: "From $X/mo", "$X once", "Free", the old price struck
 * through with the Sale or Flash sale pill and its countdown), phones and
 * demo (components/studio-market), in the same two looks: "Gallery" by day
 * and "Night showroom" by night, with the site's light and dark. A plan's
 * button and "Preview it on my app first" go to the dashboard's checkout or
 * demo: straight there when signed in, through sign-up or sign-in first
 * otherwise (lib/studio-market/public.ts). Only what buyers see in the
 * dashboard: never a designer's email, account, ID or payout details, nor
 * their country.
 */

const DAY = 24 * 60 * 60 * 1000;

const fmt = (lang: Lang, message: string, values?: Record<string, string | number>) => formatMessage(lang, message, values);

/** The website's names for the app kinds (src/content/{ar,tr}/marketing.ts `kindNames`), on the cards too. */
function localCards(cards: readonly TemplateCard[], lang: Lang): TemplateCard[] {
  return cards.map((card) => ({ ...card, kinds: card.kinds.map((kind) => ({ ...kind, name: kindNameFor(lang, kind.name) })) }));
}

/** The market's parts in the page's language, with the samples the phones' lists show. */
function MarketWords({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <DashboardI18n lang={lang} messages={marketCatalogFor(lang)} knownEnglish={{}}>
      {children}
    </DashboardI18n>
  );
}

/** The website's header and footer around a market page. */
function Chrome({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <div className="bg-white">
      <SiteHeader current="templates" lang={lang} />
      <main>
        {children}
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}

// ——— The market ———

export function templatesMetadata(lang: Lang, filtered = false): Metadata {
  const x = templatesText(lang);
  const base = siteMetadata(lang, { title: x.metaTitle, description: x.metaDescription, path: MARKET_PATH, image: `${MARKET_PATH}/opengraph-image` });
  // A search or a filter is the market again: its canonical is /templates, and it isn't indexed on its own.
  return filtered ? { ...base, robots: { index: false, follow: true } } : base;
}

export function isFiltered(params: Record<string, string | string[] | undefined>): boolean {
  return ["q", "kind", "price", "sort", "designer"].some((key) => typeof params[key] === "string");
}

export async function TemplatesPage({ lang, params }: { lang: Lang; params: Record<string, string | string[] | undefined> }) {
  const x = templatesText(lang);
  const t = marketT(lang);
  const lp = (path: string) => localePath(lang, path);
  const store = await getStore();
  const now = new Date();
  const query = readMarketQuery(params);
  const designerSlug = typeof params.designer === "string" && /^[a-z0-9-]{1,60}$/.test(params.designer) ? params.designer : null;
  const catalog = await marketCatalog(store, lang, now);
  const cards = localCards(catalog.cards, lang);
  const filtering = isFiltered(params);
  const shown = filterCards(cards, query).filter((c) => !designerSlug || c.designer.slug === designerSlug);
  const base = siteUrl();

  const href = (change: Partial<MarketQuery>) => {
    const next = { ...query, ...change };
    const out = new URLSearchParams();
    if (next.q) out.set("q", next.q);
    if (next.kind) out.set("kind", next.kind);
    if (next.price !== "all") out.set("price", next.price);
    if (next.sort !== "popular" || typeof params.sort === "string" || change.sort) out.set("sort", next.sort);
    if (designerSlug) out.set("designer", designerSlug);
    const text = out.toString();
    return `${lp(MARKET_PATH)}${text ? `?${text}` : ""}`;
  };
  const sortName = { popular: x.sortPopular, newest: x.sortNewest, name: x.sortName };
  const cardBase = lp(MARKET_PATH);

  // The app kinds that have templates, most first.
  const kindCounts = new Map<string, { name: string; icon: string; count: number }>();
  for (const card of cards) for (const kind of card.kinds) kindCounts.set(kind.id, { name: kind.name, icon: kind.icon, count: (kindCounts.get(kind.id)?.count ?? 0) + 1 });
  const kinds = [...kindCounts.entries()].sort((a, b) => b[1].count - a[1].count);

  // The featured template: the most applied lately, else the newest.
  const byRecent = [...cards].sort((a, b) => b.recent - a.recent || b.applies - a.applies || Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
  const featured = byRecent[0] ?? null;
  const designerName = designerSlug ? (catalog.designers.find((d) => d.slug === designerSlug)?.name ?? null) : null;

  const search = (
    <form action={lp(MARKET_PATH)} method="get" role="search" className="mk-search w-full max-w-[600px]">
      <Icon name="search" size={24} className="mk-muted" />
      <label htmlFor="templates-q" className="sr-only">
        {x.searchLabel}
      </label>
      <input id="templates-q" name="q" type="search" defaultValue={query.q} placeholder={x.searchPlaceholder} />
      {query.kind ? <input type="hidden" name="kind" value={query.kind} /> : null}
      {query.price !== "all" ? <input type="hidden" name="price" value={query.price} /> : null}
      {typeof params.sort === "string" ? <input type="hidden" name="sort" value={query.sort} /> : null}
      <button type="submit" className="mk-btn mk-btn-ember hidden h-[50px] sm:inline-flex">
        {x.searchButton}
      </button>
    </form>
  );

  const covers = cards.slice(0, 3).map((c) => c.cover);
  const hero = (
    <section className="mk-wall mk-sec relative overflow-hidden pt-10 pb-8 md:pt-16 md:pb-12" aria-labelledby="h-templates">
      <div className="mk-atmos" aria-hidden="true">
        <span className="mk-stars" />
        <span className="mk-g2 -end-[260px] -top-[260px]" />
        <span className="mk-g1 -start-[300px] top-[320px]" />
        <span className="mk-floor" />
      </div>
      <div className="mk-in relative z-[3] grid items-center gap-10 lg:grid-cols-[1fr_460px]">
        <div className="flex flex-col gap-6">
          <span className="mk-eyebrow">{x.eyebrow}</span>
          <h1 id="h-templates" className="mk-display mk-gradtext m-0 text-[44px] md:text-[76px]">
            {filtering ? x.eyebrow : x.title}
          </h1>
          {filtering ? null : <p className="mk-lead m-0 max-w-[540px]">{x.lead}</p>}
          {search}
          <p className="mk-small m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{fmt(lang, x.statsTemplates, { count: cards.length })}</span>
            <span className="opacity-40">·</span>
            <span>{fmt(lang, x.statsDesigners, { count: catalog.designers.length })}</span>
            <span className="opacity-40">·</span>
            <span>{x.statsReviewed}</span>
          </p>
        </div>
        {!filtering && covers.some(Boolean) ? (
          <div className="relative hidden h-[480px] items-end justify-center lg:flex" aria-hidden="true">
            {covers[1] ? (
              <div className="z-[1] -me-10 mb-8 -rotate-6 rtl:rotate-6">
                <TemplatePhone view={covers[1]} width={170} className="mk-reflect" />
              </div>
            ) : null}
            <div className="z-[3]">
              <TemplatePhone view={covers[0] ?? null} width={214} className="mk-reflect" />
            </div>
            {covers[2] ? (
              <div className="z-[2] -ms-10 mb-8 rotate-6 rtl:-rotate-6">
                <TemplatePhone view={covers[2]} width={170} className="mk-reflect" />
              </div>
            ) : null}
            <span className="mk-plinth bottom-2 w-[360px]" />
          </div>
        ) : null}
      </div>
    </section>
  );

  const filters = (
    <section className="mk-sec pt-7 md:pt-10" aria-label={x.kindsLabel}>
      <div className="mk-in flex flex-col gap-4">
        <nav aria-label={x.kindsLabel} className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <Link href={href({ kind: null })} aria-current={!query.kind ? "page" : undefined} className="mk-chip">
            <Icon name="apps" size={19} />
            {x.kindAll}
            <span className="mk-c">{cards.length}</span>
          </Link>
          {kinds.map(([id, kind]) => (
            <Link key={id} href={href({ kind: id })} aria-current={query.kind === id ? "page" : undefined} className="mk-chip">
              <Icon name={kind.icon as IconName} size={19} />
              {kind.name}
              <span className="mk-c">{kind.count}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={x.priceLabel} className="mk-seg">
            {(["all", "free", "paid"] as const).map((price) => (
              <Link key={price} href={href({ price })} aria-current={query.price === price ? "page" : undefined}>
                {price === "all" ? x.priceAll : price === "free" ? x.priceFree : x.pricePaid}
              </Link>
            ))}
          </nav>
          <details className="relative flex-none">
            <summary className="mk-chip cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <Icon name="tune" size={19} />
              {fmt(lang, x.sortShown, { sort: sortName[query.sort] })}
              <Icon name="expand_more" size={18} />
            </summary>
            <ul className="mk-panel absolute end-0 z-20 m-0 mt-2 flex min-w-[220px] list-none flex-col p-1.5">
              {(["popular", "newest", "name"] as const).map((sort) => (
                <li key={sort}>
                  <Link href={href({ sort })} aria-current={query.sort === sort ? "true" : undefined} className={`flex h-10 items-center rounded-xl px-3 text-sm text-[var(--mk-ink)] no-underline hover:text-[var(--mk-ink)] ${query.sort === sort ? "font-bold" : "opacity-75"}`}>
                    {sortName[sort]}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </section>
  );

  const head = (eyebrow: string | null, title: string, sub: string | undefined, id: string) => (
    <div className="mb-[22px] flex items-end justify-between gap-6 md:mb-[34px]">
      <div className="flex max-w-[680px] flex-col gap-3">
        {eyebrow ? <span className="mk-eyebrow">{eyebrow}</span> : null}
        <h2 id={id} className="mk-h2">
          {title}
        </h2>
        {sub ? <p className="mk-lead m-0 md:text-[17px]">{sub}</p> : null}
      </div>
    </div>
  );
  const grid = (list: TemplateCard[], options: { ranks?: boolean; pool?: string } = {}) => (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
      {list.map((card, i) => (
        <div key={card.id} className="w-[236px] flex-none md:w-auto">
          <TemplateCardView card={card} rank={options.ranks ? i + 1 : undefined} pool={options.pool} base={cardBase} designerBase={designersBase(lang)} />
        </div>
      ))}
    </div>
  );
  const sec = (key: string, children: ReactNode, labelledBy: string) => (
    <section key={key} aria-labelledby={labelledBy} className="mk-sec pt-16 md:pt-[96px]">
      <div className="mk-in">{children}</div>
    </section>
  );

  let body: ReactNode;
  if (!cards.length) {
    body = sec(
      "empty",
      <div className="mk-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Icon name="storefront" size={34} className="mk-muted" />
        <h2 id="h-empty" className="mk-h2 text-[28px] md:text-[34px]">
          {x.emptyTitle}
        </h2>
        <p className="mk-lead m-0 max-w-[480px] md:text-base">{x.emptyText}</p>
      </div>,
      "h-empty",
    );
  } else if (filtering) {
    body = (
      <section className="mk-sec pt-10 md:pt-14" aria-labelledby="h-results">
        <div className="mk-in flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="h-results" className="mk-h2" data-results={shown.length}>
              {fmt(lang, x.results, { count: shown.length })}
              {designerName ? (
                <span dir="auto" className="mk-muted ms-3 text-lg font-semibold">
                  {fmt(lang, x.byDesigner, { name: designerName })}
                </span>
              ) : null}
            </h2>
            <Link href={lp(MARKET_PATH)} className="mk-link">
              {x.clear}
            </Link>
          </div>
          {shown.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((card) => (
                <TemplateCardView key={card.id} card={card} base={cardBase} designerBase={designersBase(lang)} />
              ))}
            </div>
          ) : (
            <div className="mk-panel flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icon name="search" size={30} className="mk-muted" />
              <b className="text-lg">{x.noResults}</b>
              <span className="mk-muted text-sm">{x.noResultsText}</span>
            </div>
          )}
        </div>
      </section>
    );
  } else {
    const newest = cards.filter((c) => c.publishedAt && now.getTime() - Date.parse(c.publishedAt) < 7 * DAY).sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
    const popular = cards.filter((c) => c.applies > 0).sort((a, b) => b.recent - a.recent || b.applies - a.applies);
    const flash = flashStrip(cards, now).slice(0, 8);
    const featuredWords = featured ? priceWords(featured.price, featured.wasCents, t, lang) : null;
    body = (
      <>
        {featured ? (
          <section aria-labelledby="h-featured" className="mk-sec pt-10 md:pt-14" data-featured={featured.slug}>
            <div className="mk-in">
              <div className="mk-panel grid items-center gap-6 overflow-hidden rounded-[28px] px-5 py-6 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12 md:px-12 md:py-10">
                <div className="flex flex-col gap-4">
                  <span className="mk-eyebrow">{x.featuredEyebrow}</span>
                  <h2 id="h-featured" dir="auto" className="mk-h2">
                    {featured.title}
                  </h2>
                  {featured.short ? (
                    <p dir="auto" className="mk-lead m-0 md:text-[17px]">
                      {featured.short}
                    </p>
                  ) : null}
                  <span className="flex flex-wrap items-center gap-2.5 text-[15px]">
                    <DesignerAvatar designer={featured.designer} size="sm" />
                    {featured.designer.page ? (
                      <Link href={lp(designerPath(featured.designer.slug))} dir="auto" className="font-bold text-[var(--mk-ink)] hover:text-[var(--mk-ink)]">
                        {featured.designer.name}
                      </Link>
                    ) : (
                      <b dir="auto">{featured.designer.name}</b>
                    )}
                    <span className="opacity-40">·</span>
                    <span className="mk-muted">{x.featuredHint}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-4">
                    <Link href={lp(templatePath(featured.slug))} className="mk-btn mk-btn-ember">
                      {x.viewFeatured}
                      <Icon name="arrow_forward" size={20} />
                    </Link>
                    <b className="text-lg">{featuredWords!.short}</b>
                    {featuredWords!.was ? <WasPrice text={featuredWords!.was} /> : null}
                  </span>
                </div>
                <div className="flex justify-center" aria-hidden="true">
                  <TemplatePhone view={featured.cover} width={220} className="mk-reflect" />
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {flash.length ? (
          <section aria-labelledby="h-flash" data-flash-strip className="mk-flash mk-sec mt-12 py-12 md:mt-16 md:py-16">
            <div className="mk-in">
              <div className="mb-[22px] flex max-w-[680px] flex-col gap-3 md:mb-[34px]">
                <span className="mk-eyebrow">{x.flashEyebrow}</span>
                <h2 id="h-flash" className="mk-h2 flex items-center gap-3">
                  <Icon name="bolt" size={36} filled className="flex-none text-[var(--mk-accent)]" />
                  {x.flashTitle}
                </h2>
                <p className="mk-lead m-0 md:text-[17px]">{x.flashHint}</p>
              </div>
              {grid(flash, { pool: "rgba(255,90,31,.5)" })}
            </div>
          </section>
        ) : null}
        {newest.length ? (
          <section aria-labelledby="h-new" className="mk-band mk-sec mt-16 py-14 md:mt-[96px] md:py-[80px]" data-new-week>
            <div className="mk-in">
              {head(x.justIn, x.newWeek, x.newWeekHint, "h-new")}
              {grid(newest.slice(0, 4), { pool: "rgba(120,98,255,.45)" })}
            </div>
          </section>
        ) : null}
        {popular.length
          ? sec(
              "popular",
              <>
                {head(x.lastDays, x.popular, undefined, "h-popular")}
                <ol className="m-0 grid list-none grid-cols-1 gap-x-14 p-0 md:grid-cols-2" data-most-applied>
                  {popular.slice(0, 6).map((card, i) => (
                    <li key={card.id} className="relative flex items-center gap-4 border-t border-[var(--mk-hair)] py-[18px]">
                      <span className="mk-rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="h-[62px] w-[46px] flex-none overflow-hidden rounded-[10px] shadow-[0_10px_20px_-12px_rgba(14,13,36,0.5)]">{card.cover ? <PageThumb view={card.cover} width={46} height={62} /> : null}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <Link href={lp(templatePath(card.slug))} dir="auto" className="truncate text-[17px] font-bold text-[var(--mk-ink)] no-underline after:absolute after:inset-0 hover:text-[var(--mk-ink)]">
                          {card.title}
                        </Link>
                        <span dir="auto" className="mk-muted truncate text-[13px]">
                          {card.designer.name}
                        </span>
                      </span>
                      <PriceTagView price={card.price} wasCents={card.wasCents} />
                    </li>
                  ))}
                </ol>
              </>,
              "h-popular",
            )
          : null}
        {catalog.designers.length
          ? sec(
              "designers",
              <>
                {head(null, x.topDesigners, x.topDesignersHint, "h-designers")}
                <ul className="m-0 flex list-none flex-wrap gap-3 p-0" data-top-designers>
                  {catalog.designers.slice(0, 6).map((d) => (
                    <li key={d.id}>
                      <Link href={d.page ? lp(designerPath(d.slug)) : `${lp(MARKET_PATH)}?designer=${d.slug}`} className="mk-panel flex items-center gap-3 rounded-full py-2.5 ps-2.5 pe-5 text-[var(--mk-ink)] no-underline hover:text-[var(--mk-ink)]">
                        <DesignerAvatar designer={d} size="md" />
                        <span className="flex flex-col">
                          <b dir="auto" className="text-[15px]">
                            {d.name}
                          </b>
                          <span className="mk-muted text-xs">{fmt(lang, x.statsTemplates, { count: d.templates })}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>,
              "h-designers",
            )
          : null}
        {sec("every", <>{head(null, x.everyTemplate, undefined, "h-every")}{grid(filterCards(cards, query))}</>, "h-every")}
      </>
    );
  }

  const ld = marketItemListLd(base, lang, x.eyebrow, filterCards(cards, readMarketQuery({})));
  return (
    <Chrome lang={lang}>
      <JsonLdScript data={breadcrumbLd(base, [{ name: x.eyebrow, path: MARKET_PATH }], lang === "en" ? undefined : lang)} />
      <JsonLdScript data={ld} />
      <MarketWords lang={lang}>
        <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
          <div className="mk mk-bare pb-14 md:pb-24" data-public-market="">
            {hero}
            {filters}
            {body}
            <section aria-labelledby="h-owners" className="mk-sec pt-16 md:pt-[96px]">
              <div className="mk-in grid gap-6 md:grid-cols-2">
                <div className="mk-panel flex flex-col gap-4 rounded-[28px] px-[22px] py-[30px] md:p-10">
                  <h2 id="h-owners" className="mk-h2 text-[26px] md:text-[32px]">
                    {x.ownersTitle}
                  </h2>
                  <p className="mk-lead m-0 md:text-base">{x.ownersText}</p>
                  <Link href={lp("/docs/studio-market")} className="mk-link">
                    {x.ownersButton}
                    <Icon name="arrow_forward" size={18} />
                  </Link>
                </div>
                <div className="mk-panel flex flex-col gap-4 rounded-[28px] px-[22px] py-[30px] md:p-10">
                  <span className="mk-eyebrow">{x.designersEyebrow}</span>
                  <h2 className="mk-h2 text-[26px] md:text-[32px]">{x.designersTitle}</h2>
                  <p className="mk-lead m-0 md:text-base">{x.designersText}</p>
                  <Link href="/designer/join" className="mk-btn mk-btn-ink self-start">
                    {x.designersButton}
                    <Icon name="arrow_forward" size={20} />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </MarketPhones>
      </MarketWords>
    </Chrome>
  );
}

// ——— A template's page ———

export async function templateMetadata(lang: Lang, slug: string): Promise<Metadata> {
  const found = await publicTemplate(await getStore(), slug);
  if (!found) return { title: templatesText(lang).eyebrow, robots: NO_INDEX };
  const text = templateText(found.template, lang);
  const description = (text.short || text.description || templatesText(lang).metaDescription).replace(/\s+/g, " ").slice(0, 300);
  return siteMetadata(lang, { title: `${text.title} · ${templatesText(lang).eyebrow}`, description, path: templatePath(found.template.slug), image: `${templatePath(found.template.slug)}/opengraph-image` });
}

export async function TemplatePublicPage({ lang, slug, demo }: { lang: Lang; slug: string; demo?: string | string[] }) {
  const x = templatesText(lang);
  const t = marketT(lang);
  const lp = (path: string) => localePath(lang, path);
  const store = await getStore();
  const now = new Date();
  const found = await publicTemplate(store, slug);
  if (!found) notFound();
  const { template, designer, version } = found;
  const file = await versionDesign(getBlobStore(), version);
  if (!file) notFound();
  const text = templateText(template, lang);
  const kinds = templateKinds(template).map((kind) => ({ ...kind, name: kindNameFor(lang, kind.name) }));
  const discounts = (await automaticDiscounts(store, [template.id], now)).get(template.id) ?? [];
  const paid = planPrices(template, discounts, now);
  const { tag, wasCents } = marketPrice(template, discounts, now);
  const words = priceWords(tag, wasCents, t, lang);
  const rows = planChoices(paid, t, lang);
  const flashEnd = soonestFlashEnd(paid);
  const counts = await store.countTemplateLicences();
  const used = counts[template.id] ?? 0;
  const chip = designerChip(designer);
  const designerTemplates = (await store.listMarketTemplates({ designerId: designer.id, statuses: ["published"] })).filter((o) => o.currentVersionId);
  const base = siteUrl();
  // 106.14 The designer's photo and line once the team approved them; the buyers' ratings with the designer's answers.
  const profile = publicProfile(designer);
  const y = designersText(lang);
  const { ratings, stats } = await templateRatings(store, template, text.title);
  const designerHref = chip.page ? lp(designerPath(designer.slug)) : `${lp(MARKET_PATH)}?designer=${designer.slug}`;

  const pageTitle = (p: (typeof file.pages)[number]) => (p.translations?.[lang as "ar"]?.title as string | undefined) || p.title;
  const pages: DemoPage[] = file.pages.flatMap((p) => {
    const view = coverView(version.cover ? { ...version.cover, page: p.studio } : { page: p.studio, lang: file.languages.default, font: file.look?.font ?? "Cairo", brand: file.look?.primary_color ?? "#0E0D24", accent: file.look?.secondary_color ?? null, tabs: file.look?.tabs ?? [] }, version.languages, lang, text.title);
    return view ? [{ slug: p.slug, title: pageTitle(p), view }] : [];
  });
  const languages = version.languages.filter((l): l is "en" | "ar" | "tr" => l === "en" || l === "ar" || l === "tr");
  const names = languages.map((l) => x.languageNames[l]);

  const crumbs = (
    <nav aria-label={x.eyebrow} className="flex min-w-0 items-center gap-2 text-sm">
      <Link href={lp(MARKET_PATH)} className="inline-flex items-center gap-1.5 font-semibold text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100">
        <Icon name="arrow_back" size={18} />
        {x.eyebrow}
      </Link>
      {kinds[0] ? (
        <>
          <span className="hidden opacity-40 sm:inline">/</span>
          <Link href={`${lp(MARKET_PATH)}?kind=${kinds[0].id}`} className="hidden text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100 sm:inline">
            {kinds[0].name}
          </Link>
        </>
      ) : null}
    </nav>
  );

  const intro = (
    <>
      <span className="mk-eyebrow">{kinds.map((k) => k.name).join(" · ")}</span>
      <h1 dir="auto" className={`mk-display mk-gradtext m-0 break-words ${text.title.length > 16 ? "text-[42px] md:text-[60px] lg:text-[68px]" : "text-[54px] md:text-[80px] lg:text-[96px]"}`}>
        {text.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2.5 text-[15px]">
        <DesignerAvatar designer={chip} size="sm" />
        <Link href={designerHref} dir="auto" data-designer-link={designer.slug} className="font-bold text-[var(--mk-ink)] hover:text-[var(--mk-ink)]">
          {designer.name}
        </Link>
        <span className="opacity-40">·</span>
        <span className="mk-muted">{fmt(lang, x.usedBy, { count: used })}</span>
      </div>
      <RatingLine rating={stats} size={18} className="text-[14px]" />
      {text.short ? (
        <p dir="auto" className="mk-lead m-0 max-w-[460px] md:text-[17px]">
          {text.short}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <DemoButton className="mk-btn-lg" />
        <span className="mk-muted text-[13px]">{fmt(lang, x.updatedOn, { date: formatDate(lang, version.createdAt) })}</span>
      </div>
    </>
  );

  // Where its buttons go: signed in, the dashboard; signed out, sign-up (or sign-in) first, then back there.
  const links = {
    checkout: { signedIn: `/studio/market/checkout/${template.slug}?plan=`, visitor: continueHref(lang, "checkout", template.slug) },
    preview: { signedIn: marketNextPath("preview", template.slug)!, visitor: continueHref(lang, "preview", template.slug) },
  };
  const initialPlan = rows.find((r) => r.best)?.period ?? rows[0]?.period ?? null;
  const visitorOnly = (
    <VisitorOnly>
      <div className="flex flex-col items-center gap-1.5 text-center" data-visitor-note="">
        <Link href={initialPlan ? `${continueHref(lang, "checkout", template.slug, "sign-in")}${initialPlan}` : continueHref(lang, "template", template.slug, "sign-in")} prefetch={false} rel="nofollow" className="mk-link text-sm">
          {x.haveAccount}
        </Link>
        <span className="mk-muted text-xs">{x.visitorNote}</span>
      </div>
    </VisitorOnly>
  );
  const action = initialPlan ? (
    <PlanPicker slug={template.slug} plans={rows} initial={initialPlan} links={links} />
  ) : (
    <div className="flex flex-col gap-2.5">
      <AccountLink href={continueHref(lang, "template", template.slug)} signedInHref={marketNextPath("template", template.slug)!} signedIn={<><Icon name="format_paint" size={22} />{x.getFree}</>} className="mk-btn mk-btn-ember mk-btn-lg w-full">
        <Icon name="format_paint" size={22} />
        {x.getFree}
      </AccountLink>
      <AccountLink href={links.preview.visitor} signedInHref={links.preview.signedIn} signedIn={<><Icon name="visibility" size={21} />{t("studioMarket.previewMine")}</>} className="mk-btn mk-btn-ghost w-full">
        <Icon name="visibility" size={21} />
        {t("studioMarket.previewMine")}
      </AccountLink>
    </div>
  );

  const panel = (
    <aside id="plans" aria-label={x.planPanel} className="mk-panel flex scroll-mt-6 flex-col gap-[22px] rounded-[28px] px-5 py-6 md:p-[30px]" data-template-panel="">
      <div className="flex flex-col gap-1">
        <span className="mk-small">{paid.length ? x.fromWord : x.fromLabel}</span>
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <b data-price-tag className="text-[40px] leading-none tracking-[-0.04em]">
            {words.tag}
          </b>
          {words.was ? <WasPrice text={words.was} className="text-[17px]" /> : null}
        </span>
        {flashEnd ? (
          <span className="mk-sale-time flex flex-wrap items-center gap-x-2 text-[13px] font-bold">
            <Icon name="bolt" size={17} filled />
            {t("marketDiscounts.flashPill")}
            <Countdown endsAt={flashEnd} />
          </span>
        ) : null}
      </div>
      {paid.length ? null : (
        <div className="flex flex-col gap-2.5">
          <span className="mk-small">{x.planLabel}</span>
          <div className="mk-plan" aria-current="true">
            <span className="flex items-center justify-between gap-2">
              <b className="text-[22px] tracking-[-0.02em]">{t("studioMarket.free")}</b>
              <Icon name="check_circle" size={22} filled />
            </span>
            <span className="text-[13px] opacity-75">{x.freePlanHint}</span>
          </div>
        </div>
      )}
      {action}
      {visitorOnly}
      <ul className="m-0 flex list-none flex-col border-t border-[var(--mk-hair)] p-0" data-know="">
        {knowLines(template, paid.length > 0).map(([icon, key]) => (
          <li key={icon} className="flex items-start gap-3 border-b border-[var(--mk-hair2)] py-3 text-sm leading-normal">
            <span className="flex flex-none text-[var(--mk-accent)]">
              <Icon name={icon} size={20} />
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );

  const included: [IconName, string, string][] = [
    ["phone_iphone", String(version.pages), x.screensWord],
    ["widgets", String(version.elements), x.elementsWord],
    ["translate", String(languages.length), fmt(lang, x.languagesLine, { count: languages.length, names: formatList(lang, names) })],
    ["dark_mode", x.lightDarkValue, x.bothIncluded],
    ...(languages.includes("ar") ? ([["format_align_right", x.rtl, x.rtlHint]] as [IconName, string, string][]) : []),
    ["storefront", kinds.length === 1 ? kinds[0]!.name : String(kinds.length), x.kindsFit],
  ];
  const paragraphs = text.description.split(/\n{2,}/).filter((p) => p.trim());
  const others = designerTemplates.filter((o) => o.id !== template.id).slice(0, 3);
  const otherVersions = await store.listMarketTemplateVersions(others.flatMap((o) => (o.currentVersionId ? [o.currentVersionId] : [])));

  const ld = templateProductLd(base, lang, {
    slug: template.slug,
    title: text.title,
    description: (text.short || text.description).replace(/\s+/g, " ").trim(),
    designer: designer.name,
    kinds: kinds.map((k) => k.name),
    freeName: t("studioMarket.free"),
    plans: paid.map((p, i) => ({ period: p.period, cents: p.cents, flashEndsAt: p.flashEndsAt, name: rows[i]!.name })),
    rating: stats,
  });

  return (
    <Chrome lang={lang}>
      <JsonLdScript
        data={breadcrumbLd(
          base,
          [
            { name: x.eyebrow, path: MARKET_PATH },
            { name: text.title, path: templatePath(template.slug) },
          ],
          lang === "en" ? undefined : lang,
        )}
      />
      <JsonLdScript data={ld} />
      <MarketWords lang={lang}>
        <TemplateDemo pages={pages} languages={languages.length ? languages : [file.languages.default]} samples={{ items: {}, categories: {}, samples: sampleEntries(now) }} mine={[]} startOpen={demo === "1"} title={text.title}>
          <div className="mk mk-bare" data-public-template={template.slug}>
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
            <div className="mk-sec pt-7 pb-16 md:pt-16 md:pb-24">
              <div className="mk-in grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
                <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">{panel}</div>
                <div className="flex min-w-0 flex-col gap-12 md:gap-20 lg:col-start-1 lg:row-start-1">
                  <section aria-labelledby="h-included" className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2.5">
                      <span className="mk-eyebrow">{x.included}</span>
                      <h2 id="h-included" className="mk-h2 text-[28px] md:text-[38px]">
                        {x.includedTitle}
                      </h2>
                      <p className="mk-muted m-0 text-[15px] leading-relaxed">{x.includedHint}</p>
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
                  {paragraphs.length ? (
                    <section aria-labelledby="h-about" className="flex flex-col gap-4">
                      <h2 id="h-about" className="mk-eyebrow m-0">
                        {x.about}
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
                  ) : null}
                  <section aria-labelledby="h-designer" className="mk-panel grid overflow-hidden rounded-[28px] md:grid-cols-[220px_minmax(0,1fr)]" data-designer="">
                    <div className="mk-mono h-[180px] rounded-none md:h-full md:min-h-[280px]">
                      {safePhotoUrl(chip.photoUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- The designer's approved photo, served by the platform's own asset route.
                        <img src={safePhotoUrl(chip.photoUrl)!} alt="" className="h-[110px] w-[110px] rounded-full object-cover shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_20px_40px_-14px_rgba(14,13,36,0.6)]" />
                      ) : (
                        <span className="flex h-[110px] w-[110px] items-center justify-center rounded-full text-[42px] font-extrabold tracking-[-0.04em] shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_20px_40px_-14px_rgba(14,13,36,0.6)]" style={{ background: chip.bg, color: chip.fg }} aria-hidden="true">
                          {chip.initials}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-4 px-5 py-6 md:px-8 md:py-[30px]">
                      <span className="mk-eyebrow">{x.designerEyebrow}</span>
                      <h2 id="h-designer" dir="auto" className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">
                        {designer.name}
                      </h2>
                      {profile.bio ? (
                        <p dir="auto" className="m-0 text-base leading-relaxed text-[var(--mk-ink2)]">
                          {profile.bio}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {others.map((o) => {
                          const v = otherVersions.find((ov) => ov.id === o.currentVersionId);
                          const title = templateText(o, lang).title;
                          const cover = v ? coverView(v.cover, v.languages, lang, title) : null;
                          return (
                            <Link key={o.id} href={lp(templatePath(o.slug))} className="flex items-center gap-2 rounded-full border border-[var(--mk-hair)] py-1.5 ps-1.5 pe-3 text-[var(--mk-ink)] no-underline hover:border-[var(--mk-ink)] hover:text-[var(--mk-ink)]">
                              <span className="block h-9 w-[26px] flex-none overflow-hidden rounded-md">{cover ? <PageThumb view={cover} width={26} height={36} /> : null}</span>
                              <b dir="auto" className="max-w-[160px] truncate text-[13px]">
                                {title}
                              </b>
                            </Link>
                          );
                        })}
                        <Link href={designerHref} className="mk-link text-sm">
                          {fmt(lang, x.seeDesigner, { count: designerTemplates.length })}
                          <Icon name="arrow_forward" size={16} />
                        </Link>
                      </div>
                    </div>
                  </section>
                  {/* 106.14 The buyers' ratings, with the designer's answer under each. */}
                  <section aria-labelledby="h-ratings" className="flex flex-col gap-4" data-template-ratings="">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <h2 id="h-ratings" className="mk-h2 text-[28px] md:text-[38px]">
                        {y.templateRatings}
                      </h2>
                      <RatingLine rating={stats} size={18} className="text-[14px]" />
                    </div>
                    <RatingList ratings={ratings} words={{ ...ratingWords(lang), onTemplate: undefined }} designerName={designer.name} empty={y.templateNoRatings} />
                    <p className="mk-muted m-0 text-[13px]">{y.rateInDashboard}</p>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </TemplateDemo>
      </MarketWords>
    </Chrome>
  );
}
