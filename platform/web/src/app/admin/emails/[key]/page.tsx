import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetEmailTemplateAction } from "@/app/actions/admin-emails";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice, formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_CONTACT } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { contactValues, templateText } from "@/lib/email/send";
import { emailTemplate, GLOBAL_PLACEHOLDERS, sampleValues } from "@/lib/email/templates";
import { localizedDefault } from "@/lib/email/templates-lang";
import { platformSetting } from "@/lib/settings/platform";
import { TemplateForm, TestEmailForm } from "../forms";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

export default async function EditEmailPage({ params, searchParams }: PageProps<"/admin/emails/[key]">) {
  const admin = await requireAdmin();
  const { adminRole } = admin;
  const template = emailTemplate((await params).key);
  if (!template) notFound();
  const { done } = await searchParams;
  const store = await getStore();
  const [text, saved, contact] = await Promise.all([templateText(store, template.key), store.getEmailTemplate(template.key), platformSetting(store, "contact")]);
  const samples = {
    ...sampleValues(template),
    ...contactValues(contact?.value ?? DEFAULT_CONTACT, "en"),
  };
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change emails">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/emails" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Emails
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">{template.name}</h1>
        <span className="text-[15px] text-muted">
          {template.description} {saved ? `Edited ${formatDateTime(saved.updatedAt)} by ${saved.updatedBy}.` : "Using the default text."}
        </span>
        {/* 56 Emails to clients follow the language they chose for the dashboard, until the team edits them. */}
        {localizedDefault(template.key, "ar") ? (
          <span className="text-[15px] text-muted">
            {saved
              ? "Clients who use the dashboard in Arabic or Turkish get this edited English text too. Back to the default sends them Yallapp's Arabic or Turkish text again."
              : "Clients who use the dashboard in Arabic or Turkish get Yallapp's Arabic or Turkish text of this default. Once you edit it, everyone gets your English text."}
          </span>
        ) : null}
      </div>
      {done === "reset" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Back to the default text. The next email uses it.
        </Notice>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <section aria-label="Template" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <TemplateForm key={done === "reset" ? "reset" : "edit"} template={template} subject={text.subject} body={text.body} samples={samples} />
        </section>
        <aside className="flex flex-col gap-4">
          <section aria-labelledby="h-placeholders" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
            <h2 id="h-placeholders" className="m-0 text-base font-bold">
              Placeholders
            </h2>
            <span className="text-[13px] text-muted">Put these in the subject or text; each is replaced when the email is sent. Others can&apos;t be saved.</span>
            <dl className="m-0 flex flex-col gap-2 text-[13px]">
              {[...template.placeholders, ...GLOBAL_PLACEHOLDERS].map((p) => (
                <div key={p.name}>
                  <dt className="font-mono font-semibold">{`{{${p.name}}}`}</dt>
                  <dd className="m-0 text-muted">{p.description}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="h-test" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
            <h2 id="h-test" className="m-0 text-base font-bold">
              Test email
            </h2>
            <span className="text-[13px] text-muted">The saved version, with sample values, to {admin.email}.</span>
            <TestEmailForm templateKey={template.key} />
          </section>
          {saved ? (
            <form action={resetEmailTemplateAction}>
              <input type="hidden" name="key" value={template.key} />
              <SubmitButton variant="secondary" className="h-10 w-full" pendingText="Going back…">
                Back to the default text
              </SubmitButton>
            </form>
          ) : null}
        </aside>
      </div>
    </ReadOnly>
  );
}
