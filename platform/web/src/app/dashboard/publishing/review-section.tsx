import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/components/ui";
import { KitCallout, KitFold, KitSection, KitStatus } from "@/components/studio-page";
import { richText } from "@/i18n/rich";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { reviewAccountPassword, reviewCodeWho, reviewSignInKind } from "@/lib/publishing/review-account";
import { ReviewAccountForm, SecretValue } from "./forms";

/**
 * 102 The store review account, required for every app: the fixed review
 * number or email of App sign-in, or the account on the owner's website or
 * API; then where to enter it in Google Play Console and App Store Connect.
 * 132.140 In the premium kit, those steps folded behind one line.
 */
export function ReviewSection({
  app,
  text,
  managed,
  delivery = null,
}: {
  app: App;
  text: DashboardText;
  managed: boolean;
  /** 104.7 A delivery app's notes for the reviewers, and the courier app's when it has one. */
  delivery?: { customer: string; courier: string | null; courierName: string; driver?: boolean; vendor?: { notes: string; name: string; place: string } | null } | null;
}) {
  const { t, lang } = text;
  const kind = reviewSignInKind(app);
  const signInLink = (chunk: ReactNode) => <Link href="/dashboard/app-sign-in">{chunk}</Link>;
  const account = kind === "account" ? (app.hostedSettings?.reviewAccount ?? null) : null;
  const who = kind === "code" ? reviewCodeWho(app) : (account?.username ?? null);
  const secret = kind === "code" ? (who ? (app.hostedSettings?.reviewCode ?? null) : null) : account ? reviewAccountPassword(app.id, account, encryptionKey()) : null;
  const set = who !== null && secret !== null;
  const steps = (key: "publishing.reviewPlaySteps" | "publishing.reviewAppleSteps") => t(key).split("|");
  // 132.140 The premium kit: its state as a pill, the explanation behind "?", the form or what to enter in the stores, and
  // where to enter it in each store folded behind one line.
  return (
    <KitSection
      titleId="h-review"
      title={t("publishing.reviewTitle")}
      help={t("publishing.reviewIntro")}
      helpLabel={t("studioPage.helpSection")}
      actions={<KitStatus tone={set ? "success" : "danger"}>{set ? t("publishing.ready.stateOk") : t("publishing.ready.stateMissing")}</KitStatus>}
      data-review={set ? "set" : "missing"}
    >
      {kind === "code" ? (
        <p className="m-0 text-[15px] leading-relaxed text-(--sp-ink)">
          {set ? (
            <>
              {t("publishing.reviewCodeSet", { who: who!, code: secret! })} {richText(t("publishing.reviewCodeChange"), { link: signInLink })}
            </>
          ) : (
            richText(t("publishing.reviewCodeMissing"), { link: signInLink })
          )}
        </p>
      ) : (
        <>
          <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{t("publishing.reviewAccountText")}</p>
          <ReviewAccountForm current={{ username: account?.username ?? "", notes: account?.notes ?? "" }} saved={account !== null} />
          {account ? <span className="text-sm text-(--sp-muted)">{t("publishing.reviewSaved", { who: account.username, date: formatDateTime(new Date(account.savedAt), lang) })}</span> : null}
        </>
      )}
      {set ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-(--sp-soft) p-4 sm:p-5" data-review-copy="">
          <h3 className="m-0 text-base font-bold">{t("publishing.reviewCopy")}</h3>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="font-semibold">{t("publishing.reviewUsername")}</dt>
            <dd className="m-0 break-all" dir="ltr">
              <code>{who}</code>
            </dd>
            <dt className="font-semibold">{t("publishing.reviewPassword")}</dt>
            <dd className="m-0">
              <SecretValue value={secret!} label={t("publishing.reviewShow")} />
            </dd>
            {account?.notes ? (
              <>
                <dt className="font-semibold">{t("publishing.reviewNotesLabel")}</dt>
                <dd className="m-0 break-words whitespace-pre-line" dir="ltr">
                  {account.notes}
                </dd>
              </>
            ) : null}
            {delivery ? (
              <>
                <dt className="font-semibold">{t("publishing.reviewDeliveryNotes")}</dt>
                <dd className="m-0 break-words whitespace-pre-line" dir="ltr" data-review-notes="customer">
                  {delivery.customer}
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      ) : null}
      {set && delivery?.courier ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-(--sp-soft) p-4 sm:p-5" data-review-copy="courier">
          <h3 className="m-0 text-base font-bold">{t(delivery.driver ? "publishing.reviewDriverTitle" : "publishing.reviewCourierTitle", { name: delivery.courierName })}</h3>
          <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{t(delivery.driver ? "publishing.reviewDriverText" : "publishing.reviewCourierText")}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="font-semibold">{t("publishing.reviewDeliveryNotes")}</dt>
            <dd className="m-0 break-words whitespace-pre-line" dir="ltr" data-review-notes="courier">
              {delivery.courier}
            </dd>
          </dl>
        </div>
      ) : null}
      {set && delivery?.vendor ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-(--sp-soft) p-4 sm:p-5" data-review-copy="vendor">
          <h3 className="m-0 text-base font-bold">{t("publishing.reviewVendorTitle", { name: delivery.vendor.name })}</h3>
          <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{t("publishing.reviewVendorText", { place: delivery.vendor.place })}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="font-semibold">{t("publishing.reviewDeliveryNotes")}</dt>
            <dd className="m-0 break-words whitespace-pre-line" dir="ltr" data-review-notes="vendor">
              {delivery.vendor.notes}
            </dd>
          </dl>
        </div>
      ) : null}
      {managed ? (
        <KitCallout icon="support_agent" tone="success">
          {t("publishing.reviewTeam")}
        </KitCallout>
      ) : null}
      <KitFold summary={t("publishing.reviewWhere")} icon="menu_book">
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              ["publishing.reviewPlayTitle", "publishing.reviewPlaySteps"],
              ["publishing.reviewAppleTitle", "publishing.reviewAppleSteps"],
            ] as const
          ).map(([title, list]) => (
            <div key={title} className="flex flex-col gap-2">
              <h3 className="m-0 text-[15px] font-bold">{t(title)}</h3>
              <ol className="m-0 list-decimal space-y-1.5 ps-5 text-sm leading-relaxed text-(--sp-muted) marker:font-bold">
                {steps(list).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </KitFold>
    </KitSection>
  );
}
