import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocLayout, DocTitle, type DocNavGroup } from "@/components/doc-layout";
import { Icon } from "@/components/icon";
import { InlineNodes, MarkdownBlocks } from "@/components/markdown";
import { GUIDES, GUIDE_SECTIONS } from "@/content/guides";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { parseGuide } from "@/lib/content/site";

// Unknown guides get notFound() below. (dynamicParams = false would 404 every guide once
// the contact details change and the pages are rebuilt.)

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug);

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const text = await getSiteContent(`guide-${guide.slug}`);
  return { title: text.title, description: text.description };
}

/** The guides menu, with the titles as edited in the admin. */
async function guidesNav(): Promise<DocNavGroup[]> {
  const titles = new Map(await Promise.all(GUIDES.map(async (g) => [g.slug, (await getSiteContent(`guide-${g.slug}`)).title!] as const)));
  return GUIDE_SECTIONS.map((section) => ({
    title: section.toUpperCase(),
    label: `${section} guides`,
    links: GUIDES.filter((guide) => guide.section === section).map((guide) => ({ href: `/guides/${guide.slug}`, label: titles.get(guide.slug)! })),
  }));
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const contact = await getContact();
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  const [text, nav] = await Promise.all([getSiteContent(`guide-${guide.slug}`), guidesNav()]);
  const doc = parseGuide(text.body!);
  const next = GUIDES[GUIDES.indexOf(guide) + 1];
  const nextTitle = next ? nav.flatMap((g) => g.links).find((l) => l.href === `/guides/${next.slug}`)?.label : null;

  return (
    <DocLayout groups={nav} current={`/guides/${guide.slug}`} site="guides">
      <div className="flex flex-col gap-5">
        <span className="text-sm text-muted">Guides › {guide.section}</span>
        <DocTitle>{text.title}</DocTitle>
        <MarkdownBlocks blocks={doc.intro} />

        {doc.before ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-sand px-5 py-[18px]">
            <span className="font-bold text-midnight">{doc.before.title}</span>
            <ul>
              {doc.before.items.map((item, i) => (
                <li key={i}>
                  <InlineNodes nodes={item} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ol className="m-0 flex list-none flex-col gap-[26px] p-0">
          {doc.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-midnight font-extrabold text-white">{i + 1}</span>
              <div className="flex min-w-0 flex-col gap-2.5">
                <h2 className="!mt-0 text-xl font-bold text-midnight">{step.title}</h2>
                <MarkdownBlocks blocks={step.body} />
                {step.notice ? (
                  <div className="flex gap-2.5 rounded-xl bg-peach px-4 py-3.5 text-ink-2">
                    <Icon name="info" size={22} className="text-accent" />
                    <div className="flex min-w-0 flex-col gap-2">
                      <MarkdownBlocks blocks={step.notice} />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <MarkdownBlocks blocks={doc.outro} />

        <div className="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-5">
          <a href={contact.whatsappUrl} className="flex items-center gap-1.5 font-semibold no-underline">
            <Icon name="chat" size={20} />
            Need help? Message us
          </a>
          {next ? (
            <Link href={`/guides/${next.slug}`} className="flex items-center gap-1 font-bold no-underline">
              Next: {nextTitle}
              <Icon name="arrow_forward" size={20} />
            </Link>
          ) : null}
        </div>
      </div>
    </DocLayout>
  );
}
