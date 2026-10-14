import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth/session";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSettingsValues } from "@/lib/hosted/settings-form";
import { chosenSignInMethods, emailSignInPossible, hostedSignInMethods, signInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { AppSignInForm, AppWhatsappForms, SignInMethodsForm } from "./forms";

export const metadata: Metadata = { title: "App sign-in" };

const sectionClass = "flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";

/**
 * How people sign in to the app (18: phone, email or both, and the owner's own
 * WhatsApp number) for apps on the hosted API and WordPress apps, and the
 * sign-in rules of apps on the hosted API (WordPress sets those in the plugin).
 */
export default async function AppSignInPage() {
  const { app, client } = await requireClient();
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">App sign-in</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {app?.backend === "custom_api"
            ? "Your own API signs people in: your system sends the codes."
            : "Choose where your app's content comes from first."}{" "}
          <Link href="/dashboard/setup">Back to app setup</Link>
        </p>
      </div>
    );
  }
  const wordpress = app.backend === "wordpress";
  const methods = wordpress ? (chosenSignInMethods(app) ?? ["phone"]) : hostedSignInMethods(app);
  const sender = app.hostedSettings?.whatsappSender ?? null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">App sign-in</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {wordpress
            ? "People sign in to your app with the accounts on your website. Choose how, and which WhatsApp number sends their codes. The other sign-in rules are in the Yallapp plugin in WordPress."
            : "Choose how customers sign in to your app, and the rules for new customers. Changes apply at once, without a new build."}
        </p>
      </div>

      <section aria-labelledby="h-methods" className={sectionClass}>
        <h2 id="h-methods" className="m-0 text-[19px] font-bold">
          How people sign in
        </h2>
        <SignInMethodsForm
          current={signInMethodsChoice(methods)}
          wordpress={wordpress}
          emailPossible={emailSignInPossible(app)}
          chosen={wordpress ? chosenSignInMethods(app) !== null : true}
        />
      </section>

      <section aria-labelledby="h-whatsapp" className={sectionClass}>
        <h2 id="h-whatsapp" className="m-0 text-[19px] font-bold">
          WhatsApp number for codes
        </h2>
        <AppWhatsappForms
          connected={sender ? { keyLast4: sender.keyLast4, instanceId: sender.instanceId } : null}
          defaultPhone={client.whatsapp ?? ""}
          wordpress={wordpress}
        />
      </section>

      {wordpress ? null : (
        <section aria-labelledby="h-rules" className={sectionClass}>
          <h2 id="h-rules" className="m-0 text-[19px] font-bold">
            Sign-in rules
          </h2>
          <AppSignInForm current={hostedSettingsValues(hostedSettings(app))} />
        </section>
      )}
    </div>
  );
}
