import Link from "next/link";
import { Icon } from "./icon";
import { LEGAL_LINE, Logo, LogoLink, WHATSAPP_DISPLAY, WHATSAPP_URL } from "./brand";

const SECTIONS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Header of the public website. On the landing page the links are in-page
 * anchors and Home is marked current; elsewhere they lead back to the landing page.
 */
export function SiteHeader({ onLanding = false, white = true }: { onLanding?: boolean; white?: boolean }) {
  const base = onLanding ? "" : "/";
  return (
    <header className={`border-b ${white ? "border-line bg-white" : "border-line-soft"}`}>
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-[18px] sm:px-6">
        <LogoLink href={onLanding ? "#top" : "/"} />
        <div className="order-2 ml-auto flex items-center gap-2.5 sm:order-3 sm:ml-0">
          <Link href="/sign-in" className="flex h-[42px] items-center rounded-[10px] px-3 text-[15px] font-semibold text-midnight no-underline hover:text-midnight hover:underline sm:px-4">
            Sign in
          </Link>
          <a href={WHATSAPP_URL} className="flex h-[42px] items-center rounded-[10px] bg-midnight px-[18px] text-[15px] font-semibold text-white no-underline hover:bg-ink-3 hover:text-white">
            Contact us
          </a>
        </div>
        <nav aria-label="Main" className="order-3 flex w-full flex-1 flex-wrap items-center gap-x-6 gap-y-2 text-[15px] sm:order-2 sm:w-auto">
          <Link
            href={onLanding ? "#top" : "/"}
            aria-current={onLanding ? "page" : undefined}
            className={
              onLanding
                ? "border-b-2 border-ember py-1 font-bold text-midnight no-underline hover:text-midnight"
                : "text-ink-3 no-underline hover:text-midnight hover:underline"
            }
          >
            Home
          </Link>
          {SECTIONS.map((section) => (
            <Link key={section.href} href={`${base}${section.href}`} className="text-ink-3 no-underline hover:text-midnight hover:underline">
              {section.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function FooterHeading({ children }: { children: string }) {
  return <span className="text-[13px] font-bold tracking-[1px] text-ember">{children}</span>;
}

const footerLink = "text-ivory no-underline hover:text-white hover:underline";

/** The dark footer. `full` (landing page) adds in-page links, the WhatsApp button and a contact column. */
export function SiteFooter({ full = false }: { full?: boolean }) {
  return (
    <footer className="on-dark bg-midnight text-night-text">
      <div className={`mx-auto flex max-w-[1160px] flex-col px-4 sm:px-6 ${full ? "gap-12 pt-16 pb-8" : "gap-10 pt-14 pb-8"}`}>
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <div className="flex flex-[2_1_280px] flex-col gap-4">
            <div className="self-start">
              <Logo height={36} reversed />
            </div>
            <p className="m-0 max-w-[340px] text-[15px] leading-relaxed">
              Branded Android and iOS apps for WordPress academies, built from the website you already run.
            </p>
            {full ? (
              <a
                href={WHATSAPP_URL}
                className="flex h-[46px] items-center gap-2 self-start rounded-[10px] bg-ivory px-[18px] text-[15px] font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
              >
                <Icon name="chat" size={20} />
                Talk to us on WhatsApp
              </a>
            ) : null}
          </div>
          <nav aria-label="Product" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>PRODUCT</FooterHeading>
            {full ? (
              <>
                <Link href="#top" className={footerLink}>Home</Link>
                <Link href="#features" className={footerLink}>Features</Link>
                <Link href="#how" className={footerLink}>How it works</Link>
                <Link href="#pricing" className={footerLink}>Pricing</Link>
                <Link href="#faq" className={footerLink}>FAQ</Link>
              </>
            ) : (
              <>
                <Link href="/" className={footerLink}>Home</Link>
                <Link href="/#pricing" className={footerLink}>Pricing</Link>
                <Link href="/guides" className={footerLink}>Publishing guides</Link>
              </>
            )}
          </nav>
          <nav aria-label="Account" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>ACCOUNT</FooterHeading>
            <Link href="/sign-in" className={footerLink}>Sign in</Link>
            <Link href="/sign-up" className={footerLink}>Create an account</Link>
            {full ? <Link href="/guides" className={footerLink}>Publishing guides</Link> : null}
          </nav>
          <nav aria-label="Legal" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>LEGAL</FooterHeading>
            <Link href="/terms" className={footerLink}>Terms of service</Link>
            <Link href="/privacy" className={footerLink}>Privacy policy</Link>
            <Link href="/refund" className={footerLink}>Refund policy</Link>
          </nav>
          {full ? (
            <div className="flex flex-[1_1_180px] flex-col gap-3 text-[15px]">
              <FooterHeading>CONTACT</FooterHeading>
              <a href={WHATSAPP_URL} className={`${footerLink} flex items-center gap-2`}>
                <Icon name="call" size={18} />
                {WHATSAPP_DISPLAY}
              </a>
              <a href="https://yallapp.com.tr" className={`${footerLink} flex items-center gap-2`}>
                <Icon name="language" size={18} />
                yallapp.com.tr
              </a>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-night-line pt-6 text-sm">
          <span>{LEGAL_LINE}</span>
          {full ? (
            <span>WordPress is a trademark of the WordPress Foundation. Yallapp is not affiliated with the LMS plugins it supports.</span>
          ) : (
            <a href={WHATSAPP_URL} className="text-night-text no-underline hover:text-white hover:underline">
              WhatsApp: {WHATSAPP_DISPLAY} · yallapp.com.tr
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

/** Small footer for sign-in and account pages. */
export function MiniFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1160px] flex-wrap justify-between gap-x-6 gap-y-3 px-4 py-5 text-sm text-muted sm:px-6">
      <span>© 2026 WEBEK LTD · Registered in England and Wales, company no. 16326894</span>
      <span className="flex gap-5">
        <Link href="/terms" className="text-muted">Terms</Link>
        <Link href="/privacy" className="text-muted">Privacy</Link>
        <a href={WHATSAPP_URL} className="text-muted">Support</a>
      </span>
    </footer>
  );
}
