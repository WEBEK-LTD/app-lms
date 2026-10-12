import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { btn } from "@/components/ui";
import { checkResetToken } from "@/lib/auth/reset";
import { getStore } from "@/lib/data";
import { ResetPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const check = value ? await checkResetToken(await getStore(), value, new Date()) : { ok: false as const, reason: "invalid" as const };

  return (
    <AuthShell>
      <main className="flex flex-1 items-center justify-center px-4 pt-8 pb-14 sm:px-6">
        {check.ok ? (
          <ResetPasswordForm token={value} />
        ) : (
          <section className="flex w-full max-w-[440px] flex-col gap-5 rounded-[20px] border border-line bg-white px-5 py-8 sm:px-8 sm:py-9">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">
              {check.reason === "expired" ? "This link has expired" : "This link can't be used"}
            </h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">
              Reset links work once and expire after 1 hour. Ask for a new one and use the latest email we send.
            </p>
            <Link href="/forgot-password" className={`${btn.primary} h-[50px]`}>
              Ask for a new link
            </Link>
          </section>
        )}
      </main>
    </AuthShell>
  );
}
