import type { Metadata } from "next";
import Link from "next/link";
import { changeOccasionAction, changeTemplateAction } from "@/app/actions/selling";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { KitBar, KitCallout, KitDrawer, KitEmpty, KitFold, KitHeader, KitMore, KitPage, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorHead, KitInspectorPart } from "@/components/studio-page/parts";
import { KitTable, type KitTableRow } from "@/components/studio-page/table";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { occasionName, seedGiftOccasions } from "@/lib/selling/gift-messages";
import { giftsOf } from "@/lib/selling/gifts";
import { appLanguagesOf } from "@/lib/selling/store";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { OccasionForm, TemplateForm } from "../forms";
import { SellingTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("selling.messagesTitle") };
}

/** One change (move, hide or show, delete) as an entry of a "⋯" menu. */
function Change({ action, fields, label, icon, danger = false }: { action: (formData: FormData) => Promise<void>; fields: Record<string, string | number>; label: string; icon: IconName; danger?: boolean }) {
  return (
    <form action={action} className="flex">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={`${kit.menuItem} ${danger ? "text-danger hover:text-danger" : ""}`}>
        <Icon name={icon} size={18} />
        {label}
      </button>
    </form>
  );
}

/**
 * 131 Store › Card messages: occasions and their ready messages in each of
 * the app's languages. 132.135 The occasions in one card, each opening on
 * its messages; each message with Edit and the rest in its "⋯" menu.
 * 132.160 The console's look: the occasions as a table (its messages, shown
 * or hidden), an occasion's messages in the inspector with Add a message
 * folded; Delivery & offers beside it.
 */
export default async function GiftMessagesPage() {
  const { app } = await requireClient("catalog");
  const { t, lang } = await dashboardText();
  if (!app || app.appType !== "store") {
    return (
      <KitPage>
        <KitHeader icon="edit_note" title={t("selling.messagesTitle")} description={t("selling.notStore")} />
      </KitPage>
    );
  }
  const store = await getStore();
  const fresh = !giftsOf(app).messagesSeeded;
  // The first visit copies Yallapp's starters into the store: the owner's from then on.
  const occasions = await seedGiftOccasions(store, app, new Date());
  const languages = await appLanguagesOf(store, app);
  const more = t("studioPage.more");
  const close = t("common.close");
  const templates = occasions.reduce((n, o) => n + o.templates.length, 0);

  const rows: KitTableRow[] = occasions.map((o, i) => {
    const name = occasionName(o, lang, languages.default);
    return {
      id: String(o.id),
      name,
      data: { "data-occasion": String(o.id) },
      cells: [
        <>
          <KitThumb icon={o.icon as IconName} size={40} dim={o.hidden} />
          <span id={`h-occasion-${o.id}`} className="truncate text-[14.5px] font-bold" dir="auto">
            {name}
          </span>
        </>,
        <span key="m" className="font-sans tabular-nums">
          {t("selling.messageCount", { count: o.templates.length })}
        </span>,
        o.hidden ? <KitStatus key="s" tone="neutral">{t("selling.hidden")}</KitStatus> : <KitStatus key="s" tone="success">{t("selling.shownState")}</KitStatus>,
      ],
      inspector: {
        title: t("selling.occasion"),
        actions: (
          <KitMore label={more} look="row">
            {i > 0 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "up" }} label={t("selling.up")} icon="arrow_upward" /> : null}
            {i < occasions.length - 1 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "down" }} label={t("selling.down")} icon="arrow_downward" /> : null}
            <Change action={changeOccasionAction} fields={{ id: o.id, change: o.hidden ? "show" : "hide" }} label={o.hidden ? t("selling.show") : t("selling.hide")} icon={o.hidden ? "visibility" : "visibility_off"} />
            <Change action={changeOccasionAction} fields={{ id: o.id, change: "delete" }} label={t("common.delete")} icon="delete" danger />
          </KitMore>
        ),
        footer: (
          <KitDrawer
            title={name}
            closeLabel={close}
            triggerClassName={`${kit.quiet} w-full`}
            trigger={
              <>
                <Icon name="edit" size={18} />
                {t("selling.renameOccasion")}
              </>
            }
          >
            <OccasionForm occasion={{ id: o.id, names: Object.fromEntries(languages.available.map((l) => [l, o.names[l] ?? (o.key ? occasionName(o, l, languages.default) : "")])) }} languages={languages.available} />
          </KitDrawer>
        ),
        body: (
          <KitInspectorBody data-inspector-occasion={String(o.id)}>
            <KitInspectorHead icon={o.icon as IconName} title={name} line={t("selling.messageCount", { count: o.templates.length })} badges={o.hidden ? <KitStatus tone="neutral">{t("selling.hidden")}</KitStatus> : null} />
            <KitInspectorPart title={t("selling.messagesTitle")}>
              {o.templates.length ? (
                <ul aria-label={name} className="m-0 flex list-none flex-col gap-2 p-0">
                  {o.templates.map((tpl, n) => (
                    <li key={tpl.id} data-template={`${o.id}-${tpl.id}`} className="flex items-start gap-2 rounded-[14px] bg-(--sp-soft) py-2.5 ps-3.5 pe-1.5">
                      <p className={`m-0 min-w-0 flex-1 py-1 text-[14px] leading-relaxed ${tpl.hidden ? "text-(--sp-muted)" : "text-(--sp-ink)"}`} dir="auto">
                        {tpl.texts[lang] ?? tpl.texts[languages.default] ?? Object.values(tpl.texts)[0]}
                        {tpl.hidden ? (
                          <span className="ms-2 inline-flex align-middle">
                            <KitStatus tone="neutral">{t("selling.hidden")}</KitStatus>
                          </span>
                        ) : null}
                      </p>
                      <KitDrawer
                        title={t("selling.editMessage")}
                        closeLabel={close}
                        triggerClassName={kit.icon}
                        trigger={
                          <>
                            <Icon name="edit" size={18} />
                            <span className="sr-only">{t("selling.editMessage")}</span>
                          </>
                        }
                      >
                        <TemplateForm occasionId={o.id} template={tpl} languages={languages.available} />
                      </KitDrawer>
                      <KitMore label={more} look="row">
                        {n > 0 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "up" }} label={t("selling.up")} icon="arrow_upward" /> : null}
                        {n < o.templates.length - 1 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "down" }} label={t("selling.down")} icon="arrow_downward" /> : null}
                        <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: tpl.hidden ? "show" : "hide" }} label={tpl.hidden ? t("selling.show") : t("selling.hide")} icon={tpl.hidden ? "visibility" : "visibility_off"} />
                        <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "delete" }} label={t("common.delete")} icon="delete" danger />
                      </KitMore>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[14px] text-(--sp-muted)">{t("selling.noMessages")}</p>
              )}
            </KitInspectorPart>
            <KitFold icon="add" summary={t("selling.addMessage")}>
              <TemplateForm occasionId={o.id} languages={languages.available} />
            </KitFold>
          </KitInspectorBody>
        ),
      },
    };
  });

  return (
    <KitPage>
      <KitHeader
        icon="edit_note"
        title={t("selling.messagesTitle")}
        description={t("selling.messagesLine")}
        help={t("selling.messagesIntro")}
        helpLabel={t("studioPage.help")}
        actions={
          <KitDrawer
            title={t("selling.addOccasion")}
            closeLabel={close}
            triggerClassName={kit.main}
            trigger={
              <>
                <Icon name="add" size={20} />
                {t("selling.addOccasion")}
              </>
            }
          >
            <OccasionForm languages={languages.available} />
          </KitDrawer>
        }
      />
      <KitBar>
        <SellingTabs messages={templates} />
      </KitBar>
      {/* 131 An app on its own API reads its card messages from there. */}
      {app.backend === "custom_api" ? (
        <KitCallout tone="warn" icon="warning">
          {richText(t("selling.messagesOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> })}
        </KitCallout>
      ) : null}
      {fresh ? <KitCallout icon="info">{t("selling.messagesStarters")}</KitCallout> : null}
      <KitTable
        label={t("selling.messagesTitle")}
        title={t("selling.occasions", { count: occasions.length })}
        titleId="h-occasions"
        search={t("selling.searchOccasions")}
        noMatch={t("selling.noMessages")}
        columns={[
          { label: t("selling.occasion"), width: "minmax(0,1fr)" },
          { label: t("selling.messagesTitle"), width: "150px", phone: "sub" },
          { label: t("common.status"), width: "minmax(110px,auto)", phone: "end" },
        ]}
        rows={rows}
        empty={<KitEmpty icon="edit_note" title={t("selling.noMessages")} />}
      />
    </KitPage>
  );
}
