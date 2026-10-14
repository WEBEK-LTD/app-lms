import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth/session";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSettingsValues } from "@/lib/hosted/settings-form";
import { AppSignInForm } from "./forms";

export const metadata: Metadata = { title: "App sign-in" };

/** Sign-in rules for apps on the hosted API. Apps on WordPress set them in the Yallapp plugin. */
export default async function AppSignInPage() {
  const { app } = await requireClient();
  if (!app || app.backend !== "hosted") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[28px] font-extrabold">App sign-in</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Your app signs customers in through your website: set the rules in the Yallapp plugin in WordPress.{" "}
          <Link href="/dashboard/setup">Back to app setup</Link>
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">App sign-in</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Customers sign in to your app with their phone number and a 6-digit code. Changes apply at once, without a new build.
        </p>
      </div>
      <section aria-label="Sign-in rules" className="flex max-w-[760px] flex-col rounded-2xl border border-line bg-white p-5 sm:p-6">
        <AppSignInForm current={hostedSettingsValues(hostedSettings(app))} />
      </section>
    </div>
  );
}
