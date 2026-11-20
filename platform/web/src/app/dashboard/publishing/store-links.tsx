import type { ReactNode } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { KitSection } from "@/components/studio-page";
import { richText } from "@/i18n/rich";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { App } from "@/lib/data/types";
import { accountDeletionUrl } from "@/lib/publishing/readiness";

/**
 * 201 The owner: the account deletion link Google Play and Apple ask for was
 * hard to find ("ما تسهلها وتحطها في صفحه العميل"). At the top of
 * Publishing, whoever publishes the app: the links the stores ask for, each
 * with Copy: the app's own delete account page, its privacy policy and its
 * support email (or where to add them).
 */
export function StoreLinks({ app, platformUrl, text, name }: { app: App; platformUrl: string; text: DashboardText; name: string }) {
  const { t } = text;
  const copy = { label: t("common.copy"), copiedLabel: t("common.copied") };
  const setup = (chunk: ReactNode) => <Link href="/dashboard/setup?step=listing">{chunk}</Link>;
  const row = (icon: "delete" | "shield" | "mail", label: string, value: string | null, missing: string, hint?: string) => (
    <li className="flex flex-col gap-2 rounded-xl border border-(--sp-line) p-3.5">
      <span className="flex items-center gap-2 text-sm font-bold text-(--sp-ink)">
        <Icon name={icon} size={18} />
        {label}
      </span>
      {value ? (
        <span className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 rounded-lg bg-(--sp-soft) px-3 py-2 font-mono text-[13px] break-all text-(--sp-ink)" dir="ltr">
            {value}
          </code>
          <CopyButton value={value} {...copy} />
        </span>
      ) : (
        <span className="text-sm text-(--sp-muted)">{richText(missing, { link: setup })}</span>
      )}
      {hint ? <span className="text-[13px] leading-relaxed text-(--sp-muted)">{hint}</span> : null}
    </li>
  );
  return (
    <KitSection titleId="h-store-links" title={t("publishing.storeLinksTitle")} description={t("publishing.storeLinksIntro", { app: name })}>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0" data-testid="store-links">
        {row("delete", t("publishing.storeLinkDeletion"), accountDeletionUrl(platformUrl, app.id), "", t("publishing.storeLinkDeletionHint"))}
        {row("shield", t("publishing.storeLinkPrivacy"), app.privacyUrl?.trim() || null, t("publishing.storeLinkPrivacyMissing"))}
        {row("mail", t("publishing.storeLinkSupport"), app.supportEmail?.trim() || null, t("publishing.storeLinkSupportMissing"))}
      </ul>
    </KitSection>
  );
}
