import Link from "next/link";
import type { ReactNode } from "react";
import { getContact } from "@/lib/contact";
import { Icon } from "./icon";
import { SiteFooter, SiteHeader, type SitePage } from "./site-chrome";

/** A public marketing page: header with `current` marked, a title band, the content and the full footer. */
export function MarketingPage({
  current,
  eyebrow,
  title,
  intro,
  children,
}: {
  current: SitePage;
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white">
      <SiteHeader current={current} />
      <main>
        <section className="bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-4 py-14 sm:px-6 sm:py-16">
            {eyebrow ? (
              <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{eyebrow}</span>
            ) : null}
            <h1 className="m-0 max-w-[760px] text-[34px] leading-[1.1] font-extrabold tracking-[-1px] sm:text-[46px]">{title}</h1>
            <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-4">{intro}</p>
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
export function Section({ children, tinted = false, narrow = false }: { children: ReactNode; tinted?: boolean; narrow?: boolean }) {
  return (
    <section className={tinted ? "bg-ivory" : undefined}>
      <div className={`mx-auto flex flex-col gap-9 px-4 py-14 sm:px-6 sm:py-20 ${narrow ? "max-w-[820px]" : "max-w-[1160px]"}`}>{children}</div>
    </section>
  );
}

export function SectionTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-2.5">
      <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">{title}</h2>
      {text ? <p className="m-0 text-[17px] leading-relaxed text-ink-4">{text}</p> : null}
    </div>
  );
}

/** "Learn more" link under a teaser on the home page. */
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
  return (
    <section className="on-dark bg-night-2 text-white">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">Ready to put your academy in your students&apos; pockets?</h2>
          <p className="m-0 text-base text-night-text">Tell us about your site on WhatsApp. We&apos;ll set up your account and get your apps building.</p>
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
