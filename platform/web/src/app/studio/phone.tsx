"use client";

import { StudioView, type StudioLook } from "@/components/studio/view";
import type { LanguageCode, StudioPage } from "@/lib/pages/types";
import { STUDIO_COLORS as C } from "./editor/shared";

/** The width a Studio page is drawn at before it is scaled into a small phone. */
const SCREEN_WIDTH = 360;

const NO_DATA = { items: {}, categories: {} };

/**
 * 103R.3 A project's home page, drawn small in a phone: on its card in
 * Studio's home (`card`, the top of the phone) and on its overview (`whole`).
 */
export function ProjectPhone({
  home,
  size,
  words,
}: {
  home: { page: StudioPage; look: StudioLook; lang: LanguageCode } | null;
  size: "card" | "whole";
  words: { price: string; addPicture: string; addVideo: string; send: string; search: string };
}) {
  const frame = size === "card" ? { width: 120, height: 170, pad: 6, radius: 18, inner: 13 } : { width: 150, height: 220, pad: 7, radius: 24, inner: 18 };
  const screenWidth = frame.width - frame.pad * 2;
  const scale = screenWidth / SCREEN_WIDTH;
  const screenHeight = frame.height - frame.pad * (size === "card" ? 1 : 2);
  return (
    <div
      aria-hidden="true"
      className="flex-none"
      style={{
        width: frame.width,
        height: frame.height,
        boxSizing: "border-box",
        background: C.ink,
        padding: size === "card" ? `${frame.pad}px ${frame.pad}px 0` : frame.pad,
        borderRadius: size === "card" ? `${frame.radius}px ${frame.radius}px 0 0` : frame.radius,
      }}
    >
      <div
        dir="ltr"
        style={{
          width: screenWidth,
          height: screenHeight,
          overflow: "hidden",
          position: "relative",
          background: "#FBF8F2",
          borderRadius: size === "card" ? `${frame.inner}px ${frame.inner}px 0 0` : frame.inner,
        }}
      >
        {home ? (
          <div style={{ width: SCREEN_WIDTH, minHeight: screenHeight / scale, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
            <StudioView page={home.page} lang={home.lang} defaultLang={home.lang} dark={false} look={home.look} pickable={NO_DATA} words={words} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
