import type { Metadata } from "next";
import Link from "next/link";
import { Badge, formatDateTime } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { CONTENT_PAGES, type ContentGroup } from "@/lib/content/site";
import { getStore } from "@/lib/data";
import { LANG_INFO, PREFIXED_LANGS } from "@/i18n/config";

export const metadata: Metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

const GROUPS: ContentGroup[] = ["Home page", "Pages", "Guides", "Legal pages"];

/** yallapp.com.tr's texts the team can change without a new deploy. */
export default async function ContentPage() {
  await requireAdmin();
  const saved = new Map((await (await getStore()).listSiteContent()).map((r) => [r.key, r]));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Website content</h1>
        <span className="text-[15px] text-muted">
          The texts of yallapp.com.tr. A saved change shows on the website at once; pages you haven&apos;t changed show the default text. Each page has an
          English, an Arabic and a Turkish version: open a page and pick the language.
        </span>
      </div>
      {GROUPS.map((group) => (
        <section key={group} aria-labelledby={`h-${group}`} className="overflow-x-auto rounded-2xl border border-line bg-white">
          <h2 id={`h-${group}`} className="m-0 border-b border-line-soft px-4 py-3 text-base font-bold">
            {group}
          </h2>
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <tbody>
              {CONTENT_PAGES.filter((p) => p.group === group).map((page) => {
                const edit = saved.get(page.key);
                return (
                  <tr key={page.key} className="border-t border-line-soft first:border-t-0">
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      <Link href={`/admin/content/${page.key}`}>{page.title}</Link>
                    </th>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted">{page.path}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {edit ? <Badge tone="info">Edited</Badge> : <Badge tone="neutral">Default</Badge>}
                        {/* 55 The Arabic and Turkish versions the team edited. */}
                        {PREFIXED_LANGS.filter((lang) => saved.has(`${page.key}@${lang}`)).map((lang) => (
                          <Badge key={lang} tone="info">{`${LANG_INFO[lang].name} edited`}</Badge>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{edit ? `${formatDateTime(edit.updatedAt)} by ${edit.updatedBy}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
