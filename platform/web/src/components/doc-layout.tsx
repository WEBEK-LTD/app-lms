import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader, type SitePage } from "./site-chrome";

export interface DocNavGroup {
  title: string;
  label: string;
  links: { href: string; label: string }[];
}

/** Two-column layout for guides and legal pages: section nav and an article card. */
export function DocLayout({
  groups,
  current,
  site,
  children,
}: {
  groups: DocNavGroup[];
  current: string;
  /** The header link to mark, e.g. "guides". */
  site?: SitePage;
  children: ReactNode;
}) {
  return (
    <div className="bg-ivory">
      <SiteHeader current={site} />
      <main className="mx-auto flex max-w-[1160px] flex-wrap items-start gap-10 px-4 pt-12 pb-20 sm:px-6">
        <div className="flex flex-[1_1_220px] flex-col gap-[22px] text-[15px]">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.label} className="flex flex-col gap-1">
              <span className="px-3 pb-1.5 text-xs font-bold tracking-[1px] text-muted">{group.title}</span>
              {group.links.map((link) =>
                link.href === current ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current="page"
                    className="rounded-lg border-l-[3px] border-ember bg-white px-3 py-2 font-bold text-midnight no-underline hover:text-midnight"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-ink-3 no-underline hover:bg-white/60 hover:text-midnight">
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <article className="flex min-w-0 max-w-[780px] flex-[999_1_560px] flex-col gap-3.5 rounded-[20px] border border-line bg-white px-5 py-8 text-base leading-[1.7] text-ink-2 sm:p-10 [&_h2]:mt-4 [&_h2]:mb-0 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-midnight [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function DocTitle({ children }: { children: ReactNode }) {
  return <h1 className="m-0 text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-midnight sm:text-4xl">{children}</h1>;
}

export const LEGAL_NAV: DocNavGroup[] = [
  {
    title: "LEGAL",
    label: "Legal pages",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/refund", label: "Refund policy" },
    ],
  },
];

export function LastUpdated({ date }: { date: string }) {
  return <span className="text-sm text-muted">Last updated: {date}</span>;
}
