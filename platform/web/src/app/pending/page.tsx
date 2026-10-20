import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnnouncementBanner } from "@/components/announcements";
import { AuthShell } from "@/components/auth-shell";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { SignOutButton } from "@/components/sign-out";
import { btn } from "@/components/ui";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { Notice } from "@/components/ui";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { getAdminRole, getClientContext, getCurrentUser } from "@/lib/auth/session";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { getSwitches } from "@/lib/switches";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { getPlans, yallappPlanAccount } from "@/lib/settings/platform";
import { priceView } from "@/lib/billing/display";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { getContact } from "@/lib/contact";
import { appLabel } from "@/lib/app/label";
import { WhatsAppMark } from "@/components/brand-marks";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("overview.pendingTitle"), robots: { index: false } };
}

/** 56 In the dashboard's language: the signed-in person's choice, else the language cookie, else English. */
export default async function PendingPage({ searchParams }: PageProps<"/pending">) {
  const contact = await getContact();
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (await getAdminRole()) redirect("/admin");
  const text = await dashboardText();
  const { t, k, lang, dir } = text;
  const signOut = t("nav.signOut");
  const context = await getClientContext();
  if (!context) {
    // A user without a client profile (for example a former super admin): nowhere else to send them.
    return (
      <AuthShell footer={false} lang={lang}>
        <DocumentLang lang={lang} />
        <main lang={lang} dir={dir} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
          <section className="flex w-full max-w-[560px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{t("overview.noProfile")}</h1>
            <p className="m-0 text-base leading-relaxed text-ink-4">{t("overview.noProfileText")}</p>
            <div className="flex flex-wrap gap-3">
              <a href={contact.whatsappUrl} className={`${btn.primary} h-[50px] flex-[1_1_220px]`}>
                <WhatsAppMark size={20} />
                {t("overview.messageWhatsapp")}
              </a>
              <SignOutButton className={`${btn.secondary} h-[50px] w-full cursor-pointer`}>{signOut}</SignOutButton>
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
  // 52 Yallapp's gateway for plans (Kashier, in pounds); prices in the client's currency.
  const yallappAccount = suspended ? null : await yallappPlanAccount(store, encryptionKey());
  const payable = yallappAccount ? cardPlanOptions(await getPlans(store), await getSwitches(store), yallappAccount.provider, await priceView(store, context.client)) : [];
  const whatsapp = `${contact.whatsappUrl}?text=${encodeURIComponent(
    suspended ? t("overview.whatsappSuspended", { email: user.email }) : t("overview.whatsappConfirm", { email: user.email }),
  )}`;

  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <AuthShell
        footer={false}
        lang={lang}
        aside={
          <span lang={lang} dir={dir} className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <span className="break-all" dir="ltr">
              {user.email}
            </span>{" "}
            ·
            <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent hover:text-accent-hover hover:underline">{signOut}</SignOutButton>
          </span>
        }
      >
        <main lang={lang} dir={dir} className="flex flex-1 items-center justify-center px-4 pt-6 pb-14 sm:px-6">
          <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-[20px] border border-line bg-white px-5 py-10 sm:px-9">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-accent">
              <Icon name={suspended ? "block" : "hourglass_top"} size={32} />
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">{suspended ? t("overview.suspendedTitle") : t("overview.waitingTitle")}</h1>
              <p className="m-0 text-base leading-relaxed text-ink-4">
                {suspended ? t("overview.suspendedText") : payable.length ? t("overview.waitingPayText") : t("overview.waitingText")}
              </p>
            </div>

            <AnnouncementBanner context={context} />

            {suspended ? null : (
              <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
                <li className="flex items-center gap-3">
                  <Icon name="check_circle" size={22} filled className="text-success" />
                  {t("overview.accountCreated")}
                </li>
                <li className="flex items-center gap-3 font-bold" aria-current="step">
                  <Icon name="pending" size={22} className="text-accent" />
                  {t("overview.planConfirmation")}
                </li>
                <li className="flex items-center gap-3 text-muted">
                  <Icon name="radio_button_unchecked" size={22} />
                  {t("overview.accountActivated")}
                </li>
              </ol>
            )}

            {payment === "failed" ? (
              <Notice tone="danger" icon="error" role="alert">
                {t("overview.paymentFailed")}
              </Notice>
            ) : null}
            {payment === "pending" ? (
              <Notice icon="schedule" role="status">
                {t("overview.paymentPending")}
              </Notice>
            ) : null}
            {payable.length ? (
              <div className="flex flex-col gap-3 border-t border-line-soft pt-5">
                <h2 className="m-0 text-[19px] font-bold">{t("overview.payByCard")}</h2>
                {context.app ? (
                  <p className="m-0 text-sm text-muted">
                    {richText(t("overview.forApp", { app: appLabel(context.app) === "Untitled app" ? k("Untitled app") : appLabel(context.app) }), {
                      b: (chunk) => <strong className="text-ink-2">{chunk}</strong>,
                    })}
                  </p>
                ) : null}
                <PlanPaymentForm
                  plans={payable.map((p) => ({ ...p, period: p.period ? k(p.period) : null, tagline: k(p.tagline), note: p.note ? k(p.note) : p.note, charge: p.charge ? k(p.charge) : p.charge }))}
                  current={null}
                  cta={t("overview.payAndActivate")}
                  appId={context.app?.id ?? null}
                  provider={yallappAccount ? PROVIDER_NAME[yallappAccount.provider] : "iyzico"}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <a href={whatsapp} className={`${btn.primary} h-[50px] flex-[1_1_220px] text-base`}>
                <WhatsAppMark size={20} />
                {t("overview.messageWhatsapp")}
              </a>
              {/* The page is dynamic, so going to it again reads the account's state from the server. */}
              <Link href="/pending" className={`${btn.secondary} h-[50px] flex-[1_1_160px]`}>
                {t("overview.checkAgain")}
              </Link>
            </div>
            {suspended ? null : <p className="m-0 text-[13px] text-muted">{t("overview.emailWhenActive", { email: user.email })}</p>}
          </section>
        </main>
      </AuthShell>
    </DashboardI18n>
  );
}
