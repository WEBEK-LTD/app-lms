import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { JsonLdScript } from "@/components/json-ld";
import { ContactBand } from "@/components/marketing";
import { planPriceFor } from "@/components/plan-cards";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { StudioPlans } from "@/components/studio-marketing";
import { storyCopyFor } from "@/content/stories";
import { getVisitorContact } from "@/lib/contact";
import { DEMO_SLUGS, type StudioDemoId } from "@/lib/demo/constants";
import type { AppScreen } from "@/lib/marketing";
import { screenAltFor, solutionFor } from "@/lib/marketing-lang";
import { breadcrumbLd, siteMetadata, siteUrl } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { studioPlans } from "@/site/studio";
import { ChapterArtView } from "./art";
import { AGENCY, competitorsOf, PRICES_ON_PAGE, PRICES_ON_REQUEST, YALLAPP, type CompareColumn } from "./competitors";
import { StoryEffects } from "./effects";
import { photoOf, photosOf, type StoryPhoto } from "./photos";
import { STORIES, type ChapterShape, type StoryShape } from "./stories";
import { isStoryId, STORY_IDS, storyPath, type PushText, type StoryId, type StoryText, type StoryUi } from "./types";

/**
 * The Studio story pages, /yallapp-studio/<story> in every language: a day
 * told in scenes with the real app's screens, every part of the bundle
 * explained, how it compares, the Studio plans and the demo to try.
 */

export function storyMetadata(lang: Lang, id: string): Metadata {
  if (!isStoryId(id)) return {};
  const t = storyCopyFor(lang).stories[id];
  return siteMetadata(lang, { title: t.metaTitle, description: t.metaDescription, path: storyPath(id), image: `${storyPath(id)}/opengraph-image` });
}

/** The vehicle the story's map draws. */
const VEHICLE: Record<StoryId, "two_wheeler" | "local_taxi" | "directions_bus" | "delivery_dining"> = {
  school: "directions_bus",
  rides: "local_taxi",
  delivery: "two_wheeler",
  "multi-vendor": "delivery_dining",
  // The academy's scenes draw no map.
  academy: "two_wheeler",
};

const primary =
  "inline-flex h-[52px] items-center gap-2.5 rounded-2xl bg-[var(--accent)] px-6 text-base font-bold text-[#0e0d24] no-underline shadow-[0_12px_30px_-12px_var(--accent)] transition-transform hover:-translate-y-0.5 hover:text-[#0e0d24]";
const ghost =
  "inline-flex h-[52px] items-center gap-2 rounded-2xl border border-white/25 px-6 text-base font-semibold text-white no-underline backdrop-blur-sm hover:border-white hover:text-white";

/** A real screen of the app in the site's phone frame. */
function Phone({ screen, alt, className = "", priority = false }: { screen: AppScreen; alt: string; className?: string; priority?: boolean }) {
  return (
    <PhoneFrame className={className} data-screen={screen}>
      <Image src={`/screens/${screen}.png`} alt={alt} fill sizes="(max-width: 640px) 70vw, 320px" priority={priority} className="object-cover" />
    </PhoneFrame>
  );
}

/** A photo slot: the photo, or a deep gradient in the story's colour when there is none. */
function Photo({ photo, alt, className = "", sizes = "100vw", priority = false }: { photo: StoryPhoto | null; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  if (!photo) {
    return <div aria-hidden="true" className={`story-fallback ${className}`} />;
  }
  return <Image src={photo.src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}

/** A notification as it slides onto a phone's lock screen. */
function PushCard({ push, icon, now, className = "" }: { push: PushText; icon: IconName; now: string; className?: string }) {
  return (
    <div
      className={`flex w-[330px] max-w-full items-start gap-3 rounded-[22px] border border-white/15 bg-[rgba(30,29,52,0.72)] p-3.5 text-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl ${className}`}
      data-reveal="push"
      role="note"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[var(--accent)] text-[#0e0d24]">
        <Icon name={icon} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2 text-[12px] font-semibold tracking-[0.4px] text-white/60 uppercase">
          <span className="truncate">{push.app}</span>
          <span className="normal-case">{now}</span>
        </span>
        <span className="text-[15px] leading-snug font-bold">{push.title}</span>
        <span className="text-[14px] leading-snug text-white/80">{push.body}</span>
      </span>
    </div>
  );
}

function Hero({ shape, t, ui, lang, demoHref }: { shape: StoryShape; t: StoryText; ui: StoryUi; lang: Lang; demoHref: string }) {
  const alt = screenAltFor(lang);
  const photo = photoOf(shape.id, shape.hero.photo);
  return (
    <section className="on-dark relative isolate overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="story-title">
      <div className="absolute inset-0 -z-10" data-parallax="0.12" style={{ translate: "0 var(--py, 0px)" }}>
        <Photo photo={photo} alt={t.photos[shape.hero.photo] ?? ""} priority className="scale-110" />
      </div>
      <div aria-hidden="true" className="story-hero-shade absolute inset-0 -z-10" />
      <div className="mx-auto flex min-h-[min(92vh,880px)] max-w-[1240px] flex-col justify-center gap-12 px-4 pt-16 pb-24 sm:px-6 md:flex-row md:items-center md:gap-8 md:pt-20">
        <div className="flex min-w-0 flex-[1_1_56%] flex-col gap-6" data-reveal="">
          <span className="flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-bold backdrop-blur-md">
            <Icon name={shape.icon} size={18} className="text-[var(--accent)]" />
            {t.eyebrow}
          </span>
          <h1 id="story-title" className="m-0 max-w-[760px] text-[44px] leading-[1.02] font-extrabold tracking-[-1.5px] text-balance sm:text-[68px] sm:tracking-[-2.4px] lg:text-[84px]">
            {t.title}
          </h1>
          <p className="m-0 max-w-[620px] text-lg leading-relaxed text-white/85 sm:text-xl">{t.intro}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={demoHref} className={primary}>
              <Icon name="smartphone" size={20} />
              {ui.tryDemo}
            </Link>
            <a href="#plans" className={ghost}>
              {ui.seePlans}
              <Icon name="arrow_downward" size={20} />
            </a>
          </div>
          <p className="m-0 max-w-[600px] border-s-2 border-[var(--accent)] ps-4 text-[15px] leading-relaxed text-white/75">
            <span className="mb-1 block text-xs font-bold tracking-[0.8px] text-[var(--accent)] uppercase">{ui.realScreen}</span>
            {t.cast}
          </p>
        </div>
        <div className="relative flex min-w-0 flex-[1_1_44%] justify-center md:justify-end" aria-hidden="false">
          <div className="relative h-[480px] w-[330px] sm:h-[560px] sm:w-[400px]">
            <div className="story-float absolute end-0 top-0 w-[200px] sm:w-[236px]" data-parallax="-0.05" style={{ translate: "0 var(--py, 0px)" }}>
              <Phone screen={shape.hero.screens[1]} alt={alt[shape.hero.screens[1]]} className="w-full rotate-[4deg] opacity-95" />
            </div>
            <div className="absolute start-0 bottom-0 w-[220px] sm:w-[260px]" data-parallax="0.04" style={{ translate: "0 var(--py, 0px)" }}>
              <Phone screen={shape.hero.screens[0]} alt={alt[shape.hero.screens[0]]} className="w-full -rotate-[3deg] drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]" priority />
            </div>
          </div>
        </div>
      </div>
      <span aria-hidden="true" className="story-scroll absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs font-semibold tracking-[1px] text-white/60 uppercase md:flex">
        {ui.scroll}
        <Icon name="expand_more" size={22} />
      </span>
    </section>
  );
}

function Chapter({ shape, chapter, t, ui, lang, index }: { shape: StoryShape; chapter: ChapterShape; t: StoryText; ui: StoryUi; lang: Lang; index: number }) {
  const words = t.chapters[index]!;
  const alt = screenAltFor(lang);
  const photo = photoOf(shape.id, chapter.photo);
  const art = chapter.art ? <ChapterArtView art={chapter.art} t={ui.art} vehicle={VEHICLE[shape.id]} /> : null;
  const flip = index % 2 === 1;
  return (
    <li className="relative grid gap-8 ps-12 md:grid-cols-2 md:items-center md:gap-14 md:ps-0" aria-labelledby={`chapter-${index}`}>
      {/* The day's dot on the line. */}
      <span aria-hidden="true" className="story-dot absolute start-[11px] top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[#0b0a1f] md:start-1/2 md:top-1/2 md:-ms-[11px] md:-mt-[11px]" data-reveal="" />
      <div className={`flex min-w-0 flex-col gap-4 ${flip ? "md:order-2 md:ps-10" : "md:pe-10"}`} data-reveal="">
        <span className="flex items-baseline gap-3">
          <span dir="ltr" className="text-[44px] leading-none font-extrabold tracking-[-1.5px] text-[var(--accent)] tabular-nums sm:text-[56px]">
            {words.time}
          </span>
          <span className="text-[13px] font-bold tracking-[1.2px] text-white/60 uppercase">{words.kicker}</span>
        </span>
        <h3 id={`chapter-${index}`} className="m-0 text-[28px] leading-[1.1] font-extrabold tracking-[-0.6px] text-balance sm:text-[36px]">
          {words.title}
        </h3>
        <p className="m-0 max-w-[560px] text-[17px] leading-[1.7] text-white/80 sm:text-lg">{words.text}</p>
        {words.push ? <PushCard push={words.push} icon={chapter.icon} now={ui.now} className="mt-2" /> : null}
      </div>
      <div className={`relative min-w-0 ${flip ? "md:order-1" : ""}`}>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-[#16143a] sm:aspect-square" data-reveal="">
          <div className="absolute inset-[-6%]" data-parallax="0.06" style={{ translate: "0 var(--py, 0px)" }}>
            <Photo photo={photo} alt={chapter.photo ? (t.photos[chapter.photo] ?? "") : ""} sizes="(max-width: 768px) 100vw, 560px" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,10,31,0)_40%,rgba(11,10,31,0.55))]" />
          {photo ? null : (
            // No photo: the real screen stands in the middle of the scene.
            <div className={`absolute inset-y-0 flex items-end pb-[6%] sm:items-center sm:pb-0 ${art ? (flip ? "start-[6%]" : "end-[6%]") : "inset-x-0 justify-center"}`}>
              <Phone screen={chapter.screen} alt={alt[chapter.screen]} className="w-[40vw] max-w-[230px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)] sm:w-[230px]" />
            </div>
          )}
          {art ? (
            <div className={`absolute top-4 flex origin-top scale-[0.82] sm:top-6 sm:scale-100 ${flip ? "end-2 sm:end-6" : "start-2 sm:start-6"} ${photo ? "" : "max-w-[62%]"}`}>{art}</div>
          ) : null}
        </div>
        {photo ? (
          <div className={`absolute -bottom-6 w-[160px] sm:w-[210px] ${flip ? "start-[-8px] sm:start-[-28px]" : "end-[-8px] sm:end-[-28px]"}`} data-reveal="rise">
            <Phone screen={chapter.screen} alt={alt[chapter.screen]} className="w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]" />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Chapters({ shape, t, ui, lang }: { shape: StoryShape; t: StoryText; ui: StoryUi; lang: Lang }) {
  return (
    <section className="on-dark relative bg-[#0b0a1f] text-white" aria-label={t.title}>
      <div className="relative mx-auto max-w-[1160px] px-4 pt-8 pb-28 sm:px-6 sm:pt-16">
        <div aria-hidden="true" className="story-line absolute start-[27px] top-0 bottom-20 w-[2px] sm:start-[35px] md:start-1/2 md:-ms-px" data-timeline="">
          <span className="story-line-fill block w-full" />
        </div>
        <ol className="m-0 flex list-none flex-col gap-24 p-0 sm:gap-32">
          {shape.chapters.map((chapter, index) => (
            <Chapter key={index} shape={shape} chapter={chapter} t={t} ui={ui} lang={lang} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Interlude({ shape, t }: { shape: StoryShape; t: StoryText }) {
  const photo = photoOf(shape.id, shape.interlude.photo);
  return (
    <section className="on-dark relative isolate overflow-hidden bg-[#0b0a1f] text-white">
      <div className="absolute inset-[-8%] -z-10" data-parallax="0.1" style={{ translate: "0 var(--py, 0px)" }}>
        <Photo photo={photo} alt={t.photos[shape.interlude.photo] ?? ""} />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(11,10,31,0.62),rgba(11,10,31,0.9))]" />
      <figure className="mx-auto m-0 flex min-h-[70vh] max-w-[980px] flex-col items-center justify-center gap-6 px-4 py-28 text-center sm:px-6" data-reveal="">
        <Icon name="format_quote" size={44} className="icon-flip text-[var(--accent)]" />
        <blockquote className="m-0 text-[34px] leading-[1.12] font-extrabold tracking-[-1px] text-balance sm:text-[56px] sm:tracking-[-1.8px]">{t.interlude.quote}</blockquote>
        <figcaption className="max-w-[620px] text-lg leading-relaxed text-white/80">{t.interlude.text}</figcaption>
      </figure>
    </section>
  );
}

function Stats({ shape, t }: { shape: StoryShape; t: StoryText }) {
  return (
    <section className="bg-white" aria-labelledby="story-stats">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <h2 id="story-stats" className="m-0 max-w-[680px] text-[28px] leading-[1.12] font-extrabold tracking-[-0.6px] text-balance sm:text-[40px] sm:tracking-[-1px]">
          {t.statsTitle}
        </h2>
        <ul className="m-0 grid list-none gap-px overflow-hidden rounded-[24px] border border-line bg-line p-0 sm:grid-cols-2 lg:grid-cols-4">
          {shape.stats.map((stat, i) => (
            <li key={i} className="flex flex-col gap-3 bg-white p-7" data-reveal="">
              <span dir="ltr" className="self-start text-[56px] leading-none font-extrabold tracking-[-2px] text-midnight tabular-nums">
                {stat.prefix}
                <span data-count={stat.value}>{stat.value}</span>
                {stat.suffix}
              </span>
              <span className="text-[16px] leading-snug text-ink-4">{t.stats[i]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Systems({ shape, t, ui, lang }: { shape: StoryShape; t: StoryText; ui: StoryUi; lang: Lang }) {
  const alt = screenAltFor(lang);
  return (
    <section className="bg-ivory" aria-labelledby="story-systems" id="systems">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-16 px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className="text-[13px] font-bold tracking-[1px] text-accent uppercase">{ui.everything}</span>
          <h2 id="story-systems" className="m-0 text-[32px] leading-[1.08] font-extrabold tracking-[-0.8px] text-balance sm:text-[48px] sm:tracking-[-1.4px]">
            {t.systemsTitle}
          </h2>
          <p className="m-0 text-lg leading-relaxed text-ink-4">{t.systemsText}</p>
        </div>
        {shape.systems.map((system, si) => {
          const words = t.systems[si]!;
          return (
            <article key={si} className={`grid gap-10 border-t border-line pt-12 lg:gap-14 ${system.screens.length ? "lg:grid-cols-[1fr_300px]" : ""}`} aria-labelledby={`system-${si}`}>
              <div className="flex min-w-0 flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <span className="flex items-center gap-2.5 text-[15px] font-bold text-ink-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-midnight text-ivory">
                      <Icon name={system.icon} size={22} />
                    </span>
                    {words.name}
                  </span>
                  <h3 id={`system-${si}`} className="m-0 text-[26px] leading-[1.15] font-extrabold tracking-[-0.5px] text-balance sm:text-[32px]">
                    {words.title}
                  </h3>
                  <p className="m-0 max-w-[640px] text-[17px] leading-relaxed text-ink-4">{words.text}</p>
                </div>
                <ul className={`m-0 grid list-none gap-3 p-0 sm:grid-cols-2 ${system.screens.length ? "" : "lg:grid-cols-3"}`}>
                  {system.features.map((icon, fi) => {
                    const [title, text] = words.features[fi]!;
                    return (
                      <li key={fi} className="flex gap-3.5 rounded-2xl border border-line bg-white p-4 sm:p-5" data-reveal="">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-peach text-midnight">
                          <Icon name={icon} size={22} />
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-[16px] leading-snug font-bold">{title}</span>
                          <span className="text-[15px] leading-relaxed text-ink-4">{text}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {system.screens.length ? (
                <div className="flex min-w-0 flex-wrap justify-center gap-4 lg:sticky lg:top-24 lg:flex-col lg:items-center lg:self-start">
                  {system.screens.slice(0, 2).map((screen) => (
                    <Phone key={screen} screen={screen} alt={alt[screen]} className="w-[200px] lg:w-[240px]" />
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Bundle({ shape, t }: { shape: StoryShape; t: StoryText }) {
  return (
    <section className="on-dark relative overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="story-bundle">
      <div aria-hidden="true" className="story-grid absolute inset-0" />
      <div className="relative mx-auto flex max-w-[1160px] flex-col gap-12 px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex max-w-[720px] flex-col gap-3">
          <h2 id="story-bundle" className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.8px] text-balance sm:text-[44px] sm:tracking-[-1.2px]">
            {t.bundleTitle}
          </h2>
          <p className="m-0 text-lg leading-relaxed text-white/75">{t.bundleText}</p>
        </div>
        <ol className="m-0 flex list-none flex-col items-stretch gap-0 p-0 md:flex-row md:items-center">
          {shape.bundle.map((icon, i) => {
            const [name, who] = t.bundleNodes[i]!;
            const center = icon === "dashboard_customize";
            return (
              <li key={i} className="contents">
                {i > 0 ? <span aria-hidden="true" className="story-link mx-auto h-12 w-[2px] md:mx-0 md:h-[2px] md:w-auto md:min-w-8 md:flex-1" /> : null}
                <span
                  className={`flex items-center gap-4 rounded-[22px] border p-5 md:flex-[0_1_250px] md:flex-col md:items-start ${center ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,#14123a)]" : "border-white/12 bg-white/6"}`}
                  data-reveal=""
                >
                  <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${center ? "bg-[var(--accent)] text-[#0e0d24]" : "bg-white/12 text-white"}`}>
                    <Icon name={icon} size={26} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-extrabold">{name}</span>
                    <span className="text-[14px] text-white/70">{who}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {t.bundleFlows.map((flow) => (
            <li key={flow} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-[15px] leading-snug text-white/85" data-reveal="">
              <Icon name="bolt" size={20} className="mt-px flex-none text-[var(--accent)]" />
              {flow}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A site's name for a footnote ("fedena.com", "classera.com" for manual.classera.com). */
function siteOf(url: string): string {
  return new URL(url).hostname.split(".").slice(-2).join(".");
}

function Compare({ id, t, ui, lang, published }: { id: StoryId; t: StoryText; ui: StoryUi; lang: Lang; published: boolean }) {
  const others = competitorsOf(id);
  const own = YALLAPP[id];
  const rows = ["kind", "apps", "ownName", "pricing", "published", "arabic"] as const;
  const yallapp: Omit<CompareColumn, "sources"> = { name: ui.yallapp, ...own, published: published ? PRICES_ON_PAGE : PRICES_ON_REQUEST };
  const agency: Omit<CompareColumn, "sources"> = { name: ui.agency, ...AGENCY };
  const columns = [yallapp, ...others, agency];
  const note = (n: number) => (
    <sup>
      <a href={`#source-${id}-${n}`} className="ms-0.5 text-[11px] font-bold text-accent no-underline">
        {n}
      </a>
    </sup>
  );
  return (
    <section className="bg-white" aria-labelledby="story-compare" id="compare">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex max-w-[720px] flex-col gap-3">
          <h2 id="story-compare" className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.8px] text-balance sm:text-[44px] sm:tracking-[-1.2px]">
            {t.compareTitle}
          </h2>
          <p className="m-0 text-lg leading-relaxed text-ink-4">{t.compareText}</p>
        </div>
        {/* Wide screens: one table. */}
        <div className="hidden overflow-hidden rounded-[22px] border border-line lg:block">
          <table className="w-full border-collapse text-start text-[14px] leading-snug" aria-label={ui.compareLabel}>
            <thead>
              <tr>
                <th scope="col" className="w-[150px] bg-sand p-4 text-start text-[12px] font-bold tracking-[0.8px] text-muted uppercase">
                  <span className="sr-only">{ui.compareLabel}</span>
                </th>
                {columns.map((c, ci) => (
                  <th key={c.name} scope="col" className={`p-4 text-start align-bottom text-[15px] font-extrabold ${ci === 0 ? "on-dark bg-midnight text-white" : "bg-sand"}`}>
                    {c.name}
                    {ci > 0 && ci <= others.length ? note(ci) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row} className="border-t border-line-soft">
                  <th scope="row" className="bg-sand p-4 text-start align-top text-[13px] font-bold text-ink-3">
                    {ui.compareRows[row]}
                  </th>
                  {columns.map((c, ci) => (
                    <td key={c.name} className={`p-4 align-top ${ci === 0 ? "on-dark bg-midnight font-semibold text-white" : "text-ink-4"}`}>
                      {c[row][lang]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Phones and tablets: a card for each. */}
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:hidden" aria-label={ui.compareLabel}>
          {columns.map((c, ci) => (
            <li key={c.name} className={`flex flex-col gap-3 rounded-[22px] border p-5 ${ci === 0 ? "on-dark border-midnight bg-midnight text-white" : "border-line bg-white"}`}>
              <h3 className="m-0 text-lg font-extrabold">
                {c.name}
                {ci > 0 && ci <= others.length ? note(ci) : null}
              </h3>
              <dl className="m-0 flex flex-col gap-2.5">
                {rows.map((row) => (
                  <div key={row} className="flex flex-col gap-0.5">
                    <dt className={`text-[12px] font-bold tracking-[0.6px] uppercase ${ci === 0 ? "text-white/60" : "text-muted"}`}>{ui.compareRows[row]}</dt>
                    <dd className={`m-0 text-[15px] leading-snug ${ci === 0 ? "font-semibold" : "text-ink-4"}`}>{c[row][lang]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted">
          <p className="m-0">{ui.compareChecked}</p>
          <p className="m-0 font-bold text-ink-3">{ui.compareSources}</p>
          <ol className="m-0 flex flex-col gap-1.5 ps-5">
            {others.map((c, i) => (
              <li key={c.name} id={`source-${id}-${i + 1}`}>
                <span className="font-semibold text-ink-3">{c.name}: </span>
                {siteOf(c.sources[0]!)}
                {c.sources.map((url, si) => (
                  <a key={url} href={url} rel="nofollow noopener noreferrer" target="_blank" className="ms-1.5" aria-label={`${c.name}, ${siteOf(url)} ${si + 1}`}>
                    [{si + 1}]
                  </a>
                ))}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function DemoBand({ shape, ui, lang }: { shape: StoryShape; ui: StoryUi; lang: Lang }) {
  return (
    <section className="on-dark relative overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="story-demo">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,color-mix(in_srgb,var(--accent)_35%,transparent),transparent)]" />
      <div className="relative mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-8 px-4 py-20 sm:px-6">
        <div className="flex max-w-[640px] flex-col gap-3">
          <h2 id="story-demo" className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.8px] text-balance sm:text-[42px]">
            {ui.demoTitle}
          </h2>
          <p className="m-0 text-lg leading-relaxed text-white/80">{ui.demoText}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {shape.demos.map((demo, i) => (
            <Link key={demo} href={demoHref(lang, demo)} className={i === 0 ? primary : ghost}>
              <Icon name="smartphone" size={20} />
              {shape.demos.length > 1 ? `${ui.tryDemo}: ${DEMO_NAMES[demo]}` : ui.tryDemo}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The demos' own names, as their apps are called. */
const DEMO_NAMES: Partial<Record<StudioDemoId, string>> = { taxi: "Lamha Taxi", rides: "Masar Rides" };

function demoHref(lang: Lang, demo: StudioDemoId): string {
  return `${localePath(lang, "/demo/studio")}#${DEMO_SLUGS[demo]}`;
}

function Finale({ shape, t, ui, lang }: { shape: StoryShape; t: StoryText; ui: StoryUi; lang: Lang }) {
  const photo = photoOf(shape.id, shape.finale.photo);
  const others = STORY_IDS.filter((id) => id !== shape.id);
  const copy = storyCopyFor(lang).stories;
  const solutions = shape.solutions.map((s) => solutionFor(lang, s)).filter((s) => s !== undefined);
  return (
    <>
      <section className="on-dark relative isolate overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="story-finale">
        <div className="absolute inset-[-6%] -z-10" data-parallax="0.08" style={{ translate: "0 var(--py, 0px)" }}>
          <Photo photo={photo} alt={t.photos[shape.finale.photo] ?? ""} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(11,10,31,0.95),rgba(11,10,31,0.35)_70%)]" />
        {photo ? null : (
          <div aria-hidden="false" className="pointer-events-none absolute inset-y-0 end-[6%] hidden items-center md:flex">
            <Phone screen={shape.finale.screen} alt={screenAltFor(lang)[shape.finale.screen]} className="w-[240px] rotate-[3deg] drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]" />
          </div>
        )}
        <div className="relative mx-auto flex min-h-[64vh] max-w-[1160px] flex-col justify-end gap-4 px-4 py-24 sm:px-6" data-reveal="">
          <h2 id="story-finale" className="m-0 max-w-[820px] text-[36px] leading-[1.05] font-extrabold tracking-[-1.2px] text-balance sm:text-[60px] sm:tracking-[-2px]">
            {t.finale.title}
          </h2>
          <p className="m-0 max-w-[640px] text-lg leading-relaxed text-white/85 sm:text-xl">{t.finale.text}</p>
        </div>
      </section>
      <section className="bg-ivory" aria-labelledby="story-more">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-8 px-4 py-16 sm:px-6">
          <h2 id="story-more" className="m-0 text-[24px] font-extrabold tracking-[-0.4px]">
            {ui.otherStories}
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((id) => (
              <li key={id}>
                <Link
                  href={localePath(lang, storyPath(id))}
                  className="group flex h-full flex-col gap-3 rounded-[22px] border border-line bg-white p-5 text-midnight no-underline hover:border-midnight hover:text-midnight"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-midnight text-ivory">
                    <Icon name={STORIES[id].icon} size={24} />
                  </span>
                  <span className="text-[13px] font-bold tracking-[0.8px] text-accent uppercase">{copy[id].navName}</span>
                  <span className="text-xl leading-tight font-extrabold">{copy[id].title}</span>
                  <span className="text-[15px] text-ink-4">{copy[id].summary}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-2 text-[15px] font-bold">
                    {ui.readStory}
                    <Icon name="arrow_forward" size={18} className="icon-flip transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {solutions.length ? (
            <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
              <span className="font-bold text-ink-3">{ui.solutionLink}:</span>
              {solutions.map((s) => (
                <Link key={s.id} href={localePath(lang, `/solutions/${s.id}`)} className="font-semibold">
                  {s.appsTitle}
                </Link>
              ))}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Credits({ id, t, ui, lang }: { id: StoryId; t: StoryText; ui: StoryUi; lang: Lang }) {
  const photos = photosOf(id);
  return (
    <section className="border-t border-line bg-ivory" aria-labelledby="story-credits" id="credits">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-4 pt-6 pb-14 text-[13px] leading-relaxed text-muted sm:px-6">
        <h2 id="story-credits" className="m-0 text-[15px] font-bold text-ink-3">
          {ui.creditsTitle}
        </h2>
        {photos.length ? (
          <>
            <p className="m-0">{ui.creditsText}</p>
            <ul className="m-0 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
              {photos.map((p) => (
                <li key={p.slot}>
                  <span className="font-semibold text-ink-3">{t.photos[p.slot] ?? p.credit.title ?? p.slot}</span>
                  {" · "}
                  {formatMessage(lang, ui.photoBy, { creator: p.credit.creator ?? "" })}
                  {" · "}
                  {p.credit.licenseUrl ? (
                    <a href={p.credit.licenseUrl} rel="license nofollow noopener noreferrer" target="_blank">
                      {p.credit.license}
                    </a>
                  ) : (
                    p.credit.license
                  )}
                  {p.credit.source ? (
                    <>
                      {" · "}
                      <a href={p.credit.source} rel="nofollow noopener noreferrer" target="_blank">
                        {ui.photoSource}
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="m-0">{ui.creditsNone}</p>
        )}
      </div>
    </section>
  );
}

export async function StoryPage({ lang, id }: { lang: Lang; id: string }) {
  if (!isStoryId(id)) notFound();
  const shape = STORIES[id];
  const copy = storyCopyFor(lang);
  const t = copy.stories[id];
  const ui = copy.ui;
  const [contact, { plans, view }] = await Promise.all([getVisitorContact(), studioPlans(lang)]);
  const published = plans.some((plan) => planPriceFor(lang, plan, view).period !== null);
  const studioName = messagesFor(lang).studio.metaTitle;
  const demo = demoHref(lang, shape.demos[0]!);
  return (
    <div className="bg-white" data-story={id} style={{ "--accent": shape.accent } as CSSProperties}>
      <JsonLdScript
        data={breadcrumbLd(
          siteUrl(),
          [
            { name: studioName, path: "/yallapp-studio" },
            { name: t.navName, path: storyPath(id) },
          ],
          lang === "en" ? undefined : lang,
        )}
      />
      <StoryEffects />
      <SiteHeader current={`story-${id}`} lang={lang} />
      <main>
        <Hero shape={shape} t={t} ui={ui} lang={lang} demoHref={demo} />
        <Chapters shape={shape} t={t} ui={ui} lang={lang} />
        <Interlude shape={shape} t={t} />
        <Stats shape={shape} t={t} />
        <Systems shape={shape} t={t} ui={ui} lang={lang} />
        <Bundle shape={shape} t={t} />
        <Compare id={id} t={t} ui={ui} lang={lang} published={published} />
        <section className="bg-ivory" aria-labelledby="story-plans" id="plans">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
            <div className="flex max-w-[680px] flex-col gap-2.5">
              <span className="text-[13px] font-bold tracking-[1px] text-accent uppercase">{ui.studio}</span>
              <h2 id="story-plans" className="m-0 text-[28px] leading-[1.12] font-extrabold tracking-[-0.6px] text-balance sm:text-[40px] sm:tracking-[-1px]">
                {ui.plansTitle}
              </h2>
              <p className="m-0 text-[17px] leading-relaxed text-ink-4 sm:text-lg">{ui.plansText}</p>
            </div>
            <StudioPlans lang={lang} plans={plans} view={view} contact={contact} />
            <Link href={localePath(lang, "/pricing")} className="flex items-center gap-1.5 self-start text-base font-bold text-midnight no-underline hover:underline">
              {ui.allPlans}
              <Icon name="arrow_forward" size={20} className="icon-flip" />
            </Link>
          </div>
        </section>
        <DemoBand shape={shape} ui={ui} lang={lang} />
        <Finale shape={shape} t={t} ui={ui} lang={lang} />
        <Credits id={id} t={t} ui={ui} lang={lang} />
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}
