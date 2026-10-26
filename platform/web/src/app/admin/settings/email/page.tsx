import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { smtpConfig } from "@/lib/env";
import { platformSettings } from "@/lib/settings/platform";
import { SmtpMissingNotice } from "../../smtp-notice";
import { SmtpSettingForm, TestEmailForm } from "../forms";
import { Section, Source } from "../parts";

export const metadata: Metadata = { title: "Email · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Email: the SMTP server, and a test email. */
export default async function EmailSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const smtp = settings.get("smtp") as PlatformSetting<"smtp"> | undefined;
  const envSmtp = smtpConfig();
  return (
    <>
      {/* 19 Without SMTP, production drops every email with only a server log line. */}
      {smtp || envSmtp ? null : <SmtpMissingNotice what="Emails to the team (new publishing and set-up requests, build problems) aren't sent" settingsLink={false} />}
      <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
        <Section id="h-email" title="Email" text="Password links, activations, build results and new-order emails go out through this server.">
          <Source
            setting={smtp}
            settingKey="smtp"
            fallback={envSmtp ? `Netlify variables (${envSmtp.host}:${envSmtp.port} as ${envSmtp.from})` : "Not set: emails are not sent"}
          />
          <SmtpSettingForm
            current={{
              host: smtp?.value.host ?? "",
              port: smtp ? String(smtp.value.port) : "",
              secure: smtp?.value.secure ?? true,
              user: smtp?.value.user ?? "",
              from: smtp?.value.from ?? "",
              hasPassword: Boolean(smtp?.value.passEncrypted),
            }}
          />
          <TestEmailForm />
        </Section>
      </ReadOnly>
    </>
  );
}
