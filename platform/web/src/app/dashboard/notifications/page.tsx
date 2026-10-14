import type { Metadata } from "next";
import Link from "next/link";
import { removeServiceAccountAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "@/lib/hosted/notify";
import { ServiceAccountForm, SendNotificationForm } from "./forms";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";

export const metadata: Metadata = { title: "App notifications" };

/** Notifications for apps on the hosted API. Apps on WordPress send them from the plugin. */
export default async function NotificationsPage() {
  const { app, license } = await requireClient();
  if (!app || app.backend !== "hosted") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[28px] font-extrabold">App notifications</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Your app gets its notifications from your website: send them from the Yallapp plugin in WordPress.{" "}
          <Link href="/dashboard/setup">Back to app setup</Link>
        </p>
      </div>
    );
  }
  const store = await getStore();
  const [customers, sent] = await Promise.all([store.countHostedUsers(app.id), store.listHostedBroadcasts(app.id, 20)]);
  const account = serviceAccountOf(app, encryptionKey());
  // 13.1 Push comes with the plan; without it, notifications still reach the app's inbox.
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, new Date()) : null;
  const push = planId ? hasFeature(plans[planId], "push") : false;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">App notifications</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Message everyone who uses your app. {customers} {customers === 1 ? "customer has" : "customers have"} signed in so far.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-send" className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-send" className="m-0 text-[19px] font-bold">
            New notification
          </h2>
          <SendNotificationForm titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} />
        </section>

        <section aria-labelledby="h-push" className="flex min-w-0 flex-[1_1_320px] flex-col gap-[14px] rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-push" className="m-0 text-[19px] font-bold">
            Push
          </h2>
          {push ? null : (
            <UpgradeHint title="Push notifications" to={lowestPlanWith(plans, (p) => hasFeature(p, "push"), planId)} compact>
              Your plan sends notifications to the app&apos;s inbox only.
            </UpgradeHint>
          )}
          {account ? (
            <>
              <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
                <Icon name="check_circle" size={20} filled />
                On · Firebase project {account.project_id}
              </p>
              <form action={removeServiceAccountAction}>
                <SubmitButton variant="secondary" className="h-10">
                  Remove key
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">
                Notifications reach the inbox in your app. To also show them on your customers&apos; lock screens, add the key of the same
                Firebase project as your app&apos;s Firebase files.
              </p>
              <ServiceAccountForm />
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="h-sent" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-sent" className="m-0 text-[19px] font-bold">
          Sent
        </h2>
        {sent.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">Nothing sent yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {sent.map((n) => (
              <li key={n.id} className="flex flex-col gap-0.5 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="text-[15px] font-bold">{n.title}</span>
                <span className="text-[15px] text-ink-4">{n.body}</span>
                <span className="text-[13px] text-muted">{formatDateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
