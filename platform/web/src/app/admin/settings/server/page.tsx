import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { CheckMediaForm } from "../forms";
import { serverRows } from "../summary";
import { Row, Section } from "../parts";

export const metadata: Metadata = { title: "Server · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Server: what comes from the Netlify variables (read-only), and the media server check. */
export default async function ServerSettingsPage() {
  const { adminRole } = await requireAdmin();
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section id="h-server" title="Server" text="These come from the Netlify environment variables. Change them in Netlify and redeploy.">
        <div className="flex flex-col">
          {serverRows().map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </div>
        <CheckMediaForm />
      </Section>
    </ReadOnly>
  );
}
