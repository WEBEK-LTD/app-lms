import type { Metadata } from "next";
import { formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { platformSettings } from "@/lib/settings/platform";
import { InvoiceSettingForm } from "../invoice-form";
import { Section } from "../parts";

export const metadata: Metadata = { title: "Invoices · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Invoices (71): what Yallapp's receipts say under its name. */
export default async function InvoiceSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const invoice = settings.get("invoice") as PlatformSetting<"invoice"> | undefined;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-invoice"
        title="Invoices"
        text="The receipts of plans and storage packs (a PDF in the payment email and in the dashboard) show Yallapp's name, Cairo, Egypt, the website and the contact details. Add the company's legal details here when they should appear too."
      >
        {invoice ? (
          <p className="m-0 text-sm text-muted">
            Set here by {invoice.updatedBy}, {formatDateTime(invoice.updatedAt)}.
          </p>
        ) : (
          <p className="m-0 text-sm text-muted">Now: no lines.</p>
        )}
        <InvoiceSettingForm lines={invoice?.value.lines ?? []} />
      </Section>
    </ReadOnly>
  );
}
