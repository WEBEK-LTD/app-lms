"use client";

import { useActionState } from "react";
import { checkLinksAction, saveAppLinksAction, type LinksCheckState } from "@/app/actions/app-links";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { LinksCheckSnapshot } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";

/** 46 The forms of "Links to your app" and the "Check links" panel (also on App setup). */

export function AppLinksForm({ saved, ios, reportedTeamId }: { saved: { playSigningSha256: string; appleTeamId: string }; ios: boolean; reportedTeamId: boolean }) {
  const [state, action] = useActionState(saveAppLinksAction, initialFormState);
  const e = state.errors ?? {};
  const value = (key: "playSigningSha256" | "appleTeamId") => state.values?.[key] ?? saved[key];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-[15px] font-bold">Google Play</legend>
        <Field
          label="App signing key certificate: SHA-256 fingerprint"
          name="playSigningSha256"
          autoComplete="off"
          spellCheck={false}
          defaultValue={value("playSigningSha256")}
          key={`play-${value("playSigningSha256")}`}
          placeholder="14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
          className="font-mono"
          hint={
            <>
              In Play Console, open your app, then <b>Test and release › App integrity › App signing</b> (in older consoles, <b>Release › Setup › App
              integrity</b>). Copy the <b>SHA-256 certificate fingerprint</b> under <b>App signing key certificate</b>. Google signs the app people download
              with that key, so without it the app from Google Play can&apos;t open links. Your upload key&apos;s fingerprint is added by our builds.
            </>
          }
          error={e.playSigningSha256}
          small
        />
      </fieldset>
      {ios ? (
        <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-bold">App Store</legend>
          <Field
            label="Apple Team ID"
            name="appleTeamId"
            autoComplete="off"
            spellCheck={false}
            defaultValue={value("appleTeamId")}
            key={`team-${value("appleTeamId")}`}
            placeholder="A1B2C3D4E5"
            maxLength={10}
            hint={
              reportedTeamId
                ? "Taken from your last iOS build. Change it only if your app moved to another Apple developer account."
                : "In your Apple Developer account, Membership details › Team ID: 10 letters and digits. Your next iOS build fills it in too."
            }
            error={e.appleTeamId}
            small
          />
        </fieldset>
      ) : null}
      <div>
        <SubmitButton className="h-10">Save</SubmitButton>
      </div>
    </form>
  );
}

function CheckList({ result }: { result: LinksCheckSnapshot }) {
  return (
    <ul aria-live="polite" className="m-0 flex list-none flex-col gap-1.5 p-0" data-links-check="">
      {result.checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm" data-check={c.id} data-ok={c.ok ? "true" : "false"}>
          <Icon name={c.ok ? "check_circle" : "cancel"} size={18} filled className={c.ok ? "mt-px shrink-0 text-success" : "mt-px shrink-0 text-danger"} />
          <span className="min-w-0 break-words">
            <span className="font-semibold">{c.label}</span>
            {c.detail ? <span className="text-ink-4"> · {c.detail}</span> : null}
            <span className="sr-only">{c.ok ? " (passed)" : " (failed)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Check links" with the last result; a WordPress site's files are fetched as phones fetch them. */
export function CheckLinksPanel({ last }: { last: LinksCheckSnapshot | null }) {
  const [state, action] = useActionState<LinksCheckState>(checkLinksAction, { result: last });
  const result = state.result;
  return (
    <form action={action} className="flex flex-col gap-3">
      {result ? (
        <>
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold" role="status">
            <Icon name={result.ok ? "check_circle" : "error"} size={20} filled className={result.ok ? "text-success" : "text-warn"} />
            {result.ok ? "Links open your app." : "Some links don't open your app yet."}
            <span className="text-sm font-normal text-muted">
              Checked {new Date(result.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
            </span>
          </p>
          <CheckList result={result} />
        </>
      ) : (
        <p className="m-0 text-sm text-ink-4">Not checked yet.</p>
      )}
      {state.error ? <FormMessage message={state.error} /> : null}
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText="Checking…">
          <Icon name="link" size={18} />
          Check links
        </SubmitButton>
      </div>
    </form>
  );
}
