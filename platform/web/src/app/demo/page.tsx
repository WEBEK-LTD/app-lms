import type { Metadata } from "next";
import Link from "next/link";
import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { CheckList, MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { QrCode } from "@/components/qr-code";
import { Notice } from "@/components/ui";
import { getContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { AppType } from "@/lib/data/types";
import { demoDownloadBuild, listDemoApps } from "@/lib/demo/apps";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_SLUGS, DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Try a demo app",
  description: "Install a real Yallapp app on your Android phone: an academy, a shop, a bookings app and a real estate app, with sample content.",
};
/** Whether each download is ready comes from the admin. */
export const dynamic = "force-dynamic";

const ICONS: Record<AppType, "school" | "storefront" | "calendar_month" | "apartment"> = {
  lms: "school",
  store: "storefront",
  booking: "calendar_month",
  real_estate: "apartment",
};

async function downloads(): Promise<Partial<Record<AppType, boolean>>> {
  try {
    const store = await getStore();
    const out: Partial<Record<AppType, boolean>> = {};
    for (const app of await listDemoApps(store)) out[app.appType] = (await demoDownloadBuild(store, app)) !== null;
    return out;
  } catch {
    // Without the database (as during a build) every demo shows "Coming soon".
    return {};
  }
}

/** /demo (roadmap 16): the four demo apps people can install and try before they pay. */
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const query = await searchParams;
  const [ready, contact] = await Promise.all([downloads(), getContact()]);
  const base = appUrl().replace(/\/+$/, "");
  return (
    <MarketingPage
      current="demo"
      eyebrow="Try before you pay"
      title="Try a real app on your phone"
      intro="Four demo apps, one for each kind of app we make: an academy, a shop, a bookings app and a real estate app. They're real apps with sample content, running the same way your app would."
      aside={<DeviceFrame screen="academy-home" size="md" priority />}
    >
      <Section>
        {query.download === "unavailable" ? (
          <Notice tone="warn" icon="info" role="status">
            That download isn&apos;t ready yet. Please try again soon, or message us on WhatsApp.
          </Notice>
        ) : null}
        <div className="flex flex-wrap items-start gap-8 rounded-[20px] border border-line bg-sand p-6 sm:p-8">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
            <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">How to sign in</h2>
            <p className="m-0 text-[16px] leading-relaxed text-ink-4">
              The demo apps don&apos;t send a code to your phone. When an app asks for your number, use the demo number and code below. The country code is
              already filled in.
            </p>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">
              Everyone trying a demo shares this account, so please don&apos;t enter personal details. Anything you add (orders, bookings, messages) is
              deleted after {DEMO_RETENTION_HOURS} hours, and checkout never asks for a card.
            </p>
          </div>
          <dl className="m-0 grid flex-[1_1_260px] gap-3">
            <div className="flex flex-col gap-1 rounded-2xl bg-white p-5">
              <dt className="text-sm font-semibold text-muted">Phone number</dt>
              <dd className="m-0 text-[24px] font-extrabold tracking-[0.5px]" data-testid="demo-phone">
                {DEMO_SIGN_IN.display}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-white p-5">
              <dt className="text-sm font-semibold text-muted">Code</dt>
              <dd className="m-0 text-[24px] font-extrabold tracking-[2px]" data-testid="demo-code">
                {DEMO_SIGN_IN.code}
              </dd>
            </div>
          </dl>
        </div>
      </Section>

      {DEMO_TYPES.map((type, index) => {
        const guide = DEMO_GUIDES[type];
        const brand = DEMO_BRANDS[type];
        const slug = DEMO_SLUGS[type];
        const href = `${base}/demo/download/${slug}`;
        return (
          <Section key={type} id={slug} tinted={index % 2 === 0}>
            <div className="flex flex-wrap items-start gap-10" aria-labelledby={`h-${slug}`} role="group">
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-2 text-[13px] font-bold tracking-[1px] text-accent uppercase">
                    <Icon name={ICONS[type]} size={20} />
                    {guide.label}
                  </span>
                  <h2 id={`h-${slug}`} className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">
                    {brand.appName}
                  </h2>
                  <p className="m-0 text-[17px] leading-relaxed text-ink-4">{guide.summary}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="m-0 text-lg font-bold">What to try</h3>
                  <CheckList items={guide.tryThis} />
                </div>
                {ready[type] ? (
                  <div className="flex flex-wrap items-center gap-5">
                    <QrCode value={href} label={`QR code to download ${brand.appName} for Android`} />
                    <div className="flex flex-col gap-2.5">
                      <a
                        href={`/demo/download/${slug}`}
                        className="flex h-[50px] items-center gap-2.5 self-start rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
                      >
                        <Icon name="android" size={22} />
                        Download for Android
                      </a>
                      <span className="max-w-[300px] text-sm text-muted">
                        Scan the code with your phone&apos;s camera, or open this page on your phone. Your phone may ask you to allow installing apps from your
                        browser.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="flex h-[50px] items-center gap-2.5 self-start rounded-xl border border-line-strong bg-white px-[22px] text-base font-bold text-muted"
                      aria-disabled="true"
                    >
                      <Icon name="hourglass_top" size={22} />
                      <span>Coming soon</span>
                    </span>
                    <span className="text-sm text-muted">The Android download is on its way.</span>
                  </div>
                )}
                <Link href={`/solutions/${slug}`} className="flex items-center gap-1.5 self-start font-bold text-midnight no-underline hover:underline">
                  About {guide.label.toLowerCase()} apps
                  <Icon name="arrow_forward" size={20} />
                </Link>
              </div>
              <div className="flex min-w-0 flex-[1_1_320px] flex-wrap justify-center gap-5">
                {guide.screens.map((screen) => (
                  <DeviceFrame key={screen} screen={screen} size="sm" />
                ))}
              </div>
            </div>
          </Section>
        );
      })}

      <Section>
        <SectionTitle
          title="On an iPhone?"
          text="iPhone demos are available on request through TestFlight, Apple's app for trying apps before they're in the App Store. Message us on WhatsApp with the email of your Apple Account and the demo you'd like to try."
        />
        <a
          href={contact.whatsappUrl}
          className="flex h-[50px] items-center gap-2.5 self-start rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
        >
          <Icon name="phone_iphone" size={20} />
          Ask for an iPhone demo
        </a>
      </Section>
    </MarketingPage>
  );
}
