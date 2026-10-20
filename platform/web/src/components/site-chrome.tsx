import Link from "next/link";
import { Icon } from "./icon";
import { getContact } from "@/lib/contact";
import { legalLine } from "@/lib/company";
import { PRODUCT_LINKS, siteNavFor, type SitePage } from "@/lib/site-nav";
import { APP_STORES } from "@/lib/stores";
import { DEFAULT_LANG, formatMessage, messagesFor, type Lang, type Messages } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { AccountLink } from "./account-link";
import { Logo, LogoLink } from "./brand";
import { StoreMarks, WhatsAppMark } from "./brand-marks";
import { LanguageList } from "./language-switcher";
import { SiteNav } from "./site-nav";

export type { SitePage };

/** 55 The language switcher's words in a language. */
export function languageLabels(lang: Lang): { label: string; menu: string; list: string } {
  const m = messagesFor(lang).lang;
  const name = { en: "English", ar: "العربية", tr: "Türkçe" }[lang];
  return { label: m.label, menu: formatMessage(lang, m.menu, { name }), list: m.list };
}

/** The footer's legal line in a language: "© 2026 Yallapp · Cairo, Egypt". */
function footerLegalLine(lang: Lang): string {
  return lang === "en" ? legalLine() : formatMessage(lang, messagesFor(lang).footer.legalLine, { year: String(new Date().getFullYear()) });
}

/**
 * 32 Header of the public website: Product and Resources lists, the other pages, Sign in and Get started; `current` marks where the visitor is.
 * 55 In the page's language (`lang`), with the language switcher.
 */
export function SiteHeader({ current, white = true, lang = DEFAULT_LANG }: { current?: SitePage; white?: boolean; lang?: Lang }) {
  const m = messagesFor(lang).nav;
  return (
    <header data-site-theme="" className={`relative z-30 border-b ${white ? "border-line bg-white" : "border-line-soft"}`}>
      <div className="mx-auto flex max-w-[1160px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:gap-6">
        <LogoLink href={localePath(lang, "/")} adaptive alt={m.logoHome} />
        <SiteNav current={current} lang={lang} nav={siteNavFor(lang, m)} labels={m} languages={languageLabels(lang)} />
      </div>
    </header>
  );
}

function FooterHeading({ children }: { children: string }) {
  return <span className="text-[13px] font-bold tracking-[1px] text-ember">{children}</span>;
}

const footerLink = "text-ivory no-underline hover:text-white hover:underline";

/** The footer's Product links in a language. */
function productLinks(lang: Lang, m: Messages): { id: string; href: string; label: string }[] {
  const nav = m.nav;
  const label: Record<string, string> = { solutions: nav.solutions, features: nav.features, integrations: nav.integrations, how: nav.how };
  return [
    { id: "home", href: "/", label: nav.home },
    ...PRODUCT_LINKS.map((l) => ({ id: l.id, href: l.href, label: label[l.id] ?? l.label })),
    { id: "pricing", href: "/pricing", label: nav.pricing },
    { id: "demo", href: "/demo", label: nav.demo },
  ].map((l) => ({ ...l, href: localePath(lang, l.href) }));
}

/** The dark footer. `full` (marketing pages) adds the WhatsApp button and a contact column. */
export async function SiteFooter({ full = false, lang = DEFAULT_LANG }: { full?: boolean; lang?: Lang }) {
  const contact = await getContact();
  const m = messagesFor(lang);
  const f = m.footer;
  const lp = (path: string) => localePath(lang, path);
  return (
    <footer className="on-dark bg-midnight text-night-text">
      <div className={`mx-auto flex max-w-[1160px] flex-col px-4 sm:px-6 ${full ? "gap-12 pt-16 pb-8" : "gap-10 pt-14 pb-8"}`}>
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <div className="flex flex-[2_1_280px] flex-col gap-4">
            <div className="self-start">
              <Logo height={36} reversed />
            </div>
            <p className="m-0 max-w-[340px] text-[15px] leading-relaxed">{f.about}</p>
            {/* 41 The five stores. */}
            <StoreMarks stores={[...APP_STORES]} label={f.storesLabel} size={16} tone="dark" />
            {full ? (
              <a
                href={contact.whatsappUrl}
                className="flex h-[46px] items-center gap-2 self-start rounded-[10px] bg-ivory px-[18px] text-[15px] font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
              >
                <WhatsAppMark size={20} />
                {f.whatsapp}
              </a>
            ) : null}
          </div>
          <nav aria-label={m.nav.product} className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>{f.product}</FooterHeading>
            {productLinks(lang, m).map((page) => (
              <Link key={page.id} href={page.href} className={footerLink}>
                {page.label}
              </Link>
            ))}
          </nav>
          <nav aria-label={m.nav.resources} className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>{f.resources}</FooterHeading>
            <Link href={lp("/docs")} className={footerLink}>{f.documentation}</Link>
            <Link href={lp("/docs/google-play")} className={footerLink}>{f.googlePlay}</Link>
            <Link href={lp("/docs/app-store")} className={footerLink}>{f.appStore}</Link>
            <Link href={lp("/docs/galaxy-store")} className={footerLink}>{f.galaxyStore}</Link>
            <Link href={lp("/docs/huawei-appgallery")} className={footerLink}>{f.appGallery}</Link>
            <Link href={lp("/docs/xiaomi-getapps")} className={footerLink}>{f.getApps}</Link>
            <Link href={lp("/developers")} className={footerLink}>{m.nav.developers}</Link>
            <Link href={lp("/faq")} className={footerLink}>{m.nav.faq}</Link>
          </nav>
          <nav aria-label={lang === "en" ? "Account" : f.account} className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>{f.account}</FooterHeading>
            <AccountLink href={lp("/sign-in")} signedIn={f.yourDashboard} className={footerLink}>
              {m.nav.signIn}
            </AccountLink>
            <AccountLink href={lp("/sign-up")} signedIn={null} className={footerLink}>
              {f.createAccount}
            </AccountLink>
            <Link href={lp("/contact")} className={footerLink}>{m.nav.contact}</Link>
          </nav>
          <nav aria-label={lang === "en" ? "Legal" : f.legal} className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>{f.legal}</FooterHeading>
            <Link href={lp("/terms")} className={footerLink}>{f.terms}</Link>
            <Link href={lp("/privacy")} className={footerLink}>{f.privacy}</Link>
            <Link href={lp("/refund")} className={footerLink}>{f.refund}</Link>
            <Link href={lp("/delete-account")} className={footerLink}>{f.deleteAccount}</Link>
          </nav>
          {full ? (
            <div className="flex flex-[1_1_180px] flex-col gap-3 text-[15px]">
              <FooterHeading>{f.contact}</FooterHeading>
              <a href={contact.whatsappUrl} className={`${footerLink} flex items-center gap-2`}>
                <WhatsAppMark size={18} />
                <bdi dir="ltr">{contact.whatsappDisplay}</bdi>
              </a>
              <a href={`mailto:${contact.email}`} className={`${footerLink} flex items-center gap-2`}>
                <Icon name="mail" size={18} />
                {contact.email}
              </a>
            </div>
          ) : null}
        </div>
        {/* 55 The same page in English, Arabic and Turkish. */}
        <LanguageList lang={lang} labels={languageLabels(lang)} tone="dark" className="text-[15px]" />
        <div className="flex flex-wrap justify-between gap-3 border-t border-night-line pt-6 text-sm">
          <span>{footerLegalLine(lang)}</span>
          {full ? (
            <span className="max-w-[640px]">{f.trademarks}</span>
          ) : (
            <a href={contact.whatsappUrl} className="text-night-text no-underline hover:text-white hover:underline">
              {formatMessage(lang, f.whatsappLine, { number: contact.whatsappDisplay })}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

/** Small footer for sign-in and account pages. 55 `languages` adds the language switcher (the sign-in pages in every language). */
export async function MiniFooter({ lang = DEFAULT_LANG, languages = false }: { lang?: Lang; languages?: boolean }) {
  const contact = await getContact();
  const f = messagesFor(lang).footer;
  return (
    <footer className="mx-auto flex w-full max-w-[1160px] flex-wrap justify-between gap-x-6 gap-y-3 px-4 py-5 text-sm text-muted sm:px-6">
      <span>{footerLegalLine(lang)}</span>
      {languages ? <LanguageList lang={lang} labels={languageLabels(lang)} /> : null}
      <span className="flex gap-5">
        <Link href={localePath(lang, "/terms")} className="text-muted">{f.termsShort}</Link>
        <Link href={localePath(lang, "/privacy")} className="text-muted">{f.privacyShort}</Link>
        <a href={contact.whatsappUrl} className="text-muted">{f.support}</a>
      </span>
    </footer>
  );
}
