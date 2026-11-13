import Link from "next/link";
import type { ReactNode } from "react";
import { removeAllSamplesAction } from "@/app/actions/samples";
import { firstStepsAction } from "@/app/actions/start";
import { Icon } from "@/components/icon";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoItems } from "@/lib/demo/picker";
import { FIRST_STEPS, firstStepsView, type FirstStep } from "@/lib/demo/start";
import { LIST_PAGE, sampleTotal } from "@/lib/samples/lists";
import { studioPathFor } from "@/lib/studio/section";

/**
 * 127 The editor's first open after an app was started from a demo on
 * /start (step 4 as approved): "Your first steps" with a progress bar (the
 * name, logo and colour done; your own entries, of the kind the demo
 * brings; your photos on the home page; the stores), "Tap anything in the
 * app to change it", and "Remove the demo's things". Shown until every step
 * is done or the owner hides it; kept with the app (FirstSteps), never in
 * the browser. In Studio's editor it floats over the canvas.
 */
export async function FirstSteps({ app, editor }: { app: App; editor: "/dashboard/pages" | "/studio/editor" }) {
  const store = await getStore();
  const view = await firstStepsView(store, app);
  if (!view) return null;
  const { t } = await dashboardText();
  const studio = editor === "/studio/editor";
  const inSection = (path: string) => (studio ? (studioPathFor(path) ?? path) : path);
  const demo = DEMO_BRANDS[view.demo].appName;
  const items = demoItems(view.demo);
  const done = FIRST_STEPS.filter((s) => view.done[s]).length;
  const current = FIRST_STEPS.find((s) => !view.done[s]) ?? null;
  const left = await sampleTotal(store, app);
  const steps: Record<FirstStep, { title: string; text: string; action: ReactNode }> = {
    brand: { title: t("start.first.brand"), text: t("start.first.brandText"), action: null },
    items: {
      title: t(`start.items.${items.noun}.own` as DashKey),
      text: t("start.first.itemsText", { demo, items: t(`start.items.${items.noun}.has` as DashKey, { count: view.samples }) }),
      action: (
        <Link href={inSection(LIST_PAGE[items.list])} className="flex h-11 items-center self-start rounded-[14px] bg-[var(--pk-ink)] px-4 text-sm font-bold text-[var(--pk-on-ink)] no-underline">
          {t(`start.items.${items.noun}.open` as DashKey)}
        </Link>
      ),
    },
    photos: {
      title: t("start.first.photos"),
      text: t("start.first.photosText"),
      action: (
        <form action={firstStepsAction}>
          <input type="hidden" name="step" value="photos" />
          <input type="hidden" name="back" value={editor} />
          <button type="submit" className="h-11 cursor-pointer rounded-[14px] border border-[var(--pk-line)] bg-transparent px-4 font-[inherit] text-sm font-bold text-[var(--pk-ink)]">
            {t("start.first.photosDone")}
          </button>
        </form>
      ),
    },
    stores: {
      title: t("start.first.stores"),
      text: t("start.first.storesText"),
      action: (
        <Link href={inSection("/dashboard/setup?step=listing")} className="flex h-11 items-center self-start rounded-[14px] border border-[var(--pk-line)] px-4 text-sm font-bold text-[var(--pk-ink)] no-underline">
          {t("start.first.storesOpen")}
        </Link>
      ),
    },
  };
  const panel = (
    <section aria-labelledby="first-steps-title" data-first-steps={view.demo} className="picker flex flex-col gap-4 rounded-[22px] border border-[var(--pk-line)] bg-[var(--pk-surface)] p-5 text-[var(--pk-ink)]">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 grow flex-col gap-1">
          <h2 id="first-steps-title" className="m-0 text-[22px] font-extrabold tracking-[-0.01em]">
            {t("start.first.title")}
          </h2>
          <p className="m-0 text-sm text-[var(--pk-ink2)]">{t("start.first.progress", { done, total: FIRST_STEPS.length })}</p>
        </div>
        <form action={firstStepsAction}>
          <input type="hidden" name="step" value="hide" />
          <input type="hidden" name="back" value={editor} />
          <button type="submit" aria-label={t("start.first.hide")} title={t("start.first.hide")} className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--pk-ink2)]">
            <Icon name="close" size={22} />
          </button>
        </form>
      </div>
      {studio ? (
        <p className="m-0 flex items-center gap-2 self-start rounded-[22px] bg-[#0E0D24] px-3.5 py-2 text-[13px] font-semibold text-[#F4EFE6]" data-tap-hint="">
          <Icon name="touch_app" size={18} />
          {t("start.first.tap")}
        </p>
      ) : null}
      <div role="progressbar" aria-label={t("start.first.bar", { done, total: FIRST_STEPS.length })} aria-valuemin={0} aria-valuemax={FIRST_STEPS.length} aria-valuenow={done} className="h-2 overflow-hidden rounded bg-[var(--pk-steps-soft)]">
        <div className="h-2 bg-[var(--pk-ok)]" style={{ width: `${(done / FIRST_STEPS.length) * 100}%` }} />
      </div>
      <ol className={`m-0 grid list-none grid-cols-1 gap-3 p-0 ${studio ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {FIRST_STEPS.map((step, i) => {
          const isDone = view.done[step];
          const now = step === current;
          const s = steps[step];
          return (
            <li
              key={step}
              data-step={step}
              data-done={isDone ? "" : undefined}
              className="flex items-start gap-3 rounded-2xl p-3.5"
              style={{ border: now ? "2px solid var(--pk-ink)" : "1px solid var(--pk-line)" }}
            >
              {isDone ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--pk-ok)] text-[var(--pk-on-ink)]">
                  <Icon name="check" size={16} />
                  <span className="sr-only">{t("start.first.done")}</span>
                </span>
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold" style={{ border: `2px solid ${now ? "var(--pk-ink)" : "var(--pk-line)"}`, color: now ? "var(--pk-ink)" : "var(--pk-ink2)" }}>
                  {i + 1}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-2.5">
                <div>
                  <h3 className="m-0 text-[15px] font-bold">{s.title}</h3>
                  <p className="m-0 text-[13px] leading-[1.45] text-[var(--pk-ink2)]">{s.text}</p>
                </div>
                {now ? s.action : null}
              </div>
            </li>
          );
        })}
      </ol>
      {left > 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-[var(--pk-steps-soft)] p-3.5 text-[13px] leading-normal">
          <p className="m-0">{richText(t("start.first.note", { demo }), { b: (chunk) => <b>{chunk}</b> })}</p>
          <form action={removeAllSamplesAction}>
            <input type="hidden" name="back" value={editor} />
            <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[13px] font-bold text-[var(--pk-accent-text)] underline underline-offset-2">
              {t("start.first.remove")}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
  if (studio) {
    return (
      <div className="fixed end-4 bottom-4 z-40 max-h-[calc(100dvh-96px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-[22px] shadow-[0_24px_60px_rgba(14,13,36,0.35)]" data-first-steps-float="">
        {panel}
      </div>
    );
  }
  return panel;
}

/** "Tap anything in the app to change it", over the editor's phone, while the first steps show. */
export async function TapHint({ app }: { app: App }) {
  if (!(await firstStepsView(await getStore(), app))) return null;
  const { t } = await dashboardText();
  return (
    <p className="m-0 flex items-center gap-2 self-start rounded-[22px] bg-[#0E0D24] px-4 py-2.5 text-sm font-semibold text-[#F4EFE6]" data-tap-hint="">
      <Icon name="touch_app" size={18} />
      {t("start.first.tap")}
    </p>
  );
}
