import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WHATSAPP_URL } from "@/components/brand";
import { BuildBadge } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn, formatDate } from "@/components/ui";
import { SETUP_STEPS, nextStep, stepStatus } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { ACCOUNT_STATE_LABEL, daysUntil } from "@/lib/license/status";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";

export const metadata: Metadata = { title: "Overview" };

function Tile({ title, children, action }: { title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="m-0 text-base font-bold text-muted">{title}</h2>
      <div className="flex flex-1 flex-col gap-1.5">{children}</div>
      <div>{action}</div>
    </section>
  );
}

export default async function OverviewPage() {
  const { user, client, app, license, state } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const plans = await getPlans(store);
  const [latest] = await store.listBuildsByClient(client.id, 1);
  const activation = license ? await store.getActivation(license.id) : null;
  const plan = license?.plan ?? null;
  const status = stepStatus(app, plan);
  const done = SETUP_STEPS.filter((step) => status[step]).length;
  const next = nextStep(app, plan);
  const daysLeft = license ? daysUntil(license.expiresAt) : 0;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Hello, {user.name.split(" ")[0]}</h1>
        <span className="text-[15px] text-muted">
          {app.appName ?? "Your app"} · Plan: {planName(plan, plans)}
        </span>
      </div>

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan ended on {formatDate(license?.expiresAt)}. <a href={WHATSAPP_URL}>Message us on WhatsApp</a> to renew.
        </Notice>
      ) : daysLeft <= 14 ? (
        <Notice icon="schedule">
          Your plan renews on {formatDate(license?.expiresAt)}. <a href={WHATSAPP_URL}>Message us on WhatsApp</a> to arrange the renewal.
        </Notice>
      ) : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
        <Tile
          title="App setup"
          action={
            <Link href={next ? `/dashboard/setup?step=${next === "app-type" ? "website" : next}` : "/dashboard/setup"} className={`${btn.secondary} h-10`}>
              {next ? "Continue setup" : "Review setup"}
            </Link>
          }
        >
          <span className="text-2xl font-extrabold">
            {done} of {SETUP_STEPS.length} steps
          </span>
          <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={SETUP_STEPS.length} aria-valuenow={done} aria-label="Setup progress">
            <div className="h-full rounded-full bg-ember" style={{ width: `${(done / SETUP_STEPS.length) * 100}%` }} />
          </div>
        </Tile>

        <Tile
          title="Latest build"
          action={
            <Link href="/dashboard/builds" className={`${btn.secondary} h-10`}>
              Builds &amp; downloads
            </Link>
          }
        >
          {latest ? (
            <>
              <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
                #{latest.number} <BuildBadge status={latest.status} />
              </span>
              <span className="text-sm text-muted">
                App version {latest.versionName} · {formatDate(latest.createdAt)}
              </span>
            </>
          ) : (
            <span className="text-[15px] text-muted">Your first build starts when the setup is complete.</span>
          )}
        </Tile>

        <Tile
          title="License"
          action={
            <Link href="/dashboard/license" className={`${btn.secondary} h-10`}>
              License &amp; plugin
            </Link>
          }
        >
          <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {planName(plan, plans)} <Badge tone={state === "active" ? "success" : "danger"}>{ACCOUNT_STATE_LABEL[state]}</Badge>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name={activation ? "link" : "link_off"} size={18} />
            {activation ? `Connected to ${activation.siteUrl}` : "Plugin not connected yet"}
          </span>
        </Tile>
      </div>
    </>
  );
}
