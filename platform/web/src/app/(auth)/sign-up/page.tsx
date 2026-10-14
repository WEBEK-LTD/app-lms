import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Create an account" };

const NEXT_STEPS = [
  { title: "Create your account", text: "It takes a minute." },
  { title: "Confirm your plan", text: "Pay by card when it's offered, or talk to us on WhatsApp. We activate your account." },
  { title: "Set up your app", text: "Connect your content, add your branding and download your Android and iOS files." },
];

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  return (
    <AuthShell
      footer={false}
      aside={
        <span className="text-[15px] text-muted">
          Have an account?{" "}
          <Link href="/sign-in" className="font-bold">
            Sign in
          </Link>
        </span>
      }
    >
      <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-wrap items-stretch gap-6 px-4 pt-6 pb-14 sm:px-6">
        <SignUpForm />
        <aside aria-labelledby="h-next" className="on-dark flex flex-[2_1_300px] flex-col gap-6 rounded-[20px] bg-midnight px-5 py-8 text-night-text sm:px-8 sm:py-9">
          <h2 id="h-next" className="m-0 text-[22px] font-extrabold text-ivory">
            What happens next
          </h2>
          <ol className="m-0 flex list-none flex-col gap-[22px] p-0">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full font-extrabold ${index === 0 ? "bg-ember text-midnight" : "bg-night-2 text-ivory"}`}
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-ivory">{step.title}</span>
                  <span className="text-sm leading-normal">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </main>
    </AuthShell>
  );
}
