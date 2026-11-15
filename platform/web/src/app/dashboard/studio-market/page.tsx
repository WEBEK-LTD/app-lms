import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketPhones, TemplatePhone } from "@/components/studio-market/phone";
import { Board, DesignerAvatar, DesignerCardView, FreePrice, TemplateCardView } from "@/components/studio-market/parts";
import { EmptyState, PageHeader, btn } from "@/components/ui";
import { countryName } from "@/lib/account/country";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { coverView, filterCards, marketCatalog, readMarketQuery, type CoverView, type MarketQuery, type TemplateCard } from "@/lib/studio-market/catalog";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.nav") };
}
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/**
 * 106.1 Studio Market's home, as the owner approved it: whole app designs
 * by independent designers, searched by words, app kind, price and order;
 * the featured one, the week's new ones, the most applied and the top
 * designers; and selling your own designs. Free templates for now.
 */
export default async function StudioMarketPage({ searchParams }: PageProps<"/dashboard/studio-market">) {
  const context = await requireClient("settings");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const params = await searchParams;
  const query = readMarketQuery(params);
  const designerSlug = typeof params.designer === "string" ? params.designer : null;
  const catalog = await marketCatalog(store, lang, now);
  const owner = contextCan(context, "billing");
  const [designer, mine] = await Promise.all([store.getTemplateDesignerByClient(context.client.id), owner ? store.listTemplateLicences({ clientId: context.client.id }) : Promise.resolve([])]);
  const filtering = Boolean(query.q || query.kind || query.price !== "all" || typeof params.sort === "string" || designerSlug);
  const shown = filterCards(catalog.cards, query).filter((c) => !designerSlug || c.designer.slug === designerSlug);

  const href = (change: Partial<MarketQuery>) => {
    const next = { ...query, ...change };
    const out = new URLSearchParams();
    if (next.q) out.set("q", next.q);
    if (next.kind) out.set("kind", next.kind);
    if (next.price !== "all") out.set("price", next.price);
    if (next.sort !== "popular" || typeof params.sort === "string" || change.sort) out.set("sort", next.sort);
    if (designerSlug) out.set("designer", designerSlug);
    const text = out.toString();
    return `/dashboard/studio-market${text ? `?${text}` : ""}`;
  };
  const sortName = { popular: t("studioMarket.sortPopular"), newest: t("studioMarket.sortNewest"), name: t("studioMarket.sortName") };

  // The app kinds that have templates, most first.
  const kindCounts = new Map<string, { name: string; icon: string; count: number }>();
  for (const card of catalog.cards) for (const kind of card.kinds) kindCounts.set(kind.id, { name: kind.name, icon: kind.icon, count: (kindCounts.get(kind.id)?.count ?? 0) + 1 });
  const kinds = [...kindCounts.entries()].sort((a, b) => b[1].count - a[1].count);

  const header = (
    <PageHeader
      eyebrow={
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
          <Icon name="storefront" size={18} filled />
          {t("studioMarket.nav")}
        </span>
      }
      title={t("studioMarket.homeTitle")}
      description={t("studioMarket.homeIntro")}
      actions={
        <>
          {owner ? (
            <Link href="/dashboard/studio-market/mine" className={`${btn.secondary} h-11`}>
              <Icon name="dashboard_customize" size={20} />
              {t("studioMarket.navMine")}
              <span className="rounded-xl bg-line-soft px-2 py-0.5 text-xs font-bold text-muted">{mine.length}</span>
            </Link>
          ) : null}
          {owner ? (
            <Link href="/designer" className={`${btn.ghost} h-11`}>
              <Icon name="draw" size={20} />
              {t("studioMarket.navSell")}
            </Link>
          ) : null}
        </>
      }
    />
  );

  const search = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <form action="/dashboard/studio-market" method="get" role="search" className="flex h-[52px] min-w-[240px] flex-[1_1_320px] items-center gap-2 rounded-[14px] border border-line-strong bg-white px-3.5">
          <Icon name="search" size={22} className="text-muted" />
          <label htmlFor="market-q" className="sr-only">
            {t("studioMarket.searchLabel")}
          </label>
          <input id="market-q" name="q" type="search" defaultValue={query.q} placeholder={t("studioMarket.searchPlaceholder")} className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none" />
          {query.kind ? <input type="hidden" name="kind" value={query.kind} /> : null}
          {query.price !== "all" ? <input type="hidden" name="price" value={query.price} /> : null}
          {typeof params.sort === "string" ? <input type="hidden" name="sort" value={query.sort} /> : null}
          <button type="submit" className="sr-only">
            {t("studioMarket.searchButton")}
          </button>
        </form>
        <nav aria-label={t("studioMarket.priceLabel")} className="inline-flex flex-none gap-0.5 rounded-xl border border-line bg-white p-1">
          {(["all", "free", "paid"] as const).map((price) => (
            <Link
              key={price}
              href={href({ price })}
              aria-current={query.price === price ? "page" : undefined}
              className={`inline-flex h-[34px] items-center rounded-[9px] px-3.5 text-sm no-underline ${query.price === price ? "bg-midnight font-bold text-white hover:text-white" : "font-semibold text-ink-4 hover:text-midnight"}`}
            >
              {t(price === "all" ? "studioMarket.priceAll" : price === "free" ? "studioMarket.priceFree" : "studioMarket.pricePaid")}
            </Link>
          ))}
        </nav>
        <details className="relative flex-none">
          <summary className={`${btn.secondary} h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <Icon name="tune" size={20} />
            {t("studioMarket.sortShown", { sort: sortName[query.sort] })}
            <Icon name="expand_more" size={18} />
          </summary>
          <ul className="absolute end-0 z-20 m-0 mt-1 flex min-w-[200px] list-none flex-col rounded-xl border border-line bg-white p-1 shadow-lg">
            {(["popular", "newest", "name"] as const).map((sort) => (
              <li key={sort}>
                <Link href={href({ sort })} aria-current={query.sort === sort ? "true" : undefined} className={`flex h-10 items-center rounded-lg px-3 text-sm no-underline hover:bg-ivory ${query.sort === sort ? "font-bold text-midnight" : "text-ink-3"}`}>
                  {sortName[sort]}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </div>
      <nav aria-label={t("studioMarket.kindsLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Pill href={href({ kind: null })} on={!query.kind} icon="apps" label={t("studioMarket.kindAll")} count={catalog.cards.length} />
        {kinds.map(([id, kind]) => (
          <Pill key={id} href={href({ kind: id })} on={query.kind === id} icon={kind.icon as IconName} label={k(kind.name)} />
        ))}
      </nav>
    </div>
  );

  const head = (title: string, sub?: string, more?: string) => (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.3px]">{title}</h2>
        {sub ? <p className="m-0 text-sm text-muted">{sub}</p> : null}
      </div>
      {more ? (
        <Link href={more} className="inline-flex flex-none items-center gap-1 text-sm font-semibold text-accent no-underline">
          {t("studioMarket.seeAll")}
          <Icon name="arrow_forward" size={18} />
        </Link>
      ) : null}
    </div>
  );
  const grid = (cards: TemplateCard[], ranks = false) => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
      {cards.map((card, i) => (
        <TemplateCardView key={card.id} card={card} rank={ranks ? i + 1 : undefined} />
      ))}
    </div>
  );

  let body: React.ReactNode;
  if (!catalog.cards.length) {
    body = (
      <EmptyState
        icon="storefront"
        title={t("studioMarket.emptyTitle")}
        action={
          owner ? (
            <Link href="/designer" className={`${btn.primary} h-11`}>
              {t(designer ? "studioMarket.yourDesignerArea" : "studioMarket.becomeDesigner")}
            </Link>
          ) : undefined
        }
      >
        {t("studioMarket.emptyText")}
      </EmptyState>
    );
  } else if (filtering) {
    body = (
      <section className="flex flex-col gap-4" aria-labelledby="h-results">
        <div className="flex items-center justify-between gap-3">
          <h2 id="h-results" className="m-0 text-[22px] font-extrabold tracking-[-0.3px]">
            {t("studioMarket.results", { count: shown.length })}
          </h2>
          <Link href="/dashboard/studio-market" className="text-sm font-semibold text-accent no-underline">
            {t("studioMarket.clear")}
          </Link>
        </div>
        {shown.length ? (
          grid(shown)
        ) : (
          <EmptyState icon="search" title={t("studioMarket.noResults")}>
            {t("studioMarket.noResultsText")}
          </EmptyState>
        )}
      </section>
    );
  } else {
    const byRecent = [...catalog.cards].sort((a, b) => b.recent - a.recent || b.applies - a.applies || Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
    const featured = byRecent[0]!;
    const featuredTemplate = await store.getMarketTemplate(featured.id);
    const featuredVersion = featuredTemplate?.currentVersionId ? await store.getMarketTemplateVersion(featuredTemplate.currentVersionId) : null;
    const featuredFile = featuredVersion ? await versionDesign(getBlobStore(), featuredVersion) : null;
    const featuredPages: CoverView[] = featuredFile
      ? featuredFile.pages.slice(0, 3).flatMap((p) => {
          const view = coverView(featuredVersion!.cover ? { ...featuredVersion!.cover, page: p.studio } : null, featuredVersion!.languages, lang, featured.title);
          return view ? [view] : [];
        })
      : featured.cover
        ? [featured.cover]
        : [];
    const newest = catalog.cards.filter((c) => c.publishedAt && now.getTime() - Date.parse(c.publishedAt) < 7 * DAY).sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
    const popular = catalog.cards.filter((c) => c.recent > 0).sort((a, b) => b.recent - a.recent || b.applies - a.applies);
    const order = [featuredPages[1], featuredPages[0], featuredPages[2]];
    // Everything else, once: what the sections above don't show.
    const above = new Set([featured.id, ...newest.slice(0, 4).map((c) => c.id), ...popular.slice(0, 4).map((c) => c.id)]);
    const rest = filterCards(catalog.cards, query).filter((c) => !above.has(c.id));
    body = (
      <>
        <section className="flex flex-col gap-4" aria-labelledby="h-featured">
          <h2 id="h-featured" className="m-0 text-[22px] font-extrabold tracking-[-0.3px]">
            {t("studioMarket.featured")}
          </h2>
          <div className="grid overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_1px_2px_rgba(14,13,36,0.04),0_8px_24px_-16px_rgba(14,13,36,0.18)] lg:grid-cols-[1fr_1.08fr]">
            <div className="order-2 flex flex-col justify-center gap-4 p-5 lg:order-1 lg:px-9 lg:pt-9 lg:pb-8">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl bg-peach px-2.5 py-1 text-xs font-bold text-midnight">
                  <Icon name="workspace_premium" size={15} filled className="text-accent" />
                  {featured.recent > 0 ? t("studioMarket.featuredBadge") : t("studioMarket.newTag")}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 dir="auto" className="m-0 text-[26px] leading-[1.1] font-extrabold tracking-[-0.6px] lg:text-[34px]">{featured.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink-4">
                  <DesignerAvatar designer={featured.designer} size="sm" />
                  <span dir="auto" className="font-semibold text-midnight">{featured.designer.name}</span>
                  <span className="text-faint">·</span>
                  <span>{t("studioMarket.usedBy", { count: featured.applies })}</span>
                </div>
              </div>
              {featured.short ? <p dir="auto" className="m-0 max-w-[440px] text-[15px] leading-relaxed text-ink-4">{featured.short}</p> : null}
              <div className="flex flex-wrap gap-2">
                {featuredVersion ? <Chip icon="phone_iphone" label={t("studioMarket.screens", { count: featuredVersion.pages })} /> : null}
                {featuredVersion ? <Chip icon="translate" label={featuredVersion.languages.map((l) => l.toUpperCase()).join(" · ")} /> : null}
                <Chip icon="dark_mode" label={t("studioMarket.lightDark")} />
              </div>
              <FreePrice big />
              <div className="flex flex-wrap gap-2.5">
                <Link href={`/dashboard/studio-market/t/${featured.slug}`} className={`${btn.primary} h-11`}>
                  {t("studioMarket.viewTemplate")}
                  <Icon name="arrow_forward" size={20} />
                </Link>
                <Link href={`/dashboard/studio-market/t/${featured.slug}?demo=1`} className={`${btn.secondary} h-11`}>
                  <Icon name="play_circle" size={20} />
                  {t("studioMarket.tryDemo")}
                </Link>
              </div>
            </div>
            <Board className="relative order-1 h-[300px] overflow-hidden lg:order-2 lg:h-full lg:min-h-[420px]">
              <div className="absolute inset-0 flex justify-center gap-3 pt-[26px] lg:gap-[22px] lg:pt-10">
                {order.map((view, i) =>
                  view ? (
                    <div key={i} style={{ transform: i === 1 ? undefined : "translateY(46px)" }}>
                      <TemplatePhone view={view} width={i === 1 ? 186 : 168} />
                    </div>
                  ) : null,
                )}
              </div>
            </Board>
          </div>
        </section>
        {newest.length ? (
          <section className="flex flex-col gap-4" aria-label={t("studioMarket.newWeek")}>
            {head(t("studioMarket.newWeek"), t("studioMarket.newWeekHint"), "/dashboard/studio-market?sort=newest")}
            {grid(newest.slice(0, 4))}
          </section>
        ) : null}
        {popular.length ? (
          <section className="flex flex-col gap-4" aria-label={t("studioMarket.popular")}>
            {head(t("studioMarket.popular"), t("studioMarket.popularHint"), "/dashboard/studio-market?sort=popular")}
            {grid(popular.slice(0, 4), true)}
          </section>
        ) : null}
        {rest.length ? (
          <section className="flex flex-col gap-4" aria-label={t("studioMarket.navBrowse")}>
            {head(t("studioMarket.navBrowse"), undefined, rest.length > 8 ? "/dashboard/studio-market?sort=popular" : undefined)}
            {grid(rest.slice(0, 8))}
          </section>
        ) : null}
        {catalog.designers.length ? (
          <section className="flex flex-col gap-4" aria-label={t("studioMarket.topDesigners")}>
            {head(t("studioMarket.topDesigners"))}
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {catalog.designers.slice(0, 4).map((d) => (
                <div key={d.id} className="w-[260px] flex-none sm:w-auto">
                  <DesignerCardView designer={d} country={countryName(d.country, lang)} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      {header}
      {search}
      {body}
      {owner ? (
        <section className="flex flex-col items-start gap-5 rounded-[20px] bg-peach p-[22px] sm:flex-row sm:items-center sm:px-[30px] sm:py-[26px]">
          <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-white text-accent">
            <Icon name="draw" size={28} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 text-xl font-extrabold">{t("studioMarket.sellTitle")}</h2>
            <p className="m-0 text-sm text-ink-4">{t("studioMarket.sellText")}</p>
          </div>
          <Link href="/designer" className={`${btn.primary} h-11`}>
            {t(designer ? "studioMarket.yourDesignerArea" : "studioMarket.becomeDesigner")}
            <Icon name="arrow_forward" size={20} />
          </Link>
        </section>
      ) : null}
    </MarketPhones>
  );
}

function Pill({ href, on, icon, label, count }: { href: string; on: boolean; icon: IconName; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`inline-flex h-10 flex-none items-center gap-[7px] rounded-full border px-[15px] text-sm whitespace-nowrap no-underline ${on ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-midnight hover:border-midnight hover:text-midnight"}`}
    >
      <Icon name={icon} size={19} className={on ? "text-white" : "text-muted"} />
      {label}
      {count !== undefined ? <span className={`text-[13px] ${on ? "opacity-70" : "text-faint"}`}>{count}</span> : null}
    </Link>
  );
}

function Chip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-line-soft px-2.5 py-[5px] text-xs font-semibold text-muted">
      <Icon name={icon} size={15} />
      {label}
    </span>
  );
}
