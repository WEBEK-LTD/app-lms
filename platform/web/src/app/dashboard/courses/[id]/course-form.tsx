"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { saveCourseAction } from "@/app/actions/courses";
import { FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { useDashT } from "@/components/dashboard-i18n";
import { SaveBar, useDirtyForm, useLeaveGuard } from "@/components/manage-kit-client";
import { initialFormState } from "@/lib/forms";
import {
  CourseAboutFields,
  CourseAccessDaysField,
  CourseCertificateFields,
  CourseCompletionFields,
  CoursePrerequisitesField,
  CoursePriceField,
  CourseRestartField,
  CourseSequentialField,
  CourseTeachingFields,
  CourseVisibleField,
} from "../forms";
import { OnTabs, TabPanel, useEditorTab } from "./editor-tabs";

/** The course form's tabs; the others (Curriculum, Students, Settings) have their own forms. */
export const FORM_TABS = ["details", "pricing", "certificate"];

function Card({ id, icon, title, description, children }: { id: string; icon: IconName; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ivory text-midnight">
          <Icon name={icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={id} className="m-0 text-[17px] font-extrabold">
            {title}
          </h2>
          {description ? <p className="m-0 text-[13px] leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** What a tab's fields hold, to tell which tabs have unsaved changes. */
function fieldsOf(panel: Element): string {
  return [...panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")]
    .map((f) => `${f.name}=${f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio") ? f.checked : f instanceof HTMLInputElement && f.type === "file" ? (f.files?.length ?? 0) : f.value}`)
    .join("\u0001");
}

/**
 * 132.13 The course's form across the editor's Details, Pricing and access,
 * and Certificate tabs: one form (every field is sent together, as the
 * server keeps them), saved from the bar at the foot without being cleared.
 */
export function CourseEditorForm({
  current,
  categories,
  currency,
  imageUrl,
  others,
}: {
  current: Record<string, string>;
  categories: { id: number; name: string }[];
  currency: string;
  imageUrl: string | null;
  others: { id: number; title: string }[];
}) {
  const t = useDashT();
  const { mark, open } = useEditorTab();
  const [state, dispatch, pending] = useActionState(saveCourseAction, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  const { dirty, markClean } = useDirtyForm(form);
  useLeaveGuard(dirty && !pending, t("common.leaveUnsaved"));
  const base = useRef<Record<string, string>>({});
  const e = state.errors ?? {};
  const part = { v: current, e, k: `f-course-${current.id}` };

  // Each tab's fields as they opened, to mark the tabs with unsaved changes.
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      for (const panel of el.querySelectorAll("[data-tab-panel]")) base.current[panel.getAttribute("data-tab-panel")!] = fieldsOf(panel);
    });
    const check = () =>
      window.setTimeout(() => {
        for (const panel of el.querySelectorAll("[data-tab-panel]")) {
          const id = panel.getAttribute("data-tab-panel")!;
          mark(id, { dirty: fieldsOf(panel) !== base.current[id], error: Boolean(panel.querySelector('[aria-invalid="true"], [id$="-error"]')) });
        }
      }, 0);
    el.addEventListener("input", check);
    el.addEventListener("change", check);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("input", check);
      el.removeEventListener("change", check);
    };
  }, [mark]);

  // Saved: the new picture is the course's now, nothing is unsaved. A field to fix: its tab opens.
  useEffect(() => {
    const el = form.current;
    if (!el || (!state.ok && !state.errors)) return;
    requestAnimationFrame(() => {
      if (state.ok) {
        for (const file of el.querySelectorAll<HTMLInputElement>('input[type="file"]')) file.value = "";
        for (const box of el.querySelectorAll<HTMLInputElement>('input[name="removeImage"]')) box.checked = false;
        for (const panel of el.querySelectorAll("[data-tab-panel]")) {
          const id = panel.getAttribute("data-tab-panel")!;
          base.current[id] = fieldsOf(panel);
          mark(id, {});
        }
        markClean();
        return;
      }
      let first: string | null = null;
      for (const panel of el.querySelectorAll("[data-tab-panel]")) {
        const id = panel.getAttribute("data-tab-panel")!;
        const error = Boolean(panel.querySelector('[id$="-error"]'));
        mark(id, { dirty: fieldsOf(panel) !== base.current[id], error });
        if (error && !first) first = id;
      }
      if (first) {
        open(first);
        requestAnimationFrame(() => el.querySelector<HTMLElement>(`[data-tab-panel="${first}"] [id$="-error"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });
  }, [state, mark, open, markClean]);

  return (
    <form
      ref={form}
      noValidate
      data-course-form=""
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      <input type="hidden" name="id" value={current.id} />
      <OnTabs tabs={FORM_TABS}>
        <FormMessage message={state.message} ok={state.ok} />
      </OnTabs>
      <TabPanel tab="details">
        <Card id="h-details" icon="edit_note" title={t("courses.details")} description={t("courses.formAboutHint")}>
          <CourseAboutFields {...part} categories={categories} imageUrl={imageUrl} />
        </Card>
        <Card id="h-teaching" icon="co_present" title={t("manage.teaching")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CourseTeachingFields {...part} />
          </div>
        </Card>
      </TabPanel>
      <TabPanel tab="pricing">
        <Card id="h-price" icon="sell" title={t("courses.prices")}>
          <div className="sm:max-w-[320px]">
            <CoursePriceField {...part} currency={currency} />
          </div>
        </Card>
        <Card id="h-access" icon="lock" title={t("courses.formAccess")}>
          <CourseVisibleField {...part} />
          <CourseAccessDaysField {...part} />
          <CourseRestartField {...part} />
          <CourseSequentialField {...part} />
          <CoursePrerequisitesField {...part} others={others} />
        </Card>
      </TabPanel>
      <TabPanel tab="certificate">
        <Card id="h-certificate" icon="workspace_premium" title={t("manage.tabCertificate")} description={t("courses.formFinishHint")}>
          <CourseCertificateFields {...part} />
          <CourseCompletionFields {...part} />
        </Card>
      </TabPanel>
      <OnTabs tabs={FORM_TABS}>
        <SaveBar
          dirty={dirty}
          pending={pending}
          errorCount={Object.keys(e).length}
          saveLabel={t("courses.saveCourse")}
          cancel={{ href: "/dashboard/courses", label: t("common.cancel") }}
          words={{ unsaved: t("manage.unsaved"), saved: t("manage.noChanges"), saving: t("common.saving"), errors: t("manage.fixErrors", { count: Object.keys(e).length }) }}
        />
      </OnTabs>
    </form>
  );
}
