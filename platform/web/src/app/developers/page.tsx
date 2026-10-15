import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import reference from "@/content/api-reference.json";
import { DocArticle, DocsShell } from "@/components/docs-shell";
import { Icon } from "@/components/icon";
import type { ApiEndpoint, ApiReference } from "@/lib/api-reference";
import { getSiteContent } from "@/lib/content/get";
import { headingId } from "@/lib/content/markdown";

export async function generateMetadata(): Promise<Metadata> {
  const text = await getSiteContent("developers");
  return pageMetadata({ title: "API reference", description: text.intro!, path: "/developers" });
}

const API = reference as ApiReference;

const ACCESS: Record<ApiEndpoint["access"], string> = {
  public: "No sign-in",
  "signed-in": "Signed in",
  optional: "Sign-in optional",
};

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-success-bg text-success",
  POST: "bg-peach text-accent",
  PUT: "bg-tile-3 text-ink-2",
  PATCH: "bg-tile-3 text-ink-2",
  DELETE: "bg-danger-bg text-danger",
};

export default async function DevelopersPage() {
  const text = await getSiteContent("developers");
  const count = API.tags.reduce((n, t) => n + t.endpoints.length, 0);
  return (
    <DocsShell current="/developers">
      <DocArticle>
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/docs" className="text-muted">
            Docs
          </Link>{" "}
          › For developers
        </nav>
        {text.eyebrow ? <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">{text.eyebrow}</span> : null}
        <h1 className="m-0 text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] text-midnight sm:text-4xl">{text.title}</h1>
        <p>{text.intro}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/my-own-api"
            className="flex h-11 items-center gap-2 rounded-[10px] bg-midnight px-4 font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
          >
            <Icon name="menu_book" size={20} />
            Step-by-step guide
          </Link>
          <a
            href="/developers/openapi.yaml"
            download
            className="flex h-11 items-center gap-2 rounded-[10px] border border-line-strong px-4 font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight"
          >
            <Icon name="download" size={20} />
            Download openapi.yaml
          </a>
        </div>
        <ul>
          <li>
            {count} endpoints in {API.tags.length} groups, version {API.version}. The file is OpenAPI 3.1: open it in any OpenAPI viewer for every field and error code.
          </li>
          <li>
            JSON everywhere, dates in ISO 8601 UTC, errors as <code>{"{ code, message }"}</code>, lists paged with <code>page</code> and <code>per_page</code>.
          </li>
          <li>
            Signed-in calls send <code>Authorization: Bearer</code> with the access token. See{" "}
            <Link href="/docs/my-own-api#the-sign-in-flow-simply">the sign-in flow</Link>.
          </li>
        </ul>

        <nav aria-label="Endpoint groups" className="flex flex-wrap gap-2">
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
                    <span className="text-xs font-semibold text-muted">{ACCESS[e.access]}</span>
                  </span>
                  <span className="font-semibold text-midnight">{e.summary}</span>
                  {e.description ? <span className="text-[15px] leading-relaxed whitespace-pre-line text-ink-4">{e.description}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </DocArticle>
    </DocsShell>
  );
}
