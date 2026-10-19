"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { SIGNED_IN_COOKIE } from "@/lib/auth/signed-in-cookie";

const noSubscribe = () => () => {};
const readSignedIn = () => document.cookie.split("; ").includes(`${SIGNED_IN_COOKIE}=1`);

/** True when someone is signed in on this browser (after the page has loaded; false while it renders on the server). */
export function useSignedIn(): boolean {
  return useSyncExternalStore(noSubscribe, readSignedIn, () => false);
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
