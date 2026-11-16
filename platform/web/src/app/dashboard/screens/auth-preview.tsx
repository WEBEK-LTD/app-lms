"use client";

import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { authWords, rtlLanguage, type AuthWords } from "@/lib/studio/auth-preview-words";
import type { SystemLook } from "@/lib/studio/premium-chrome";
import type { SignInLook } from "@/lib/studio/screens";

/**
 * 132.6 Studio › Screens' preview of sign-in, the code screen and a new
 * account, as the app draws them (mobile/lib/modules/shared/auth): in the
 * system screens' look when sign-in follows it (`PremiumAuthFrame`), else
 * in sign-in's own look (classic, photo, card, minimal, premium;
 * `sign_in_screen.dart` and `auth_look.dart`), with "Not now" where the
 * app has it, in light or dark. 132.9 In the app's own words and reading
 * direction, with its logo; the same drawing makes the pictures of the
 * looks to choose from ([ScaledPhone]).
 */

export type AuthScreen = "sign_in" | "code" | "signup";

/** 119 The app's colours in light or dark mode, for the previews; 132.9 the app's own (mobile/lib/core/theme/palette.dart). */
export function previewTheme(dark: boolean) {
  return dark
    ? { page: "#0B0A1C", surface: "#17162E", text: "#F4EFE6", muted: "#B9B5CA", line: "#24223F", field: "#17162E", fieldLine: "#3A3756", placeholder: "#34314F" }
    : { page: "#F4EFE6", surface: "#FFFFFF", text: "#0E0D24", muted: "#5E5B70", line: "#EDE7DC", field: "#FFFFFF", fieldLine: "#D9D1C3", placeholder: "#D9D1C3" };
}

type Theme = ReturnType<typeof previewTheme>;

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
  /** The owner's welcome and the line under it in the preview's language; null, the app's own words. */
  title: string | null;
  subtitle: string | null;
  appName: string;
  color: string;
  second: string | null;
  dark: boolean;
  /** 132.9 The app language shown: its words and reading direction. */
  lang: string;
  /** 132.9 The app's logo (else its icon); none, its initial on the main colour. */
  logoUrl?: string | null;
  /** 132.9 A look's picture without a photo yet: a soft placeholder where the photo goes (the app draws a photo look without one as the classic one). */
  placeholder?: boolean;
  /** 132.9 A small picture: images load lazily. */
  thumb?: boolean;
}

/** The photo behind a look, or its placeholder. */
function Photo({ url, placeholder, color, className, thumb }: { url: string | null; placeholder?: boolean; color: string; className: string; thumb?: boolean }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading={thumb ? "lazy" : undefined} decoding="async" className={`object-cover ${className}`} />;
  }
  if (!placeholder) return null;
  return (
    <span aria-hidden="true" className={`flex items-center justify-center ${className}`} style={{ background: `linear-gradient(150deg, ${mix(color, "#FFFFFF", 0.55)}, ${mix(color, "#0E1424", 0.35)})`, color: "rgba(255,255,255,.75)" }} data-photo-placeholder="">
      <Icon name="image" size={30} />
    </span>
  );
}

/** The app's logo on its tile (the main colour, or frosted glass over a photo). */
function Logo({ url, appName, color, glass, size = 28 }: { url?: string | null; appName: string; color: string; glass?: boolean; size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-lg text-[11px] font-extrabold"
      style={{ width: size, height: size, background: glass ? "rgba(255,255,255,.22)" : url ? "#FFFFFF" : color, border: glass ? "1px solid rgba(255,255,255,.4)" : undefined, color: "#FFFFFF" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-0.5" />
      ) : (
        (appName.trim() || "A").slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** The form of each screen: the phone number, the six boxes of the code, or the name; then its button. */
function Form({ screen, th, color, gold, w }: { screen: AuthScreen; th: Theme; color: string; gold?: boolean; w: AuthWords }) {
  const field = (label: string) => (
    <span className="flex h-6 w-full items-center rounded-md border px-1.5 text-[8px]" style={{ borderColor: th.fieldLine, background: th.field, color: th.muted }}>
      {label}
    </span>
  );
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
        field(w.fullName)
      ) : (
        <span className="flex gap-1" dir="ltr">
          <span className="flex h-6 flex-none items-center rounded-md border px-1 text-[8px] font-semibold" style={{ borderColor: th.fieldLine, background: th.field, color: th.text }}>
            +90
          </span>
          {field(w.mobileNumber)}
        </span>
      )}
      <span className="flex h-6 w-full items-center justify-center gap-1 rounded-md font-bold" style={button} data-preview-button={gold ? "gold" : ""}>
        {screen === "code" ? w.verify : screen === "signup" ? w.createAccount : gold ? w.continueAction : w.sendCode}
        {gold ? <Icon name="arrow_forward" size={11} /> : null}
      </span>
    </>
  );
}

function Frame({ dark, th, children, chrome, style, rtl }: { dark: boolean; th: Theme; children: ReactNode; chrome?: string; style: string; rtl: boolean }) {
  return (
    <div
      className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight text-[10px]"
      style={{ background: th.page }}
      dir={rtl ? "rtl" : "ltr"}
      data-testid="sign-in-preview"
      data-dark={dark ? "" : undefined}
      data-auth-look={chrome}
      data-auth-style={chrome ? undefined : style}
    >
      {children}
    </div>
  );
}

/** "Not now" on sign-in, or the way back on the screens after it. */
function TopRow({ screen, onColour, th, w }: { screen: AuthScreen; onColour: boolean; th: Theme; w: AuthWords }) {
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
          {w.notNow}
        </span>
      ) : null}
    </div>
  );
}

const headingOf = (screen: AuthScreen, title: string, w: AuthWords) => (screen === "code" ? w.enterCode : screen === "signup" ? w.createYourAccount : title);

export const AuthPreview = memo(function AuthPreview(props: AuthPreviewProps) {
  return props.chrome ? <ChromeAuthPreview {...props} chrome={props.chrome} /> : <OwnAuthPreview {...props} />;
});

/** 130.24 The system screens' look: the hero (the photo under a shade, the brand's gradient, a tint of the main colour, or the petal wash), the form on a rounded sheet. */
function ChromeAuthPreview({ screen, look, chrome, photo, title, subtitle, appName, color, second, dark, lang, logoUrl, thumb }: AuthPreviewProps & { chrome: SystemLook }) {
  const th = previewTheme(dark);
  const w = authWords(lang);
  const rtl = rtlLanguage(lang);
  const accent = second ?? "#FF5A1F";
  const petal = chrome === "petal";
  const shown = chrome === "photo" || petal ? photo : null;
  const tinted = chrome === "large" || (petal && !shown);
  const ink = tinted ? th.text : "#FFFFFF";
  const hero =
    petal && !shown
      ? `radial-gradient(120% 90% at 50% 0%, ${alpha(color, dark ? 0.42 : 0.24)}, transparent 65%), radial-gradient(60% 70% at 100% 10%, ${alpha(accent, dark ? 0.3 : 0.24)}, transparent 70%), ${dark ? mix(color, "#000000", 0.78) : mix(color, "#FFFFFF", 0.9)}`
      : tinted
        ? mix(th.page, color, dark ? 0.24 : 0.12)
        : `linear-gradient(140deg, ${color}, ${mix(color, accent, 0.55)})`;
  const compact = screen !== "sign_in";
  return (
    <Frame dark={dark} th={th} chrome={chrome} style={look.style} rtl={rtl}>
      <div className="absolute inset-x-0 top-0" style={{ height: compact ? "36%" : "48%", background: hero }}>
        {shown ? (
          <>
            <Photo url={shown} color={color} className="absolute inset-0 h-full w-full" thumb={thumb} />
            <span className="absolute inset-0" style={{ background: petal ? `linear-gradient(180deg, ${alpha(color, 0.3)}, ${alpha(color, 0.12)} 40%, rgba(0,0,0,.6))` : "linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,.08) 40%, rgba(0,0,0,.65))" }} />
          </>
        ) : null}
      </div>
      <TopRow screen={screen} onColour={!tinted} th={th} w={w} />
      <div className="absolute inset-x-3 flex flex-col gap-1" style={{ top: compact ? "13%" : "17%", color: ink }}>
        {look.show_logo && screen === "sign_in" ? <Logo url={logoUrl} appName={appName} color={color} glass={!tinted} /> : null}
        <span className="text-[15px] leading-tight font-extrabold" style={{ letterSpacing: rtl ? undefined : "-0.02em" }}>
          {headingOf(screen, title ?? w.welcome, w)}
        </span>
        <span className="leading-snug opacity-80">{screen === "sign_in" ? (subtitle ?? w.intro) : screen === "code" ? w.codeSent : null}</span>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-2.5 pt-3 pb-3"
        style={{ top: compact ? "33%" : "45%", background: chrome === "glass" ? (dark ? "rgba(23,22,46,.94)" : "rgba(255,255,255,.94)") : th.page, borderTopLeftRadius: 14, borderTopRightRadius: 14, boxShadow: "0 -4px 14px rgba(0,0,0,.12)", color: th.text }}
      >
        <Form screen={screen} th={th} color={color} w={w} />
      </div>
    </Frame>
  );
}

/** 118.3 and 123 Sign-in's own looks; 132.6 the code screen and a new account in them too. */
function OwnAuthPreview({ screen, look, photo, title, subtitle, appName, color, dark, lang, logoUrl, placeholder, thumb }: AuthPreviewProps) {
  const th = previewTheme(dark);
  const w = authWords(lang);
  const rtl = rtlLanguage(lang);
  const heading = headingOf(screen, title ?? w.welcome, w);
  const line = screen === "sign_in" ? (subtitle ?? w.intro) : screen === "code" ? w.codeSent : null;
  if (look.style === "premium") {
    // 123 The welcome large in white over the photo (or the gold to the main colour), the form on a card at the foot, the button in gold.
    return (
      <Frame dark={dark} th={th} style="premium" rtl={rtl}>
        {photo ? <Photo url={photo} color={color} className="absolute inset-0 h-full w-full" thumb={thumb} /> : <span className="absolute inset-0" style={{ background: `linear-gradient(200deg,#D9B36C 0%,${color} 45%,#0E1424 100%)` }} />}
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,transparent 0%,transparent 35%,${th.page} 72%)` }} />
        <TopRow screen={screen} onColour th={th} w={w} />
        <div className="absolute inset-x-3 top-7 flex flex-col gap-1.5 text-white">
          {look.show_logo && screen === "sign_in" ? (
            <span className="flex items-center gap-1.5 font-extrabold">
              <Logo url={logoUrl} appName={appName} color={color} glass size={24} />
              <span className="truncate">{appName}</span>
            </span>
          ) : null}
          <span className="mt-2 text-[17px] leading-tight font-black">{heading}</span>
          {line ? <span className="leading-snug opacity-80">{line}</span> : null}
        </div>
        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-xl border p-2.5 shadow" style={{ background: th.surface, borderColor: th.line, color: th.text }} data-preview-premium-card="">
          {screen === "sign_in" ? (
            <>
              <span className="text-[11px] font-extrabold">{w.phoneTitle}</span>
              <span className="-mt-1 text-[7.5px] leading-snug" style={{ color: th.muted }}>
                {w.codeNote}
              </span>
            </>
          ) : null}
          <Form screen={screen} th={th} color={color} gold w={w} />
        </div>
      </Frame>
    );
  }
  const needsPhoto = look.style === "photo" || look.style === "card";
  const shown = needsPhoto ? photo : null;
  const hasPhoto = Boolean(shown) || (needsPhoto && placeholder === true);
  const panel = look.style === "photo" && hasPhoto;
  const card = look.style === "card" && hasPhoto;
  const minimal = look.style === "minimal";
  const plain = !panel && !card && !minimal;
  return (
    <Frame dark={dark} th={th} style={hasPhoto || !needsPhoto ? look.style : "classic"} rtl={rtl}>
      {hasPhoto ? <Photo url={shown} placeholder={placeholder} color={color} className={`absolute inset-x-0 top-0 w-full ${look.style === "photo" ? "h-full" : "h-[38%]"}`} thumb={thumb} /> : null}
      {panel ? <span className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" /> : null}
      {/* The classic page: the logo, the name and "Not now" in one row on top, as the app has them. */}
      {plain && screen === "sign_in" ? null : <TopRow screen={screen} onColour={hasPhoto} th={th} w={w} />}
      <div
        className={`absolute inset-x-2.5 flex flex-col gap-1.5 ${card ? "top-[33%] rounded-xl p-2.5 shadow" : minimal ? "top-[22%] items-center text-center" : panel ? "bottom-3 rounded-xl p-2.5" : plain && screen === "sign_in" ? "top-[3%]" : "top-[12%]"}`}
        style={{ color: th.text, background: card ? th.page : panel ? th.surface : undefined }}
        data-preview-form={panel ? "over-photo" : card ? "card-under-photo" : minimal ? "centred" : "page"}
      >
        {look.show_logo && screen === "sign_in" ? (
          minimal ? (
            <Logo url={logoUrl} appName={appName} color={color} size={34} />
          ) : (
            <span className="flex items-center gap-1.5">
              <Logo url={logoUrl} appName={appName} color={color} />
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold">{appName}</span>
              {plain ? (
                <span data-testid="preview-not-now" className="text-[8px] font-bold">
                  {w.notNow}
                </span>
              ) : null}
            </span>
          )
        ) : null}
        <span className={`leading-tight font-extrabold ${plain && screen === "sign_in" ? "mt-5 text-[15px]" : "text-[13px]"}`}>{heading}</span>
        {line ? (
          <span className="leading-snug" style={{ color: th.muted }}>
            {line}
          </span>
        ) : null}
        <span className="mt-1 flex w-full flex-col gap-1.5">
          <Form screen={screen} th={th} color={color} w={w} />
        </span>
      </div>
    </Frame>
  );
}

/**
 * 132.9 A phone drawn at [width] and shrunk to the space it has, as one
 * picture to choose from: the drawing is the preview's own, the size is
 * measured once and on resize (no request of its own).
 */
export function ScaledPhone({ children, width = 180, ratio = 19 / 9, label }: { children: ReactNode; width?: number; ratio?: number; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => el.clientWidth && setScale(el.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div ref={box} aria-hidden={label ? undefined : true} aria-label={label} className="pointer-events-none relative w-full overflow-hidden" style={{ aspectRatio: `1 / ${ratio}` }}>
      <div className="absolute top-0 left-0" style={{ width, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
}
