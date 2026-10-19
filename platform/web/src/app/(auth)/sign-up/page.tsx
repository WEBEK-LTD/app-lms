import type { Metadata } from "next";
import { authMetadata, SignUpPage } from "@/site/auth";

export const metadata: Metadata = authMetadata("en", "signUp", "/sign-up");

export default function Page() {
  return <SignUpPage lang="en" />;
}
