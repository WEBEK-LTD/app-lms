import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { CheckList, Comparison, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { ALL_SOLUTIONS, STUDIO_SOLUTIONS } from "@/lib/marketing";
import { comparisonFor, screenAltFor, solutionFor, solutionsFor } from "@/lib/marketing-lang";
import { breadcrumbLd, faqLd, siteMetadata, siteUrl } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";

export function solutionsMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.solutionsTitle, description: m.solutionsDescription, path: "/solutions" });
}

export async function SolutionsPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("solutions", lang);
  const m = messagesFor(lang);
  const alt = screenAltFor(lang);
  return (
    <MarketingPage current="solutions" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      {solutionsFor(lang).map((s, index) => (
        <Section key={s.id} tinted={index % 2 === 1}>
          <div className="flex flex-wrap items-center gap-10">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-peach">
                <Icon name={s.icon} size={26} />
              </span>
              <SectionTitle title={s.appsTitle} text={`${s.summary} ${s.audience}`} />
              <CheckList items={s.inTheApp} />
              <p className="m-0 text-[15px] text-ink-4">
                <b className="text-midnight">{m.solutions.contentFrom}</b> {s.sources.join(" · ")}
              </p>
              <Link
                href={localePath(lang, `/solutions/${s.id}`)}
                className="flex h-[50px] items-center gap-2 self-start rounded-xl bg-midnight px-5 font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
              >
                {formatMessage(lang, m.common.moreAbout, { apps: s.apps })}
                <Icon name="arrow_forward" size={20} />
              </Link>
            </div>
            <div className="flex min-w-0 flex-[1_1_300px] flex-wrap justify-center gap-5">
              {s.screens.slice(0, 2).map((screen) => (
                <DeviceFrame key={screen} screen={screen} size="sm" alt={alt[screen]} />
              ))}
            </div>
          </div>
        </Section>
      ))}
      <Section>
        <SectionTitle title={m.solutions.everyTitle} text={m.solutions.everyText} />
        <Comparison rows={comparisonFor(lang)} lang={lang} />
      </Section>
    </MarketingPage>
  );
}

export function solutionParams(): { id: string }[] {
  return ALL_SOLUTIONS.map((s) => ({ id: s.id }));
}

export async function solutionMetadata(lang: Lang, id: string): Promise<Metadata> {
  const s = solutionFor(lang, id);
  if (!s) return {};
  const text = await getSiteContent(s.contentKey, lang);
  return siteMetadata(lang, { title: s.appsTitle, description: text.intro!, path: `/solutions/${s.id}`, image: `/solutions/${s.id}/opengraph-image` });
}

export async function SolutionPage({ lang, id }: { lang: Lang; id: string }) {
  const s = solutionFor(lang, id);
  if (!s) notFound();
  const text = await getSiteContent(s.contentKey, lang);
  const others = solutionsFor(lang).filter((o) => o.id !== s.id);
  const m = messagesFor(lang);
  const t = m.solutions;
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  // SEO: Studio's kinds are tried in Studio's demo apps and made in Yallapp Studio.
  const studio = STUDIO_SOLUTIONS.some((o) => o.id === s.id);
  return (
    <MarketingPage
      current="solutions"
      eyebrow={text.eyebrow}
      title={text.title!}
      intro={text.intro!}
      aside={<DeviceFrame screen={s.screens[0]!} size="lg" alt={alt[s.screens[0]!]} priority />}
      lang={lang}
    >
      <JsonLdScript
        data={breadcrumbLd(
          siteUrl(),
          [
            { name: m.nav.solutions, path: "/solutions" },
            { name: s.appsTitle, path: `/solutions/${s.id}` },
          ],
          lang === "en" ? undefined : lang,
        )}
      />
      {s.faq ? <JsonLdScript data={faqLd(s.faq.map((f) => ({ question: f.q, answer: f.a })), lang === "en" ? undefined : lang)} /> : null}
      <Section>
        <SectionTitle title={lang === "en" ? `What makes a great ${s.name.toLowerCase()} app` : formatMessage(lang, t.great, { app: s.app })} text={s.audience} />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {s.highlights.map((h) => (
            <article key={h.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory">
                <Icon name={h.icon} size={26} />
              </span>
              <h3 className="m-0 text-lg font-bold">{h.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{h.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tinted>
        <div className="flex flex-wrap items-start gap-10">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.inTheApp}</h2>
              <CheckList items={s.inTheApp} />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.forYou}</h2>
              <CheckList items={s.forYou} />
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_300px] flex-wrap justify-center gap-5">
            {s.screens.slice(1).map((screen) => (
              <DeviceFrame key={screen} screen={screen} size="sm" alt={alt[screen]} />
            ))}
          </div>
        </div>
      </Section>

      <Section>
        {/* SEO: Studio's kinds keep their content in Studio, so there's no source to choose. */}
        {studio ? null : (
          <>
            <SectionTitle title={t.sourcesTitle} text={t.sourcesText} />
            <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {s.sources.map((source) => (
                <li key={source} className="flex gap-3 rounded-2xl border border-line p-5 text-[15px]">
                  <Icon name="link" size={22} />
                  {source}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-lg font-bold">{t.guides}</h3>
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {s.docs.map((d) => (
              <li key={d.href}>
                <Link href={lp(d.href)} className="font-semibold">
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {studio ? null : <MoreLink href={lp("/integrations")}>{m.common.allIntegrations}</MoreLink>}
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] bg-peach-soft p-6 sm:p-8">
          <div className="flex max-w-[620px] flex-col gap-2">
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{formatMessage(lang, t.tryTitle, { app: s.app })}</h2>
            <p className="m-0 text-[16px] leading-relaxed text-ink-4">{formatMessage(lang, t.tryText, { demoApp: s.demoApp })}</p>
          </div>
          <Link
            href={studio ? `${lp("/demo/studio")}#${s.demoSlug}` : `${lp("/demo")}#${s.demoSlug}`}
            className="flex h-[50px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
          >
            <Icon name="smartphone" size={20} />
            {formatMessage(lang, t.tryButton, { demo: s.demo })}
          </Link>
        </div>
      </Section>

      {s.faq ? (
        <Section>
          <SectionTitle title={t.faqTitle} />
          <div className="flex flex-col gap-3">
            {s.faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-line bg-white transition-colors duration-200 open:border-line-strong hover:border-line-strong"
              >
                <summary className="flex items-center justify-between gap-4 rounded-2xl px-5 py-[18px] text-[17px] leading-snug font-bold sm:px-6">
                  {f.q}
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand transition-colors group-open:bg-midnight group-open:text-white">
                    <Icon name="expand_more" size={22} className="transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </summary>
                <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-ink-4 sm:px-6">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>
      ) : null}

      {studio ? (
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-line p-6 sm:p-8">
            <div className="flex max-w-[620px] flex-col gap-2">
              <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{t.studioTitle}</h2>
              <p className="m-0 text-[16px] leading-relaxed text-ink-4">{t.studioText}</p>
            </div>
            <Link
              href={lp("/yallapp-studio")}
              className="flex h-[50px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
            >
              {t.studioButton}
              <Icon name="arrow_forward" size={20} />
            </Link>
          </div>
        </Section>
      ) : null}

      <Section tinted>
        <SectionTitle title={t.others} />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {others.map((o) => (
            <Link
              key={o.id}
              href={lp(`/solutions/${o.id}`)}
              className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 text-midnight no-underline hover:border-midnight hover:text-midnight"
            >
              <Icon name={o.icon} size={26} />
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold">{o.name}</span>
                <span className="text-[15px] text-ink-4">{o.summary}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </MarketingPage>
  );
}
