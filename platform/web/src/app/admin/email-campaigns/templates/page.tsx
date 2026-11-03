import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { DeleteButton } from "@/components/mailing/list-actions";
import { PageHeader, btn, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { MAIL_TEMPLATES } from "@/lib/mailing/templates";
import { MailTabs } from "../shared";

export const metadata: Metadata = { title: "Email templates" };
export const dynamic = "force-dynamic";

/** 114 The ready-made designs (English) and the team's own saved ones. */
export default async function TemplatesPage() {
  const admin = await requireAdmin();
  const saved = await (await getStore()).listMailTemplates();
  const editable = can(admin.adminRole, "marketing.edit");
  return (
    <>
      <PageHeader
        title="Templates"
        description="Ready-made designs in Yallapp's look, and the designs your team saved from the builder (Save as template)."
        actions={
          editable ? (
            <Link href="/admin/email-campaigns/new" className={`${btn.main} h-11`}>
              <Icon name="add" size={20} />
              New campaign
            </Link>
          ) : null
        }
      />
      <MailTabs current="/admin/email-campaigns/templates" />
      <section aria-labelledby="h-saved" className="flex flex-col gap-3">
        <h2 id="h-saved" className="m-0 text-[18px] font-extrabold">
          Your templates
        </h2>
        {saved.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed border-line-strong bg-white p-5 text-[14px] text-muted">None yet. In the builder, “Save as template” keeps a design here for later campaigns.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-white p-0">
            {saved.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3.5 first:border-t-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-ink-3">
                  <Icon name="bookmark" size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="text-midnight">{t.name}</b>
                  <span className="text-[13px] text-muted">
                    {Object.keys(t.contents).map((l) => l.toUpperCase()).join(" · ")} · {t.createdBy} · {formatDateTime(t.updatedAt)}
                  </span>
                </span>
                <a href={`/admin/email-campaigns/templates/preview/${encodeURIComponent(`saved:${t.id}`)}`} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} h-9 text-[13px]`}>
                  <Icon name="visibility" size={17} />
                  Preview
                </a>
                {editable ? <DeleteButton kind="template" id={t.id} name={t.name} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-ready" className="flex flex-col gap-3">
        <h2 id="h-ready" className="m-0 text-[18px] font-extrabold">
          Ready-made ({MAIL_TEMPLATES.length})
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))" }}>
          {MAIL_TEMPLATES.map((t) => (
            <li key={t.id} className="overflow-hidden rounded-[18px] border border-line bg-white">
              <a href={`/admin/email-campaigns/templates/preview/${encodeURIComponent(`ready:${t.id}`)}`} target="_blank" rel="noopener noreferrer" className="block text-midnight no-underline hover:text-midnight">
                {/* eslint-disable-next-line @next/next/no-img-element -- The template's own static picture. */}
                <img src={`/email/templates/${t.picture}`} alt="" className="aspect-[15/7] w-full object-cover" />
                <span className="flex flex-col gap-1 px-4 pt-3 pb-4">
                  <span className="text-[12px] font-bold tracking-wide text-accent uppercase">{t.category}</span>
                  <b className="text-[16px]">{t.name}</b>
                  <span className="text-[13px] leading-relaxed text-ink-4">{t.description}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
