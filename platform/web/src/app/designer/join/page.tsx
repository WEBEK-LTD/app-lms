import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { designerSignUpAction } from "@/app/actions/designer";
import { Logo } from "@/components/brand";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { DashboardLanguage } from "@/components/dashboard-language";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { ThemeSwitch } from "@/components/theme-switch";
import { btn, Notice } from "@/components/ui";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { localePath } from "@/i18n/paths";
import { countryOptions } from "@/lib/account/country";
import { contextCan, getClientContext } from "@/lib/auth/session";
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { JoinForm } from "./form";
import "@/components/studio-market/market.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await dashboardText()).t("studioMarket.joinTitle")} · Yallapp`, robots: { index: false } }; // i18n-ok: the brand
}
export const dynamic = "force-dynamic";

/**
 * 106.1 Becoming a designer, as the owner approved it: why (75% of every
 * sale, no app of your own needed, paid every month) beside the four steps.
 * Any account can, without an app or a plan; someone signed out makes an
 * account first and comes back here. Their profile is changed here too.
 */
export default async function JoinPage({ searchParams }: PageProps<"/designer/join">) {
  const context = await getClientContext();
  const { t, lang, dir } = await dashboardText();
  const params = await searchParams;
  const designer = context ? await (await getStore()).getTemplateDesignerByClient(context.client.id) : null;
  const owner = context ? contextCan(context, "billing") : false;
  const year = String(new Date().getUTCFullYear());
  const contact = await getVisitorContact();

  const benefit = (icon: IconName, title: string, text: string) => (
    <div className="flex items-start gap-3.5">
      <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-night-2 text-[#ff7a45]">
        <Icon name={icon} size={22} />
      </span>
      <div className="flex flex-col gap-0.5">
        <b className="text-base text-ivory">{title}</b>
        <span className="text-sm leading-normal text-night-text">{text}</span>
      </div>
    </div>
  );
  const shot = (src: string, width: number, style?: React.CSSProperties) => (
    <div style={style}>
      <PhoneFrame style={{ width }} className="flex-none">
        <Image src={src} alt="" fill sizes={`${width}px`} className="object-cover object-top" />
      </PhoneFrame>
    </div>
  );

  let card: React.ReactNode;
  if (!context) {
    card = (
      <section className="mk-panel flex flex-col gap-4 rounded-[28px] px-5 py-6 sm:px-8 sm:py-[30px]">
        <h1 className="mk-display mk-gradtext m-0 text-[30px] sm:text-[34px]">{t("studioMarket.joinTitle")}</h1>
        <p className="m-0 text-[15px] text-ink-4">{t("studioMarket.joinIntro")}</p>
        <div className="flex flex-col gap-1 rounded-2xl bg-sand p-[18px]">
          <b className="text-base">{t("studioMarket.signedOutTitle")}</b>
          <span className="text-sm text-muted">{t("studioMarket.signedOutText")}</span>
        </div>
        <form action={designerSignUpAction} className="flex flex-wrap gap-3">
          <button type="submit" name="to" value="sign-up" className={`${btn.main} h-[52px] cursor-pointer text-base`}>
            {t("studioMarket.createAccount")}
            <Icon name="arrow_forward" size={20} />
          </button>
          <button type="submit" name="to" value="sign-in" className={`${btn.secondary} h-[52px] cursor-pointer text-base`}>
            {t("studioMarket.haveAccount")}
          </button>
        </form>
      </section>
    );
  } else if (!owner) {
    card = (
      <section className="mk-panel flex flex-col gap-4 rounded-[28px] px-5 py-6 sm:px-8 sm:py-[30px]">
        <h1 className="mk-display mk-gradtext m-0 text-[30px] sm:text-[34px]">{t("studioMarket.joinTitle")}</h1>
        <Notice tone="neutral" icon="lock">
          {t("studioMarket.ownerOnly")}
        </Notice>
      </section>
    );
  } else {
    card = (
      <JoinForm
        profile={designer ? { name: designer.name, slug: designer.slug, country: designer.country, bio: designer.bio ?? "" } : null}
        countries={countryOptions(lang)}
        joined={params.joined === "1" && Boolean(designer)}
        host="yallapp.com.tr"
      />
    );
  }

  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <div lang={lang} dir={dir} data-site-theme="" className="mk mk-bare mk-page min-h-screen">
        <header className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-[22px] sm:px-8">
          <Link href={designer ? "/designer/templates" : "/dashboard/studio-market"} className="flex rounded-md">
            <Logo height={28} adaptive alt={t("nav.logoAlt")} />
          </Link>
          <span aria-hidden="true" className="hidden h-6 w-px bg-line-strong sm:block" />
          <span className="hidden text-[15px] font-bold sm:block">{t("studioMarket.designersHeader")}</span>
          <span className="ms-auto flex items-center gap-2.5">
            <a href={localePath(lang, "/docs/yallapp-studio")} className={`${btn.ghost} h-9 px-3 text-sm`}>
              <Icon name="help" size={18} />
              {t("studioMarket.help")}
            </a>
            <span className="hidden rounded-[10px] border border-line-strong bg-white px-2 py-0.5 sm:block">
              <DashboardLanguage lang={lang} label={t("nav.languageList")} />
            </span>
            <ThemeSwitch label={t("nav.darkMode")} className="h-9 w-9" />
          </span>
        </header>
        <main id="main" className="mx-auto grid max-w-[1200px] items-start gap-8 px-4 pt-2 pb-16 sm:px-8 lg:grid-cols-[460px_minmax(0,1fr)]">
          <aside className="mk-pitch on-dark relative flex flex-col gap-[26px] overflow-hidden rounded-[28px] px-6 pt-10 sm:px-9">
            <div aria-hidden="true" className="absolute -start-[120px] -bottom-[140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,31,0.28),transparent)]" />
            <span className="mk-eyebrow relative text-[#ff9a6e]">{t("studioMarket.forDesigners")}</span>
            <h2 className="mk-display relative m-0 text-[34px] text-ivory sm:text-[42px]">{t("studioMarket.pitchTitle")}</h2>
            <p className="relative m-0 text-base leading-relaxed text-night-text">{t("studioMarket.pitchText")}</p>
            <div className="relative flex flex-col gap-5">
              {benefit("payments", t("studioMarket.benefit1Title"), t("studioMarket.benefit1Text"))}
              {benefit("public", t("studioMarket.benefit2Title"), t("studioMarket.benefit2Text"))}
              {benefit("event_available", t("studioMarket.benefit3Title"), t("studioMarket.benefit3Text"))}
            </div>
            <div aria-hidden="true" className="relative mt-1.5 flex h-[250px] items-start justify-center gap-3.5">
              {shot("/screens/flowers-sig-b-home.png", 150, { transform: "translateY(40px) rotate(-6deg)" })}
              {shot("/screens/travel-sig-b-home-dark.png", 162)}
              {shot("/screens/food-delivery-sig-a-home.png", 150, { transform: "translateY(40px) rotate(6deg)" })}
            </div>
          </aside>
          {card}
        </main>
        <footer className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3 px-4 pb-7 text-sm text-muted sm:px-8">
          <span>{t("studioMarket.copyright", { year })}</span>
          <span className="flex gap-5">
            <Link href={localePath(lang, "/terms")} className="text-muted no-underline hover:text-midnight">
              {t("studioMarket.terms")}
            </Link>
            <Link href={localePath(lang, "/privacy")} className="text-muted no-underline hover:text-midnight">
              {t("studioMarket.privacy")}
            </Link>
            <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-muted no-underline hover:text-midnight">
              {t("studioMarket.support")}
            </a>
          </span>
        </footer>
      </div>
    </DashboardI18n>
  );
}
