import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Notice, PageHeader } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { choosesScreenProtection, offersContentScope, screenProtectionFormValue } from "@/lib/app/screen-protection";
import { requireClient } from "@/lib/auth/session";
import { ScreenProtectionForm } from "./forms";

export const metadata: Metadata = { title: "Screen protection" };

/**
 * 53 Screenshots and screen recording in the app, for every app type: off,
 * course content only (academies) or the whole app; on WordPress also the
 * plugin's own setting. An app on its own API gets it from that API.
 */
export default async function ScreenProtectionPage() {
  const { app } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const academy = offersContentScope(app);
  return (
    <>
      <PageHeader
        title="Screen protection"
        description={<>Keep what people see in {appLabel(app)} from being captured with screenshots or screen recordings.</>}
      />
      <section aria-labelledby="h-protection" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-protection" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="lock" size={22} />
          Screenshots and screen recording
        </h2>
        {choosesScreenProtection(app) ? (
          <ScreenProtectionForm
            current={screenProtectionFormValue(app)}
            academy={academy}
            wordpress={app.backend === "wordpress" || app.backend === "setup_requested"}
          />
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-ink-4" data-own-api="">
            Your app gets this from your own API: its <code>/config</code> sends <code>app.screen_protection</code> as <code>off</code>,{" "}
            <code>content</code> or <code>app</code>. The developer guide has the details.
          </p>
        )}
      </section>

      <section aria-labelledby="h-how" className="flex max-w-[720px] flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-how" className="m-0 text-lg font-bold">
          What people see
        </h2>
        <ul className="m-0 flex flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-4">
          <li>
            <strong className="text-ink-2">Android:</strong> screenshots and screen recordings of protected screens come out black, and the app is hidden in
            the list of recent apps.
          </li>
          <li>
            <strong className="text-ink-2">iPhone and iPad:</strong> Apple doesn&apos;t let apps block screenshots. While the screen is recorded or shared,
            protected screens are covered; screenshots of them come out blank where iOS allows it, and the app shows a short notice after one. The app is
            blurred in the app switcher.
          </li>
          {academy ? (
            <li>
              <strong className="text-ink-2">Attachments:</strong> while protection is on, course files open only in the app&apos;s own viewer, without
              sharing, saving to the phone or printing. Saved lessons always stay encrypted inside the app.
            </li>
          ) : null}
          <li>
            No app can stop someone from filming the screen with another phone.
            {academy ? " The watermark on lesson videos shows whose account it was." : null}
          </li>
        </ul>
        <Notice icon="info">
          Protection works in the installed apps. The preview in your browser can&apos;t block screenshots, so it looks the same with protection on or off.
        </Notice>
      </section>
    </>
  );
}
