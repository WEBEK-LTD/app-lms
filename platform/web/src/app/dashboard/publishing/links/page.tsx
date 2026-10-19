import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { appUrl } from "@/lib/env";
import { siteLinkBase, yallappLinkBase } from "@/lib/links/table";
import { hasFeature } from "@/lib/plans";
import { AppLinksForm, CheckLinksPanel } from "./forms";

export const metadata: Metadata = { title: "Links to your app" };

/** An example link of the app's own kind of content. */
const EXAMPLE: Record<string, string> = {
  lms: "course/12",
  store: "product/12",
  booking: "service/12",
  real_estate: "listing/12",
  news: "article/12",
  events: "event/12",
  donations: "campaign/12",
};

/**
 * 46 Links that open the app (Android App Links, iOS Universal Links): what
 * a shared link looks like, the Play App Signing key's fingerprint and the
 * Apple Team ID the link files need, and "Check links".
 */
export default async function AppLinksPage() {
  const { app, license } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const plan = await appPlan(await getStore(), license, new Date());
  const ios = hasFeature(plan, "ios");
  const site = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  const example = EXAMPLE[app.appType] ?? "page/home";
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/dashboard/publishing">Publishing</Link>}
        title="Links to your app"
        description={<>Links people share from {appLabel(app)} open in the app when it&apos;s installed, and on the web when it isn&apos;t.</>}
      />
      <section aria-labelledby="h-how" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-how" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="link" size={22} />
          How links work
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          The Share buttons in your app share links like these. On a phone with your app, they open the right screen in the app; without it, they open{" "}
          {site ? "the same page on your website" : "a page with your app's name, picture and store links"}. Notification links work the same way.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 font-mono text-sm break-all">
          {site ? <li>{`${site}/${example}`}</li> : null}
          <li>{`${yallappLinkBase(appUrl(), app.id)}/${example}`}</li>
        </ul>
        <p className="m-0 text-sm text-muted">
          Phones check that each address trusts your app, with two small files the address serves.
          {site ? " Your website serves its files through the Yallapp plugin (keep it up to date); ours are always ready." : " Ours are always ready."} The
          next build of your app knows these addresses.
        </p>
      </section>

      <section aria-labelledby="h-keys" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-keys" className="m-0 text-lg font-bold">
          What the files need
        </h2>
        <AppLinksForm
          ios={ios}
          reportedTeamId={Boolean(app.appleTeamId)}
          saved={{ playSigningSha256: app.playSigningSha256 ?? "", appleTeamId: app.appleTeamId ?? "" }}
        />
      </section>

      <section aria-labelledby="h-check" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-check" className="m-0 text-lg font-bold">
          Link status
        </h2>
        <CheckLinksPanel last={app.linksCheck ?? null} />
      </section>
    </>
  );
}
