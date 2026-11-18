import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketPhones, PageThumb, TemplatePhone } from "@/components/studio-market/phone";
import { DesignerAvatar, PriceTagView, TemplateCardView } from "@/components/studio-market/parts";
import { countryName } from "@/lib/account/country";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { coverView, filterCards, flashStrip, marketCatalog, readMarketQuery, type CoverView, type MarketQuery, type TemplateCard } from "@/lib/studio-market/catalog";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.nav") };
}
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/**
 * 106.1 Studio Market's home, in the art direction the owner chose: A
 * "Gallery" in light (the wall, the framed print, phones on the floor) and B
 * "Night showroom" in dark (glowing phones under a beam of light). The two
 * heroes are both rendered and the theme shows one (globals.css
 * `.mk-only-a`, `.mk-only-b`); every other section is one markup styled for
 * each. Searched by words, app kind, price and order; 106.12 the flash strip
 * (the templates on a flash sale now, each with its countdown, the soonest
 * to end first); the collections by app kind, the week's new ones, a
 * designer, the most applied; selling your own designs. Cards show their
 * prices after the automatic discounts, the old ones struck through.
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

  // The featured template: the most applied lately, else the newest; its first pages for the heroes.
  const byRecent = [...catalog.cards].sort((a, b) => b.recent - a.recent || b.applies - a.applies || Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
  const featured = byRecent[0] ?? null;
  let featuredPages: CoverView[] = [];
  let featuredScreens = 0;
  if (featured) {
    const template = await store.getMarketTemplate(featured.id);
    const version = template?.currentVersionId ? await store.getMarketTemplateVersion(template.currentVersionId) : null;
    const file = version ? await versionDesign(getBlobStore(), version) : null;
    featuredScreens = version?.pages ?? 0;
    featuredPages = file
      ? file.pages.slice(0, 3).flatMap((p) => {
          const view = coverView(version!.cover ? { ...version!.cover, page: p.studio } : null, version!.languages, lang, featured.title);
          return view ? [view] : [];
        })
      : featured.cover
        ? [featured.cover]
        : [];
  }
  const page = (i: number): CoverView | null => featuredPages[i] ?? featuredPages[0] ?? null;

  const search = (id: string, ember: boolean) => (
    <form action="/dashboard/studio-market" method="get" role="search" className="mk-search w-full max-w-[600px]">
      <Icon name="search" size={24} className="mk-muted" />
      <label htmlFor={id} className="sr-only">
        {t("studioMarket.searchLabel")}
      </label>
      <input id={id} name="q" type="search" defaultValue={query.q} placeholder={t("studioMarket.searchPlaceholder")} />
      {query.kind ? <input type="hidden" name="kind" value={query.kind} /> : null}
      {query.price !== "all" ? <input type="hidden" name="price" value={query.price} /> : null}
      {typeof params.sort === "string" ? <input type="hidden" name="sort" value={query.sort} /> : null}
      <button type="submit" className={`mk-btn ${ember ? "mk-btn-ember" : "mk-btn-ink"} hidden h-[50px] sm:inline-flex`}>
        {t("studioMarket.searchButton")}
      </button>
    </form>
  );
  const stats = (
    <p className="mk-small m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>{t("studioMarket.statsTemplates", { count: catalog.cards.length })}</span>
      <span className="opacity-40">·</span>
      <span>{t("studioMarket.statsDesigners", { count: catalog.designers.length })}</span>
      <span className="opacity-40">·</span>
      <span>{t("studioMarket.statsReviewed")}</span>
    </p>
  );

  // ——— The heroes: A's wall with a framed print, B's night with glowing phones ———
  const heroA = (
    <section className="mk-wall mk-only-a mk-sec pt-10 pb-6 md:pt-[72px] md:pb-10">
      <div className="mk-in grid items-center gap-10 lg:grid-cols-[1fr_520px]">
        <div className="flex flex-col gap-6">
          <span className="mk-eyebrow">{t("studioMarket.nav")}</span>
          <h1 className="mk-display m-0 text-[50px] md:text-[88px]">{t("studioMarket.heroTitleA")}</h1>
          <p className="mk-lead m-0 max-w-[520px]">{t("studioMarket.heroLead")}</p>
          {search("market-q", false)}
          {stats}
        </div>
        {featured ? (
          <div className="relative hidden h-[600px] lg:block" aria-hidden="true">
            {page(2) ? (
              <div className="mk-drift-slow absolute end-0 top-10 bg-white p-3.5 shadow-[0_1px_1px_rgba(14,13,36,0.04),0_24px_48px_-28px_rgba(14,13,36,0.3)]">
                <PageThumb view={page(2)!} width={148} height={192} />
              </div>
            ) : null}
            <div className="absolute end-0 top-[278px] flex w-[176px] flex-col bg-white px-4 py-3.5 text-[12.5px] leading-normal text-[#6b6779] shadow-[0_1px_2px_rgba(14,13,36,0.08)]">
              <b dir="auto" className="text-sm text-[#0e0d24]">
                {featured.title}
              </b>
              <span dir="auto">{featured.designer.name}</span>
              <span>{[featured.kinds[0] ? k(featured.kinds[0].name) : null, t("studioMarket.screens", { count: featuredScreens })].filter(Boolean).join(" · ")}</span>
              <PriceTagView price={featured.price} wasCents={featured.wasCents} />
            </div>
            {page(1) ? (
              <div className="mk-drift absolute start-0 bottom-[58px] -rotate-[4deg]">
                <TemplatePhone view={page(1)} width={170} className="mk-reflect" />
              </div>
            ) : null}
            <div className="absolute start-[118px] bottom-[38px] z-[2]">
              <TemplatePhone view={page(0)} width={214} className="mk-reflect" />
            </div>
            <span className="mk-plinth start-[34%] bottom-2 w-[300px]" />
          </div>
        ) : null}
      </div>
    </section>
  );
  const covers = catalog.cards.slice(0, 5).map((c) => c.cover);
  const pick = (i: number): CoverView | null => covers[i] ?? page(i % Math.max(1, featuredPages.length));
  const heroPhones: { view: CoverView | null; width: number; top: number; offset: number; rotate: number; pool: string }[] = [
    { view: pick(3), width: 150, top: 620, offset: -440, rotate: -10, pool: "rgba(120,98,255,.55)" },
    { view: pick(1), width: 186, top: 585, offset: -236, rotate: -5, pool: "rgba(255,90,31,.5)" },
    { view: page(0), width: 228, top: 550, offset: 0, rotate: 0, pool: "rgba(255,120,80,.75)" },
    { view: pick(2), width: 186, top: 585, offset: 236, rotate: 5, pool: "rgba(120,98,255,.5)" },
    { view: pick(4), width: 150, top: 620, offset: 440, rotate: 10, pool: "rgba(255,90,31,.45)" },
  ];
  const heroB = (
    <section className="mk-night mk-only-b h-[640px] md:h-[1080px]">
      <div className="mk-atmos" aria-hidden="true">
        <span className="mk-stars" />
        <span className="mk-g2 -end-[260px] -top-[260px]" />
        <span className="mk-g1 -start-[300px] top-[420px]" />
        <span className="mk-beam start-[calc(50%-260px)]" />
        <span className="mk-floor" />
      </div>
      <div className="relative z-[4] flex flex-col items-center gap-6 px-5 pt-11 text-center md:px-14 md:pt-[72px]">
        <span className="mk-glasspill">
          <Icon name="storefront" size={17} filled />
          {t("studioMarket.heroPill", { count: catalog.cards.length })}
        </span>
        <h1 className="mk-display mk-gradtext m-0 max-w-[900px] text-[46px] md:text-[92px]">{t("studioMarket.heroTitleB")}</h1>
        <p className="mk-lead m-0 max-w-[620px] text-[rgba(244,239,230,0.72)]">{t("studioMarket.heroLead")}</p>
        <div className="flex w-full max-w-[620px] justify-center">{search("market-q-night", true)}</div>
      </div>
      {featured ? (
        <div className="absolute inset-0 z-[3] hidden md:block" aria-hidden="true">
          {heroPhones.map((p, i) =>
            p.view ? (
              <div key={i} className="absolute -translate-x-1/2" style={{ top: p.top, left: `calc(50% + ${p.offset}px)`, zIndex: i === 2 ? 3 : i === 1 || i === 3 ? 2 : 1 }}>
                <div style={{ rotate: `${p.rotate}deg`, animationDelay: `${-i * 1.3}s` }} className="mk-float relative">
                  <span className="mk-glow" style={{ "--mk-pool": p.pool } as React.CSSProperties} />
                  <TemplatePhone view={p.view} width={p.width} className="mk-reflect" />
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : null}
      {featured ? (
        <div className="absolute inset-x-0 top-[400px] z-[3] flex justify-center gap-3 md:hidden" aria-hidden="true">
          {[heroPhones[1]!, heroPhones[2]!, heroPhones[3]!].map((p, i) =>
            p.view ? (
              <div key={i} className="mk-float relative" style={{ rotate: `${(i - 1) * 9}deg`, marginTop: i === 1 ? 0 : 40, animationDelay: `${-i * 2}s` }}>
                <span className="mk-glow" style={{ "--mk-pool": p.pool } as React.CSSProperties} />
                <TemplatePhone view={p.view} width={i === 1 ? 150 : 120} />
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </section>
  );
  // While searching: the title and the search, without the heroes.
  const compact = (
    <section className="mk-sec pt-8 md:pt-12">
      <div className="mk-in flex flex-col gap-5">
        <span className="mk-eyebrow">{t("studioMarket.nav")}</span>
        <h1 className="mk-display mk-gradtext m-0 text-[40px] md:text-[56px]">{t("studioMarket.homeTitle")}</h1>
        {search("market-q", false)}
      </div>
    </section>
  );

  const filters = (
    <section className="mk-sec pt-7 md:pt-10">
      <div className="mk-in flex flex-col gap-4">
        <nav aria-label={t("studioMarket.kindsLabel")} className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          <Link href={href({ kind: null })} aria-current={!query.kind ? "page" : undefined} className="mk-chip">
            <Icon name="apps" size={19} />
            {t("studioMarket.kindAll")}
            <span className="mk-c">{catalog.cards.length}</span>
          </Link>
          {kinds.map(([id, kind]) => (
            <Link key={id} href={href({ kind: id })} aria-current={query.kind === id ? "page" : undefined} className="mk-chip">
              <Icon name={kind.icon as IconName} size={19} />
              {k(kind.name)}
              <span className="mk-c">{kind.count}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={t("studioMarket.priceLabel")} className="mk-seg">
            {(["all", "free", "paid"] as const).map((price) => (
              <Link key={price} href={href({ price })} aria-current={query.price === price ? "page" : undefined}>
                {t(price === "all" ? "studioMarket.priceAll" : price === "free" ? "studioMarket.priceFree" : "studioMarket.pricePaid")}
              </Link>
            ))}
          </nav>
          <details className="relative flex-none">
            <summary className="mk-chip cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <Icon name="tune" size={19} />
              {t("studioMarket.sortShown", { sort: sortName[query.sort] })}
              <Icon name="expand_more" size={18} />
            </summary>
            <ul className="mk-panel absolute end-0 z-20 m-0 mt-2 flex min-w-[220px] list-none flex-col p-1.5">
              {(["popular", "newest", "name"] as const).map((sort) => (
                <li key={sort}>
                  <Link href={href({ sort })} aria-current={query.sort === sort ? "true" : undefined} className={`flex h-10 items-center rounded-xl px-3 text-sm no-underline hover:bg-ivory ${query.sort === sort ? "font-bold text-midnight" : "text-ink-3"}`}>
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

  const head = (eyebrow: string | null, title: string, sub?: string, more?: string) => (
    <div className="mb-[22px] flex items-end justify-between gap-6 md:mb-[34px]">
      <div className="flex max-w-[680px] flex-col gap-3">
        {eyebrow ? <span className="mk-eyebrow">{eyebrow}</span> : null}
        <h2 className="mk-h2">{title}</h2>
        {sub ? <p className="mk-lead m-0 md:text-[17px]">{sub}</p> : null}
      </div>
      {more ? (
        <Link href={more} className="mk-link hidden flex-none md:inline-flex">
          {t("studioMarket.seeAll")}
          <Icon name="arrow_forward" size={18} />
        </Link>
      ) : null}
    </div>
  );
  const grid = (cards: TemplateCard[], options: { ranks?: boolean; pool?: string } = {}) => (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
      {cards.map((card, i) => (
        <div key={card.id} className="w-[236px] flex-none md:w-auto">
          <TemplateCardView card={card} rank={options.ranks ? i + 1 : undefined} pool={options.pool} />
        </div>
      ))}
    </div>
  );
  const sec = (key: string, children: React.ReactNode, label: string) => (
    <section key={key} aria-label={label} className="mk-sec pt-16 md:pt-[104px]">
      <div className="mk-in">{children}</div>
    </section>
  );

  let body: React.ReactNode;
  if (!catalog.cards.length) {
    body = sec(
      "empty",
      <div className="mk-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Icon name="storefront" size={34} className="mk-muted" />
        <h2 className="mk-h2 text-[28px] md:text-[34px]">{t("studioMarket.emptyTitle")}</h2>
        <p className="mk-lead m-0 max-w-[480px] md:text-base">{t("studioMarket.emptyText")}</p>
      </div>,
      t("studioMarket.emptyTitle"),
    );
  } else if (filtering) {
    body = (
      <section className="mk-sec pt-10 md:pt-14" aria-labelledby="h-results">
        <div className="mk-in flex flex-col gap-6">
          <div className="flex items-end justify-between gap-3">
            <h2 id="h-results" className="mk-h2">
              {t("studioMarket.results", { count: shown.length })}
            </h2>
            <Link href="/dashboard/studio-market" className="mk-link">
              {t("studioMarket.clear")}
            </Link>
          </div>
          {shown.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((card) => (
                <TemplateCardView key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="mk-panel flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icon name="search" size={30} className="mk-muted" />
              <b className="text-lg">{t("studioMarket.noResults")}</b>
              <span className="mk-muted text-sm">{t("studioMarket.noResultsText")}</span>
            </div>
          )}
        </div>
      </section>
    );
  } else {
    const newest = catalog.cards.filter((c) => c.publishedAt && now.getTime() - Date.parse(c.publishedAt) < 7 * DAY).sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!));
    const popular = catalog.cards.filter((c) => c.applies > 0).sort((a, b) => b.recent - a.recent || b.applies - a.applies);
    const collections = kinds.filter(([, kind]) => kind.count >= 2).slice(0, 2);
    const top = catalog.designers[0] ?? null;
    const topDesigner = top ? await store.getTemplateDesigner(top.id) : null;
    const shownAbove = new Set([...collections.flatMap(([id]) => catalog.cards.filter((c) => c.kinds.some((x) => x.id === id)).slice(0, 4).map((c) => c.id)), ...newest.slice(0, 4).map((c) => c.id)]);
    const rest = filterCards(catalog.cards, query).filter((c) => !shownAbove.has(c.id));
    // 106.12 The flash strip: on a flash sale now, the soonest to end first.
    const flash = flashStrip(catalog.cards, now).slice(0, 8);
    body = (
      <>
        {flash.length ? (
          <section aria-labelledby="h-flash" data-flash-strip className="mk-flash mk-sec mt-10 py-12 md:mt-14 md:py-16">
            <div className="mk-in">
              <div className="mb-[22px] flex max-w-[680px] flex-col gap-3 md:mb-[34px]">
                <span className="mk-eyebrow">{t("marketDiscounts.flashEyebrow")}</span>
                <h2 id="h-flash" className="mk-h2 flex items-center gap-3">
                  <Icon name="bolt" size={36} filled className="flex-none text-[var(--mk-accent)]" />
                  {t("marketDiscounts.flashTitle")}
                </h2>
                <p className="mk-lead m-0 md:text-[17px]">{t("marketDiscounts.flashHint")}</p>
              </div>
              {grid(flash, { pool: "rgba(255,90,31,.5)" })}
            </div>
          </section>
        ) : null}
        {collections.map(([id, kind], i) =>
          sec(
            id,
            <>
              {head(t("studioMarket.collectionEyebrow", { n: String(i + 1).padStart(2, "0") }), k(kind.name), t("studioMarket.collectionHint"), href({ kind: id }))}
              {grid(catalog.cards.filter((c) => c.kinds.some((x) => x.id === id)).slice(0, 4))}
            </>,
            k(kind.name),
          ),
        )}
        {newest.length ? (
          <section aria-label={t("studioMarket.newWeek")} className="mk-band mk-sec mt-16 py-14 md:mt-[104px] md:py-[88px]">
            <div className="mk-in">
              {head(t("studioMarket.justIn"), t("studioMarket.newWeek"), t("studioMarket.newWeekHint"), "/dashboard/studio-market?sort=newest")}
              {grid(newest.slice(0, 4), { pool: "rgba(120,98,255,.45)" })}
            </div>
          </section>
        ) : null}
        {top && topDesigner
          ? sec(
              "designer",
              <>
                <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
                  <div className="mk-mono h-[300px] lg:h-full lg:min-h-[440px]">
                    <span
                      className="flex h-[150px] w-[150px] items-center justify-center rounded-full text-[58px] font-extrabold tracking-[-0.04em] shadow-[0_30px_60px_-20px_rgba(14,13,36,0.6),0_0_0_10px_rgba(255,255,255,0.35)] lg:h-[200px] lg:w-[200px] lg:text-[78px]"
                      style={{ background: top.bg, color: top.fg }}
                      aria-hidden="true"
                    >
                      {top.initials}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center gap-5">
                    <span className="mk-eyebrow">{t("studioMarket.topDesigner")}</span>
                    <h2 dir="auto" className="mk-h2">
                      {top.name}
                    </h2>
                    {topDesigner.bio ? (
                      <p dir="auto" className="m-0 text-[21px] leading-snug font-semibold tracking-[-0.01em] md:text-[27px]">
                        “{topDesigner.bio}”
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-8">
                      {(
                        [
                          [top.templates, t("studioMarket.templatesWord")],
                          [top.applies, t("studioMarket.appsWord")],
                        ] as const
                      ).map(([value, label]) => (
                        <div key={label} className="flex flex-col gap-2">
                          <span className="mk-kpi">{value}</span>
                          <span className="mk-small">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/dashboard/studio-market?designer=${top.slug}`} className="mk-btn mk-btn-ink">
                        {t("studioMarket.seeTheirs")}
                        <Icon name="arrow_forward" size={20} />
                      </Link>
                      <span className="mk-small">{countryName(top.country, lang)}</span>
                    </div>
                  </div>
                </div>
                {catalog.designers.length > 1 ? (
                  <div className="-mx-5 mt-7 flex items-center gap-3 overflow-x-auto px-5 md:mx-0 md:mt-10 md:px-0">
                    <span className="mk-small me-2 hidden md:inline">{t("studioMarket.moreDesigners")}</span>
                    {catalog.designers.slice(1, 5).map((d) => (
                      <Link key={d.id} href={`/dashboard/studio-market?designer=${d.slug}`} className="mk-panel flex flex-none items-center gap-2.5 rounded-full py-2.5 ps-2.5 pe-4 text-midnight no-underline hover:text-midnight">
                        <DesignerAvatar designer={d} size="sm" />
                        <span className="flex flex-col">
                          <b dir="auto" className="text-sm">
                            {d.name}
                          </b>
                          <span className="mk-muted text-xs">{t("studioMarket.statsTemplates", { count: d.templates })}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </>,
              t("studioMarket.topDesigner"),
            )
          : null}
        {popular.length
          ? sec(
              "popular",
              <>
                {head(t("studioMarket.lastDays"), t("studioMarket.popular"), undefined, "/dashboard/studio-market?sort=popular")}
                <ol className="m-0 grid list-none grid-cols-1 gap-x-14 p-0 md:grid-cols-2">
                  {popular.slice(0, 6).map((card, i) => (
                    <li key={card.id} className="relative flex items-center gap-4 border-t border-[var(--mk-hair)] py-[18px]">
                      <span className="mk-rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="h-[62px] w-[46px] flex-none overflow-hidden rounded-[10px] shadow-[0_10px_20px_-12px_rgba(14,13,36,0.5)]">{card.cover ? <PageThumb view={card.cover} width={46} height={62} /> : null}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <Link href={`/dashboard/studio-market/t/${card.slug}`} dir="auto" className="truncate text-[17px] font-bold text-[var(--mk-ink)] no-underline after:absolute after:inset-0 hover:text-[var(--mk-ink)]">
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
              t("studioMarket.popular"),
            )
          : null}
        {rest.length ? sec("every", <>{head(null, t("studioMarket.everyTemplate"))}{grid(rest.slice(0, 8))}</>, t("studioMarket.everyTemplate")) : null}
      </>
    );
  }

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <div className="mk mk-bare pb-14 md:pb-24">
        {filtering ? (
          compact
        ) : (
          <>
            {heroA}
            {heroB}
          </>
        )}
        {filters}
        {body}
        {owner ? (
          <section aria-label={t("studioMarket.ctaTitle")} className="mk-sec pt-16 md:pt-[104px]">
            <div className="mk-in">
              <div className="mk-panel relative flex flex-col gap-6 overflow-hidden px-[22px] py-[30px] md:flex-row md:items-center md:gap-12 md:p-14">
                <div className="flex flex-1 flex-col gap-4">
                  <span className="mk-eyebrow">{t("studioMarket.forDesigners")}</span>
                  <h2 className="mk-h2">{t("studioMarket.ctaTitle")}</h2>
                  <p className="mk-lead m-0 md:text-[17px]">{t("studioMarket.ctaText")}</p>
                </div>
                <Link href="/designer" className="mk-btn mk-btn-ember mk-btn-lg">
                  {t(designer ? "studioMarket.yourDesignerArea" : "studioMarket.becomeDesigner")}
                  <Icon name="arrow_forward" size={20} />
                </Link>
              </div>
            </div>
          </section>
        ) : null}
        {owner && mine.length ? (
          <div className="mk-sec pt-8">
            <div className="mk-in flex justify-end">
              <Link href="/dashboard/studio-market/mine" className="mk-link">
                <Icon name="dashboard_customize" size={18} />
                {t("studioMarket.navMine")} · {mine.length}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </MarketPhones>
  );
}
