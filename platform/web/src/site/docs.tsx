import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import reference from "@/content/api-reference.json";
import { DocArticle, DocsShell, docSectionName, docsNavGroups } from "@/components/docs-shell";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { JsonLdScript } from "@/components/json-ld";
import { InlineNodes, MarkdownBlocks } from "@/components/markdown";
import { WhatsAppMark } from "@/components/brand-marks";
import { DOCS, docBySlug, type DocSection } from "@/content/docs";
import type { ApiEndpoint, ApiReference } from "@/lib/api-reference";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { headingId } from "@/lib/content/markdown";
import { parseGuide } from "@/lib/content/site";
import { breadcrumbLd, siteMetadata, siteUrl } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 55 The documentation (index, articles) and the API reference, in any language. */

export async function docsMetadata(lang: Lang): Promise<Metadata> {
  const text = await getSiteContent("docs", lang);
  return siteMetadata(lang, { title: messagesFor(lang).meta.docsTitle, description: text.intro!, path: "/docs" });
}

const SECTION_ICONS: Record<DocSection, IconName> = {
  "Getting started": "explore",
  "Your content": "link",
  "Your app": "smartphone",
  Publishing: "upload",
  "Selling and bookings": "storefront",
  "Account and billing": "account_circle",
  Troubleshooting: "help",
  "For developers": "code",
};

export async function DocsIndexPage({ lang }: { lang: Lang }) {
  const [text, groups, contact] = await Promise.all([getSiteContent("docs", lang), docsNavGroups(lang), getContact()]);
  const m = messagesFor(lang).docs;
  const startHere = [
    { href: "/docs/getting-started", label: m.startWelcome, icon: "explore" },
    { href: "/docs/content-sources", label: m.startSources, icon: "link" },
    { href: "/docs/setup-steps", label: m.startSetup, icon: "list" },
    { href: "/docs/google-play", label: m.startGooglePlay, icon: "android" },
  ] as const;
  return (
    <DocsShell current="/docs" lang={lang}>
      <div className="flex flex-col gap-3">
        {text.eyebrow ? <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{text.eyebrow}</span> : null}
        <h1 className="m-0 text-[32px] leading-[1.1] font-extrabold tracking-[-0.5px] sm:text-[42px]">{text.title}</h1>
        <p className="m-0 max-w-[640px] text-lg leading-relaxed text-ink-4">{text.intro}</p>
      </div>

      <section aria-labelledby="start-here" className="flex flex-col gap-3">
        <h2 id="start-here" className="m-0 text-xl font-bold">
          {m.startHere}
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
          {startHere.map((item) => (
            <li key={item.href}>
              <Link
                href={localePath(lang, item.href)}
                className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-4 font-bold text-midnight no-underline hover:border-midnight hover:text-midnight"
              >
                <Icon name={item.icon} size={24} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {groups.map((group) => (
        <section key={group.section} aria-labelledby={`docs-${group.section}`} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5 sm:p-7">
          <h2 id={`docs-${group.section}`} className="m-0 flex items-center gap-2.5 text-xl font-bold">
            <Icon name={SECTION_ICONS[group.section]} size={24} />
            {group.title}
          </h2>
          <ul className="m-0 grid list-none gap-x-6 gap-y-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
            {group.links.map((link) => (
              <li key={link.href} className="flex flex-col gap-0.5">
                <Link href={link.href} className="font-bold">
                  {link.label}
                </Link>
                {link.description ? <span className="text-[15px] leading-snug text-ink-4">{link.description}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] text-ink-4">
        <WhatsAppMark size={20} />
        {richText(m.cantFind, {
          whatsapp: (chunk) => <a href={contact.whatsappUrl}>{chunk}</a>,
          faq: (chunk) => <Link href={localePath(lang, "/faq")}>{chunk}</Link>,
        })}
      </p>
    </DocsShell>
  );
}

export function docParams(): { slug: string }[] {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function docMetadata(lang: Lang, slug: string): Promise<Metadata> {
  const article = docBySlug(slug);
  if (!article) return {};
  const text = await getSiteContent(article.key, lang);
  return siteMetadata(lang, { title: text.title!, description: text.description!, path: `/docs/${article.slug}`, image: `/docs/${article.slug}/opengraph-image` });
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-peach px-4 py-3.5 text-ink-2">
      <Icon name="info" size={22} className="mt-0.5 text-accent" />
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

export async function DocPage({ lang, slug }: { lang: Lang; slug: string }) {
  const article = docBySlug(slug);
  if (!article) notFound();
  const [text, groups, contact] = await Promise.all([getSiteContent(article.key, lang), docsNavGroups(lang), getContact()]);
  const m = messagesFor(lang).docs;
  const doc = parseGuide(text.body!);
  const here = localePath(lang, `/docs/${article.slug}`);
  const links = groups.flatMap((g) => g.links).filter((l) => l.href.startsWith(localePath(lang, "/docs/")));
  const index = links.findIndex((l) => l.href === here);
  const previous = index > 0 ? links[index - 1] : null;
  const next = index >= 0 && index < links.length - 1 ? links[index + 1] : null;
  const ids = doc.steps.map((step) => headingId(step.title));

  return (
    <DocsShell current={`/docs/${article.slug}`} lang={lang}>
      <JsonLdScript
        data={breadcrumbLd(
          siteUrl(),
          [
            { name: m.docs, path: "/docs" },
            { name: text.title!, path: `/docs/${article.slug}` },
          ],
          lang === "en" ? undefined : lang,
        )}
      />
      <DocArticle>
        <nav aria-label={m.breadcrumb} className="text-sm text-muted">
          <Link href={localePath(lang, "/docs")} className="text-muted">
            {m.docs}
          </Link>{" "}
          › {docSectionName(lang, article.section)}
        </nav>
        <h1 className="m-0 text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-midnight sm:text-4xl">{text.title}</h1>
        <MarkdownBlocks blocks={doc.intro} anchors lang={lang} />

        {doc.steps.length >= 3 ? (
          <nav aria-label={m.onThisPage} className="flex flex-col gap-1.5 rounded-[14px] border border-line-soft px-5 py-4 text-[15px]">
            <span className="text-xs font-bold tracking-[1px] text-muted uppercase">{m.onThisPage}</span>
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
                  <InlineNodes nodes={item} lang={lang} />
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
                  <MarkdownBlocks blocks={step.body} anchors lang={lang} />
                  {step.notice ? (
                    <Notice>
                      <MarkdownBlocks blocks={step.notice} lang={lang} />
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
              <MarkdownBlocks blocks={step.body} anchors lang={lang} />
              {step.notice ? (
                <Notice>
                  <MarkdownBlocks blocks={step.notice} lang={lang} />
                </Notice>
              ) : null}
            </section>
          ))
        )}

        {doc.outro.length ? (
          <div className="flex flex-col gap-3 border-t border-line-soft pt-5">
            <MarkdownBlocks blocks={doc.outro} anchors lang={lang} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5">
          <a href={contact.whatsappUrl} className="flex items-center gap-1.5 font-semibold no-underline">
            <WhatsAppMark size={20} />
            {m.needHelp}
          </a>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            {previous ? (
              <Link href={previous.href} className="flex items-center gap-1 font-semibold no-underline">
                <Icon name="arrow_back" size={20} />
                <span>
                  <span className="sr-only">{m.previous}</span>
                  {previous.label}
                </span>
              </Link>
            ) : null}
            {next ? (
              <Link href={next.href} className="flex items-center gap-1 font-bold no-underline">
                <span>{formatMessage(lang, m.next, { title: next.label })}</span>
                <Icon name="arrow_forward" size={20} />
              </Link>
            ) : null}
          </span>
        </div>
      </DocArticle>
    </DocsShell>
  );
}

// ---------------------------------------------------------------------------
// The API reference: its page around the reference, which stays in English (the OpenAPI file's words).

const API = reference as ApiReference;

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-success-bg text-success",
  POST: "bg-peach text-accent",
  PUT: "bg-tile-3 text-ink-2",
  PATCH: "bg-tile-3 text-ink-2",
  DELETE: "bg-danger-bg text-danger",
};

export async function developersMetadata(lang: Lang): Promise<Metadata> {
  const text = await getSiteContent("developers", lang);
  return siteMetadata(lang, { title: messagesFor(lang).meta.developersTitle, description: text.intro!, path: "/developers" });
}

export async function DevelopersPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("developers", lang);
  const count = API.tags.reduce((n, t) => n + t.endpoints.length, 0);
  const m = messagesFor(lang);
  const d = m.developers;
  const access: Record<ApiEndpoint["access"], string> = { public: d.noSignIn, "signed-in": d.signedIn, optional: d.optional };
  const code = (value: string) => () => <code dir="ltr">{value}</code>;
  return (
    <DocsShell current="/developers" lang={lang}>
      <DocArticle>
        <nav aria-label={m.docs.breadcrumb} className="text-sm text-muted">
          <Link href={localePath(lang, "/docs")} className="text-muted">
            {m.docs.docs}
          </Link>{" "}
          › {d.forDevelopers}
        </nav>
        {text.eyebrow ? <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{text.eyebrow}</span> : null}
        <h1 className="m-0 text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-midnight sm:text-4xl">{text.title}</h1>
        <p>{text.intro}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={localePath(lang, "/docs/my-own-api")}
            className="flex h-11 items-center gap-2 rounded-[10px] bg-midnight px-4 font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
          >
            <Icon name="menu_book" size={20} />
            {d.guide}
          </Link>
          <a
            href="/developers/openapi.yaml"
            download
            className="flex h-11 items-center gap-2 rounded-[10px] border border-line-strong px-4 font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight"
          >
            <Icon name="download" size={20} />
            {d.download}
          </a>
        </div>
        <ul>
          <li>{formatMessage(lang, d.count, { count: String(count), groups: String(API.tags.length), version: API.version })}</li>
          <li>{richText(d.json, { error: code("{ code, message }"), page: code("page"), perPage: code("per_page") })}</li>
          <li>
            {richText(d.auth, {
              header: code("Authorization: Bearer"),
              link: (chunk) => <Link href={lang === "en" ? "/docs/my-own-api#the-sign-in-flow-simply" : localePath(lang, "/docs/my-own-api")}>{chunk}</Link>,
            })}
          </li>
        </ul>
        {lang !== "en" ? <p className="!m-0 rounded-xl bg-sand px-4 py-3 text-[15px]">{d.englishNote}</p> : null}

        <div lang="en" dir="ltr" className="flex min-w-0 flex-col gap-4">
          <nav aria-label={lang === "en" ? "Endpoint groups" : d.groups} className="flex flex-wrap gap-2">
            {API.tags.map((tag) => (
              <a key={tag.name} href={`#${headingId(tag.name)}`} className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-midnight no-underline hover:border-midnight">
                {tag.name}
              </a>
            ))}
          </nav>

          {API.tags.map((tag) => (
            <section key={tag.name} aria-labelledby={headingId(tag.name)} className="flex min-w-0 flex-col gap-3 pt-3">
              <h2 id={headingId(tag.name)} className="scroll-mt-6">
                {tag.name}
              </h2>
              {tag.description ? <p className="text-ink-4">{tag.description}</p> : null}
              <ul className="!m-0 flex list-none flex-col !p-0">
                {tag.endpoints.map((e) => (
                  <li key={`${e.method} ${e.path}`} className="!my-0 flex flex-col gap-1 border-t border-line-soft py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${METHOD_STYLE[e.method] ?? "bg-sand"}`}>{e.method}</span>
                      <code className="!bg-transparent !p-0 font-mono text-[14px] font-semibold break-all text-midnight">{e.path}</code>
                      <span lang={lang} className="text-xs font-semibold text-muted">
                        {access[e.access]}
                      </span>
                    </span>
                    <span className="font-semibold text-midnight">{e.summary}</span>
                    {e.description ? <span className="text-[15px] leading-relaxed whitespace-pre-line text-ink-4">{e.description}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DocArticle>
    </DocsShell>
  );
}
