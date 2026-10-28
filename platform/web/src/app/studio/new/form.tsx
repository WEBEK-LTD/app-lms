"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createStudioProjectAction } from "@/app/actions/studio-projects";
import { SubmitButton } from "@/components/form";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { StudioView } from "@/components/studio/view";
import type { DashKey } from "@/i18n/dashboard";
import { kindById } from "@/lib/app/kinds";
import { templatesFor, type SectionWord } from "@/lib/studio/sections";
import { Glyph, STUDIO_COLORS as C } from "../editor/shared";
import { StudioBar } from "../chrome";

export interface KindChoice {
  id: string;
  name: string;
  icon: string;
  sources: { value: string; label: string; short: string | null }[];
}

type StudioKind = KindChoice & { text: string; soon: boolean };

const ARABIC_DIGITS = ["١", "٢", "٣"];

/** 103R.3 The new project's three steps, with its summary beside them. */
export function NewProjectForm({ studioKinds, kinds, error }: { studioKinds: StudioKind[]; kinds: KindChoice[]; error: string | null }) {
  const t = useDashT();
  const lang = useDashLang();
  const all = [...studioKinds.filter((k) => !k.soon), ...kinds];
  const [kindId, setKindId] = useState<string | null>(null);
  const kind = all.find((k) => k.id === kindId) ?? null;
  const [sourceValue, setSourceValue] = useState<string | null>(null);
  const source = kind?.sources.find((s) => s.value === sourceValue) ?? kind?.sources[0] ?? null;
  const [template, setTemplate] = useState<string | null>(null);
  // 103R.7 The project type's own templates first; a choice another type's list had counts as none.
  const kindTemplates = useMemo(() => {
    const info = kindById(kindId);
    return templatesFor(info ? { type: info.engine, vertical: info.vertical } : null);
  }, [kindId]);
  const pick = template && kindTemplates.some((x) => x.id === template) ? template : null;
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const go = (to: number) => {
    setStep(to);
    document.getElementById(`step-${to}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const ready = Boolean(kind && name.trim());
  const digit = (n: number) => (lang === "ar" ? ARABIC_DIGITS[n - 1] : String(n));
  const stepNames = [t("studio.step1"), t("studio.step2"), t("studio.step3")];
  const dim = (n: number) => ({ opacity: step === n ? 1 : 0.55, transition: "opacity 150ms" });
  const templateName = (id: string) => t(`studio.tpl_${id}` as DashKey);
  const words = { price: t("studio.price"), addPicture: t("studio.addPicture"), addVideo: t("studio.addVideo"), send: t("studio.send"), search: t("studio.search") };
  // The templates drawn small, in the dashboard's language, with the project's name.
  const pages = useMemo(
    () =>
      Object.fromEntries(
        kindTemplates.filter((x) => x.id !== "blank").map((x) => [
          x.id,
          x.make({ brand: "#0E0D24", source: null, w: (word: SectionWord) => t(`studio.w_${word}` as DashKey, { app: name.trim() || t("studio.untitledProject") }), newId: () => `t${x.id}` }),
        ]),
      ),
    [t, name, kindTemplates],
  );

  return (
    <form action={createStudioProjectAction} className="flex min-h-dvh flex-col">
      <input type="hidden" name="kind" value={kind?.id ?? ""} />
      <input type="hidden" name="source" value={source?.value ?? ""} />
      <input type="hidden" name="template" value={pick ?? "blank"} />
      <StudioBar>
        <Link href="/studio" className="flex items-center gap-1 text-sm no-underline" style={{ color: C.barMuted }}>
          <Glyph name="arrow_back" size={18} flip />
          {t("studio.yourProjects")}
        </Link>
        <div className="flex-[1_1_20px]" />
        <ol aria-label={t("studio.steps")} className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-[13px]">
          {stepNames.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(i + 1)}
                aria-current={step === i + 1 ? "step" : undefined}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 py-1"
                style={step === i + 1 ? { background: C.ivory, color: C.ink, fontWeight: 700, fontFamily: "inherit" } : { background: C.barSoft, color: C.ivory, fontFamily: "inherit" }}
              >
                <span>{digit(i + 1)}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </StudioBar>

      <main id="main" className="mx-auto box-border flex w-full max-w-[1200px] flex-1 flex-wrap items-start gap-6 px-6 pt-7 pb-10">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-[22px]">
          {error ? (
            <p role="alert" className="m-0 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "#FFE7DE", color: "#B23E0E" }}>
              {error}
            </p>
          ) : null}

          <section id="step-1" aria-labelledby="h-type" className="flex scroll-mt-4 flex-col gap-3" style={dim(1)} onFocus={() => setStep(1)}>
            <h1 id="h-type" className="m-0 text-[26px] font-extrabold">
              {t("studio.typeTitle")}
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "#B23E0E" }}>
              <Glyph name="auto_awesome" size={18} />
              {t("studio.studioOnly")}
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {studioKinds.map((k) => {
                const on = kindId === k.id;
                return (
                  <label
                    key={k.id}
                    className={`relative flex flex-col items-start gap-1.5 rounded-[14px] p-3.5 ${k.soon ? "" : "cursor-pointer"}`}
                    style={
                      on
                        ? { border: `2px solid ${C.accent}`, background: "#FFF2EC" }
                        : k.soon
                          ? { border: "1px dashed #B9B3A5", background: "#FFFFFF", color: C.muted }
                          : { border: `1px solid ${C.line}`, background: "#FFFFFF" }
                    }
                  >
                    <input
                      type="radio"
                      name="kindChoice"
                      value={k.id}
                      checked={on}
                      disabled={k.soon}
                      onChange={() => {
                        setKindId(k.id);
                        setSourceValue(null);
                        setStep(2);
                      }}
                      className="absolute top-3 end-3"
                      style={{ accentColor: C.accent }}
                    />
                    <Glyph name={k.icon} size={28} />
                    <span className="text-[15px] font-extrabold" style={{ color: C.ink }}>
                      {k.name}
                    </span>
                    <span className="text-xs" style={{ color: C.muted }}>
                      {k.text}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-1 text-[13px] font-bold" style={{ color: C.muted }}>
              {t("studio.allTypes")}
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {kinds.map((k) => {
                const on = kindId === k.id;
                return (
                  <label
                    key={k.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-white p-3 text-sm"
                    style={{ border: on ? `2px solid ${C.ink}` : `1px solid ${C.line}`, fontWeight: on ? 700 : 400 }}
                  >
                    <input
                      type="radio"
                      name="kindChoice"
                      value={k.id}
                      checked={on}
                      onChange={() => {
                        setKindId(k.id);
                        setSourceValue(null);
                        setStep(2);
                      }}
                      style={{ accentColor: C.ink }}
                    />
                    <Glyph name={k.icon} />
                    {k.name}
                  </label>
                );
              })}
            </div>
          </section>

          <section id="step-2" aria-labelledby="h-source" className="flex scroll-mt-4 flex-col gap-3" style={dim(2)} onFocus={() => setStep(2)}>
            <h2 id="h-source" className="m-0 text-xl font-extrabold">
              {t("studio.sourceTitle")}
            </h2>
            <div role="radiogroup" aria-labelledby="h-source" className="flex flex-wrap gap-2 text-sm">
              {(kind?.sources ?? []).map((s) => {
                const on = source?.value === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setSourceValue(s.value);
                      setStep(3);
                    }}
                    className="cursor-pointer rounded-[10px] bg-white px-3.5 py-2"
                    style={{ border: on ? `2px solid ${C.ink}` : `1px solid ${C.line}`, fontWeight: on ? 700 : 400, color: C.ink, fontFamily: "inherit" }}
                  >
                    {s.label}
                  </button>
                );
              })}
              {!kind ? (
                <span className="rounded-[10px] px-3.5 py-2" style={{ border: `1px dashed ${C.line}`, color: C.muted }}>
                  {t("studio.errKind")}
                </span>
              ) : null}
            </div>
            <div className="text-xs" style={{ color: C.muted }}>
              {t("studio.deliverySource")}
            </div>
          </section>

          <section id="step-3" aria-labelledby="h-start" className="flex scroll-mt-4 flex-col gap-3" style={dim(3)} onFocus={() => setStep(3)}>
            <h2 id="h-start" className="m-0 text-xl font-extrabold">
              {t("studio.newStartTitle")}
            </h2>
            <div role="radiogroup" aria-labelledby="h-start" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {kindTemplates.filter((x) => x.id !== "blank").map((x) => {
                const on = pick === x.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setTemplate(x.id);
                      setStep(3);
                    }}
                    className="flex cursor-pointer flex-col gap-2 rounded-[14px] bg-white p-2.5 text-start"
                    style={{ border: on ? `2px solid ${C.ink}` : `1px solid ${C.line}`, color: C.ink, fontFamily: "inherit" }}
                  >
                    <span dir="ltr" className="relative block h-[120px] w-full overflow-hidden rounded-[10px]" style={{ background: "#FBF8F2" }} aria-hidden="true">
                      <span className="absolute top-0 left-1/2 block" style={{ width: 360, transform: "translateX(-50%) scale(0.36)", transformOrigin: "top center", pointerEvents: "none" }}>
                        <StudioView
                          page={pages[x.id]!}
                          lang={lang}
                          defaultLang={lang}
                          dark={false}
                          look={{ name: name.trim() || t("studio.untitledProject"), logoUrl: null, brand: "#0E0D24", font: "Cairo", tabs: [], activeTab: null }}
                          pickable={{ items: {}, categories: {} }}
                          words={words}
                        />
                      </span>
                    </span>
                    <span className="text-[13px] font-bold">{templateName(x.id)}</span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={pick === null || pick === "blank"}
                onClick={() => {
                  setTemplate("blank");
                  setStep(3);
                }}
                className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] p-2.5"
                style={{
                  border: pick === "blank" ? `2px solid ${C.ink}` : "2px dashed #B9B3A5",
                  background: "rgba(255,255,255,0.5)",
                  color: C.ink,
                  fontFamily: "inherit",
                }}
              >
                <Glyph name="note_add" size={28} />
                <span className="text-[13px] font-bold">{templateName("blank")}</span>
              </button>
            </div>
          </section>
        </div>

        <aside className="sticky top-4 flex max-w-[360px] flex-[1_1_300px] flex-col gap-3 rounded-[18px] bg-white p-[18px]" style={{ border: `1px solid ${C.line}` }}>
          <div className="text-xs font-bold" style={{ color: C.muted }}>
            {t("studio.yourProject")}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            {t("studio.projectName")}
            <input
              name="name"
              type="text"
              required
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-[10px] px-3 text-sm font-normal"
              style={{ border: `1px solid ${C.line}`, fontFamily: "inherit", color: C.ink }}
            />
          </label>
          {kind ? (
            <div className="flex items-center gap-2 text-sm">
              <Glyph name={kind.icon} className="text-[#FF5A1F]" />
              {kind.name}
            </div>
          ) : null}
          {source ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
              <Glyph name={source.value === "catalog" ? "cloud_off" : "link"} />
              {source.short ?? source.label}
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-sm" style={{ color: C.muted }}>
            <Glyph name="dashboard" />
            {t("studio.templateLine", { name: templateName(pick ?? "blank") })}
          </div>
          <div className="h-px" style={{ background: "#EDE8DD" }} />
          <p className="m-0 text-[13px]" style={{ color: C.muted }}>
            {t("studio.tryFirst")}
          </p>
          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 && !kind}
              onClick={() => go(step + 1)}
              className="flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border-0 text-[15px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: C.accent, color: C.ink, fontFamily: "inherit" }}
            >
              {t("studio.next")}
              <Glyph name="arrow_forward" flip />
            </button>
          ) : (
            <SubmitButton
              disabled={!ready}
              className="flex h-[46px] items-center justify-center gap-2 rounded-xl border-0 !bg-[#FF5A1F] text-[15px] font-extrabold !text-[#0E0D24] disabled:opacity-60"
            >
              {t("studio.next")}
              <Glyph name="arrow_forward" flip />
            </SubmitButton>
          )}
        </aside>
      </main>
    </form>
  );
}
