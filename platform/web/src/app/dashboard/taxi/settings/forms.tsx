"use client";

import { useActionState, useState, type ReactNode } from "react";
import { removeGoogleKeyAction, saveTaxiSettingsAction, testLiveDatabaseAction, testTaxiMapAction, type MapTestState } from "@/app/actions/taxi";
import { CopyButton } from "@/components/copy-button";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { initialFormState, type FormState } from "@/lib/forms";
import { Choices } from "../../delivery/forms";

/** Examples in fields: a key's start, and the credit OpenStreetMap asks for (not translated). */
const KEY_EXAMPLE = "AIza…";
const OSM_CREDIT = "© OpenStreetMap contributors";

const card = "flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";

/** 105.9 The company's map (Google Maps with its key, or its OpenStreetMap servers) and its Realtime Database. */
export function TaxiSettingsForm({
  values,
  savedKey,
  mapTest,
  liveTest,
  rules,
}: {
  values: Record<string, string>;
  /** The saved Google key, masked. */
  savedKey: string | null;
  mapTest: ReactNode;
  liveTest: ReactNode;
  rules: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveTaxiSettingsAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const [provider, setProvider] = useState(value("provider") || "osm");
  return (
    <>
      <form action={action} noValidate className="flex flex-col gap-6">
        <section aria-labelledby="h-map" className={card}>
          <div className="flex flex-col gap-1">
            <h2 id="h-map" className="m-0 text-lg font-bold">
              {t("taxi.map")}
            </h2>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("taxi.mapIntro")}</p>
          </div>
          <Choices
            legend={t("taxi.provider")}
            name="provider"
            value={provider}
            onChange={setProvider}
            options={[
              { value: "google", label: t("taxi.google"), hint: t("taxi.googleHint") },
              { value: "osm", label: t("taxi.osm"), hint: t("taxi.osmHint") },
            ]}
          />
          {provider === "google" ? (
            <div className="flex flex-col gap-2">
              <Field
                label={t("taxi.googleKey")}
                name="googleKey"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                maxLength={100}
                placeholder={savedKey ?? KEY_EXAMPLE}
                hint={savedKey ? t("taxi.googleKeySaved", { key: savedKey }) : t("taxi.googleKeyHint")}
                error={state.errors?.googleKey}
              />
              {savedKey ? (
                <button type="submit" formAction={removeGoogleKeyAction} formNoValidate className="self-start text-sm font-semibold text-danger underline underline-offset-2">
                  {t("taxi.removeKey")}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field
                label={t("taxi.tilesUrl")}
                name="tilesUrl"
                dir="ltr"
                maxLength={300}
                defaultValue={value("tilesUrl")}
                placeholder="https://tiles.example.com/{z}/{x}/{y}.png"
                hint={t("taxi.tilesUrlHint", { example: "https://tiles.example.com/{z}/{x}/{y}.png" })}
                error={state.errors?.tilesUrl}
              />
              <Field label={t("taxi.attribution")} name="attribution" maxLength={120} defaultValue={value("attribution")} placeholder={OSM_CREDIT} hint={t("taxi.attributionHint")} error={state.errors?.attribution} />
              <Field label={t("taxi.searchUrl")} name="searchUrl" dir="ltr" maxLength={300} defaultValue={value("searchUrl")} placeholder="https://search.example.com" hint={t("taxi.searchUrlHint")} error={state.errors?.searchUrl} />
              <Field label={t("taxi.routingUrl")} name="routingUrl" dir="ltr" maxLength={300} defaultValue={value("routingUrl")} placeholder="https://route.example.com" hint={t("taxi.routingUrlHint")} error={state.errors?.routingUrl} />
            </div>
          )}
        </section>
        <section aria-labelledby="h-live" className={card}>
          <div className="flex flex-col gap-1">
            <h2 id="h-live" className="m-0 text-lg font-bold">
              {t("taxi.live")}
            </h2>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("taxi.liveIntro")}</p>
          </div>
          <Field
            label={t("taxi.databaseUrl")}
            name="databaseUrl"
            dir="ltr"
            maxLength={300}
            defaultValue={value("databaseUrl")}
            placeholder="https://your-app-default-rtdb.firebaseio.com"
            hint={t("taxi.databaseUrlHint")}
            error={state.errors?.databaseUrl}
          />
        </section>
        <div className="flex max-w-[760px] flex-col gap-3">
          <FormMessage message={state.message} ok={state.ok} />
          <SubmitButton className="h-11 self-start px-6">{t("taxi.save")}</SubmitButton>
        </div>
      </form>
      <section aria-label={t("taxi.testMap")} className={card}>
        <div className="flex flex-wrap gap-6">
          {mapTest}
          {liveTest}
        </div>
      </section>
      <section aria-labelledby="h-rules" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex max-w-[560px] flex-col gap-1">
            <h2 id="h-rules" className="m-0 text-lg font-bold">
              {t("taxi.rules")}
            </h2>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("taxi.rulesIntro")}</p>
          </div>
          <CopyButton value={rules} label={t("taxi.copy")} copiedLabel={t("taxi.copied")} />
        </div>
        <pre dir="ltr" className="m-0 max-h-72 overflow-auto rounded-xl bg-sand p-4 text-[13px] leading-relaxed">
          {rules}
        </pre>
      </section>
    </>
  );
}

const PARTS = { tiles: "taxi.part_tiles", search: "taxi.part_search", routes: "taxi.part_routes" } as const;

/** Tries the saved map: its tiles, search and routes, each with why not. */
export function MapTest() {
  const t = useDashT();
  const [state, action] = useActionState<MapTestState>(testTaxiMapAction, {});
  return (
    <form action={action} className="flex min-w-[240px] flex-1 flex-col gap-3">
      <SubmitButton variant="secondary" className="h-10 self-start" pendingText={t("taxi.testing")}>
        <Icon name="map" size={18} />
        {t("taxi.testMap")}
      </SubmitButton>
      {state.message ? <FormMessage message={state.message} /> : null}
      {state.checks ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
          {state.checks.map((check) => (
            <li key={check.part} className="flex items-start gap-2 text-[14px]">
              <Icon name={check.ok ? "check_circle" : "error"} size={20} filled className={check.ok ? "text-success" : "text-danger"} />
              <span>
                <span className="font-semibold">{t(PARTS[check.part])}</span>
                {": "}
                <span className={check.ok ? "text-success" : "text-ink-4"}>{check.ok ? t("taxi.works") : check.problem}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

/** Writes to the saved database, reads it back and removes it. */
export function LiveTest() {
  const t = useDashT();
  const [state, action] = useActionState<FormState>(testLiveDatabaseAction, initialFormState);
  return (
    <form action={action} className="flex min-w-[240px] flex-1 flex-col gap-3">
      <SubmitButton variant="secondary" className="h-10 self-start" pendingText={t("taxi.testing")}>
        <Icon name="cloud_sync" size={18} />
        {t("taxi.testLive")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}
