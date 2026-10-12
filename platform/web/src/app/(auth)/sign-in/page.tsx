import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  return (
    <AuthShell
      aside={
        <Link href="/" className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-3 no-underline hover:text-midnight">
          <Icon name="arrow_back" size={20} />
          Back to home
        </Link>
      }
    >
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        <SignInForm />
      </main>
    </AuthShell>
  );
}
