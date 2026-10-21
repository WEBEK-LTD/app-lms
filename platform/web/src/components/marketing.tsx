import Link from "next/link";
import type { ReactNode } from "react";
import type { IconName } from "./icon-names";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { DEFAULT_LANG, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { AccountLink } from "./account-link";
import { Logo } from "./brand";
import { Icon } from "./icon";
import { SiteFooter, SiteHeader, type SitePage } from "./site-chrome";
import { WhatsAppMark } from "./brand-marks";
import { WhatsAppLink } from "./whatsapp-link";

/** A public marketing page: header with `current` marked, a title band, the content and the full footer. */
export function MarketingPage({
  current,
  eyebrow,
  title,
  intro,
  aside,
  children,
  lang = DEFAULT_LANG,
}: {
  /** 55 The page's language: its header, closing band and footer follow it. */
  lang?: Lang;
  current?: SitePage;
  eyebrow?: string;
  title: string;
  intro: string;
  /** Shown next to the title from md up, below it on phones (screenshots). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white">
      <SiteHeader current={current} lang={lang} />
      <main>
        <section className="bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-10 px-4 py-14 sm:px-6 sm:py-20">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
              {eyebrow ? (
                <span className="flex h-[30px] items-center self-start rounded-full border border-line bg-white px-3.5 text-[13px] font-bold">{eyebrow}</span>
              ) : null}
              <h1 className="m-0 max-w-[780px] text-[36px] leading-[1.06] font-extrabold tracking-[-1.2px] text-balance sm:text-[50px] sm:tracking-[-1.6px]">{title}</h1>
              <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-4 sm:text-[19px]">{intro}</p>
            </div>
            {aside ? <div className="flex min-w-0 flex-[1_1_300px] justify-center">{aside}</div> : null}
          </div>
        </section>
        {children}
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}

/** A content section with the site's width and spacing. */
export function Section({
  children,
  tinted = false,
  narrow = false,
  id,
  label,
}: {
  children: ReactNode;
  tinted?: boolean;
  narrow?: boolean;
  id?: string;
  /** Names the section for assistive technology when it has no heading of its own. */
  label?: string;
}) {
  return (
    <section id={id} aria-label={label} className={`scroll-mt-4 ${tinted ? "bg-ivory" : ""}`}>
      <div className={`mx-auto flex flex-col gap-10 px-4 py-16 sm:px-6 sm:py-24 ${narrow ? "max-w-[820px]" : "max-w-[1160px]"}`}>{children}</div>
    </section>
  );
}

export function SectionTitle({ title, text, eyebrow }: { title: string; text?: string; eyebrow?: string }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-2.5">
      {eyebrow ? <span className="text-[13px] font-bold tracking-[1px] text-accent uppercase">{eyebrow}</span> : null}
      <h2 className="m-0 text-[28px] leading-[1.12] font-extrabold tracking-[-0.6px] text-balance sm:text-[38px] sm:tracking-[-1px]">{title}</h2>
      {text ? <p className="m-0 text-[17px] leading-relaxed text-ink-4 sm:text-lg">{text}</p> : null}
    </div>
  );
}

/** "Learn more" link under a teaser. */
export function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="group flex items-center gap-1.5 self-start text-base font-bold text-midnight no-underline hover:text-midnight hover:underline">
      {children}
      <Icon name="arrow_forward" size={20} className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

/** The closing call to action on every marketing page. */
export async function ContactBand({ lang = DEFAULT_LANG }: { lang?: Lang }) {
  const contact = await getContact();
  const text = await getSiteContent("contact-band", lang);
  const m = messagesFor(lang).common;
  return (
    <section className="on-dark bg-night-2 text-white">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-8 px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex max-w-[620px] flex-col gap-2.5">
          <h2 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.6px] text-balance sm:text-[32px]">{text.title}</h2>
          <p className="m-0 text-base text-night-text">{text.text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <WhatsAppLink
            lines={contact.lines}
            className="flex h-[50px] items-center gap-2.5 rounded-xl bg-ivory px-[22px] text-base font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
          >
            <WhatsAppMark size={20} />
            {m.talkWhatsApp}
          </WhatsAppLink>
          <AccountLink
            href={localePath(lang, "/sign-up")}
            signedIn={m.goToDashboard}
            className="flex h-[50px] items-center rounded-xl border border-night-line px-[22px] text-base font-semibold text-white no-underline hover:border-ivory hover:text-white"
          >
            {m.createAccount}
          </AccountLink>
        </div>
      </div>
    </section>
  );
}

/**
 * "A typical app builder" next to Yallapp. From md up a three-column table:
 * the topics with their icons, a quiet column for the typical builder, and a
 * raised dark column for Yallapp that runs the whole height. On phones each
 * topic is a card with the two answers one under the other.
 */
export function Comparison({ rows, lang = DEFAULT_LANG }: { rows: { icon: IconName; topic: string; typical: string; yallapp: string }[]; lang?: Lang }) {
  const last = rows.length + 1;
  const m = messagesFor(lang).comparison;
  return (
    <div role="table" aria-label={m.label} className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(180px,0.85fr)_1fr_1.15fr] md:gap-0" data-comparison="">
      {/* The two columns' backgrounds, under the cells. */}
      <div aria-hidden="true" className="hidden rounded-2xl border border-line bg-white md:block" style={{ gridColumn: 2, gridRow: `1 / ${last + 1}` }} />
      <div
        aria-hidden="true"
        className="hidden rounded-[22px] bg-night-2 shadow-[0_24px_60px_-20px_rgba(14,13,36,0.55)] ring-1 ring-night-line md:block md:-my-3"
        style={{ gridColumn: 3, gridRow: `1 / ${last + 1}` }}
      />

      <div role="row" className="hidden md:grid md:grid-cols-subgrid" style={{ gridColumn: "1 / 4", gridRow: 1 }}>
        <span role="columnheader" className="flex items-end px-5 pb-4 text-[13px] font-bold tracking-[1px] text-muted uppercase">
          {m.whatMatters}
        </span>
        <span role="columnheader" className="flex items-center gap-2.5 border-b border-line-soft px-6 py-5 text-[15px] font-bold text-muted">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand">
            <Icon name="apps" size={18} />
          </span>
          {m.typical}
        </span>
        <span role="columnheader" className="on-dark flex items-center justify-between gap-3 border-b border-night-line px-6 py-5">
          <Logo height={26} reversed alt="Yallapp" />
          <span className="rounded-full bg-ember px-2.5 py-1 text-[12px] font-bold tracking-[0.5px] text-white uppercase">{m.everyApp}</span>
        </span>
      </div>

      {rows.map((row, i) => {
        const end = i === rows.length - 1;
        return (
          <div
            role="row"
            key={row.topic}
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white md:grid md:grid-cols-subgrid md:overflow-visible md:rounded-none md:border-0 md:bg-transparent"
            style={{ gridColumn: "1 / 4", gridRow: i + 2 }}
          >
            <span role="rowheader" className={`flex items-center gap-3 px-5 pt-4 pb-3 md:py-5 ${end ? "" : "md:border-b md:border-line-soft"}`}>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-peach text-accent">
                <Icon name={row.icon} size={22} />
              </span>
              <span className="text-base font-bold">{row.topic}</span>
            </span>
            <span role="cell" className={`flex gap-3 px-5 pb-4 text-[15px] leading-snug text-muted md:px-6 md:py-5 ${end ? "" : "md:border-b md:border-line-soft"}`}>
              <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sand text-faint md:bg-line-soft">
                <Icon name="close" size={14} />
              </span>
              <span>
                <span className="font-semibold text-ink-4 md:sr-only">{m.typicalPrefix}</span>
                {row.typical}
              </span>
            </span>
            <span role="cell" className={`on-dark flex gap-3 bg-night-2 px-5 py-4 text-[15px] leading-snug text-white md:bg-transparent md:px-6 md:py-5 ${end ? "" : "md:border-b md:border-night-line"}`}>
              <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ember text-white">
                <Icon name="check" size={14} />
              </span>
              <span>
                <span className="font-bold text-ivory md:sr-only">{m.yallappPrefix}</span>
                {row.yallapp}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A list with check marks. */
export function CheckList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-2 p-0 text-[15px] ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Icon name="check" size={20} className="mt-0.5 text-success" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A small rounded label, like an app type on an integration. */
export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-ivory px-2.5 py-0.5 text-xs font-bold text-ink-3">{children}</span>;
}

/** 41 The icon tile on cards: one size everywhere (a 48 px tile, a 26 px symbol). */
export function FeatureIcon({ name }: { name: IconName }) {
  return (
    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-peach text-midnight">
      <Icon name={name} size={26} />
    </span>
  );
}
