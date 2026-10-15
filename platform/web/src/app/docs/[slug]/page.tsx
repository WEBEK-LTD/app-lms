import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DocArticle, DocsShell, docsNavGroups } from "@/components/docs-shell";
import { Icon } from "@/components/icon";
import { InlineNodes, MarkdownBlocks } from "@/components/markdown";
import { DOCS, docBySlug } from "@/content/docs";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { headingId } from "@/lib/content/markdown";
import { parseGuide } from "@/lib/content/site";
import { breadcrumbLd, pageMetadata, siteUrl } from "@/lib/seo";
import { JsonLdScript } from "@/components/json-ld";

// Unknown articles get notFound() below. (dynamicParams = false would 404 every article once
// the contact details change and the pages are rebuilt.)

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const article = docBySlug((await params).slug);
  if (!article) return {};
  const text = await getSiteContent(article.key);
  return pageMetadata({ title: text.title!, description: text.description!, path: `/docs/${article.slug}`, image: `/docs/${article.slug}/opengraph-image` });
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-peach px-4 py-3.5 text-ink-2">
      <Icon name="info" size={22} className="mt-0.5 text-accent" />
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const article = docBySlug(slug);
  if (!article) notFound();
  const [text, groups, contact] = await Promise.all([getSiteContent(article.key), docsNavGroups(), getContact()]);
  const doc = parseGuide(text.body!);
  const links = groups.flatMap((g) => g.links).filter((l) => l.href.startsWith("/docs/"));
  const index = links.findIndex((l) => l.href === `/docs/${article.slug}`);
  const previous = index > 0 ? links[index - 1] : null;
  const next = index >= 0 && index < links.length - 1 ? links[index + 1] : null;
  const ids = doc.steps.map((step) => headingId(step.title));

  return (
    <DocsShell current={`/docs/${article.slug}`}>
      <JsonLdScript
        data={breadcrumbLd(siteUrl(), [
          { name: "Docs", path: "/docs" },
          { name: text.title!, path: `/docs/${article.slug}` },
        ])}
      />
      <DocArticle>
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/docs" className="text-muted">
            Docs
          </Link>{" "}
          › {article.section}
        </nav>
        <h1 className="m-0 text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-midnight sm:text-4xl">{text.title}</h1>
        <MarkdownBlocks blocks={doc.intro} anchors />

        {doc.steps.length >= 3 ? (
          <nav aria-label="On this page" className="flex flex-col gap-1.5 rounded-[14px] border border-line-soft px-5 py-4 text-[15px]">
            <span className="text-xs font-bold tracking-[1px] text-muted uppercase">On this page</span>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {doc.steps.map((step, i) => (
                <li key={i}>
                  <a href={`#${ids[i]}`}>{step.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

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

        {article.steps ? (
          <ol className="m-0 flex list-none flex-col gap-[26px] p-0">
            {doc.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-midnight font-extrabold text-white">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <h2 id={ids[i]} className="scroll-mt-6 pt-0.5">
                    {step.title}
                  </h2>
                  <MarkdownBlocks blocks={step.body} anchors />
                  {step.notice ? (
                    <Notice>
                      <MarkdownBlocks blocks={step.notice} />
                    </Notice>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          doc.steps.map((step, i) => (
            <section key={i} aria-labelledby={ids[i]} className="flex min-w-0 flex-col gap-3 pt-2">
              <h2 id={ids[i]} className="scroll-mt-6">
                {step.title}
              </h2>
              <MarkdownBlocks blocks={step.body} anchors />
              {step.notice ? (
                <Notice>
                  <MarkdownBlocks blocks={step.notice} />
                </Notice>
              ) : null}
            </section>
          ))
        )}

        {doc.outro.length ? (
          <div className="flex flex-col gap-3 border-t border-line-soft pt-5">
            <MarkdownBlocks blocks={doc.outro} anchors />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5">
          <a href={contact.whatsappUrl} className="flex items-center gap-1.5 font-semibold no-underline">
            <Icon name="chat" size={20} />
            Need help? Message us
          </a>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            {previous ? (
              <Link href={previous.href} className="flex items-center gap-1 font-semibold no-underline">
                <Icon name="arrow_back" size={20} />
                <span>
                  <span className="sr-only">Previous: </span>
                  {previous.label}
                </span>
              </Link>
            ) : null}
            {next ? (
              <Link href={next.href} className="flex items-center gap-1 font-bold no-underline">
                <span>Next: {next.label}</span>
                <Icon name="arrow_forward" size={20} />
              </Link>
            ) : null}
          </span>
        </div>
      </DocArticle>
    </DocsShell>
  );
}
