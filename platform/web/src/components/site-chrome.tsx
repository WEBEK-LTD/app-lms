import Link from "next/link";
import { Icon } from "./icon";
import { getContact } from "@/lib/contact";
import { LEGAL_LINE, Logo, LogoLink } from "./brand";

export type SitePage = "home" | "solutions" | "features" | "integrations" | "how" | "pricing" | "demo" | "docs" | "faq" | "contact";

export const SITE_PAGES: { id: SitePage; href: string; label: string }[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "solutions", href: "/solutions", label: "Solutions" },
  { id: "features", href: "/features", label: "Features" },
  { id: "integrations", href: "/integrations", label: "Integrations" },
  { id: "how", href: "/how-it-works", label: "How it works" },
  { id: "pricing", href: "/pricing", label: "Pricing" },
  { id: "demo", href: "/demo", label: "Demo" },
  { id: "docs", href: "/docs", label: "Docs" },
  { id: "faq", href: "/faq", label: "FAQ" },
  { id: "contact", href: "/contact", label: "Contact" },
];

/** Header of the public website. Every link is its own page; `current` marks where the visitor is. */
export async function SiteHeader({ current, white = true }: { current?: SitePage; white?: boolean }) {
  const contact = await getContact();
  return (
    <header className={`border-b ${white ? "border-line bg-white" : "border-line-soft"}`}>
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-[18px] sm:px-6">
        <LogoLink href="/" />
        <div className="order-2 ml-auto flex items-center gap-2.5 lg:order-3 lg:ml-0">
          <Link href="/sign-in" className="flex h-[42px] items-center rounded-[10px] px-3 text-[15px] font-semibold text-midnight no-underline hover:text-midnight hover:underline sm:px-4">
            Sign in
          </Link>
          <a href={contact.whatsappUrl} className="flex h-[42px] items-center rounded-[10px] bg-midnight px-[18px] text-[15px] font-semibold text-white no-underline hover:bg-ink-3 hover:text-white">
            Contact us
          </a>
        </div>
        <nav aria-label="Main" className="order-3 flex w-full flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-[15px] lg:order-2 lg:w-auto">
          {SITE_PAGES.map((page) =>
            page.id === current ? (
              <Link
                key={page.id}
                href={page.href}
                aria-current="page"
                className="border-b-2 border-ember py-1 font-bold text-midnight no-underline hover:text-midnight"
              >
                {page.label}
              </Link>
            ) : (
              <Link key={page.id} href={page.href} className="text-ink-3 no-underline hover:text-midnight hover:underline">
                {page.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

function FooterHeading({ children }: { children: string }) {
  return <span className="text-[13px] font-bold tracking-[1px] text-ember">{children}</span>;
}

const footerLink = "text-ivory no-underline hover:text-white hover:underline";

/** The dark footer. `full` (marketing pages) adds the WhatsApp button and a contact column. */
export async function SiteFooter({ full = false }: { full?: boolean }) {
  const contact = await getContact();
  return (
    <footer className="on-dark bg-midnight text-night-text">
      <div className={`mx-auto flex max-w-[1160px] flex-col px-4 sm:px-6 ${full ? "gap-12 pt-16 pb-8" : "gap-10 pt-14 pb-8"}`}>
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <div className="flex flex-[2_1_280px] flex-col gap-4">
            <div className="self-start">
              <Logo height={36} reversed />
            </div>
            <p className="m-0 max-w-[340px] text-[15px] leading-relaxed">
              Branded Android and iOS apps for academies, stores, bookings, real estate offices and news sites, from the website you already run, or
              from no website at all.
            </p>
            {full ? (
              <a
                href={contact.whatsappUrl}
                className="flex h-[46px] items-center gap-2 self-start rounded-[10px] bg-ivory px-[18px] text-[15px] font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
              >
                <Icon name="chat" size={20} />
                Talk to us on WhatsApp
              </a>
            ) : null}
          </div>
          <nav aria-label="Product" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>PRODUCT</FooterHeading>
            {SITE_PAGES.filter((page) => !["home", "docs", "faq", "contact"].includes(page.id)).map((page) => (
              <Link key={page.id} href={page.href} className={footerLink}>
                {page.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Resources" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>RESOURCES</FooterHeading>
            <Link href="/docs" className={footerLink}>Documentation</Link>
            <Link href="/docs/google-play" className={footerLink}>Publish on Google Play</Link>
            <Link href="/docs/app-store" className={footerLink}>Publish on the App Store</Link>
            <Link href="/developers" className={footerLink}>API reference</Link>
            <Link href="/faq" className={footerLink}>FAQ</Link>
          </nav>
          <nav aria-label="Account" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>ACCOUNT</FooterHeading>
            <Link href="/sign-in" className={footerLink}>Sign in</Link>
            <Link href="/sign-up" className={footerLink}>Create an account</Link>
            <Link href="/contact" className={footerLink}>Contact</Link>
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
              <a href={contact.whatsappUrl} className={`${footerLink} flex items-center gap-2`}>
                <Icon name="call" size={18} />
                {contact.whatsappDisplay}
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
            <span>WordPress, Shopify and the other names on this site are trademarks of their owners. Yallapp is not affiliated with the platforms it connects to.</span>
          ) : (
            <a href={contact.whatsappUrl} className="text-night-text no-underline hover:text-white hover:underline">
              WhatsApp: {contact.whatsappDisplay} · yallapp.com.tr
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

/** Small footer for sign-in and account pages. */
export async function MiniFooter() {
  const contact = await getContact();
  return (
    <footer className="mx-auto flex w-full max-w-[1160px] flex-wrap justify-between gap-x-6 gap-y-3 px-4 py-5 text-sm text-muted sm:px-6">
      <span>© 2026 WEBEK LTD · Registered in England and Wales, company no. 16326894</span>
      <span className="flex gap-5">
        <Link href="/terms" className="text-muted">Terms</Link>
        <Link href="/privacy" className="text-muted">Privacy</Link>
        <a href={contact.whatsappUrl} className="text-muted">Support</a>
      </span>
    </footer>
  );
}
