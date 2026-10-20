"use client";

import { useActionState } from "react";
import { checkLinksAction, saveAppLinksAction, type LinksCheckState } from "@/app/actions/app-links";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { LinksCheckSnapshot } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { richText } from "@/i18n/rich";
import { formatDate } from "@/i18n/format";

/** 46 The forms of "Links to your app" and the "Check links" panel (also on App setup). */

export function AppLinksForm({ saved, ios, reportedTeamId }: { saved: { playSigningSha256: string; appleTeamId: string }; ios: boolean; reportedTeamId: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppLinksAction, initialFormState);
  const e = state.errors ?? {};
  const value = (key: "playSigningSha256" | "appleTeamId") => state.values?.[key] ?? saved[key];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">Google Play</legend>
        <Field
          label={t("stores.playFingerprint")}
          name="playSigningSha256"
          autoComplete="off"
          spellCheck={false}
          defaultValue={value("playSigningSha256")}
          key={`play-${value("playSigningSha256")}`}
          placeholder="14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
          className="font-mono"
          dir="ltr"
          hint={richText(t("stores.playFingerprintHint"), { b: B, b2: B, b3: B, b4: B })}
          error={e.playSigningSha256}
          small
        />
      </fieldset>
      {ios ? (
        <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-bold">App Store</legend>
          <Field
            label={t("stores.teamId")}
            name="appleTeamId"
            autoComplete="off"
            spellCheck={false}
            defaultValue={value("appleTeamId")}
            key={`team-${value("appleTeamId")}`}
            placeholder="A1B2C3D4E5"
            maxLength={10}
            dir="ltr"
            hint={reportedTeamId ? t("stores.teamIdReported") : t("stores.teamIdHint")}
            error={e.appleTeamId}
            small
          />
        </fieldset>
      ) : null}
      <div>
        <SubmitButton className="h-10">{t("common.save")}</SubmitButton>
      </div>
    </form>
  );
}

const B = (chunk: string) => <b>{chunk}</b>;

function CheckList({ result }: { result: LinksCheckSnapshot }) {
  const t = useDashT();
  const known = useKnownText();
  return (
    <ul aria-live="polite" className="m-0 flex list-none flex-col gap-1.5 p-0" data-links-check="">
      {result.checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm" data-check={c.id} data-ok={c.ok ? "true" : "false"}>
          <Icon name={c.ok ? "check_circle" : "cancel"} size={18} filled className={c.ok ? "mt-px shrink-0 text-success" : "mt-px shrink-0 text-danger"} />
          <span className="min-w-0 break-words">
            <span className="font-semibold">{known(c.label)}</span>
            {c.detail ? <span className="text-ink-4"> · {known(c.detail)}</span> : null}
            <span className="sr-only">{c.ok ? t("stores.passed") : t("stores.failed")}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Check links" with the last result; a WordPress site's files are fetched as phones fetch them. */
export function CheckLinksPanel({ last }: { last: LinksCheckSnapshot | null }) {
  const t = useDashT();
  const known = useKnownText();
  const lang = useDashLang();
  const [state, action] = useActionState<LinksCheckState>(checkLinksAction, { result: last });
  const result = state.result;
  return (
    <form action={action} className="flex flex-col gap-3">
      {result ? (
        <>
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold" role="status">
            <Icon name={result.ok ? "check_circle" : "error"} size={20} filled className={result.ok ? "text-success" : "text-warn"} />
            {result.ok ? t("stores.linksOk") : t("stores.linksNotOk")}
            <span className="text-sm font-normal text-muted">
              {t("stores.checked", {
                time: t("common.utc", { time: formatDate(lang, new Date(result.at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) }),
              })}
            </span>
          </p>
          <CheckList result={result} />
        </>
      ) : (
        <p className="m-0 text-sm text-ink-4">{t("stores.notChecked")}</p>
      )}
      {state.error ? <FormMessage message={known(state.error)} /> : null}
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText={t("stores.checking")}>
          <Icon name="link" size={18} />
          {t("stores.checkLinks")}
        </SubmitButton>
      </div>
    </form>
  );
}
