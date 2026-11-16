"use client";

import type { CSSProperties, ReactNode } from "react";
import type { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import type { SystemLook } from "@/lib/studio/premium-chrome";
import type { SignInLook } from "@/lib/studio/screens";

/**
 * 132.6 Studio › Screens' preview of sign-in, the code screen and a new
 * account, as the app draws them (mobile/lib/modules/shared/auth): in the
 * system screens' look when sign-in follows it (`PremiumAuthFrame`), else
 * in sign-in's own look (classic, photo, card, minimal, premium;
 * `sign_in_screen.dart` and `auth_look.dart`), with "Not now" where the
 * app has it, in light or dark.
 */

export type AuthScreen = "sign_in" | "code" | "signup";

type T = ReturnType<typeof useDashT>;

/** 119 The app's colours in light or dark mode, for the previews. */
export function previewTheme(dark: boolean) {
  return dark
    ? { page: "#121614", surface: "#1C2320", text: "#EEF1EF", muted: "#A3ADA8", line: "#2A322E", field: "#151B18", fieldLine: "#36403B", placeholder: "#3A4440" }
    : { page: "#F7F3EC", surface: "#FFFFFF", text: "#0E1424", muted: "#5B6470", line: "#EFE9DE", field: "#FFFFFF", fieldLine: "#D9D3C7", placeholder: "#D9D3C7" };
}

function mix(hex: string, other: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const c = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
}

function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface AuthPreviewProps {
  screen: AuthScreen;
  look: SignInLook;
  /** The system screens' look sign-in follows; null, its own. */
  chrome: SystemLook | null;
  /** The photo drawn: the system look's (else sign-in's) when following it, else sign-in's. */
  photo: string | null;
  title: string;
  subtitle: string;
  appName: string;
  color: string;
  second: string | null;
  dark: boolean;
  t: T;
}

/** The form of each screen: the phone number, the six boxes of the code, or the name and email. */
function Form({ screen, th, color, gold, t }: { screen: AuthScreen; th: ReturnType<typeof previewTheme>; color: string; gold?: boolean; t: T }) {
  const field = <span className="block h-6 w-full rounded-md border" style={{ borderColor: th.fieldLine, background: th.field }} />;
  const button: CSSProperties = gold ? { background: "linear-gradient(90deg,#E7C982,#B8893A)", color: "#2A1D05" } : { background: color, color: "#FFFFFF" };
  return (
    <>
      {screen === "code" ? (
        <span className="flex gap-1" dir="ltr">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="block h-6 flex-1 rounded-md border" style={{ borderColor: i === 0 ? color : th.fieldLine, background: th.field }} />
          ))}
        </span>
      ) : screen === "signup" ? (
        <>
          {field}
          {field}
        </>
      ) : (
        field
      )}
      <span className="flex h-6 w-full items-center justify-center rounded-md font-bold" style={button}>
        {t(screen === "code" ? "studio.previewCodeButton" : screen === "signup" ? "studio.previewSignupButton" : "studio.previewButton")}
      </span>
    </>
  );
}

function Frame({ dark, th, children, chrome }: { dark: boolean; th: ReturnType<typeof previewTheme>; children: ReactNode; chrome?: string }) {
  return (
    <div
      className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight text-[10px]"
      style={{ background: th.page }}
      data-testid="sign-in-preview"
      data-dark={dark ? "" : undefined}
      data-auth-look={chrome}
    >
      {children}
    </div>
  );
}

/** "Not now" on sign-in, or the way back on the screens after it. */
function TopRow({ screen, onColour, th, t }: { screen: AuthScreen; onColour: boolean; th: ReturnType<typeof previewTheme>; t: T }) {
  const ink = onColour ? "#FFFFFF" : th.text;
  return (
    <div className="absolute inset-x-2 top-2 z-[1] flex items-center justify-between">
      {screen === "sign_in" ? (
        <span />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: onColour ? "rgba(255,255,255,.22)" : alpha(th.text, 0.08), color: ink }}>
          <Icon name="arrow_back" size={12} />
        </span>
      )}
      {screen === "sign_in" ? (
        <span data-testid="preview-not-now" className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: ink, background: onColour ? "rgba(255,255,255,.18)" : "transparent" }}>
          {t("studio.previewNotNow")}
        </span>
      ) : null}
    </div>
  );
}

const heading = (screen: AuthScreen, title: string, t: T) => (screen === "code" ? t("studio.previewCodeTitle") : screen === "signup" ? t("studio.previewSignupTitle") : title);

export function AuthPreview(props: AuthPreviewProps) {
  return props.chrome ? <ChromeAuthPreview {...props} chrome={props.chrome} /> : <OwnAuthPreview {...props} />;
}

/** 130.24 The system screens' look: the hero (the photo under a shade, the brand's gradient, a tint of the main colour, or the petal wash), the form on a rounded sheet. */
function ChromeAuthPreview({ screen, look, chrome, photo, title, subtitle, appName, color, second, dark, t }: AuthPreviewProps & { chrome: SystemLook }) {
  const th = previewTheme(dark);
  const accent = second ?? "#FF5A1F";
  const petal = chrome === "petal";
  const shown = chrome === "photo" || petal ? photo : null;
  const tinted = chrome === "large" || (petal && !shown);
  const ink = tinted ? th.text : "#FFFFFF";
  const hero = petal && !shown
    ? `radial-gradient(120% 90% at 50% 0%, ${alpha(color, dark ? 0.42 : 0.24)}, transparent 65%), radial-gradient(60% 70% at 100% 10%, ${alpha(accent, dark ? 0.3 : 0.24)}, transparent 70%), ${dark ? mix(color, "#000000", 0.78) : mix(color, "#FFFFFF", 0.9)}`
    : tinted
      ? mix(th.page, color, dark ? 0.24 : 0.12)
      : `linear-gradient(140deg, ${color}, ${mix(color, accent, 0.55)})`;
  const compact = screen !== "sign_in";
  return (
    <Frame dark={dark} th={th} chrome={chrome}>
      <div className="absolute inset-x-0 top-0" style={{ height: compact ? "36%" : "48%", background: hero }}>
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0" style={{ background: petal ? `linear-gradient(180deg, ${alpha(color, 0.3)}, ${alpha(color, 0.12)} 40%, rgba(0,0,0,.6))` : "linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,.08) 40%, rgba(0,0,0,.65))" }} />
          </>
        ) : null}
      </div>
      <TopRow screen={screen} onColour={!tinted} th={th} t={t} />
      <div className="absolute inset-x-3 flex flex-col gap-1" style={{ top: compact ? "13%" : "17%", color: ink }}>
        {look.show_logo && screen === "sign_in" ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-extrabold" style={{ background: "rgba(255,255,255,.22)", borderColor: "rgba(255,255,255,.4)", color: tinted ? color : "#FFFFFF" }}>
            {(appName || "A").slice(0, 1)}
          </span>
        ) : null}
        <span className="text-[15px] leading-tight font-extrabold" style={{ letterSpacing: "-0.02em" }}>
          {heading(screen, title, t)}
        </span>
        {screen === "sign_in" ? <span className="leading-snug opacity-80">{subtitle}</span> : null}
      </div>
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-2.5 pt-3 pb-3"
        style={{ top: compact ? "33%" : "45%", background: chrome === "glass" ? (dark ? "rgba(23,22,46,.94)" : "rgba(255,255,255,.94)") : th.page, borderTopLeftRadius: 14, borderTopRightRadius: 14, boxShadow: "0 -4px 14px rgba(0,0,0,.12)", color: th.text }}
      >
        <Form screen={screen} th={th} color={color} t={t} />
      </div>
    </Frame>
  );
}

/** 118.3 and 123 Sign-in's own looks; 132.6 the code screen and a new account in them too. */
function OwnAuthPreview({ screen, look, photo, title, subtitle, appName, color, dark, t }: AuthPreviewProps) {
  const th = previewTheme(dark);
  if (look.style === "premium") {
    return (
      <Frame dark={dark} th={th}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0" style={{ background: `linear-gradient(200deg,#D9B36C 0%,${color} 45%,#0E1424 100%)` }} />
        )}
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,transparent 0%,transparent 35%,${th.page} 72%)` }} />
        <TopRow screen={screen} onColour th={th} t={t} />
        <div className="absolute inset-x-3 top-7 flex flex-col gap-1.5 text-white">
          {look.show_logo && screen === "sign_in" ? (
            <span className="flex items-center gap-1.5 font-extrabold">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-[10px]">{(appName || "A").slice(0, 1)}</span>
              {appName}
            </span>
          ) : null}
          <span className="mt-2 text-[17px] leading-tight font-black">{heading(screen, title, t)}</span>
          {screen === "sign_in" ? <span className="leading-snug opacity-80">{subtitle}</span> : null}
        </div>
        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-xl border p-2.5 shadow" style={{ background: th.surface, borderColor: th.line, color: th.text }}>
          <Form screen={screen} th={th} color={color} gold t={t} />
        </div>
      </Frame>
    );
  }
  const shown = (look.style === "photo" || look.style === "card") && photo ? photo : null;
  const panel = look.style === "photo" && shown;
  const minimal = look.style === "minimal";
  return (
    <Frame dark={dark} th={th}>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className={`absolute inset-x-0 top-0 w-full object-cover ${look.style === "photo" ? "h-full" : "h-[38%]"}`} />
      ) : null}
      {panel ? <span className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" /> : null}
      <TopRow screen={screen} onColour={Boolean(shown)} th={th} t={t} />
      <div
        className={`absolute inset-x-2.5 flex flex-col gap-1.5 ${look.style === "card" && shown ? "top-[33%] rounded-xl p-2.5 shadow" : minimal ? "top-[24%] items-center text-center" : panel ? "bottom-3 rounded-xl p-2.5" : "bottom-4"}`}
        style={{ color: th.text, background: look.style === "card" && shown ? th.page : panel ? th.surface : undefined }}
      >
        {look.show_logo && screen === "sign_in" ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: color }}>
            {(appName || "A").slice(0, 1)}
          </span>
        ) : null}
        <span className="text-[13px] leading-tight font-extrabold">{heading(screen, title, t)}</span>
        {screen === "sign_in" ? (
          <span className="leading-snug" style={{ color: th.muted }}>
            {subtitle}
          </span>
        ) : null}
        <span className="mt-1 flex w-full flex-col gap-1.5">
          <Form screen={screen} th={th} color={color} t={t} />
        </span>
      </div>
    </Frame>
  );
}
