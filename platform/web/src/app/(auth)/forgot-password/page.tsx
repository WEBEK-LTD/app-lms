import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/icon";
import { ForgotPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      aside={
        <Link href="/sign-in" className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-3 no-underline hover:text-midnight">
          <Icon name="arrow_back" size={20} />
          Back to sign in
        </Link>
      }
    >
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        <ForgotPasswordForm />
      </main>
    </AuthShell>
  );
}
