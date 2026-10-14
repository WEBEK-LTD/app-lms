import Link from "next/link";
import type { ReactNode } from "react";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { Icon } from "./icon";
import { SiteFooter, SiteHeader, type SitePage } from "./site-chrome";

/** A public marketing page: header with `current` marked, a title band, the content and the full footer. */
export function MarketingPage({
  current,
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
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
      <SiteHeader current={current} />
      <main>
        <section className="bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-10 px-4 py-14 sm:px-6 sm:py-16">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-4">
              {eyebrow ? (
                <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{eyebrow}</span>
              ) : null}
              <h1 className="m-0 max-w-[760px] text-[34px] leading-[1.1] font-extrabold tracking-[-1px] sm:text-[46px]">{title}</h1>
              <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-4">{intro}</p>
            </div>
            {aside ? <div className="flex min-w-0 flex-[1_1_300px] justify-center">{aside}</div> : null}
          </div>
        </section>
        {children}
        <ContactBand />
      </main>
      <SiteFooter full />
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
      <div className={`mx-auto flex flex-col gap-9 px-4 py-14 sm:px-6 sm:py-20 ${narrow ? "max-w-[820px]" : "max-w-[1160px]"}`}>{children}</div>
    </section>
  );
}

export function SectionTitle({ title, text, eyebrow }: { title: string; text?: string; eyebrow?: string }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-2.5">
      {eyebrow ? <span className="text-[13px] font-bold tracking-[1px] text-accent uppercase">{eyebrow}</span> : null}
      <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">{title}</h2>
      {text ? <p className="m-0 text-[17px] leading-relaxed text-ink-4">{text}</p> : null}
    </div>
  );
}

/** "Learn more" link under a teaser. */
export function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 self-start text-base font-bold text-midnight no-underline hover:underline">
      {children}
      <Icon name="arrow_forward" size={20} />
    </Link>
  );
}

/** The closing call to action on every marketing page. */
export async function ContactBand() {
  const contact = await getContact();
  const text = await getSiteContent("contact-band");
  return (
    <section className="on-dark bg-night-2 text-white">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{text.title}</h2>
          <p className="m-0 text-base text-night-text">{text.text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={contact.whatsappUrl}
            className="flex h-[50px] items-center gap-2.5 rounded-xl bg-ivory px-[22px] text-base font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
          >
            <Icon name="chat" size={20} />
            Talk to us on WhatsApp
          </a>
          <Link
            href="/sign-up"
            className="flex h-[50px] items-center rounded-xl border border-night-line px-[22px] text-base font-semibold text-white no-underline hover:border-ivory hover:text-white"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The true numbers about Yallapp, as a band of figures. */
export function NumbersBand({ numbers }: { numbers: { value: string; label: string }[] }) {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">
      {numbers.map((n) => (
        <li key={n.label} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5">
          <span className="text-[40px] leading-none font-extrabold tracking-[-1px]">{n.value}</span>
          <span className="text-[15px] leading-snug text-ink-4">{n.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** "A typical app builder" next to Yallapp: a table from sm up, stacked rows on phones. */
export function Comparison({ rows }: { rows: { topic: string; typical: string; yallapp: string }[] }) {
  return (
    <div role="table" aria-label="A typical app builder compared with Yallapp" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div role="row" className="hidden border-b border-line bg-sand sm:grid sm:grid-cols-[1fr_1.4fr_1.4fr]">
        <span role="columnheader" className="px-5 py-4 text-sm font-bold text-muted">
          What matters
        </span>
        <span role="columnheader" className="px-5 py-4 text-sm font-bold text-muted">
          A typical app builder
        </span>
        <span role="columnheader" className="px-5 py-4 text-sm font-bold">
          Yallapp
        </span>
      </div>
      {rows.map((row) => (
        <div role="row" key={row.topic} className="grid gap-2 border-b border-line-soft px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_1.4fr_1.4fr] sm:gap-0 sm:p-0">
          <span role="rowheader" className="font-bold sm:px-5 sm:py-4">
            {row.topic}
          </span>
          <span role="cell" className="flex gap-2 text-[15px] text-ink-4 sm:px-5 sm:py-4">
            <Icon name="close" size={20} className="mt-0.5 text-muted" />
            <span>
              <span className="sr-only">A typical app builder: </span>
              {row.typical}
            </span>
          </span>
          <span role="cell" className="flex gap-2 text-[15px] sm:bg-peach-soft sm:px-5 sm:py-4">
            <Icon name="check" size={20} className="mt-0.5 text-success" />
            <span>
              <span className="sr-only">Yallapp: </span>
              {row.yallapp}
            </span>
          </span>
        </div>
      ))}
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
