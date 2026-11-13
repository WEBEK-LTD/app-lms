/* eslint-disable @next/next/no-img-element -- the demo's own screenshots, in the approved phone frames. */
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { formatMessage, messagesFor } from "@/i18n";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { DataStore } from "@/lib/data/store";
import { demoAppOfType } from "@/lib/demo/apps";
import { DEMO_SIGN_IN, demoKind, type DemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { liveLanguage } from "@/lib/demo/loops";
import { demoFacts, demoOfSlug, pickerPath, productOf, sameBusiness, slugOf } from "@/lib/demo/picker";
import { appUrl, signingSecret } from "@/lib/env";
import { demoGuideFor } from "@/lib/marketing-lang";
import { createPreviewToken, previewAppPath, previewKey } from "@/lib/preview/token";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { demoDownloads } from "@/site/demo";
import { pickerContext } from "../context";
import { LivePhone, type LiveApp } from "../live-phone";
import { BackLink, businessName, cardWords, demoScreens, PickerShell, ProductBadge, STUDIO } from "../parts";

export async function generateMetadata({ params }: PageProps<"/start/[demo]">): Promise<Metadata> {
  const demo = demoOfSlug((await params).demo);
  const { t } = await dashboardText();
  return { title: demo ? DEMO_BRANDS[demo].appName : t("start.title"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

/**
 * 127 Step 2, a real app to try: the demo with three of its own screens,
 * what it is, its facts counted from the demo (pages, entries, languages),
 * where it opens (the App editor or Yallapp Studio, on their plans), "Start
 * with this app", the demo's download to try it on a phone (as /demo has
 * it), and the other demos of the same business, Studio's in their dark
 * section. 128.9 The middle phone runs the real demo app (the app
 * preview), its screenshot shown until it is ready (live-phone.tsx).
 */
export default async function PickPage({ params }: PageProps<"/start/[demo]">) {
  const { demo, adding, context } = await pickerContext((await params).demo);
  const text = await dashboardText();
  const { t, lang } = text;
  const studio = productOf(demo) === "studio";
  const brand = DEMO_BRANDS[demo];
  const facts = demoFacts(demo);
  const screens = demoScreens(text, demo);
  const [center, left, right] = [screens[0]!, screens[1] ?? null, screens[2] ?? null];
  const guide = demoGuideFor(lang, demo);
  const ready = (await demoDownloads())[demo] ?? false;
  const license = context.apps.length ? null : context.license;
  const store = await getStore();
  const offered = appTypeOn(await getSwitches(store), demoKind(demo).engine, license?.plan ?? null);
  const live = await liveApp(store, demo, lang, t("start.liveFrame", { app: brand.appName }));
  const others = sameBusiness(demo);
  const business = businessName(text, demo);
  const side = "h-[150px] w-[68px] rounded-[14px] border-[4px] md:h-[368px] md:w-[170px] md:rounded-[28px] md:border-[6px] translate-y-[18px]";
  // 128.9 The live phone: its height is the app's (360 × 780) at the frame's width.
  const middle = "w-[150px] rounded-[22px] border-[5px] md:w-[224px] md:rounded-[34px] md:border-[7px] shadow-[0_30px_60px_rgba(14,13,36,0.25)]";
  return (
    <PickerShell step={2} back={<BackLink href={pickerPath({ adding, product: productOf(demo) })} label={business} />}>
      <div className="flex flex-wrap items-center gap-10 rounded-[32px] bg-[var(--pk-hero)] p-5 sm:p-9" data-demo-page={demo} data-product={productOf(demo)}>
        <div className="flex min-w-0 flex-[1_1_520px] items-end justify-center gap-2.5 sm:gap-[18px]">
          {left ? <Shot {...left} className={side} /> : null}
          <LivePhone shot={center} live={live} labels={{ tryLive: t("start.liveTry"), opening: t("start.liveOpening") }} className={middle} />
          {right ? <Shot {...right} className={side} /> : null}
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="flex h-7 items-center rounded-[14px] bg-[var(--pk-surface)] px-3 text-[13px] font-bold">{t("start.live")}</span>
            <ProductBadge text={text} id={demo} long />
          </div>
          <h1 className="m-0 text-[36px] leading-[1.02] font-extrabold tracking-[-0.03em] break-words sm:text-[48px]">{brand.appName}</h1>
          <p className="m-0 text-lg leading-normal text-[var(--pk-ink2)]">{guide.summary}</p>
          {live ? (
            <a href={live.src} target="_blank" rel="noopener" data-live-full="" className="flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold text-[var(--pk-accent-text)] no-underline hover:underline">
              <Icon name="open_in_new" size={18} />
              {t("start.liveFull")}
            </a>
          ) : null}
          <dl className="m-0 grid grid-cols-3 gap-2.5">
            {(
              [
                [facts.pages, t("start.pages", { count: facts.pages }), "pages"],
                [facts.items.count, t(`start.items.${facts.items.noun}.inside` as DashKey, { count: facts.items.count }), "items"],
                [facts.languages.length, t("start.languages", { count: facts.languages.length }), "languages"],
              ] as const
            ).map(([n, label, key]) => (
              <div key={key} className="flex flex-col-reverse rounded-2xl bg-[var(--pk-surface)] p-3" data-fact={key}>
                <dt className="text-[13px] text-[var(--pk-ink2)]">{label}</dt>
                <dd className="m-0 text-[22px] font-extrabold">{n}</dd>
              </div>
            ))}
          </dl>
          {offered ? (
            <div className="mt-1 flex flex-wrap gap-2.5">
              <Link href={pickerPath({ demo, make: true, adding })} className="flex h-14 items-center rounded-2xl bg-[var(--pk-ink)] px-[26px] text-[17px] font-bold text-[var(--pk-on-ink)] no-underline">
                {t("start.startWith")}
              </Link>
              <TryOnPhone text={text} demo={demo} ready={ready} />
            </div>
          ) : (
            <p role="status" className="m-0 rounded-[14px] bg-[var(--pk-surface)] px-3.5 py-3 text-sm">
              {t("start.unavailable")}
            </p>
          )}
          <div className="flex items-center gap-2.5 rounded-[14px] bg-[var(--pk-surface)] px-3.5 py-3 text-sm leading-[1.4]">
            <Icon name={studio ? "palette" : "web_asset"} size={20} />
            <span>{richText(t(studio ? "start.opensStudio" : "start.opensEditor"), { b: (chunk) => <b>{chunk}</b> })}</span>
          </div>
        </div>
      </div>
      {others.length ? <Others text={text} ids={others} business={business} adding={adding} /> : null}
      <div className="flex items-start gap-3 rounded-[18px] bg-[var(--pk-soft)] px-[18px] py-4 text-sm leading-normal">
        <Icon name="info" size={22} />
        <span>{richText(t("start.whichOne"), { b: (chunk) => <b>{chunk}</b> })}</span>
      </div>
    </PickerShell>
  );
}

/**
 * 128.9 The demo app in the app preview: a preview link to the demo app the
 * team made (Admin › Demo apps), its published pages, in the dashboard's
 * language when the demo has it. Null before the demo apps are made: the
 * phone keeps the screenshot.
 */
async function liveApp(store: DataStore, demo: DemoId, lang: string, title: string): Promise<LiveApp | null> {
  const app = await demoAppOfType(store, demo);
  if (!app) return null;
  const token = createPreviewToken({ appId: app.id, draft: false }, previewKey(signingSecret()));
  return { src: `${previewAppPath(token)}&lang=${liveLanguage(DEMO_BRANDS[demo].languages, lang)}`, appId: app.id, title };
}

function Shot({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`shrink-0 overflow-hidden border-solid border-[#0E0D24] bg-[#0E0D24] ${className}`}>
      <img src={src} alt={alt} className="block h-full w-full object-cover object-top" />
    </div>
  );
}

/** The demo's download, as /demo offers it: the QR code, the Android download, and the number and code to sign in. */
function TryOnPhone({ text, demo, ready }: { text: DashboardText; demo: DemoId; ready: boolean }) {
  const { t, lang } = text;
  const m = messagesFor(lang).demo;
  const slug = slugOf(demo);
  const href = `${appUrl().replace(/\/+$/, "")}/demo/download/${slug}`;
  return (
    <details className="group">
      <summary className="flex h-14 cursor-pointer list-none items-center gap-2 rounded-2xl border border-[var(--pk-ink)] px-5 text-base font-semibold [&::-webkit-details-marker]:hidden">
        <Icon name="smartphone" size={20} />
        {t("start.tryPhone")}
      </summary>
      <div className="mt-3 flex flex-wrap items-start gap-4 rounded-2xl bg-[var(--pk-surface)] p-4" data-try-phone="">
        {ready ? (
          <>
            <QrCode value={href} label={formatMessage(lang, m.qrLabel, { app: DEMO_BRANDS[demo].appName })} size={128} />
            <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 text-sm">
              <p className="m-0 leading-normal">{t("start.tryText")}</p>
              <a href={`/demo/download/${slug}`} className="flex h-11 items-center gap-2 self-start rounded-xl bg-[var(--pk-ink)] px-4 font-bold text-[var(--pk-on-ink)] no-underline">
                <Icon name="android" size={20} />
                {m.download}
              </a>
            </div>
          </>
        ) : (
          <p className="m-0 min-w-0 flex-[1_1_200px] text-sm leading-normal">{t("start.trySoon")}</p>
        )}
        <dl className="m-0 grid basis-full grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[var(--pk-ink2)]">{m.phone}</dt>
            <dd className="m-0 font-extrabold" dir="ltr">
              {DEMO_SIGN_IN.display}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--pk-ink2)]">{m.code}</dt>
            <dd className="m-0 font-extrabold tracking-[2px]" dir="ltr">
              {DEMO_SIGN_IN.code}
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

/** The other demos of the same business, each in its product's look: Studio's dark with gold, the App editor's light. */
function Others({ text, ids, business, adding }: { text: DashboardText; ids: DemoId[]; business: string; adding: boolean }) {
  const { t } = text;
  const studio = ids.filter((id) => productOf(id) === "studio");
  const editor = ids.filter((id) => productOf(id) === "editor");
  const card = (id: DemoId, dark: boolean) => {
    const shot = demoScreens(text, id)[0]!;
    const words = cardWords(text, id);
    return (
      <li key={id} className="flex gap-4 rounded-[24px] p-4" data-demo={id} style={dark ? { background: STUDIO.card, border: `1px solid ${STUDIO.cardLine}` } : { background: "var(--pk-surface)", border: "1px solid var(--pk-line)" }}>
        <div className="h-[224px] w-[104px] shrink-0 overflow-hidden rounded-[20px] border-[5px] border-solid border-[#0E0D24] bg-[#0E0D24]">
          <img src={shot.src} alt={shot.alt} className="block h-full w-full object-cover object-top" loading="lazy" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="self-start">
            <ProductBadge text={text} id={id} long={!dark} />
          </span>
          <h3 className="m-0 text-xl font-extrabold">{DEMO_BRANDS[id].appName}</h3>
          <p className="m-0 text-sm leading-[1.45]" style={{ color: dark ? STUDIO.muted : "var(--pk-ink2)" }}>
            {words.line}
          </p>
          <div className="grow" />
          <Link
            href={pickerPath({ demo: id, adding })}
            className="flex h-11 items-center self-start rounded-[14px] px-4 text-[15px] font-semibold no-underline"
            style={dark ? { border: `1px solid ${STUDIO.text}`, color: STUDIO.text } : { border: "1px solid var(--pk-ink)", color: "var(--pk-ink)" }}
          >
            {t("start.see")}
            <span className="sr-only">: {DEMO_BRANDS[id].appName}</span>
          </Link>
        </div>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-3.5">
      {studio.length ? (
        <section aria-labelledby="pk-more-studio" data-section="studio" className="flex flex-col gap-4 rounded-[28px] p-4 sm:p-6" style={{ background: STUDIO.bg, color: STUDIO.text }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="pk-more-studio" className="m-0 text-[22px] font-extrabold tracking-[-0.01em]">
              {t("start.moreStudio", { business })}
            </h2>
            <span className="flex h-6 items-center rounded-xl bg-[#E6C26E] px-2.5 text-xs font-extrabold text-[#0E0D24]">{t("start.badgeStudio")}</span>
            <span className="text-sm" style={{ color: STUDIO.muted }}>
              {t("start.moreStudioText")}
            </span>
          </div>
          <ul className="m-0 grid list-none gap-[18px] p-0 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">{studio.map((id) => card(id, true))}</ul>
        </section>
      ) : null}
      {editor.length ? (
        <section aria-labelledby="pk-more-editor" data-section="editor" className="flex flex-col gap-4 rounded-[28px] border border-[var(--pk-line)] p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="pk-more-editor" className="m-0 text-[22px] font-extrabold tracking-[-0.01em]">
              {t("start.moreEditor", { business })}
            </h2>
            <span className="text-sm text-[var(--pk-ink2)]">{t("start.moreEditorText")}</span>
          </div>
          <ul className="m-0 grid list-none gap-[18px] p-0 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">{editor.map((id) => card(id, false))}</ul>
        </section>
      ) : null}
    </div>
  );
}
