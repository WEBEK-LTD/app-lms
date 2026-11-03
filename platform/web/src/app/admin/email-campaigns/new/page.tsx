import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TemplatePicker } from "@/components/mailing/template-picker";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { MAIL_TEMPLATES } from "@/lib/mailing/templates";

export const metadata: Metadata = { title: "New email campaign" };
export const dynamic = "force-dynamic";

/** 114 A new campaign starts from a template: a ready-made one (in English), one of the team's own, or a blank email. */
export default async function NewCampaignPage() {
  await requireAdmin("marketing.edit");
  const saved = await (await getStore()).listMailTemplates();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/email-campaigns", label: "Email campaigns" }}
        title="Choose a design"
        description="Every design is in Yallapp's look and changes block by block. The ready-made ones are in English; add Arabic or Turkish versions in the editor (Arabic reads right to left by itself)."
      />
      <TemplatePicker
        ready={MAIL_TEMPLATES.map((t) => ({ id: `ready:${t.id}`, name: t.name, category: t.category, description: t.description, picture: `/email/templates/${t.picture}` }))}
        saved={saved.map((t) => ({ id: `saved:${t.id}`, name: t.name, category: "Your templates", description: `${Object.keys(t.contents).map((l) => l.toUpperCase()).join(" · ")} · saved by ${t.createdBy}`, picture: null }))}
      />
    </>
  );
}
