/* eslint-disable @next/next/no-img-element -- the demos' own screenshots, in the approved phone frames. */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LogoLink } from "@/components/brand";
import { Icon } from "@/components/icon";
import { DashboardI18n, DocumentLang } from "@/components/dashboard-i18n";
import { ThemeSwitch } from "@/components/theme-switch";
import { messagesFor } from "@/i18n";
import { dashboardMessages, knownEnglish, type DashKey } from "@/i18n/dashboard";
import { en as startWords } from "@/i18n/dashboard/start";
import { en as studioWords } from "@/i18n/dashboard/studio";
import { localePath } from "@/i18n/paths";
import { kindOf } from "@/lib/app/kinds";
import type { DemoId } from "@/lib/demo/constants";
import { demoKind } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import type { DemoLoop as DemoLoopFiles } from "@/lib/demo/loops";
import { businessOf, hasLookShot, lookShotName, productOf, screensOf, startLooks } from "@/lib/demo/picker";
import type { SignatureLook } from "@/lib/studio/demo-designs/signature";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { demoGuideFor, screenAltFor } from "@/lib/marketing-lang";
import { DemoLoop } from "./demo-loop";

/**
 * 127 The pieces of /start, as approved on 13 November 2026: the page with
 * its steps, the App editor's light cards and Yallapp Studio's dark ones
 * with gold, and the phone frame around a demo's screenshots.
 */

export const STUDIO = { bg: "#0E0D24", card: "#1B1A38", cardLine: "#4A4060", tile: "#26254A", line: "#33325A", text: "#F4EFE6", muted: "#B8B3C8", gold: "#E6C26E", goldLine: "#C9A24B", frame: "#07061A" } as const;

const TINTS = ["#EAE3D6", "#E7E6F3", "#E3F2E9", "#FBE4E1"];
const DARK_TINTS = ["#26254A", "#2A2950", "#232246"];

/** A card's tint, light and dark, by its place in the list. */
export function tintStyle(index: number): CSSProperties {
  return { "--tint": TINTS[index % TINTS.length], "--tint-dark": DARK_TINTS[index % DARK_TINTS.length] } as CSSProperties;
}

/** A demo's words on its card: its own (start.cards), else its kind's name and the demo's summary. */
export function cardWords(text: DashboardText, id: DemoId): { name: string; line: string } {
  if (id in startWords.cards) return { name: text.t(`start.cards.${id}.name` as DashKey), line: text.t(`start.cards.${id}.line` as DashKey) };
  return { name: text.k(demoKind(id).name), line: demoGuideFor(text.lang, id).summary };
}

/** The name of a demo's business ("Teaching and courses"), else its kind's. */
export function businessName(text: DashboardText, id: DemoId): string {
  const business = businessOf(id);
  return business in startWords.business ? text.t(`start.business.${business}` as DashKey) : text.k(kindOf({ appType: demoKind(id).engine, vertical: demoKind(id).vertical }).name);
}

/**
 * A screenshot of the demo in the approved phone frame: `width` × `height`, the frame's border `border`.
 * 128.9 With `loop`, the demo's short loop plays over it while in view (demo-loop.tsx).
 */
export function Phone({ src, alt, width, height, border, radius, frame = "#0E0D24", className = "", style, loop }: { src: string; alt: string; width: number; height: number; border: number; radius: number; frame?: string; className?: string; style?: CSSProperties; loop?: DemoLoopFiles }) {
  return (
    <div className={`shrink-0 overflow-hidden ${className}`} style={{ width, height, borderRadius: radius, border: `${border}px solid ${frame}`, background: frame, ...style }}>
      <div className="relative h-full w-full">
        <img src={src} alt={alt} className="block h-full w-full object-cover object-top" loading="lazy" decoding="async" />
        {loop ? <DemoLoop webm={loop.webm} mp4={loop.mp4} poster={src} /> : null}
      </div>
    </div>
  );
}

export function screenSrc(screen: string): string {
  return `/screens/${screen}.png`;
}

/** The demo's screens with their descriptions in the dashboard's language. */
export function demoScreens(text: DashboardText, id: DemoId): { src: string; alt: string }[] {
  const alt = screenAltFor(text.lang) as Record<string, string>;
  return screensOf(id).map((s) => ({ src: screenSrc(s), alt: alt[s] ?? DEMO_BRANDS[id].appName }));
}

// ——— 130 The Studio demos' two Signature looks ———

export interface LookShot {
  look: SignatureLook;
  /** Its home's picture, by day and by night; the demo's own while the look has none yet. */
  src: string;
  dark: string;
  alt: string;
  /** "Look A", and its name ("Living map") when its template is in Studio. */
  label: string;
  name: string | null;
}


/** A Studio demo's looks with their pictures (`<demo>-sig-<look>-home.png`), the demo's own screenshot until a look has its own. */
export function lookShots(text: DashboardText, id: DemoId): LookShot[] {
  const fallback = demoScreens(text, id)[0]!;
  return startLooks(id).map((look) => {
    const own = hasLookShot(lookShotName(id, look));
    const dark = hasLookShot(lookShotName(id, look, true));
    const key = `tpl_${id}_signature_${look}`;
    const name = key in studioWords ? text.t(`studio.${key}` as DashKey) : null;
    const label = text.t(look === "a" ? "start.lookA" : "start.lookB");
    return {
      look,
      src: own ? screenSrc(lookShotName(id, look)) : fallback.src,
      dark: dark ? screenSrc(lookShotName(id, look, true)) : own ? screenSrc(lookShotName(id, look)) : fallback.src,
      alt: name ? `${DEMO_BRANDS[id].appName} · ${name}` : fallback.alt,
      label,
      name,
    };
  });
}
// ——— end 130 ———

/** The product badge: "App editor" on a light card, "STUDIO" in gold on a dark one. */
export function ProductBadge({ text, id, long = false }: { text: DashboardText; id: DemoId; long?: boolean }) {
  if (productOf(id) === "studio") {
    return <span className="flex h-[26px] items-center rounded-[13px] bg-[#E6C26E] px-2.5 text-xs font-extrabold text-[#0E0D24]">{text.t("start.badgeStudio")}</span>;
  }
  return long ? (
    <span className="flex h-7 items-center rounded-[14px] border-2 border-[var(--pk-ink)] px-3 text-[13px] font-extrabold text-[var(--pk-ink)]">{text.t("start.badgeEditorLong")}</span>
  ) : (
    <span className="flex h-[26px] items-center rounded-[13px] bg-[var(--pk-surface)] px-2.5 text-xs font-bold text-[var(--pk-ink)]">{text.t("start.badgeEditor")}</span>
  );
}

/** The three steps, the current one filled. */
function Steps({ text, step }: { text: DashboardText; step: 1 | 2 | 3 }) {
  const names = [text.t("start.steps.choose"), text.t("start.steps.try"), text.t("start.steps.make")];
  return (
    <ol aria-label={text.t("start.steps.label")} className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0 text-sm font-semibold">
      {names.map((name, i) => (
        <li key={name} className="flex items-center gap-2.5">
          {i > 0 ? <span aria-hidden="true" className="h-0.5 w-6" style={{ background: i < step ? "var(--pk-ink)" : "var(--pk-line)" }} /> : null}
          {i + 1 === step ? (
            <span aria-current="step" className="flex h-8 items-center rounded-2xl bg-[var(--pk-ink)] px-3.5 text-[var(--pk-on-ink)]">
              {name}
            </span>
          ) : (
            <span className="text-[var(--pk-ink2)]">{name}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** The page: the dashboard's language and catalog for its forms, the logo, the back link and the steps. */
export async function PickerShell({ step, back, children, gap = "gap-8" }: { step: 1 | 2 | 3; back?: ReactNode; children: ReactNode; gap?: string }) {
  const text = await dashboardText();
  const { lang, dir } = text;
  return (
    <DashboardI18n lang={lang} messages={dashboardMessages(lang)} knownEnglish={lang === "en" ? {} : knownEnglish()}>
      <DocumentLang lang={lang} />
      <div data-site-theme="" lang={lang} dir={dir} className="picker picker-page min-h-screen font-sans" data-picker-step={step}>
        <div className={`mx-auto box-border flex w-full max-w-[1200px] flex-col ${gap} px-4 pt-7 pb-16 sm:px-6`}>
          <header className="flex flex-wrap items-center gap-4">
            {back ?? <LogoLink href={localePath(lang, "/")} adaptive height={26} alt={messagesFor(lang).nav.logoHome} />}
            <div className="grow" />
            <Steps text={text} step={step} />
            <ThemeSwitch label={messagesFor(lang).nav.darkMode} />
          </header>
          {children}
        </div>
      </div>
    </DashboardI18n>
  );
}

/** The back link at the top of steps 2 and 3. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex h-11 items-center gap-1.5 rounded-[22px] ps-2 pe-3.5 text-[15px] font-semibold text-[var(--pk-ink)] no-underline">
      <Icon name="chevron_left" size={22} />
      {label}
    </Link>
  );
}
