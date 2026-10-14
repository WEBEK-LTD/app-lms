import type { Metadata } from "next";
import Link from "next/link";
import { Notice, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { failureDate } from "@/lib/hosted/app-sender";
import { platformDefinition } from "@/lib/hosted/connectors/registry";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSettingsValues } from "@/lib/hosted/settings-form";
import { chosenSignInMethods, emailSignInPossible, hostedSignInMethods, signInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { AppSignInForm, AppWhatsappForms, SignInMethodsForm } from "./forms";

export const metadata: Metadata = { title: "App sign-in" };

const sectionClass = "flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
const titleClass = "m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]";
const GUIDE_SIGN_IN = "/docs/my-own-api#the-sign-in-flow-simply";

/** 19 What an own API's /config said at the last API check, in words. */
function advertised(signIn: NonNullable<NonNullable<App["hostedSettings"]>["apiSignIn"]>): string[] {
  const lines: string[] = [];
  if (signIn.methods.includes("phone")) lines.push("Phone number, with a code your API sends");
  if (signIn.methods.includes("email")) {
    lines.push(signIn.emailSignIn === "password" ? "Email address and password" : "Email address, with a code your API sends");
  }
  lines.push(signIn.previewSignIn ? "The app preview can sign in with your store review number" : "The app preview doesn't sign in (no preview sign-in)");
  return lines;
}

/** 19 Own API apps: the API decides how people sign in; this shows what it said at the last check. */
function CustomApiSignIn({ app }: { app: App }) {
  const saved = app.hostedSettings?.apiSignIn ?? null;
  const current = saved && app.apiBaseUrl && saved.baseUrl === app.apiBaseUrl.replace(/\/+$/, "") ? saved : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className={titleClass}>App sign-in</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Your own API signs people in, so it decides how: by phone, by email or both, in its <code>GET /config</code> (
          <code>auth.methods</code>). Your system sends the codes, and keeps the store review number or email address for Apple and Google.
          Nothing here changes it.
        </p>
      </div>
      <section aria-labelledby="h-api-sign-in" className={sectionClass}>
        <h2 id="h-api-sign-in" className="m-0 text-[19px] font-bold">
          What your API offers
        </h2>
        {current ? (
          <>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[15px]">
              {advertised(current).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted">As your API answered at the last check, on {failureDate(current.checkedAt)}.</p>
          </>
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            Run the check of your API to see how it signs people in. It reads your API&apos;s <code>GET /config</code> the way the app does.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/setup?step=website" className={`${btn.secondary} h-10 px-4 text-sm`}>
            Check my API
          </Link>
          <Link href={GUIDE_SIGN_IN} className={`${btn.secondary} h-10 px-4 text-sm`}>
            Sign-in in the developer guide
          </Link>
        </div>
      </section>
    </div>
  );
}

/** 19 The connected platform's name, for the note that email sign-in is off. */
function sourceName(app: App): string {
  if (app.connector?.kind === "shopify") return "Shopify";
  if (app.connector?.kind === "platform") return platformDefinition(app.connector.platform)?.name ?? "your connected platform";
  return "your connected platform";
}

/**
 * How people sign in to the app (18: phone, email or both, and the owner's own
 * WhatsApp number) for apps on the hosted API and WordPress apps, and the
 * sign-in rules of apps on the hosted API (WordPress sets those in the plugin).
 */
export default async function AppSignInPage() {
  const { app, client } = await requireClient();
  if (app?.backend === "custom_api") return <CustomApiSignIn app={app} />;
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className={titleClass}>App sign-in</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Choose where your app&apos;s content comes from first. <Link href="/dashboard/setup">Back to app setup</Link>
        </p>
      </div>
    );
  }
  const wordpress = app.backend === "wordpress";
  const methods = wordpress ? (chosenSignInMethods(app) ?? ["phone"]) : hostedSignInMethods(app);
  const sender = app.hostedSettings?.whatsappSender ?? null;
  const failedAt = sender ? (app.hostedSettings?.whatsappFailedAt ?? null) : null;
  // 19 Email chosen, but the content now comes from a platform that finds customers by phone.
  const emailOff = !wordpress && !emailSignInPossible(app) && (chosenSignInMethods(app) ?? []).includes("email");
  const emailOnlyUsers = emailOff ? await (await getStore()).countHostedEmailOnlyUsers(app.id) : 0;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className={titleClass}>App sign-in</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {wordpress
            ? "People sign in to your app with the accounts on your website. Choose how, and which WhatsApp number sends their codes. The other sign-in rules are in the Yallapp plugin in WordPress."
            : "Choose how customers sign in to your app, and the rules for new customers. Changes apply at once, without a new build."}
        </p>
      </div>

      {emailOff ? (
        <Notice tone="warn" icon="warning">
          Email sign-in is off: your app&apos;s content comes from {sourceName(app)}, which finds each customer by their phone number, so the
          app signs in by phone only.
          {emailOnlyUsers > 0
            ? ` ${emailOnlyUsers === 1 ? "1 customer who signed up" : `${emailOnlyUsers.toLocaleString("en-GB")} customers who signed up`} with their email address can't sign in.`
            : ""}{" "}
          To offer email sign-in again, manage your content in Yallapp on the <Link href="/dashboard/setup?step=website">Website step</Link>.
        </Notice>
      ) : null}

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
        {failedAt ? (
          <Notice tone="warn" icon="warning" role="status">
            Your WhatsApp number couldn&apos;t send codes on {failureDate(failedAt)}. Customers got those codes from Yallapp&apos;s number
            instead. Check the number and the API key in your WABEK account, then send a test code below.
          </Notice>
        ) : null}
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
          <AppSignInForm current={hostedSettingsValues(hostedSettings(app))} emailOnly={methods.length === 1 && methods[0] === "email"} />
        </section>
      )}
    </div>
  );
}
