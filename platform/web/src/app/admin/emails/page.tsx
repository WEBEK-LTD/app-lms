import type { Metadata } from "next";
import Link from "next/link";
import { Badge, formatDateTime } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

/** Every email the platform sends, with the team's edits. */
export default async function EmailsPage() {
  await requireAdmin();
  const saved = new Map((await (await getStore()).listEmailTemplates()).map((t) => [t.key, t]));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Emails</h1>
        <span className="text-[15px] text-muted">
          What the platform sends to clients and to the team. A saved change applies to the next email; emails you haven&apos;t changed use the
          default text.
        </span>
      </div>
      <section aria-label="Emails" className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-sand text-left text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 font-semibold">When</th>
              <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
              <th scope="col" className="px-4 py-3 font-semibold">Text</th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_TEMPLATES.map((template) => {
              const edit = saved.get(template.key);
              return (
                <tr key={template.key} className="border-t border-line-soft align-top">
                  <th scope="row" className="px-4 py-3 text-left font-semibold">
                    <Link href={`/admin/emails/${template.key}`}>{template.name}</Link>
                  </th>
                  <td className="px-4 py-3 text-muted">{template.description}</td>
                  <td className="px-4 py-3">{edit?.subject ?? template.subject}</td>
                  <td className="px-4 py-3">
                    {edit ? (
                      <span className="flex flex-col items-start gap-1">
                        <Badge tone="info">Edited</Badge>
                        <span className="text-xs text-muted">
                          {formatDateTime(edit.updatedAt)} by {edit.updatedBy}
                        </span>
                      </span>
                    ) : (
                      <Badge tone="neutral">Default</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
