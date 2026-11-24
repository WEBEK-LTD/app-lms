/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons, small files the site and the platform serve already sized. */
import type { MemberRef } from "./data";
import { safeImageSrc } from "./safe-url";

/** A member's picture, else their initial on one of six gradients (the design's a1–a6). */
export function Avatar({ member, size, className = "" }: { member: Pick<MemberRef, "id" | "name" | "avatarUrl">; size: number; className?: string }) {
  const tone = `a${(hash(member.id) % 6) + 1}`;
  const initial = (member.name.trim()[0] ?? "?").toUpperCase();
  const src = safeImageSrc(member.avatarUrl);
  return (
    <span className={`av ${tone} ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initial}
    </span>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
