import type { Metadata } from "next";
import { authMetadata, SignInPage } from "@/site/auth";

export const metadata: Metadata = authMetadata("en", "signIn", "/sign-in");

export default function Page() {
  return <SignInPage lang="en" />;
}
