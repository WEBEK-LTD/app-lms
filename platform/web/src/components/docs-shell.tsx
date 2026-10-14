import type { ReactNode } from "react";
import { DOCS, DOC_SECTIONS } from "@/content/docs";
import { getSiteContent } from "@/lib/content/get";
import { DocsNav, type DocsNavGroup } from "./docs-nav";
import { SiteFooter, SiteHeader } from "./site-chrome";

/** The documentation's menu: every article by section, with the titles as edited in the admin. */
export async function docsNavGroups(): Promise<DocsNavGroup[]> {
  const texts = new Map(await Promise.all(DOCS.map(async (d) => [d.slug, await getSiteContent(d.key)] as const)));
  return DOC_SECTIONS.map((section) => ({
    title: section,
    links: [
      ...DOCS.filter((d) => d.section === section).map((d) => ({
        href: `/docs/${d.slug}`,
        label: texts.get(d.slug)!.title!,
        description: texts.get(d.slug)!.description,
      })),
      ...(section === "For developers" ? [{ href: "/developers", label: "API reference", description: "Every endpoint, field and error code" }] : []),
    ],
  }));
}

/** The documentation's pages: the site header, the menu with its search, and the page. */
export async function DocsShell({ current, children }: { current: string; children: ReactNode }) {
  const groups = await docsNavGroups();
  return (
    <div className="bg-ivory">
      <SiteHeader current="docs" />
      <main className="mx-auto flex max-w-[1160px] flex-col gap-8 px-4 pt-8 pb-20 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:pt-12">
        <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[260px] lg:flex-none lg:overflow-y-auto lg:pb-6">
          <DocsNav groups={groups} current={current} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The article card, with the styles Markdown content needs. */
export function DocArticle({ children }: { children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-[20px] [overflow-wrap:anywhere] border border-line bg-white px-5 py-8 text-base leading-[1.7] text-ink-2 sm:p-10 [&_code]:rounded [&_code]:bg-sand [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.92em] [&_h2]:m-0 [&_h2]:text-[22px] [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:text-midnight [&_h3]:mt-2 [&_h3]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-midnight [&_li]:my-1 [&_ol]:m-0 [&_ol:not(.list-none)]:pl-5 [&_p]:m-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] [&_ul]:m-0 [&_ul:not(.list-none)]:pl-5 [&_ul:not(.list-none)]:list-disc [&_ol:not(.list-none)]:list-decimal">
      {children}
    </article>
  );
}
