import type { Metadata } from "next";
import { addSuggestedTemplateAction, addTemplateFieldAction, changeTemplateFieldAction, deleteReportTemplateAction, saveReportTemplateAction } from "@/app/actions/school-reports";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { SCHOOL_REPORT_FIELD_TYPES, SCHOOL_REPORT_KINDS, type SchoolReportKind } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { REPORT_LIMITS } from "@/lib/school/teacher-reports";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { FIELD_TYPE_KEYS } from "../report-parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("reports.templates") };
}

const KIND_KEYS: Record<SchoolReportKind, { title: DashKey; intro: DashKey; suggested: DashKey }> = {
  student: { title: "reports.studentTemplates", intro: "reports.studentTemplatesIntro", suggested: "reports.addSuggestedStudent" },
  class: { title: "reports.classTemplates", intro: "reports.classTemplatesIntro", suggested: "reports.addSuggestedClass" },
};

/**
 * 113.5 The school's report templates, for teachers' reports on a student
 * or on a class: each field written text, a choice or a rating from 1 to 5,
 * and whether it must be filled in. A report keeps the fields it was
 * started with.
 */
export default async function ReportTemplatesPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("reports.templates")} t={t} />;
  const store = await getStore();
  const [templates, plan] = await Promise.all([store.listSchoolReportTemplates(app.id), appPlan(store, license, new Date())]);
  const typeOptions = SCHOOL_REPORT_FIELD_TYPES.map((type) => ({ value: type, label: t(FIELD_TYPE_KEYS[type]) }));

  const change = (templateId: number, field: string, what: "up" | "down" | "remove", disabled = false) => (
    <form action={changeTemplateFieldAction}>
      <input type="hidden" name="id" value={templateId} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="change" value={what} />
      {what === "remove" ? (
        <button type="submit" aria-label={t("reports.removeField")} className={`${btn.ghost} h-8 px-2 text-danger`}>
          <Icon name="delete" size={18} />
        </button>
      ) : (
        <button type="submit" disabled={disabled} aria-label={t(what === "up" ? "reports.moveUp" : "reports.moveDown")} className={`${btn.ghost} h-8 px-2`}>
          <Icon name={what === "up" ? "arrow_upward" : "arrow_downward"} size={18} />
        </button>
      )}
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("reports.templates")} intro={t("reports.templatesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {SCHOOL_REPORT_KINDS.map((kind) => {
        const own = templates.filter((x) => x.kind === kind);
        return (
          <Panel key={kind} id={`h-templates-${kind}`} title={t(KIND_KEYS[kind].title)} intro={t(KIND_KEYS[kind].intro)}>
            {own.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="m-0 flex-1 text-[15px] text-muted">{t("reports.noTemplates")}</p>
                <form action={addSuggestedTemplateAction}>
                  <input type="hidden" name="kind" value={kind} />
                  <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
                    {t(KIND_KEYS[kind].suggested)}
                  </button>
                </form>
              </div>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {own.map((template) => (
                <li key={template.id} className="flex flex-col gap-3 rounded-xl border border-line p-4" data-template={template.name}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1 text-[16px] font-bold">{template.name}</span>
                    <form action={deleteReportTemplateAction}>
                      <input type="hidden" name="id" value={template.id} />
                      <ConfirmButton confirm={t("reports.deleteTemplate", { name: template.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("school.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  {template.fields.length === 0 ? <p className="m-0 text-[14px] text-muted">{t("reports.noFields")}</p> : null}
                  <ol className="m-0 flex list-none flex-col p-0">
                    {template.fields.map((field, i) => (
                      <li key={field.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-2 first:border-t-0" data-field={field.label}>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px] font-semibold">{field.label}</span>
                          <span className="text-[13px] text-muted">{[t(FIELD_TYPE_KEYS[field.type]), field.options.join(" / ")].filter(Boolean).join(" · ")}</span>
                        </span>
                        {field.required ? <Badge tone="neutral">{t("reports.required")}</Badge> : null}
                        {change(template.id, field.id, "up", i === 0)}
                        {change(template.id, field.id, "down", i === template.fields.length - 1)}
                        {change(template.id, field.id, "remove")}
                      </li>
                    ))}
                  </ol>
                  {template.fields.length < REPORT_LIMITS.fields ? (
                    <AddServiceBox title={t("reports.addField")} open={template.fields.length === 0}>
                      <SchoolForm action={addTemplateFieldAction} submit={t("school.add")} reset>
                        <input type="hidden" name="id" value={template.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field id={`f-label-${template.id}`} label={t("reports.fieldLabel")} name="label" maxLength={REPORT_LIMITS.label} placeholder={t("reports.fieldLabelExample")} required />
                          <Choice id={`f-type-${template.id}`} name="type" label={t("reports.fieldType")} options={typeOptions} defaultValue="text" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`f-options-${template.id}`} className="text-sm font-semibold">
                            {t("reports.choices")}
                          </label>
                          <textarea id={`f-options-${template.id}`} name="options" rows={3} className="input min-h-20 py-3" placeholder={t("reports.choicesExample")} />
                          <span className="text-xs text-muted">{t("reports.choicesHint")}</span>
                        </div>
                        <label className="flex items-center gap-2 text-[15px] font-semibold">
                          <input type="checkbox" name="required" className="h-4 w-4 accent-midnight" />
                          {t("reports.mustFill")}
                        </label>
                      </SchoolForm>
                    </AddServiceBox>
                  ) : null}
                  <details className="rounded-lg border border-line-soft px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold">{t("reports.renameTemplate")}</summary>
                    <div className="pt-3">
                      <SchoolForm action={saveReportTemplateAction} submit={t("school.save")}>
                        <input type="hidden" name="id" value={template.id} />
                        <input type="hidden" name="kind" value={template.kind} />
                        <Field id={`f-name-${template.id}`} label={t("reports.templateName")} name="name" defaultValue={template.name} maxLength={REPORT_LIMITS.templateName} />
                      </SchoolForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            <AddServiceBox title={t("reports.addTemplate")} open={false}>
              <SchoolForm action={saveReportTemplateAction} submit={t("school.add")} reset>
                <input type="hidden" name="kind" value={kind} />
                <Field id={`f-name-new-${kind}`} label={t("reports.templateName")} name="name" maxLength={REPORT_LIMITS.templateName} placeholder={t("reports.templateNameExample")} required />
              </SchoolForm>
            </AddServiceBox>
          </Panel>
        );
      })}
    </div>
  );
}
