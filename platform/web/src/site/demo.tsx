import type { Metadata } from "next";
import Link from "next/link";
import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { CheckList, MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { QrCode } from "@/components/qr-code";
import { Notice } from "@/components/ui";
import { getContact } from "@/lib/contact";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { getStore } from "@/lib/data";
import { demoDownloadBuild, listDemoApps } from "@/lib/demo/apps";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_SLUGS, DEMO_TYPES, demoIdOf, demoKind, type DemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { appUrl } from "@/lib/env";
import { demoGuideFor, kindNameFor, screenAltFor, solutionFor } from "@/lib/marketing-lang";
import { siteMetadata } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";

export function demoMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.demoTitle, description: m.demoDescription, path: "/demo" });
}

async function downloads(): Promise<Partial<Record<DemoId, boolean>>> {
  try {
    const store = await getStore();
    const out: Partial<Record<DemoId, boolean>> = {};
    for (const app of await listDemoApps(store)) out[demoIdOf(app)] = (await demoDownloadBuild(store, app)) !== null;
    return out;
  } catch {
    // Without the database (as during a build) every demo shows "Coming soon".
    return {};
  }
}

/** Which demo apps can be downloaded now (also for /demo/studio). */
export const demoDownloads = downloads;

/** /demo (roadmap 16): the demo apps people can install and try before they pay (21 the clinic, 23 the news app, 26 the café, 27 the gym, 28 the events app, 29 the charity too), 55 in any language. */
export async function DemoPage({ lang, download }: { lang: Lang; download?: string | string[] }) {
  const [ready, contact] = await Promise.all([downloads(), getContact()]);
  const m = messagesFor(lang).demo;
  const alt = screenAltFor(lang);
  return (
    <MarketingPage
      current="demo"
      eyebrow={m.eyebrow}
      title={m.title}
      intro={m.intro}
      aside={<DeviceFrame screen="academy-home" size="md" alt={alt["academy-home"]} priority />}
      lang={lang}
    >
      <Section>
        {download === "unavailable" ? (
          <Notice tone="warn" icon="info" role="status">
            {m.unavailable}
          </Notice>
        ) : null}
        <DemoSignIn lang={lang} />
      </Section>

      {DEMO_TYPES.map((type, index) => (
        <DemoAppSection key={type} type={type} lang={lang} ready={ready[type] ?? false} tinted={index % 2 === 0} />
      ))}

      <Section>
        <SectionTitle title={m.iphoneTitle} text={m.iphoneText} />
        <WhatsAppLink
          lines={contact.lines}
          className="flex h-[50px] items-center gap-2.5 self-start rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
        >
          <Icon name="phone_iphone" size={20} />
          {m.iphoneButton}
        </WhatsAppLink>
      </Section>
    </MarketingPage>
  );
}

/** How to sign in to every demo app: the shared number and code (also on /demo/studio). */
export function DemoSignIn({ lang }: { lang: Lang }) {
  const m = messagesFor(lang).demo;
  return (
    <div className="flex flex-wrap items-start gap-8 rounded-[20px] border border-line bg-sand p-6 sm:p-8">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.5px]">{m.signInTitle}</h2>
        <p className="m-0 text-[16px] leading-relaxed text-ink-4">{m.signInText}</p>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{formatMessage(lang, m.sharedText, { hours: DEMO_RETENTION_HOURS })}</p>
      </div>
      <dl className="m-0 grid flex-[1_1_260px] gap-3">
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5">
          <dt className="text-sm font-semibold text-muted">{m.phone}</dt>
          <dd className="m-0 text-[24px] font-extrabold tracking-[0.5px]" data-testid="demo-phone" dir="ltr">
            {DEMO_SIGN_IN.display}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-white p-5">
          <dt className="text-sm font-semibold text-muted">{m.code}</dt>
          <dd className="m-0 text-[24px] font-extrabold tracking-[2px]" data-testid="demo-code" dir="ltr">
            {DEMO_SIGN_IN.code}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** One demo app: what it is, what to try, its download (or "coming soon") and its screens (also on /demo/studio). */
export function DemoAppSection({ type, lang, ready, tinted }: { type: DemoId; lang: Lang; ready: boolean; tinted: boolean }) {
  const base = appUrl().replace(/\/+$/, "");
  const m = messagesFor(lang).demo;
  const alt = screenAltFor(lang);
  const guide = demoGuideFor(lang, type);
  const brand = DEMO_BRANDS[type];
  const slug = DEMO_SLUGS[type];
  const kind = demoKind(type);
  const href = `${base}/demo/download/${slug}`;
  const solution = solutionFor(lang, kind.marketing.slug);
  return (
    <Section id={slug} tinted={tinted}>
      <div className="flex flex-wrap items-start gap-10" aria-labelledby={`h-${slug}`} role="group">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <span className="flex items-center gap-2 text-[13px] font-bold tracking-[1px] text-accent uppercase">
              <Icon name={kind.marketing.icon} size={20} />
              {kindNameFor(lang, kind.name)}
            </span>
            <h2 id={`h-${slug}`} className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">
              {brand.appName}
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-ink-4">{guide.summary}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-lg font-bold">{m.whatToTry}</h3>
            <CheckList items={guide.tryThis} />
          </div>
          {ready ? (
            <div className="flex flex-wrap items-center gap-5">
              <QrCode value={href} label={formatMessage(lang, m.qrLabel, { app: brand.appName })} />
              <div className="flex flex-col gap-2.5">
                <a
                  href={`/demo/download/${slug}`}
                  className="flex h-[50px] items-center gap-2.5 self-start rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
                >
                  <Icon name="android" size={22} />
                  {m.download}
                </a>
                <span className="max-w-[300px] text-sm text-muted">{m.scan}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-[50px] items-center gap-2.5 self-start rounded-xl border border-line-strong bg-white px-[22px] text-base font-bold text-muted"
                aria-disabled="true"
              >
                <Icon name="hourglass_top" size={22} />
                <span>{m.comingSoon}</span>
              </span>
              <span className="text-sm text-muted">{m.onItsWay}</span>
            </div>
          )}
          <Link href={localePath(lang, `/solutions/${kind.marketing.slug}`)} className="flex items-center gap-1.5 self-start font-bold text-midnight no-underline hover:underline">
            {lang === "en" ? `About ${kind.name.toLowerCase()} apps` : formatMessage(lang, m.about, { apps: solution?.apps ?? kind.name })}
            <Icon name="arrow_forward" size={20} />
          </Link>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-wrap justify-center gap-5">
          {guide.screens.map((screen) => (
            <DeviceFrame key={screen} screen={screen} size="sm" alt={alt[screen]} />
          ))}
        </div>
      </div>
    </Section>
  );
}
