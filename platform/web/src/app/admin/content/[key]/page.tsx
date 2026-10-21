import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetSiteContentAction } from "@/app/actions/admin-content";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice, btn, formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import { contentPage, contentWith } from "@/lib/content/site";
import { langContentKey, translatedDefaults } from "@/lib/content/site-lang";
import { getStore } from "@/lib/data";
import { isPrefixedLang, LANG_INFO, LANGS } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { ContentForm } from "../forms";

export const metadata: Metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

export default async function EditContentPage({ params, searchParams }: PageProps<"/admin/content/[key]">) {
  const { adminRole } = await requireAdmin();
  const page = contentPage((await params).key);
  if (!page) notFound();
  const query = await searchParams;
  const { done } = query;
  // 55 The English texts, or their Arabic or Turkish version.
  const lang = isPrefixedLang(query.lang) ? query.lang : null;
  const store = await getStore();
  const [english, saved, contact] = await Promise.all([store.getSiteContent(page.key), lang ? store.getSiteContent(langContentKey(page.key, lang)) : null, getContact()]);
  const edit = lang ? saved : english;
  const englishTexts = contentWith(page, english?.fields);
  // A translation's form starts from the team's edit in that language, else the built-in translation; empty fields show the English.
  const values = lang ? { ...translatedDefaults(page, lang), ...(saved?.fields ?? {}) } : englishTexts;
  const path = localePath(lang ?? "en", page.path);
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change the website's texts">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/content" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Website content
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">{page.title}</h1>
        <span className="text-[15px] text-muted">
          {edit ? `Edited ${formatDateTime(edit.updatedAt)} by ${edit.updatedBy}.` : lang ? "Showing the built-in translation." : "Showing the default text."} Saving publishes the change on{" "}
          <span className="font-mono text-[13px]">{path}</span> at once.
        </span>
      </div>
      {/* 55 One tab per language of the website. */}
      <nav aria-label="Languages" className="flex flex-wrap gap-2">
        {LANGS.map((l) => {
          const here = (lang ?? "en") === l;
          return (
            <Link
              key={l}
              href={`/admin/content/${page.key}${l === "en" ? "" : `?lang=${l}`}`}
              aria-current={here ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold no-underline ${here ? "border-midnight bg-midnight text-white hover:text-white" : "border-line bg-white text-midnight hover:border-midnight"}`}
            >
              {LANG_INFO[l].name}
            </Link>
          );
        })}
      </nav>
      {lang ? (
        <Notice tone="info" icon="language">
          The {LANG_INFO[lang].name} version of this page, at <span className="font-mono text-[13px]">{path}</span>. A field you leave empty shows the built-in
          translation, or the English text where there is none. The English is shown in each empty field.
        </Notice>
      ) : null}
      {done === "reset" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Back to the default text. The website shows it now.
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <a href={path} target="_blank" rel="noreferrer" className={`${btn.secondary} h-10`}>
          <Icon name="open_in_new" size={18} />
          Preview on the website
        </a>
        {edit ? (
          <form action={resetSiteContentAction}>
            <input type="hidden" name="key" value={page.key} />
            {lang ? <input type="hidden" name="lang" value={lang} /> : null}
            <SubmitButton variant="secondary" className="h-10" pendingText="Going back…">
              Back to the default text
            </SubmitButton>
          </form>
        ) : null}
      </div>
      <section aria-label="Texts" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ContentForm
          // Going back to the default text, or another language, starts the form again.
          key={`${lang ?? "en"}-${done === "reset" ? "reset" : "edit"}`}
          pageKey={page.key}
          fields={page.fields}
          values={values}
          lang={lang ?? undefined}
          placeholders={lang ? englishTexts : {}}
          previewValues={{
            contact_email: contact.email,
            contact_whatsapp: contact.lines.international.display,
            contact_whatsapp_url: contact.lines.international.url,
            contact_whatsapp_egypt: contact.lines.egypt.display,
            contact_whatsapp_egypt_url: contact.lines.egypt.url,
          }}
        />
      </section>
    </ReadOnly>
  );
}
