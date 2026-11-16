import type { Metadata } from "next";
import Link from "next/link";
import { changeOccasionAction, changeTemplateAction } from "@/app/actions/selling";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { KitCallout, KitDisclosure, KitEmpty, KitFold, KitHeader, KitMore, KitPage, KitStatus, KitThumb, kit } from "@/components/studio-page";
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
 * the app's languages. 132.135 The premium kit: the occasions in one card,
 * each opening in place on its messages; each message with Edit and the
 * rest in its "⋯" menu.
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
  return (
    <KitPage>
      <KitHeader
        icon="edit_note"
        title={t("selling.messagesTitle")}
        description={t("studioPage.messagesLine")}
        help={t("selling.messagesIntro")}
        helpLabel={t("studioPage.help")}
        back={{ href: "/dashboard/selling", label: t("selling.title") }}
        actions={
          <SheetButton target="new-occasion" variant="main" className="h-11">
            {t("selling.addOccasion")}
          </SheetButton>
        }
      />
      {/* 131 An app on its own API reads its card messages from there. */}
      {app.backend === "custom_api" ? (
        <KitCallout tone="warn" icon="warning">
          {richText(t("selling.messagesOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> })}
        </KitCallout>
      ) : null}
      {fresh ? <KitCallout icon="info">{t("selling.messagesStarters")}</KitCallout> : null}
      <Sheet id="new-occasion" title={t("selling.addOccasion")}>
        <OccasionForm languages={languages.available} />
      </Sheet>
      <section aria-label={t("selling.messagesTitle")} className={`${kit.card} flex min-w-0 flex-col py-2`}>
        {occasions.length === 0 ? (
          <KitEmpty icon="edit_note" title={t("selling.noMessages")} />
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {occasions.map((o, i) => {
              const name = occasionName(o, lang, languages.default);
              return (
                <li key={o.id} className="border-t border-(--sp-line-soft) first:border-t-0" data-occasion={o.id}>
                  <KitDisclosure
                    defaultOpen={i === 0}
                    media={<KitThumb icon={o.icon as IconName} dim={o.hidden} />}
                    summary={
                      <>
                        <span id={`h-occasion-${o.id}`} className="text-[15px] font-semibold break-words">
                          {name}
                        </span>
                        <span className="text-[13px] text-(--sp-muted)">{t("studioPage.messageCount", { count: o.templates.length })}</span>
                      </>
                    }
                    aside={o.hidden ? <KitStatus tone="neutral">{t("selling.hidden")}</KitStatus> : null}
                  >
                    <div className="flex flex-col gap-4 sm:ps-16">
                      <div className="flex flex-wrap items-center gap-2">
                        <SheetButton target={`occasion-${o.id}`} variant="pill" className="h-9" icon="edit">
                          {t("selling.editMessage")}
                        </SheetButton>
                        <KitMore label={more}>
                          {i > 0 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "up" }} label={t("selling.up")} icon="arrow_upward" /> : null}
                          {i < occasions.length - 1 ? <Change action={changeOccasionAction} fields={{ id: o.id, change: "down" }} label={t("selling.down")} icon="arrow_downward" /> : null}
                          <Change action={changeOccasionAction} fields={{ id: o.id, change: o.hidden ? "show" : "hide" }} label={o.hidden ? t("selling.show") : t("selling.hide")} icon={o.hidden ? "visibility" : "visibility_off"} />
                          <Change action={changeOccasionAction} fields={{ id: o.id, change: "delete" }} label={t("common.delete")} icon="delete" danger />
                        </KitMore>
                      </div>
                      <Sheet id={`occasion-${o.id}`} title={name}>
                        <OccasionForm occasion={{ id: o.id, names: Object.fromEntries(languages.available.map((l) => [l, o.names[l] ?? (o.key ? occasionName(o, l, languages.default) : "")])) }} languages={languages.available} />
                      </Sheet>
                      {o.templates.length ? (
                        <ul aria-label={name} className="m-0 flex list-none flex-col p-0">
                          {o.templates.map((tpl, n) => (
                            <li key={tpl.id} data-template={`${o.id}-${tpl.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) py-3 first:border-t-0">
                              <p className={`m-0 min-w-0 flex-[1_1_240px] text-[15px] leading-relaxed ${tpl.hidden ? "text-(--sp-muted)" : "text-(--sp-ink)"}`} dir="auto">
                                {tpl.texts[lang] ?? tpl.texts[languages.default] ?? Object.values(tpl.texts)[0]}
                              </p>
                              <span className="flex shrink-0 flex-wrap items-center gap-2">
                                {tpl.hidden ? <KitStatus tone="neutral">{t("selling.hidden")}</KitStatus> : null}
                                <SheetButton target={`template-${o.id}-${tpl.id}`} variant="pill" className="h-9" icon={null}>
                                  {t("selling.editMessage")}
                                </SheetButton>
                                <KitMore label={more}>
                                  {n > 0 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "up" }} label={t("selling.up")} icon="arrow_upward" /> : null}
                                  {n < o.templates.length - 1 ? <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "down" }} label={t("selling.down")} icon="arrow_downward" /> : null}
                                  <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: tpl.hidden ? "show" : "hide" }} label={tpl.hidden ? t("selling.show") : t("selling.hide")} icon={tpl.hidden ? "visibility" : "visibility_off"} />
                                  <Change action={changeTemplateAction} fields={{ occasionId: o.id, templateId: tpl.id, change: "delete" }} label={t("common.delete")} icon="delete" danger />
                                </KitMore>
                              </span>
                              <Sheet id={`template-${o.id}-${tpl.id}`} title={t("selling.editMessage")}>
                                <TemplateForm occasionId={o.id} template={tpl} languages={languages.available} />
                              </Sheet>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="m-0 text-[15px] text-(--sp-muted)">{t("selling.noMessages")}</p>
                      )}
                      <KitFold icon="add" summary={t("selling.addMessage")}>
                        <TemplateForm occasionId={o.id} languages={languages.available} />
                      </KitFold>
                    </div>
                  </KitDisclosure>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </KitPage>
  );
}
