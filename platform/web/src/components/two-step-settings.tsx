import Link from "next/link";
import { cancelTwoStepSetupAction, signOutEverywhereAction, startTwoStepSetupAction } from "@/app/actions/security";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { ConfirmTwoStepForm, RenewRecoveryCodesForm, TurnOffTwoStepForm, type TwoStepLabels } from "@/components/two-step-forms";
import { Badge, Notice, formatDate } from "@/components/ui";
import type { Lang } from "@/i18n/config";
import type { DashT } from "@/i18n/dashboard";
import { groupedSecret, otpauthUri } from "@/lib/auth/totp";
import { twoStepStatus, waitingSecret } from "@/lib/auth/two-step";
import { getStore } from "@/lib/data";
import type { User } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";

const card = "flex max-w-[720px] flex-col gap-3.5 rounded-2xl border border-line bg-white px-5 py-5 sm:px-6";

/**
 * 70 Your account's two-step sign-in (Dashboard › Your account in the
 * person's language, Admin › Your account in English): off with "Set up",
 * the setup with its QR code (drawn here, lib/qr.ts) and the key as text,
 * or on with new recovery codes and turning it off. Always the signed-in
 * person's own account.
 */
export async function TwoStepSettings({ user, from, t, lang, setup }: { user: User; from: "admin" | "dashboard"; t: DashT; lang: Lang; setup: boolean }) {
  const store = await getStore();
  const status = await twoStepStatus(store, user.id);
  const secret = setup && status.waiting ? await waitingSecret(store, user.id, encryptionKey()) : null;
  const page = from === "admin" ? "/admin/account" : "/dashboard/account";
  const labels: TwoStepLabels = {
    code: t("security.code"),
    turnOn: t("security.turnOn"),
    checking: t("security.checking"),
    recoveryTitle: t("security.recoveryTitle"),
    recoveryText: t("security.recoveryText"),
    recoveryDone: t("security.recoveryDone"),
    appCode: t("security.appCode"),
    makeCodes: t("security.makeCodes"),
    password: t("security.password"),
    showPassword: t("security.showPassword"),
    hidePassword: t("security.hidePassword"),
    turnOff: t("security.turnOff"),
  };
  return (
    <section id="two-step" aria-labelledby="h-two-step" className={card}>
      <div className="flex flex-wrap items-center gap-2.5">
        <Icon name="shield" size={24} className="text-accent" />
        <h2 id="h-two-step" className="m-0 text-lg font-bold">
          {t("security.title")}
        </h2>
        {status.on ? <Badge tone="success">{t("security.badgeOn")}</Badge> : null}
      </div>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">{t("security.intro")}</p>
      {status.on ? (
        <>
          <p className="m-0 text-[15px] font-semibold text-midnight" data-two-step="on">
            {t("security.on", { date: formatDate(status.enabledAt, lang) })} {t("security.recoveryLeft", { count: status.recoveryLeft })}
          </p>
          <details className="group rounded-xl border border-line-soft px-4 py-3">
            <summary className="cursor-pointer font-semibold">{t("security.newCodes")}</summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="m-0 text-sm text-ink-3">{t("security.newCodesText")}</p>
              <RenewRecoveryCodesForm from={from} labels={labels} doneHref={`${page}?saved=1#two-step`} />
            </div>
          </details>
          <details className="group rounded-xl border border-line-soft px-4 py-3">
            <summary className="cursor-pointer font-semibold">{t("security.turnOffTitle")}</summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="m-0 text-sm text-ink-3">{t("security.turnOffText")}</p>
              <TurnOffTwoStepForm from={from} labels={labels} />
            </div>
          </details>
        </>
      ) : secret ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-5">
            <QrCode value={otpauthUri(secret, user.email)} label={t("security.qrLabel")} size={176} />
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
              <p className="m-0 text-[15px] font-semibold">{t("security.scan")}</p>
              <p className="m-0 text-sm text-ink-3">{t("security.manual")}</p>
              <code dir="ltr" data-two-step-secret={secret} className="self-start rounded-lg bg-sand px-3 py-2 font-mono text-[15px] break-all">
                {groupedSecret(secret)}
              </code>
            </div>
          </div>
          <p className="m-0 text-[15px] font-semibold">{t("security.enterCode")}</p>
          <ConfirmTwoStepForm from={from} labels={labels} doneHref={`${page}?saved=1#two-step`} />
          <form action={cancelTwoStepSetupAction}>
            <input type="hidden" name="from" value={from} />
            <SubmitButton variant="ghost" className="h-10 px-0 text-sm">
              {t("security.cancel")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          <p className="m-0 text-[15px] text-ink-3" data-two-step="off">
            {t("security.off")}
          </p>
          <form action={startTwoStepSetupAction}>
            <input type="hidden" name="from" value={from} />
            <SubmitButton className="h-11 px-5">{t("security.setUp")}</SubmitButton>
          </form>
        </>
      )}
    </section>
  );
}

/**
 * 70 The overview's suggestion to turn on two-step sign-in, for the owner
 * or the team member signed in without it (never our team managing the
 * dashboard: their own is in the admin).
 */
export async function TwoStepRecommendation({ person, staff, t }: { person: Pick<User, "id">; staff: boolean; t: DashT }) {
  if (staff || (await twoStepStatus(await getStore(), person.id)).on) return null;
  return (
    <Notice icon="shield">
      {t("security.notice")}{" "}
      <Link href="/dashboard/account#two-step" className="font-bold">
        {t("security.noticeLink")}
      </Link>
    </Notice>
  );
}

/** 70 "Sign out of all devices": every browser, this one too, and every Yallapp Business phone. */
export function SignOutEverywhere({ t }: { t: DashT }) {
  return (
    <section aria-labelledby="h-everywhere" className={card}>
      <div className="flex items-center gap-2.5">
        <Icon name="devices" size={24} className="text-accent" />
        <h2 id="h-everywhere" className="m-0 text-lg font-bold">
          {t("security.everywhereTitle")}
        </h2>
      </div>
      <p className="m-0 text-[15px] leading-relaxed text-ink-3">{t("security.everywhereText")}</p>
      <form action={signOutEverywhereAction}>
        <SubmitButton variant="secondary" className="h-11 px-5">
          {t("security.everywhere")}
        </SubmitButton>
      </form>
    </section>
  );
}
