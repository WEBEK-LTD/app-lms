import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnnouncementBanner } from "@/components/announcements";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { btn } from "@/components/ui";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { Notice } from "@/components/ui";
import { getAdminRole, getClientContext, getCurrentUser } from "@/lib/auth/session";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { getSwitches } from "@/lib/switches";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { getPlans, yallappPaymentAccount } from "@/lib/settings/platform";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { getContact } from "@/lib/contact";
import { appLabel } from "@/lib/app/label";

export const metadata: Metadata = { title: "Account pending activation", robots: { index: false } };

export default async function PendingPage({ searchParams }: PageProps<"/pending">) {
  const contact = await getContact();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (await getAdminRole()) redirect("/admin");
  const context = await getClientContext();
  if (!context) {
    // A user without a client profile (for example a former super admin): nowhere else to send them.
    return (
      <AuthShell footer={false}>
        <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
          <section className="flex w-full max-w-[560px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">This account has no client profile</h1>
            <p className="m-0 text-base leading-relaxed text-ink-4">Message us on WhatsApp and we&apos;ll sort it out.</p>
            <div className="flex flex-wrap gap-3">
              <a href={contact.whatsappUrl} className={`${btn.primary} h-[50px] flex-[1_1_220px]`}>
                Message us on WhatsApp
              </a>
              <SignOutButton className={`${btn.secondary} h-[50px] w-full cursor-pointer`} />
            </div>
          </section>
        </main>
      </AuthShell>
    );
  }
  if (context.client.status === "active") redirect(context.app ? "/dashboard" : "/dashboard/app-type");

  const suspended = context.client.status === "suspended";
  const { payment } = await searchParams;
  const store = await getStore();
  const yallappAccount = suspended ? null : await yallappPaymentAccount(store, encryptionKey());
  const payable = yallappAccount ? cardPlanOptions(await getPlans(store), await getSwitches(store), yallappAccount.provider) : [];
  const whatsapp = `${contact.whatsappUrl}?text=${encodeURIComponent(
    suspended
      ? `Hello, my Yallapp account (${user.email}) is suspended. Can you help?`
      : `Hello, I created a Yallapp account with ${user.email} and I'd like to confirm my plan.`,
  )}`;

  return (
    <AuthShell
      footer={false}
      aside={
        <span className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <span className="break-all">{user.email}</span> ·
          <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent hover:text-accent-hover hover:underline" />
        </span>
      }
    >
      <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
        <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-accent">
            <Icon name={suspended ? "block" : "hourglass_top"} size={32} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">
              {suspended ? "Your account is suspended" : "Your account is waiting for activation"}
            </h1>
            <p className="m-0 text-base leading-relaxed text-ink-4">
              {suspended
                ? "Your apps and the plugin connection are paused. Message us on WhatsApp and we'll help you sort it out."
                : payable.length
                  ? "Pay your plan by card to start right away, or message us on WhatsApp to confirm it. Once it's confirmed, your account is active and we email your license key."
                  : "Message us on WhatsApp to confirm your plan. Once it's confirmed, we activate your account and send your license key."}
            </p>
          </div>

          <AnnouncementBanner context={context} />

          {suspended ? null : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
              <li className="flex items-center gap-3">
                <Icon name="check_circle" size={22} filled className="text-success" />
                Account created
              </li>
              <li className="flex items-center gap-3 font-bold" aria-current="step">
                <Icon name="pending" size={22} className="text-accent" />
                Plan confirmation
              </li>
              <li className="flex items-center gap-3 text-muted">
                <Icon name="radio_button_unchecked" size={22} />
                Account activated
              </li>
            </ol>
          )}

          {payment === "failed" ? (
            <Notice tone="danger" icon="error" role="alert">
              The payment didn&apos;t go through, and nothing was charged. Try again, or message us on WhatsApp.
            </Notice>
          ) : null}
          {payment === "pending" ? (
            <Notice icon="schedule" role="status">
              Your payment isn&apos;t confirmed yet. If you paid, your account is activated within a few minutes and we email you; otherwise, try again.
            </Notice>
          ) : null}
          {payable.length ? (
            <div className="flex flex-col gap-3 border-t border-line-soft pt-5">
              <h2 className="m-0 text-[19px] font-bold">Pay by card</h2>
              {context.app ? (
                <p className="m-0 text-sm text-muted">
                  For your app <strong className="text-ink-2">{appLabel(context.app)}</strong>. Each app has its own plan.
                </p>
              ) : null}
              <PlanPaymentForm plans={payable} current={null} cta="Pay and activate" appId={context.app?.id ?? null} provider={yallappAccount ? PROVIDER_NAME[yallappAccount.provider] : "iyzico"} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <a href={whatsapp} className={`${btn.primary} h-[50px] flex-[1_1_220px] text-base`}>
              <Icon name="chat" size={20} />
              Message us on WhatsApp
            </a>
            {/* A full page load, so the status is read again from the server. */}
            <a href="/pending" className={`${btn.secondary} h-[50px] flex-[1_1_160px]`}>
              Check again
            </a>
          </div>
          {suspended ? null : (
            <p className="m-0 text-[13px] text-muted">We&apos;ll also email you at {user.email} when your account is active.</p>
          )}
        </section>
      </main>
    </AuthShell>
  );
}
