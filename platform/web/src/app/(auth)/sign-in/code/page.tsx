import type { Metadata } from "next";
import { authMetadata, TwoStepPage } from "@/site/auth";

export const metadata: Metadata = authMetadata("en", "code", "/sign-in/code");

/** 70 The code from the authenticator app, after the password. */
export default async function Page() {
  return <TwoStepPage lang="en" />;
}
