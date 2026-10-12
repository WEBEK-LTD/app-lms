import type { Metadata } from "next";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { appUrl, blobsMode, buildPipelineToken, dataMode, smtpConfig, superAdminEmails } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <span className="w-[200px] flex-none text-sm font-semibold">{label}</span>
      <Badge tone={ok ? "success" : "warn"}>{ok ? "OK" : "Check"}</Badge>
      <span className="min-w-0 flex-1 text-sm break-all text-muted">{value}</span>
    </div>
  );
}

/** Read-only view of the server configuration. Secrets are never shown, only whether they're set. */
export default async function SettingsPage() {
  await requireAdmin();
  const smtp = smtpConfig();
  const data = dataMode();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Settings</h1>
        <span className="text-[15px] text-muted">These come from the Netlify environment variables. Change them in Netlify and redeploy.</span>
      </div>
      <section className="rounded-2xl border border-line bg-white px-5 py-2 sm:px-6">
        <Row label="Site address" ok={appUrl().startsWith("https://")} value={appUrl()} />
        <Row label="Database" ok={data === "mysql"} value={data === "mysql" ? "MySQL over TLS" : "In memory (development only)"} />
        <Row label="File storage" ok={blobsMode() === "netlify"} value={blobsMode() === "netlify" ? "Netlify Blobs" : "Local folder (development only)"} />
        <Row label="Email (SMTP)" ok={Boolean(smtp)} value={smtp ? `${smtp.host}:${smtp.port} as ${smtp.from}` : "Not configured: emails are not sent"} />
        <Row label="Build pipeline token" ok={Boolean(buildPipelineToken())} value={buildPipelineToken() ? "Set" : "Not set: the pipeline API refuses every request"} />
        <Row label="Super admins" ok={superAdminEmails().length > 0} value={superAdminEmails().join(", ")} />
      </section>
    </>
  );
}
