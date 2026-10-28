import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, formatDateTime } from "@/components/ui";
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
  delivery?: { customer: string; courier: string | null; courierName: string } | null;
}) {
  const { t, lang } = text;
  const kind = reviewSignInKind(app);
  const signInLink = (chunk: ReactNode) => <Link href="/dashboard/app-sign-in">{chunk}</Link>;
  const account = kind === "account" ? (app.hostedSettings?.reviewAccount ?? null) : null;
  const who = kind === "code" ? reviewCodeWho(app) : (account?.username ?? null);
  const secret = kind === "code" ? (who ? (app.hostedSettings?.reviewCode ?? null) : null) : account ? reviewAccountPassword(app.id, account, encryptionKey()) : null;
  const set = who !== null && secret !== null;
  const steps = (key: "publishing.reviewPlaySteps" | "publishing.reviewAppleSteps") => t(key).split("|");
  return (
    <section aria-labelledby="h-review" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-review={set ? "set" : "missing"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-review" className="m-0 text-lg font-bold">
          {t("publishing.reviewTitle")}
        </h2>
        <Badge tone={set ? "success" : "danger"}>{set ? t("publishing.ready.stateOk") : t("publishing.ready.stateMissing")}</Badge>
      </div>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.reviewIntro")}</p>
      {kind === "code" ? (
        <p className="m-0 text-[15px] leading-relaxed">
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
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.reviewAccountText")}</p>
          <ReviewAccountForm current={{ username: account?.username ?? "", notes: account?.notes ?? "" }} saved={account !== null} />
          {account ? <span className="text-sm text-muted">{t("publishing.reviewSaved", { who: account.username, date: formatDateTime(new Date(account.savedAt), lang) })}</span> : null}
        </>
      )}
      {set ? (
        <div className="flex flex-col gap-2 rounded-xl bg-sand p-4" data-review-copy="">
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
                <dd className="m-0 whitespace-pre-line break-words" dir="ltr">
                  {account.notes}
                </dd>
              </>
            ) : null}
            {delivery ? (
              <>
                <dt className="font-semibold">{t("publishing.reviewDeliveryNotes")}</dt>
                <dd className="m-0 whitespace-pre-line break-words" dir="ltr" data-review-notes="customer">
                  {delivery.customer}
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      ) : null}
      {set && delivery?.courier ? (
        <div className="flex flex-col gap-2 rounded-xl bg-sand p-4" data-review-copy="courier">
          <h3 className="m-0 text-base font-bold">{t("publishing.reviewCourierTitle", { name: delivery.courierName })}</h3>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("publishing.reviewCourierText")}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
            <dt className="font-semibold">{t("publishing.reviewDeliveryNotes")}</dt>
            <dd className="m-0 whitespace-pre-line break-words" dir="ltr" data-review-notes="courier">
              {delivery.courier}
            </dd>
          </dl>
        </div>
      ) : null}
      {managed ? <p className="m-0 text-[15px] font-semibold">{t("publishing.reviewTeam")}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["publishing.reviewPlayTitle", "publishing.reviewPlaySteps"],
            ["publishing.reviewAppleTitle", "publishing.reviewAppleSteps"],
          ] as const
        ).map(([title, list]) => (
          <div key={title} className="flex flex-col gap-2">
            <h3 className="m-0 text-base font-bold">{t(title)}</h3>
            <ol className="m-0 list-decimal space-y-1.5 ps-5 text-[15px] leading-relaxed text-ink-4 marker:font-bold">
              {steps(list).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
