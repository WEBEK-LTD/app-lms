import Link from "next/link";
import { Icon } from "./icon";
import { getContact } from "@/lib/contact";
import { legalLine } from "@/lib/company";
import { PRODUCT_LINKS, type SitePage } from "@/lib/site-nav";
import { APP_STORES } from "@/lib/stores";
import { AccountLink } from "./account-link";
import { Logo, LogoLink } from "./brand";
import { StoreMarks, WhatsAppMark } from "./brand-marks";
import { SiteNav } from "./site-nav";

export type { SitePage };

/** 32 Header of the public website: Product and Resources lists, the other pages, Sign in and Get started; `current` marks where the visitor is. */
export function SiteHeader({ current, white = true }: { current?: SitePage; white?: boolean }) {
  return (
    <header data-site-theme="" className={`relative z-30 border-b ${white ? "border-line bg-white" : "border-line-soft"}`}>
      <div className="mx-auto flex max-w-[1160px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:gap-6">
        <LogoLink href="/" adaptive />
        <SiteNav current={current} />
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
              Branded Android and iOS apps for academies, shops, restaurants, clinics, gyms, events, charities and more, from the website you already run, or from
              no website at all.
            </p>
            {/* 41 The five stores. */}
            <StoreMarks stores={[...APP_STORES]} label="App stores Yallapp publishes to" size={16} tone="dark" />
            {full ? (
              <a
                href={contact.whatsappUrl}
                className="flex h-[46px] items-center gap-2 self-start rounded-[10px] bg-ivory px-[18px] text-[15px] font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
              >
                <WhatsAppMark size={20} />
                Talk to us on WhatsApp
              </a>
            ) : null}
          </div>
          <nav aria-label="Product" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>PRODUCT</FooterHeading>
            {[...PRODUCT_LINKS, { id: "pricing", href: "/pricing", label: "Pricing" }, { id: "demo", href: "/demo", label: "Demo" }].map((page) => (
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
            <Link href="/docs/galaxy-store" className={footerLink}>Publish on Galaxy Store</Link>
            <Link href="/docs/huawei-appgallery" className={footerLink}>Publish on AppGallery</Link>
            <Link href="/docs/xiaomi-getapps" className={footerLink}>Publish on GetApps</Link>
            <Link href="/developers" className={footerLink}>API reference</Link>
            <Link href="/faq" className={footerLink}>FAQ</Link>
          </nav>
          <nav aria-label="Account" className="flex flex-[1_1_140px] flex-col gap-3 text-[15px]">
            <FooterHeading>ACCOUNT</FooterHeading>
            <AccountLink href="/sign-in" signedIn="Your dashboard" className={footerLink}>
              Sign in
            </AccountLink>
            <AccountLink href="/sign-up" signedIn={null} className={footerLink}>
              Create an account
            </AccountLink>
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
                <WhatsAppMark size={18} />
                {contact.whatsappDisplay}
              </a>
              <a href={`mailto:${contact.email}`} className={`${footerLink} flex items-center gap-2`}>
                <Icon name="mail" size={18} />
                {contact.email}
              </a>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-night-line pt-6 text-sm">
          <span>{legalLine()}</span>
          {full ? (
            <span className="max-w-[640px]">
              Google Play, the App Store, WordPress, Shopify and the other names and logos on this site are trademarks of their owners. Yallapp is not affiliated with
              the stores and platforms it works with.
            </span>
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
      <span>{legalLine()}</span>
      <span className="flex gap-5">
        <Link href="/terms" className="text-muted">Terms</Link>
        <Link href="/privacy" className="text-muted">Privacy</Link>
        <a href={contact.whatsappUrl} className="text-muted">Support</a>
      </span>
    </footer>
  );
}
