import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { ContactBand } from "@/components/marketing";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DesignerAvatar, RatingLine, TemplateCardView } from "@/components/studio-market/parts";
import { MarketPhones } from "@/components/studio-market/phone";
import { safePhotoUrl } from "@/lib/studio-market/photo-url";
import { RatingList, type RatingWords } from "@/components/studio-market/ratings";
import { formatDate, formatMessage, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { countryName } from "@/lib/account/country";
import { getStore } from "@/lib/data";
import { kindNameFor } from "@/lib/marketing-lang";
import { breadcrumbLd, NO_INDEX, siteMetadata, siteUrl } from "@/lib/seo";
import { designerPath, designersBase } from "@/lib/studio-market/designer-page";
import { designerProfileLd, publicDesigner } from "@/lib/studio-market/designer-public";
import { MARKET_PATH, templatePath } from "@/lib/studio-market/public";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { designersText } from "./designers-text";
import { templatesText } from "./templates-text";
import { marketCatalogFor } from "./templates-words";

/**
 * 106.14 A designer's public page, /designers/<handle> (/ar/designers/<handle>
 * in Modern Standard Arabic, right to left, and /tr/designers/<handle>), in
 * the market's two looks with the website's light and dark: their photo,
 * name and line (once the team approved them), their country and links if
 * they chose to show them, their overall rating, how many ratings and
 * buyers, every published template's card, and the buyers' ratings with
 * the designer's answer under each. Nothing about their account.
 */

const fmt = (lang: Lang, message: string, values?: Record<string, string | number>) => formatMessage(lang, message, values);

export function ratingWords(lang: Lang): RatingWords {
  const x = designersText(lang);
  return {
    someone: marketCatalogFor(lang).marketPage.someone,
    replyFrom: (name) => fmt(lang, x.replyFrom, { name }),
    onTemplate: (title) => fmt(lang, x.onTemplate, { title }),
    date: (date) => formatDate(lang, date),
    edited: x.edited,
  };
}

export async function designerMetadata(lang: Lang, slug: string): Promise<Metadata> {
  const page = await publicDesigner(await getStore(), slug, lang, new Date());
  if (!page) return { title: templatesText(lang).eyebrow, robots: NO_INDEX };
  const x = designersText(lang);
  const description = (page.bio ? fmt(lang, x.metaDescriptionBio, { bio: page.bio }) : fmt(lang, x.metaDescription, { name: page.designer.name, count: page.cards.length })).replace(/\s+/g, " ").slice(0, 300);
  return siteMetadata(lang, { title: fmt(lang, x.metaTitle, { name: page.designer.name }), description, path: designerPath(page.designer.slug), ...(page.photoUrl ? { image: page.photoUrl } : {}) });
}

export async function DesignerPublicPage({ lang, slug }: { lang: Lang; slug: string }) {
  const x = designersText(lang);
  const lp = (path: string) => localePath(lang, path);
  const now = new Date();
  const page = await publicDesigner(await getStore(), slug, lang, now);
  if (!page) notFound();
  const { designer, chip, overall } = page;
  const cards = page.cards.map((card) => ({ ...card, kinds: card.kinds.map((kind) => ({ ...kind, name: kindNameFor(lang, kind.name) })) }));
  const base = siteUrl();
  const number = (n: number) => n.toLocaleString(lang === "tr" ? "tr" : "en");
  const avatar = { ...chip, photoUrl: page.photoUrl };

  const stat = (value: React.ReactNode, label: string, key: string) => (
    <div key={key} className="flex min-w-0 flex-col gap-1">
      <span className="mk-kpi text-[30px] md:text-[36px]">{value}</span>
      <span className="mk-small">{label}</span>
    </div>
  );

  return (
    <div className="bg-white">
      <SiteHeader current="templates" lang={lang} />
      <main>
        <JsonLdScript
          data={breadcrumbLd(
            base,
            [
              { name: templatesText(lang).eyebrow, path: MARKET_PATH },
              { name: designer.name, path: designerPath(designer.slug) },
            ],
            lang === "en" ? undefined : lang,
          )}
        />
        <JsonLdScript data={designerProfileLd(base, lang, page)} />
        <DashboardI18n lang={lang} messages={marketCatalogFor(lang)} knownEnglish={{}}>
          <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
            <div className="mk mk-bare pb-14 md:pb-24" data-designer-page={designer.slug}>
              <section className="mk-wall mk-sec relative overflow-hidden pt-6 pb-10 md:pt-10 md:pb-14" aria-labelledby="h-designer">
                <div className="mk-atmos" aria-hidden="true">
                  <span className="mk-stars" />
                  <span className="mk-g2 -end-[260px] -top-[260px]" />
                  <span className="mk-g1 -start-[300px] top-[220px]" />
                  <span className="mk-floor" />
                </div>
                <div className="mk-in relative z-[3] flex flex-col gap-8">
                  <nav aria-label={x.back} className="text-sm">
                    <Link href={lp(MARKET_PATH)} className="inline-flex items-center gap-1.5 font-semibold text-[var(--mk-ink)] no-underline opacity-80 hover:text-[var(--mk-ink)] hover:opacity-100">
                      <Icon name="arrow_back" size={18} />
                      {x.back}
                    </Link>
                  </nav>
                  <div className="grid items-start gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
                    <div className="flex justify-center md:block">
                      {safePhotoUrl(page.photoUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- The designer's approved photo, served by the platform's own asset route.
                        <img src={safePhotoUrl(page.photoUrl)!} alt={designer.name} width={168} height={168} className="h-[132px] w-[132px] rounded-full object-cover shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_20px_40px_-14px_rgba(14,13,36,0.6)] md:h-[168px] md:w-[168px]" data-designer-photo="" />
                      ) : (
                        <span className="flex h-[132px] w-[132px] items-center justify-center rounded-full text-[48px] font-extrabold tracking-[-0.04em] shadow-[0_0_0_8px_rgba(255,255,255,0.35),0_20px_40px_-14px_rgba(14,13,36,0.6)] md:h-[168px] md:w-[168px] md:text-[60px]" style={{ background: chip.bg, color: chip.fg }} aria-hidden="true">
                          {chip.initials}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                      <span className="mk-eyebrow">{x.eyebrow}</span>
                      <h1 id="h-designer" dir="auto" className="mk-display mk-gradtext m-0 text-[40px] break-words md:text-[64px]">
                        {designer.name}
                      </h1>
                      <p className="mk-muted m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                        {page.country ? (
                          <span className="inline-flex items-center gap-1.5" data-designer-country={page.country}>
                            <Icon name="location_on" size={18} />
                            {fmt(lang, x.from, { country: countryName(page.country, lang) })}
                          </span>
                        ) : null}
                        <span>{fmt(lang, x.since, { year: String(designer.createdAt.getUTCFullYear()) })}</span>
                      </p>
                      {page.bio ? (
                        <p dir="auto" className="mk-lead m-0 max-w-[640px] md:text-[18px]" data-designer-bio="">
                          {page.bio}
                        </p>
                      ) : null}
                      {page.links.length ? (
                        <ul aria-label={x.links} className="m-0 flex list-none flex-wrap gap-2 p-0" data-designer-links="">
                          {page.links.map((link) => (
                            <li key={link.url}>
                              <a href={link.url} target="_blank" rel="noopener noreferrer nofollow ugc" aria-label={fmt(lang, x.externalLink, { label: link.label })} className="mk-chip text-[var(--mk-ink)] no-underline hover:text-[var(--mk-ink)]">
                                <Icon name="link" size={18} />
                                <span dir="ltr">{link.label}</span>
                                <Icon name="open_in_new" size={15} className="opacity-60" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mk-panel mt-2 grid grid-cols-2 gap-5 rounded-[22px] px-5 py-4 sm:grid-cols-4 md:px-7 md:py-5" data-designer-stats="">
                        {stat(overall.average === null ? "—" : overall.average.toLocaleString(lang === "tr" ? "tr" : "en", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), x.overall, "overall")}
                        {stat(number(overall.count), x.ratingsLabel, "count")}
                        {stat(number(page.buyers), fmt(lang, x.buyers, { count: page.buyers }), "buyers")}
                        {stat(number(cards.length), x.templatesLabel, "templates")}
                      </div>
                      {overall.average !== null ? <RatingLine rating={overall} size={20} className="text-[15px]" /> : null}
                    </div>
                  </div>
                </div>
              </section>

              <section aria-labelledby="h-templates" className="mk-sec pt-14 md:pt-20">
                <div className="mk-in flex flex-col gap-6">
                  <h2 id="h-templates" dir="auto" className="mk-h2">
                    {fmt(lang, x.templatesTitle, { name: designer.name })}
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" data-designer-templates="">
                    {cards.map((card) => (
                      <TemplateCardView key={card.id} card={card} base={lp(MARKET_PATH)} designerBase={designersBase(lang)} />
                    ))}
                  </div>
                </div>
              </section>

              <section aria-labelledby="h-ratings" className="mk-sec pt-14 md:pt-20">
                <div className="mk-in grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
                  <div className="flex flex-col gap-3">
                    <h2 id="h-ratings" className="mk-h2 text-[28px] md:text-[38px]">
                      {x.ratingsTitle}
                    </h2>
                    <p className="mk-muted m-0 text-[15px] leading-relaxed">{x.ratingsHint}</p>
                    <div className="flex items-center gap-3">
                      <DesignerAvatar designer={avatar} size="md" />
                      <RatingLine rating={overall} />
                    </div>
                  </div>
                  <RatingList ratings={page.ratings} words={ratingWords(lang)} designerName={designer.name} templateHref={(s) => lp(templatePath(s))} empty={x.noRatings} />
                </div>
              </section>
            </div>
          </MarketPhones>
        </DashboardI18n>
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}
