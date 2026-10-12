import type { Metadata } from "next";
import Link from "next/link";
import { releaseSiteAction } from "@/app/actions/dashboard";
import { WHATSAPP_URL } from "@/components/brand";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, btn, formatDate, formatDateTime } from "@/components/ui";
import { revealLicenseKey } from "@/lib/admin/clients";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { latestRelease } from "@/lib/license/service";
import { ACCOUNT_STATE_LABEL } from "@/lib/license/status";
import { planName } from "@/lib/plans";

export const metadata: Metadata = { title: "License & plugin" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <dt className="w-[150px] flex-none text-sm text-muted">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[15px] font-semibold break-words">{children}</dd>
    </div>
  );
}

export default async function LicensePage({ searchParams }: PageProps<"/dashboard/license">) {
  const { license, state } = await requireClient();
  const { released } = await searchParams;
  const store = await getStore();
  const activation = license ? await store.getActivation(license.id) : null;
  const release = latestRelease(await store.listReleases());
  const key = license ? revealLicenseKey(license, encryptionKey()) : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">License &amp; plugin</h1>
        <span className="text-[15px] text-muted">Your license connects the Yallapp plugin on your website to your plan.</span>
      </div>

      {released ? (
        <Notice tone="success" icon="check_circle" role="status">
          The license is released. Activate it in the plugin on your new website.
        </Notice>
      ) : null}
      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan ended on {formatDate(license?.expiresAt)}. The plugin reports the license as expired, and your apps stop loading content. <a href={WHATSAPP_URL}>Message us on WhatsApp</a> to renew.
        </Notice>
      ) : null}

      <section aria-labelledby="h-license" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-license" className="m-0 text-[19px] font-bold">
            License
          </h2>
          <Badge tone={state === "active" ? "success" : state === "expired" ? "danger" : "warn"}>{ACCOUNT_STATE_LABEL[state]}</Badge>
        </div>
        {key ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ivory px-4 py-3">
            <code className="min-w-0 flex-1 font-mono text-lg font-bold tracking-wider break-all" aria-label="License key">
              {key}
            </code>
            <CopyButton value={key} label="Copy key" />
          </div>
        ) : null}
        <dl className="m-0">
          <Row label="Plan">{planName(license?.plan)}</Row>
          <Row label="Active until">{formatDate(license?.expiresAt)}</Row>
          <Row label="Activated on">
            {activation ? (
              <span className="flex flex-col gap-0.5">
                <span>{activation.siteUrl}</span>
                <span className="text-[13px] font-normal text-muted">
                  Plugin {activation.pluginVersion} · last check {formatDateTime(activation.lastCheckedAt)}
                </span>
              </span>
            ) : (
              <span className="font-normal text-muted">Not activated on a website yet</span>
            )}
          </Row>
        </dl>
        {activation ? (
          <form action={releaseSiteAction} className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <SubmitButton variant="secondary" className="h-10" pendingText="Releasing…">
              <Icon name="link_off" size={18} />
              Release from this website
            </SubmitButton>
            <span className="text-[13px] text-muted">Do this when you move to a new domain. The plugin on the old site stops working.</span>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="h-plugin" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-plugin" className="m-0 text-[19px] font-bold">
          WordPress plugin
        </h2>
        {release ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">Yallapp plugin {release.version}</span>
              <span className="text-[13px] text-muted">
                Requires WordPress {release.requiresWp} and PHP {release.requiresPhp} · released {formatDate(release.createdAt)}
              </span>
            </div>
            {state === "active" ? (
              <a href="/api/dashboard/plugin" className={`${btn.primary} h-11`}>
                <Icon name="download" size={20} />
                Download plugin
              </a>
            ) : (
              <span className="text-sm text-muted">Downloads need an active plan.</span>
            )}
          </div>
        ) : (
          <p className="m-0 text-[15px] text-muted">The plugin download appears here as soon as it&apos;s published.</p>
        )}
        <p className="m-0 text-sm text-muted">
          After you install it, the plugin updates itself from WordPress like any other plugin. See{" "}
          <Link href="/guides/install-plugin">Install the plugin</Link> and <Link href="/guides/activate-license">Activate your license</Link>.
        </p>
      </section>
    </>
  );
}
