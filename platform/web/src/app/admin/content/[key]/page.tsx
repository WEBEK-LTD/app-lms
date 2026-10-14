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
import { getStore } from "@/lib/data";
import { ContentForm } from "../forms";

export const metadata: Metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

export default async function EditContentPage({ params, searchParams }: PageProps<"/admin/content/[key]">) {
  const { adminRole } = await requireAdmin();
  const page = contentPage((await params).key);
  if (!page) notFound();
  const { done } = await searchParams;
  const [saved, contact] = await Promise.all([(await getStore()).getSiteContent(page.key), getContact()]);
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change the website's texts">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/content" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Website content
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">{page.title}</h1>
        <span className="text-[15px] text-muted">
          {saved ? `Edited ${formatDateTime(saved.updatedAt)} by ${saved.updatedBy}.` : "Showing the default text."} Saving publishes the change on{" "}
          <span className="font-mono text-[13px]">{page.path}</span> at once.
        </span>
      </div>
      {done === "reset" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Back to the default text. The website shows it now.
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <a href={page.path} target="_blank" rel="noreferrer" className={`${btn.secondary} h-10`}>
          <Icon name="open_in_new" size={18} />
          Preview on the website
        </a>
        {saved ? (
          <form action={resetSiteContentAction}>
            <input type="hidden" name="key" value={page.key} />
            <SubmitButton variant="secondary" className="h-10" pendingText="Going back…">
              Back to the default text
            </SubmitButton>
          </form>
        ) : null}
      </div>
      <section aria-label="Texts" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ContentForm
          // Going back to the default text starts the form again from it.
          key={done === "reset" ? "reset" : "edit"}
          pageKey={page.key}
          fields={page.fields}
          values={contentWith(page, saved?.fields)}
          previewValues={{ contact_email: contact.email, contact_whatsapp: contact.whatsappDisplay, contact_whatsapp_url: contact.whatsappUrl }}
        />
      </section>
    </ReadOnly>
  );
}
