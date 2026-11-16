"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { importAction, type ImportState } from "@/app/actions/import";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { Notice, btn } from "@/components/ui";
import type { ImportKind } from "@/lib/import/plan";

const INITIAL: ImportState = { step: "start" };

const LIST: Record<ImportKind, { href: string; key: "imports.seeProducts" | "imports.seeServices" | "imports.seeCourses" }> = {
  products: { href: "/dashboard/catalog", key: "imports.seeProducts" },
  services: { href: "/dashboard/services", key: "imports.seeServices" },
  courses: { href: "/dashboard/courses", key: "imports.seeCourses" },
};

/**
 * 81.4 The import: a file or a link, checked first (what would be imported,
 * what's wrong), then imported. The file is kept here between the two, since
 * a form's own fields are emptied after each action.
 */
export function ImportForm() {
  const t = useDashT();
  const known = useKnownText();
  const [state, dispatch, pending] = useActionState(importAction, INITIAL);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [intent, setIntent] = useState<"check" | "import">("check");

  const send = (next: "check" | "import") => {
    const form = new FormData();
    form.set("intent", next);
    if (file) form.set("file", file);
    else form.set("link", link);
    setIntent(next);
    startTransition(() => dispatch(form));
  };
  const reset = () => {
    setFile(null);
    setLink("");
    const form = new FormData();
    form.set("intent", "reset");
    startTransition(() => dispatch(form));
  };

  if (state.step === "done") {
    const { report } = state;
    return (
      <div className="flex max-w-[720px] flex-col gap-3">
        <Notice tone="success" icon="check_circle" role="status">
          {t("imports.done", { added: report.added, updated: report.updated })}
        </Notice>
        {report.skipped ? <p className="m-0 text-[15px] text-ink-4">{t("imports.skipped", { count: report.skipped })}</p> : null}
        {report.pictures.missed ? <p className="m-0 text-[15px] text-ink-4">{t("imports.picturesMissed", { count: report.pictures.missed })}</p> : null}
        {report.pictures.missed && state.wix ? <p className="m-0 text-[15px] text-ink-4">{t("imports.picturesAgain")}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Link href={LIST[state.kind].href} className={`${btn.primary} h-11`}>
            {t(LIST[state.kind].key)}
          </Link>
          <button type="button" className={`${btn.secondary} h-11`} onClick={() => reset()}>
            {t("imports.another")}
          </button>
        </div>
      </div>
    );
  }

  const preview = state.step === "checked" ? state.preview : null;
  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex max-w-[720px] flex-col gap-4 rounded-[20px] border border-line bg-white p-[22px]"
        onSubmit={(event) => {
          event.preventDefault();
          send("check");
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="import-file" className="text-sm font-semibold">
            {t("imports.file")}
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.tsv,.txt,.xml,text/csv,text/tab-separated-values,application/xml,text/xml"
            className="text-[15px]"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              if (event.target.files?.[0]) setLink("");
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="import-link" className="text-sm font-semibold">
            {t("imports.link")}
          </label>
          <input
            id="import-link"
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            value={link}
            disabled={Boolean(file)}
            maxLength={2000}
            onChange={(event) => setLink(event.target.value)}
            className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] disabled:opacity-60"
          />
        </div>
        {state.step === "start" && state.error ? (
          <Notice tone="warn" icon="warning" role="alert">
            {known(state.error)}
          </Notice>
        ) : null}
        <div>
          <button type="submit" className={`${btn.secondary} h-11`} disabled={pending || (!file && !link.trim())}>
            <Icon name="visibility" size={20} />
            {pending && intent === "check" ? t("imports.checking") : t("imports.check")}
          </button>
        </div>
      </form>

      {preview ? (
        <section aria-labelledby="import-preview" className="flex max-w-[960px] flex-col gap-4">
          <h2 id="import-preview" className="m-0 text-lg font-extrabold">
            {preview.wix ? t("imports.wixReady", { ready: preview.ready, total: preview.total }) : t("imports.ready", { ready: preview.ready, total: preview.total })}
          </h2>
          {preview.wix ? (
            // Wix's own product export: what it holds, and what this shop can't keep.
            <div className="flex flex-col gap-2" data-wix-file="">
              <Notice tone="info" icon="info" role="status">
                {t("imports.wixFound", { products: preview.wix.products, variants: preview.wix.variants, pictures: preview.wix.pictures })}
              </Notice>
              {preview.wix.dropped.length ? (
                <div className="flex flex-col gap-1 text-sm" data-wix-dropped="">
                  <span className="font-semibold">{t("imports.wixNotKept")}</span>
                  <ul className="m-0 flex list-disc flex-col gap-0.5 ps-5">
                    {preview.wix.dropped.map((d) => (
                      <li key={d.what}>
                        {/* Each name kept apart from the line's own direction (U+2068…U+2069), so an English name reads right in Arabic. */}
                        {t(`imports.wixDropped.${d.what}`, { count: d.count, names: d.names.map((n) => `\u2068“${n}”\u2069`).join(", ") })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          {preview.missing.length ? (
            <Notice tone="warn" icon="warning" role="alert">
              {t("imports.missing", { fields: preview.missing.map((f) => t(`imports.fields.${f}`)).join(", ") })}
            </Notice>
          ) : null}
          {preview.columns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start text-sm">
                <caption className="mb-2 text-start text-sm font-bold">{t("imports.columnsFound")}</caption>
                <thead>
                  <tr className="border-b border-line text-ink-4">
                    <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("imports.field")}</th>
                    <th scope="col" className="py-2 text-start font-semibold">{t("imports.column")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((c) => (
                    <tr key={c.field} className="border-b border-line-soft">
                      <td className="py-2 pe-4">{t(`imports.fields.${c.field}`)}</td>
                      <td className="py-2" dir="auto">{c.column}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview.sample.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start text-sm">
                <caption className="mb-2 text-start text-sm font-bold">{t("imports.sample")}</caption>
                <thead>
                  <tr className="border-b border-line text-ink-4">
                    <th scope="col" className="py-2 pe-4 text-start font-semibold">#</th>
                    <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("imports.name")}</th>
                    <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("imports.price")}</th>
                    <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("imports.category")}</th>
                    {preview.wix ? (
                      <>
                        <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("imports.variants")}</th>
                        <th scope="col" className="py-2 text-start font-semibold">{t("imports.pictures")}</th>
                      </>
                    ) : (
                      <th scope="col" className="py-2 text-start font-semibold">{t("imports.picture")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((r) => (
                    <tr key={r.row} className="border-b border-line-soft">
                      <td className="py-2 pe-4 text-muted">{r.row}</td>
                      <td className="py-2 pe-4">
                        <bdi>{r.name}</bdi>
                      </td>
                      <td className="py-2 pe-4">
                        <bdi dir="ltr">{r.price ?? "—"}</bdi>
                      </td>
                      <td className="py-2 pe-4">
                        <bdi>{r.category ?? "—"}</bdi>
                      </td>
                      {preview.wix ? (
                        <>
                          <td className="py-2 pe-4">{r.variants ?? 0}</td>
                          <td className="py-2">{r.pictures ?? 0}</td>
                        </>
                      ) : (
                        <td className="py-2">{r.picture ? t("imports.yes") : t("imports.no")}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview.problems.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-base font-bold">{t("imports.problems")}</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {preview.problems.map((p) => (
                  <li key={p.row}>
                    <span className="font-semibold">{t("imports.row", { row: p.row })}</span>
                    {p.name ? <span dir="auto"> · {p.name}</span> : null}: {p.errors.map((e) => known(e)).join(" ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview.ready ? (
            <div>
              <button type="button" className={`${btn.primary} h-11`} disabled={pending} onClick={() => send("import")}>
                <Icon name="upload" size={20} />
                {pending && intent === "import" ? t("imports.importing") : t("imports.importNow", { count: preview.ready })}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
