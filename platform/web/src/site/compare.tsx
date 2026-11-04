import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketingPage, Section } from "@/components/marketing";
import { APP_STORES } from "@/lib/stores";
import {
  CHECKED_ON,
  DUO_SLUG,
  COMPARE_TEXT,
  COMPETITORS,
  DUO_TABLE,
  DUO_TEXT,
  REGULAR_TABLE,
  STUDIO_TABLE,
  cellOf,
  competitor,
  leadOver,
  tablesFor,
  type Category,
  type Cell,
  type Competitor,
  type CompetitorId,
} from "@/lib/compare";
import { ALL_SOLUTIONS, INTEGRATION_COUNTS } from "@/lib/marketing";
import { siteMetadata } from "@/lib/seo";
import { formatMessage, formatNumber, LANGS, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";

/**
 * The comparison pages: /compare (every competitor, regular apps and
 * Studio), /compare/<competitor> and /compare/regular-vs-studio, from
 * lib/compare.ts, in every language.
 */

export { compareParams, DUO_SLUG } from "@/lib/compare";

const fill = (lang: Lang, text: string, values: Record<string, string | number>) => formatMessage(lang, text, values);

function checkedDate(lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${CHECKED_ON}T00:00:00Z`));
}

export async function compareMetadata(lang: Lang): Promise<Metadata> {
  const m = COMPARE_TEXT[lang];
  return siteMetadata(lang, { title: m.metaTitle, description: m.metaDescription, path: "/compare" });
}

export async function compareOneMetadata(lang: Lang, name: string): Promise<Metadata> {
  if (name === DUO_SLUG) {
    const d = DUO_TEXT[lang];
    return siteMetadata(lang, { title: d.metaTitle, description: d.metaDescription, path: `/compare/${DUO_SLUG}` });
  }
  const c = competitor(name);
  if (!c) notFound();
  const m = COMPARE_TEXT[lang];
  return siteMetadata(lang, { title: fill(lang, m.vsMetaTitle, { name: c.name }), description: fill(lang, m.vsMetaDescription, { name: c.name }), path: `/compare/${c.id}` });
}

const MARK_LOOK: Record<Cell["mark"], { icon: IconName; tone: string }> = {
  yes: { icon: "check", tone: "bg-success-bg text-success" },
  part: { icon: "add", tone: "bg-warn-bg text-warn" },
  soon: { icon: "schedule", tone: "bg-peach-soft text-ember" },
  notListed: { icon: "horizontal_rule", tone: "bg-sand text-faint" },
  no: { icon: "close", tone: "bg-sand text-muted" },
};

function markWord(lang: Lang, mark: Cell["mark"]): string {
  const m = COMPARE_TEXT[lang];
  return { yes: m.yes, part: m.part, soon: DUO_TEXT[lang].soon, notListed: m.notListed, no: m.no }[mark];
}

function Mark({ cell, lang, strong = false }: { cell: Cell; lang: Lang; strong?: boolean }) {
  const look = MARK_LOOK[cell.mark];
  return (
    <span className="flex items-start gap-2">
      <span className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full ${look.tone}`} aria-hidden="true">
        <Icon name={look.icon} size={16} />
      </span>
      <span className="flex flex-col">
        <span className={`text-[14px] ${strong ? "font-bold text-midnight" : cell.mark === "notListed" ? "text-muted" : "font-semibold text-ink-2"}`}>{markWord(lang, cell.mark)}</span>
        {cell.note ? <span className="text-[13px] leading-snug text-ink-4">{cell.note[lang]}</span> : null}
      </span>
    </span>
  );
}

/** One category as a table: the feature, Yallapp's column (marked), then each competitor's. */
function CategoryTable({ lang, category, columns }: { lang: Lang; category: Category; columns: Competitor[] }) {
  const m = COMPARE_TEXT[lang];
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-line bg-white p-4 sm:p-6" data-compare-category={category.id}>
      <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.3px]">{category.title[lang]}</h3>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-start">
          <caption className="sr-only">{category.title[lang]}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[34%] border-b border-line-soft pb-3 text-start text-xs font-bold tracking-[0.6px] text-muted uppercase">
                {m.feature}
              </th>
              <th scope="col" className="rounded-t-2xl border-b border-line-soft bg-midnight px-3 pt-3 pb-3 text-start text-[15px] font-extrabold text-white">
                Yallapp
              </th>
              {columns.map((c) => (
                <th key={c.id} scope="col" className="border-b border-line-soft px-3 pb-3 text-start text-[15px] font-bold text-ink-2">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {category.rows.map((row) => (
              <tr key={row.id} data-compare-row={row.id}>
                <th scope="row" className="border-b border-line-soft py-3.5 pe-3 text-start align-top text-[15px] font-semibold text-ink-2">
                  {row.label[lang]}
                </th>
                <td className="border-b border-line-soft bg-ivory px-3 py-3.5 align-top">
                  <Mark cell={row.yallapp} lang={lang} strong />
                </td>
                {columns.map((c) => (
                  <td key={c.id} className="border-b border-line-soft px-3 py-3.5 align-top" data-competitor={c.id}>
                    <Mark cell={cellOf(row, c.id)} lang={lang} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Hero({ lang }: { lang: Lang }) {
  const m = COMPARE_TEXT[lang];
  const stats = [
    { value: APP_STORES.length, label: m.statStores, icon: "storefront" as const },
    { value: LANGS.length, label: m.statLanguages, icon: "translate" as const },
    { value: ALL_SOLUTIONS.length, label: m.statKinds, icon: "apps" as const },
    { value: INTEGRATION_COUNTS.plugins + INTEGRATION_COUNTS.platforms, label: m.statSources, icon: "dashboard_customize" as const },
  ];
  return (
    <section className="on-dark overflow-hidden bg-night-2 text-white" data-compare-stats="">
      <div className="mx-auto grid max-w-[1160px] gap-4 px-4 py-10 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))] sm:px-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-[20px] border border-night-line bg-night-3 p-5">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-ember text-white">
              <Icon name={s.icon} size={24} />
            </span>
            <span className="flex flex-col">
              <span className="text-[30px] leading-none font-extrabold tracking-[-1px]">{formatNumber(lang, s.value)}</span>
              <span className="text-sm text-night-text">{s.label}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OthersNav({ lang, current }: { lang: Lang; current?: string }) {
  const m = COMPARE_TEXT[lang];
  const links = [
    ...COMPETITORS.map((c) => ({ id: c.id, label: fill(lang, m.seeVs, { name: c.name }) })),
    { id: DUO_SLUG, label: DUO_TEXT[lang].metaTitle },
  ];
  return (
    <nav aria-label={m.others} className="flex flex-col gap-3">
      <h2 className="m-0 text-xs font-bold tracking-[0.8px] text-muted uppercase">{m.others}</h2>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {links.map((l) => (
          <li key={l.id}>
            <Link
              href={localePath(lang, `/compare/${l.id}`)}
              aria-current={current === l.id ? "page" : undefined}
              className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-bold no-underline transition-colors ${
                current === l.id ? "border-midnight bg-midnight text-white" : "border-line bg-white text-midnight hover:border-midnight"
              }`}
            >
              {l.label}
              <Icon name="arrow_forward" size={16} className="rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sources({ lang, competitors }: { lang: Lang; competitors: Competitor[] }) {
  const m = COMPARE_TEXT[lang];
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-line bg-sand p-6" data-compare-sources="">
      <h2 className="m-0 text-[20px] font-extrabold">{m.sources}</h2>
      <p className="m-0 text-[15px] text-ink-4">{fill(lang, m.checked, { date: checkedDate(lang) })}</p>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
        {competitors.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <span className="font-bold text-ink-2">{c.name}</span>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {c.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="nofollow noopener noreferrer" target="_blank" className="inline-flex items-center gap-1 text-ink-3">
                    {s.label}
                    <Icon name="open_in_new" size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="m-0 text-sm leading-relaxed text-ink-4">{m.method}</p>
      <p className="m-0 text-[13px] text-muted">{m.trademarks}</p>
    </div>
  );
}

function Ctas({ lang }: { lang: Lang }) {
  const m = COMPARE_TEXT[lang];
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={localePath(lang, "/demo")} className="flex h-[52px] items-center gap-2 rounded-xl bg-midnight px-6 font-bold text-white no-underline hover:bg-ink-3 hover:text-white">
        <Icon name="smartphone" size={20} />
        {m.tryDemo}
      </Link>
      <Link href={localePath(lang, "/pricing")} className="flex h-[52px] items-center gap-2 rounded-xl border border-midnight px-6 font-bold text-midnight no-underline hover:bg-midnight hover:text-white">
        {m.pricing}
        <Icon name="arrow_forward" size={18} className="rtl:-scale-x-100" />
      </Link>
    </div>
  );
}

function TableSection({ lang, table, competitors }: { lang: Lang; table: "regular" | "studio"; competitors: Competitor[] }) {
  const m = COMPARE_TEXT[lang];
  const categories = table === "regular" ? REGULAR_TABLE : STUDIO_TABLE;
  const columns = competitors.filter((c) => c.tables.includes(table));
  if (columns.length === 0) return null;
  return (
    <Section id={table} tinted={table === "studio"}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.8px] text-accent uppercase">
            <Icon name={table === "studio" ? "dashboard_customize" : "smartphone"} size={16} />
            {table === "studio" ? m.studio : m.regular}
          </span>
          <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">{table === "studio" ? m.studio : m.regular}</h2>
          <p className="m-0 max-w-[720px] text-[17px] text-ink-4">{table === "studio" ? m.studioText : m.regularText}</p>
        </div>
        {categories.map((category) => (
          <CategoryTable key={category.id} lang={lang} category={category} columns={columns} />
        ))}
      </div>
    </Section>
  );
}

/** /compare: every competitor, in the regular apps' table and Studio's. */
export async function ComparePage({ lang }: { lang: Lang }) {
  const m = COMPARE_TEXT[lang];
  return (
    <MarketingPage current="pricing" trail={[{ name: m.nav, path: "/compare" }]} eyebrow={m.eyebrow} title={m.title} intro={m.intro} lang={lang}>
      <Hero lang={lang} />
      <Section>
        <OthersNav lang={lang} />
      </Section>
      <TableSection lang={lang} table="regular" competitors={COMPETITORS} />
      <TableSection lang={lang} table="studio" competitors={COMPETITORS} />
      <Section>
        <div className="flex flex-col gap-8">
          <Sources lang={lang} competitors={COMPETITORS} />
          <Ctas lang={lang} />
        </div>
      </Section>
    </MarketingPage>
  );
}

/** The rows a competitor's page leads with: what Yallapp has and their site doesn't list. */
function wins(c: Competitor): { label: Record<Lang, string>; id: string }[] {
  const out: { label: Record<Lang, string>; id: string }[] = [];
  for (const { categories } of tablesFor(c)) {
    for (const cat of categories) for (const row of cat.rows) if (row.yallapp.mark === "yes" && cellOf(row, c.id as CompetitorId).mark !== "yes") out.push({ id: `${cat.id}-${row.id}`, label: row.label });
  }
  return out;
}

/** /compare/<competitor> and /compare/regular-vs-studio. */
export async function CompareOnePage({ lang, name }: { lang: Lang; name: string }) {
  if (name === DUO_SLUG) return <DuoPage lang={lang} />;
  const c = competitor(name);
  if (!c) notFound();
  const m = COMPARE_TEXT[lang];
  const lead = leadOver(c);
  const list = wins(c);
  return (
    <MarketingPage
      current="pricing"
      trail={[
        { name: m.nav, path: "/compare" },
        { name: fill(lang, m.vsTitle, { name: c.name }), path: `/compare/${c.id}` },
      ]}
      eyebrow={m.eyebrow}
      title={fill(lang, m.vsTitle, { name: c.name })}
      intro={fill(lang, m.vsIntro, { name: c.name, what: c.what[lang] })}
      lang={lang}
    >
      <Hero lang={lang} />
      <Section>
        <div className="flex flex-col gap-6 rounded-[28px] border border-line bg-ivory p-6 sm:p-8" data-compare-leads="">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-midnight text-white">
              <Icon name="emoji_events" size={26} />
            </span>
            <div className="flex flex-col">
              <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.4px]">{m.leadsTitle}</h2>
              <p className="m-0 text-[15px] text-ink-4">{fill(lang, m.leadCount, { ours: formatNumber(lang, lead.ours), total: formatNumber(lang, lead.total), name: c.name })}</p>
            </div>
          </div>
          <ul className="m-0 grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
            {list.map((w) => (
              <li key={w.id} className="flex items-start gap-2.5 rounded-2xl border border-line bg-white p-3.5 text-[15px] font-semibold text-ink-2">
                <span className="mt-px flex h-6 w-6 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                  <Icon name="check" size={16} />
                </span>
                {w.label[lang]}
              </li>
            ))}
          </ul>
        </div>
      </Section>
      {c.tables.map((table) => (
        <TableSection key={table} lang={lang} table={table} competitors={[c]} />
      ))}
      <Section>
        <div className="flex flex-col gap-8">
          <OthersNav lang={lang} current={c.id} />
          <Sources lang={lang} competitors={[c]} />
          <Ctas lang={lang} />
        </div>
      </Section>
    </MarketingPage>
  );
}

/** /compare/regular-vs-studio: Yallapp's two kinds of project side by side. */
function DuoPage({ lang }: { lang: Lang }) {
  const m = COMPARE_TEXT[lang];
  const d = DUO_TEXT[lang];
  return (
    <MarketingPage
      current="studio"
      trail={[
        { name: m.nav, path: "/compare" },
        { name: d.metaTitle, path: `/compare/${DUO_SLUG}` },
      ]}
      eyebrow={m.eyebrow}
      title={d.title}
      intro={d.intro}
      lang={lang}
    >
      <Section>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]" data-compare-pick="">
          {[
            { title: d.regular, text: d.pickRegular, icon: "smartphone" as const, dark: false },
            { title: d.studio, text: d.pickStudio, icon: "dashboard_customize" as const, dark: true },
          ].map((p) => (
            <div key={p.title} className={`flex flex-col gap-3 rounded-[24px] p-6 ${p.dark ? "on-dark bg-night-2 text-white" : "border border-line bg-ivory"}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${p.dark ? "bg-ember text-white" : "bg-midnight text-white"}`}>
                <Icon name={p.icon} size={22} />
              </span>
              <h2 className="m-0 text-[22px] font-extrabold">{p.title}</h2>
              <p className={`m-0 text-[16px] leading-relaxed ${p.dark ? "text-night-text" : "text-ink-4"}`}>{p.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section tinted>
        <div className="flex flex-col gap-6">
          <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.6px]">{d.pick}</h2>
          {DUO_TABLE.map((category) => (
            <div key={category.id} className="flex flex-col gap-4 rounded-[24px] border border-line bg-white p-4 sm:p-6" data-compare-category={category.id}>
              <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.3px]">{category.title[lang]}</h3>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-start">
                  <caption className="sr-only">{category.title[lang]}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[30%] border-b border-line-soft pb-3 text-start text-xs font-bold tracking-[0.6px] text-muted uppercase">
                        {m.feature}
                      </th>
                      <th scope="col" className="border-b border-line-soft px-3 pb-3 text-start text-[15px] font-extrabold text-midnight">
                        {d.regular}
                      </th>
                      <th scope="col" className="rounded-t-2xl border-b border-line-soft bg-midnight px-3 pt-3 pb-3 text-start text-[15px] font-extrabold text-white">
                        {d.studio}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.rows.map((row) => (
                      <tr key={row.id} data-compare-row={row.id}>
                        <th scope="row" className="border-b border-line-soft py-3.5 pe-3 text-start align-top text-[15px] font-semibold text-ink-2">
                          {row.label[lang]}
                        </th>
                        <td className="border-b border-line-soft px-3 py-3.5 align-top">
                          <Mark cell={row.regular} lang={lang} />
                        </td>
                        <td className="border-b border-line-soft bg-ivory px-3 py-3.5 align-top">
                          <Mark cell={row.studio} lang={lang} strong />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section>
        <div className="flex flex-col gap-8">
          <OthersNav lang={lang} current={DUO_SLUG} />
          <Ctas lang={lang} />
        </div>
      </Section>
    </MarketingPage>
  );
}
