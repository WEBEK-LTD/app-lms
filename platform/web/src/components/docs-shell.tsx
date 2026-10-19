import type { ReactNode } from "react";
import { DOCS, DOC_SECTIONS, type DocSection } from "@/content/docs";
import { getSiteContent } from "@/lib/content/get";
import { DEFAULT_LANG, messagesFor, type Lang, type Messages } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { DocsNav, type DocsNavGroup } from "./docs-nav";
import { SiteFooter, SiteHeader } from "./site-chrome";

/** 55 A documentation section's name in a language. */
export function docSectionName(lang: Lang, section: DocSection): string {
  if (lang === "en") return section;
  const m: Messages["docs"] = messagesFor(lang).docs;
  const names: Record<DocSection, string> = {
    "Getting started": m.sectionGettingStarted,
    "Your content": m.sectionContent,
    "Your app": m.sectionApp,
    Publishing: m.sectionPublishing,
    "Selling and bookings": m.sectionSelling,
    "Account and billing": m.sectionAccount,
    Troubleshooting: m.sectionTroubleshooting,
    "For developers": m.sectionDevelopers,
  };
  return names[section];
}

/**
 * The documentation's menu: every article by section, with the titles as edited in the admin.
 * 55 In a language: its titles and links; `section` keeps the English section (for its icon).
 */
export async function docsNavGroups(lang: Lang = DEFAULT_LANG): Promise<(DocsNavGroup & { section: DocSection })[]> {
  const texts = new Map(await Promise.all(DOCS.map(async (d) => [d.slug, await getSiteContent(d.key, lang)] as const)));
  const m = messagesFor(lang).docs;
  return DOC_SECTIONS.map((section) => ({
    section,
    title: docSectionName(lang, section),
    links: [
      ...DOCS.filter((d) => d.section === section).map((d) => ({
        href: localePath(lang, `/docs/${d.slug}`),
        label: texts.get(d.slug)!.title!,
        description: texts.get(d.slug)!.description,
      })),
      ...(section === "For developers" ? [{ href: localePath(lang, "/developers"), label: m.apiReference, description: m.apiReferenceText }] : []),
    ],
  }));
}

/** The documentation's pages: the site header, the menu with its search, and the page. `current` is the English path. */
export async function DocsShell({ current, children, lang = DEFAULT_LANG }: { current: string; children: ReactNode; lang?: Lang }) {
  const groups = await docsNavGroups(lang);
  const m = messagesFor(lang).docs;
  return (
    <div className="bg-ivory">
      <SiteHeader current={current === "/developers" ? "developers" : "docs"} lang={lang} />
      <main className="mx-auto flex max-w-[1160px] flex-col gap-8 px-4 pt-8 pb-20 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:pt-12">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[260px] lg:flex-none lg:overflow-y-auto lg:pb-6">
          <DocsNav
            groups={groups.map(({ title, links }) => ({ title, links }))}
            current={localePath(lang, current)}
            labels={{ menu: m.menu, browse: m.browse, search: m.search, noMatch: m.noMatch }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}

/** The article card, with the styles Markdown content needs. */
export function DocArticle({ children }: { children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-[20px] [overflow-wrap:anywhere] border border-line bg-white px-5 py-8 text-base leading-[1.7] text-ink-2 sm:p-10 [&_code]:rounded [&_code]:bg-sand [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.92em] [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:text-midnight [&_h3]:mt-2 [&_h3]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-midnight [&_li]:my-1 [&_ol]:m-0 [&_ol:not(.list-none)]:ps-5 [&_p]:m-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] [&_ul]:m-0 [&_ul:not(.list-none)]:ps-5 [&_ul:not(.list-none)]:list-disc [&_ol:not(.list-none)]:list-decimal">
      {children}
    </article>
  );
}
