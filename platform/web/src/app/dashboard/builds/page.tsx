import type { Metadata } from "next";
import Link from "next/link";
import { BuildBadge, BuildStages, BuildStatusText } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { Notice, formatDate, formatDateTime } from "@/components/ui";
import { isSetupComplete, nextStep } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ArtifactKind, Build } from "@/lib/data/types";
import { ARTIFACT_LABEL, fileLink } from "@/lib/files";
import { latestRelease } from "@/lib/license/service";
import { planName } from "@/lib/plans";
import { bumpPatch } from "@/lib/semver";
import { StartBuildForm } from "./start-build";

export const metadata: Metadata = { title: "Builds & downloads" };

const FILES: { kind: ArtifactKind; text: string; highlight?: boolean }[] = [
  { kind: "apk", text: "Install directly on a phone to test" },
  { kind: "aab", text: "The file you upload to Google Play" },
  { kind: "ipa", text: "Pro: uploaded to TestFlight for you" },
  { kind: "keystore", text: "The keystore and its passwords. Every future update on Google Play needs this same key.", highlight: true },
];

function DownloadRow({
  title,
  text,
  href,
  unavailable = "Available after your first build",
  highlight,
  last,
}: {
  title: string;
  text: string;
  href: string | null;
  unavailable?: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 ${last ? "" : "border-b border-line-soft"} ${highlight ? "bg-cream" : ""}`}>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className={`text-[13px] ${highlight ? "text-warn" : "text-muted"}`}>{text}</span>
      </div>
      {href ? (
        <a href={href} className="flex h-[38px] items-center rounded-lg border border-line-strong bg-white px-4 text-sm font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight">
          Download<span className="sr-only"> {title}</span>
        </a>
      ) : (
        <span className="flex flex-col items-end gap-1">
          <button type="button" disabled aria-describedby={`na-${title.replace(/\W+/g, "-")}`} className="h-[38px] cursor-not-allowed rounded-lg border border-line bg-sand px-4 text-sm font-semibold text-muted">
            Download<span className="sr-only"> {title}</span>
          </button>
          <span id={`na-${title.replace(/\W+/g, "-")}`} className="text-xs text-muted">
            {unavailable}
          </span>
        </span>
      )}
    </li>
  );
}

export default async function BuildsPage({ searchParams }: PageProps<"/dashboard/builds">) {
  const { client, app, license, state } = await requireClient();
  const { started } = await searchParams;
  const store = await getStore();
  const builds = await store.listBuildsByClient(client.id, 50);
  const current = builds[0] ?? null;
  const lastReady: Build | null = builds.find((b) => b.status === "ready") ?? null;
  const release = latestRelease(await store.listReleases());
  const plan = license?.plan ?? null;
  // Signed when the page renders (links to files.yallapp.com.tr expire after 15 minutes); never stored.
  const now = new Date();
  const fileRow = (kind: ArtifactKind) => {
    const url = lastReady?.artifacts.find((a) => a.kind === kind)?.url;
    if (!url) return { href: null };
    const link = fileLink(url, now);
    return link.disabledReason === null ? { href: link.href } : { href: null, unavailable: link.disabledReason };
  };

  const setupDone = isSetupComplete(app, plan);
  const disabledReason =
    state !== "active"
      ? "Your plan has ended. Message us on WhatsApp to renew it."
      : !setupDone
        ? "Finish the app setup to start a build."
        : current && (current.status === "queued" || current.status === "building")
          ? "A build is in progress. You can start another one when it finishes."
          : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold">Builds &amp; downloads</h1>
          <span className="text-[15px] text-muted">
            {app?.appName ?? "Your app"} · Plan: {planName(plan)}
          </span>
        </div>
        <StartBuildForm suggestedVersion={current ? bumpPatch(current.versionName) : "1.0.0"} disabledReason={disabledReason} />
      </div>

      {started ? (
        <Notice tone="success" icon="check_circle" role="status">
          Your app setup is complete and your first build is queued. We&apos;ll email you when your files are ready.
        </Notice>
      ) : null}

      {!setupDone ? (
        <Notice icon="info">
          Your first build starts when the app setup is complete.{" "}
          <Link href={app ? `/dashboard/setup?step=${nextStep(app, plan) ?? "website"}` : "/dashboard/app-type"} className="font-bold">
            Continue the setup
          </Link>
        </Notice>
      ) : null}

      {current ? (
        <section aria-labelledby="h-current" className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="h-current" className="m-0 text-[19px] font-bold">
                Build #{current.number} · App version {current.versionName}
              </h2>
              <span className="text-sm text-muted">
                Started {formatDateTime(current.createdAt)} · Version code {current.versionCode}
              </span>
            </div>
            <BuildBadge status={current.status} />
          </div>
          <BuildStages stages={current.stages} />
          {current.status === "queued" ? (
            <p className="m-0 text-sm text-muted">Your build is in the queue. This page shows each step as it runs.</p>
          ) : null}
          {current.status === "failed" && current.message ? (
            <Notice tone="danger" icon="error">
              {current.message} We&apos;ve been notified and will get back to you.
            </Notice>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="h-files" className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 id="h-files" className="m-0 border-b border-line-soft px-4 py-5 text-[19px] font-bold sm:px-6">
          Files from the latest successful build
        </h2>
        <ul className="m-0 list-none p-0">
          {FILES.map((file) => (
            <DownloadRow key={file.kind} title={ARTIFACT_LABEL[file.kind]} text={file.text} highlight={file.highlight} {...fileRow(file.kind)} />
          ))}
          <DownloadRow
            title="WordPress plugin (.zip)"
            text={release ? `Version ${release.version} · License key on the License page` : "License key on the License page"}
            href={release && state === "active" ? "/api/dashboard/plugin" : null}
          />
          <DownloadRow title={ARTIFACT_LABEL.store_assets} text="Icons in every size, feature graphic and screenshots" {...fileRow("store_assets")} last />
        </ul>
      </section>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        {[
          { href: "/guides/google-play", title: "Publish on Google Play" },
          { href: "/guides/app-store", title: "Publish on the App Store" },
        ].map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="flex items-center gap-3.5 rounded-2xl border border-line bg-white px-[22px] py-5 text-midnight no-underline hover:border-midnight hover:text-midnight"
          >
            <Icon name="menu_book" size={26} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{guide.title}</span>
              <span className="text-[13px] text-muted">Step-by-step guide</span>
            </span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="h-history" className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-5 sm:px-6">
        <h2 id="h-history" className="m-0 text-[17px] font-bold">
          Build history
        </h2>
        {builds.length === 0 ? (
          <p className="m-0 text-sm text-muted">No builds yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 font-semibold">Build</th>
                  <th scope="col" className="py-2 font-semibold">App version</th>
                  <th scope="col" className="py-2 font-semibold">Date</th>
                  <th scope="col" className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((build) => (
                  <tr key={build.id} className="border-t border-line-soft">
                    <td className="py-2.5">#{build.number}</td>
                    <td>{build.versionName}</td>
                    <td>{formatDate(build.createdAt)}</td>
                    <td>
                      <BuildStatusText status={build.status} />
                      {build.status === "failed" && build.logUrl ? (
                        <>
                          {" "}
                          · <a href={build.logUrl}>View log</a>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
