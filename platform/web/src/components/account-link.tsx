"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { SIGNED_IN_COOKIE } from "@/lib/auth/signed-in-cookie";

/** 62 Fired when this page clears the readable cookie, so links on it change at once. */
const CHANGED = "yallapp:signed-in";

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
};
const readSignedIn = () => document.cookie.split("; ").includes(`${SIGNED_IN_COOKIE}=1`);

/** True when someone is signed in on this browser (after the page has loaded; false while it renders on the server). */
export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, readSignedIn, () => false);
}

/**
 * 62 On a page only people without a valid session see (the sign-in and
 * sign-up pages redirect anyone signed in): a readable cookie left by a
 * session that ended on the server (signed out elsewhere, a new password)
 * is removed, so the public pages stop saying "Dashboard".
 */
export function ClearSignedIn() {
  useEffect(() => {
    if (!readSignedIn()) return;
    document.cookie = `${SIGNED_IN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return null;
}

/** A link for visitors that becomes another one for people who are signed in: "Create an account" or "Go to your dashboard". */
export function AccountLink({
  href,
  children,
  signedInHref = "/dashboard",
  signedIn,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  signedInHref?: string;
  /** What signed-in people see; nothing at all when null. */
  signedIn: ReactNode | null;
  className?: string;
  onClick?: () => void;
}) {
  const known = useSignedIn();
  if (known && signedIn === null) return null;
  return (
    <Link href={known ? signedInHref : href} className={className} onClick={onClick} data-account-link={known ? "signed-in" : "visitor"}>
      {known ? signedIn : children}
    </Link>
  );
}
