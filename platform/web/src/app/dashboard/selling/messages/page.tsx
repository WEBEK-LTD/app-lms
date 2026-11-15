import type { Metadata } from "next";
import Link from "next/link";
import { changeOccasionAction, changeTemplateAction } from "@/app/actions/selling";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { occasionName, seedGiftOccasions } from "@/lib/selling/gift-messages";
import { giftsOf } from "@/lib/selling/gifts";
import { appLanguagesOf } from "@/lib/selling/store";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { OccasionForm, TemplateForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("selling.messagesTitle") };
}

function Change({ action, fields, label, danger = false }: { action: (formData: FormData) => Promise<void>; fields: Record<string, string | number>; label: string; danger?: boolean }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={danger ? "danger" : "secondary"} className="h-8 px-3 text-[13px]">
        {label}
      </SubmitButton>
    </form>
  );
}

/** 131 Store › Card messages: occasions and their ready messages in each of the app's languages. */
export default async function GiftMessagesPage() {
  const { app } = await requireClient("catalog");
  const { t, lang } = await dashboardText();
  if (!app || app.appType !== "store") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("selling.messagesTitle")} description={t("selling.notStore")} />
      </div>
    );
  }
  const store = await getStore();
  const fresh = !giftsOf(app).messagesSeeded;
  // The first visit copies Yallapp's starters into the store: the owner's from then on.
  const occasions = await seedGiftOccasions(store, app, new Date());
  const languages = await appLanguagesOf(store, app);
  return (
    <div className="flex flex-col gap-6" data-gift-messages="">
      <PageHeader
        title={t("selling.messagesTitle")}
        description={t("selling.messagesIntro")}
        back={{ href: "/dashboard/selling", label: t("selling.title") }}
        actions={
          <SheetButton target="new-occasion" variant="secondary" className="h-10">
            {t("selling.addOccasion")}
          </SheetButton>
        }
      />
      {/* 131 An app on its own API reads its card messages from there. */}
      {app.backend === "custom_api" ? (
        <Notice tone="warn" icon="warning">
          {richText(t("selling.messagesOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> })}
        </Notice>
      ) : null}
      {fresh ? <Notice tone="info">{t("selling.messagesStarters")}</Notice> : null}
      <Sheet id="new-occasion" title={t("selling.addOccasion")}>
        <OccasionForm languages={languages.available} />
      </Sheet>
      {occasions.map((o, i) => (
        <Section
          key={o.id}
          titleId={`h-occasion-${o.id}`}
          title={
            <span className="inline-flex items-center gap-2">
              <Icon name={o.icon as Parameters<typeof Icon>[0]["name"]} size={20} />
              {occasionName(o, lang, languages.default)}
              {o.hidden ? <Badge tone="neutral">{t("selling.hidden")}</Badge> : null}
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <SheetButton target={`occasion-${o.id}`} variant="secondary" className="h-8 px-3 text-[13px]">
                {t("selling.editMessage")}
              </SheetButton>
              {i > 0 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "up" }} label={t("selling.up")} /> : null}
              {i < occasions.length - 1 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "down" }} label={t("selling.down")} /> : null}
              <Change action={changeOccasionAction} fields={{ id: o.id, change: o.hidden ? "show" : "hide" }} label={o.hidden ? t("selling.show") : t("selling.hide")} />
              <Change action={changeOccasionAction} fields={{ id: o.id, change: "delete" }} label={t("common.delete")} danger />
            </div>
          }
        >
          <Sheet id={`occasion-${o.id}`} title={occasionName(o, lang, languages.default)}>
            <OccasionForm occasion={{ id: o.id, names: Object.fromEntries(languages.available.map((l) => [l, o.names[l] ?? (o.key ? occasionName(o, l, languages.default) : "")])) }} languages={languages.available} />
          </Sheet>
          {o.templates.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {o.templates.map((tpl, n) => (
                <li key={tpl.id} data-template={`${o.id}-${tpl.id}`} className="flex flex-col gap-2 rounded-xl border border-line-soft p-3">
                  <p className="m-0 text-[15px]" dir="auto">
                    {tpl.texts[lang] ?? tpl.texts[languages.default] ?? Object.values(tpl.texts)[0]}
                    {tpl.hidden ? (
                      <>
                        {" "}
                        <Badge tone="neutral">{t("selling.hidden")}</Badge>
                      </>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <SheetButton target={`template-${o.id}-${tpl.id}`} variant="secondary" className="h-8 px-3 text-[13px]">
                      {t("selling.editMessage")}
                    </SheetButton>
                    {n > 0 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "up" }} label={t("selling.up")} /> : null}
                    {n < o.templates.length - 1 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "down" }} label={t("selling.down")} /> : null}
                    <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: tpl.hidden ? "show" : "hide" }} label={tpl.hidden ? t("selling.show") : t("selling.hide")} />
                    <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "delete" }} label={t("common.delete")} danger />
                  </div>
                  <Sheet id={`template-${o.id}-${tpl.id}`} title={t("selling.editMessage")}>
                    <TemplateForm occasionId={o.id} template={tpl} languages={languages.available} />
                  </Sheet>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="edit_note" title={t("selling.noMessages")} />
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold">{t("selling.addMessage")}</summary>
            <div className="pt-3">
              <TemplateForm occasionId={o.id} languages={languages.available} />
            </div>
          </details>
        </Section>
      ))}
    </div>
  );
}
