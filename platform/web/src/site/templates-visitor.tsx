"use client";

import type { ReactNode } from "react";
import { useSignedIn } from "@/components/account-link";

/** 106.13 What only visitors who aren't signed in see (the sign-in line under a template's buttons); nothing for people signed in. */
export function VisitorOnly({ children }: { children: ReactNode }) {
  return useSignedIn() ? null : <>{children}</>;
}
