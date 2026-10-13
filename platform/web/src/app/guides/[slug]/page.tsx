import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocLayout, DocTitle, type DocNavGroup } from "@/components/doc-layout";
import { Icon } from "@/components/icon";
import { GUIDES, GUIDE_SECTIONS, guideBySlug } from "@/content/guides";
import { getContact } from "@/lib/contact";

// Unknown guides get notFound() below. (dynamicParams = false would 404 every guide once
// the contact details change and the pages are rebuilt.)

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  return guide ? { title: guide.title, description: guide.description } : {};
}

const NAV: DocNavGroup[] = GUIDE_SECTIONS.map((section) => ({
  title: section.toUpperCase(),
  label: `${section} guides`,
  links: GUIDES.filter((guide) => guide.section === section).map((guide) => ({ href: `/guides/${guide.slug}`, label: guide.title })),
}));

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const contact = await getContact();
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  const index = GUIDES.indexOf(guide);
  const next = GUIDES[index + 1];

  return (
    <DocLayout groups={NAV} current={`/guides/${guide.slug}`} site="guides">
      <div className="flex flex-col gap-5">
        <span className="text-sm text-muted">Guides › {guide.section}</span>
        <DocTitle>{guide.title}</DocTitle>
        {guide.intro}

        {guide.before ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-sand px-5 py-[18px]">
            <span className="font-bold text-midnight">Before you start</span>
            <ul>
              {guide.before.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ol className="m-0 flex list-none flex-col gap-[26px] p-0">
          {guide.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-midnight font-extrabold text-white">{i + 1}</span>
              <div className="flex min-w-0 flex-col gap-2.5">
                <h2 className="!mt-0 text-xl font-bold text-midnight">{step.title}</h2>
                {step.body}
                {step.notice ? (
                  <div className="flex gap-2.5 rounded-xl bg-peach px-4 py-3.5 text-ink-2">
                    <Icon name="info" size={22} className="text-accent" />
                    {step.notice}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {guide.outro}

        <div className="flex flex-wrap justify-between gap-3 border-t border-line-soft pt-5">
          <a href={contact.whatsappUrl} className="flex items-center gap-1.5 font-semibold no-underline">
            <Icon name="chat" size={20} />
            Need help? Message us
          </a>
          {next ? (
            <Link href={`/guides/${next.slug}`} className="flex items-center gap-1 font-bold no-underline">
              Next: {next.title}
              <Icon name="arrow_forward" size={20} />
            </Link>
          ) : null}
        </div>
      </div>
    </DocLayout>
  );
}
