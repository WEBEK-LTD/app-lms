"use client";

import { useActionState, useMemo, useState } from "react";
import { saveStudioScreensAction } from "@/app/actions/studio-screens";
import { useDashT } from "@/components/dashboard-i18n";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MediaPicker } from "@/components/media-picker";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { initialFormState } from "@/lib/forms";
import { PAGE_ICONS } from "@/lib/pages/icons";
import {
  ACCOUNT_ITEMS,
  REQUIRED_ACCOUNT_ITEMS,
  SCREEN_LIMITS,
  SIGN_IN_STYLES,
  type AccountHeader,
  type AccountItemKey,
  type AccountMenuEntry,
  type ScreenTexts,
  type SignInLook,
  type SignInStyle,
  type StudioScreens,
} from "@/lib/studio/screens";

/** The app's own icon for each entry, for the list and the preview. */
const ITEM_ICONS: Record<AccountItemKey, IconName> = {
  orders: "receipt_long",
  points: "star",
  certificates: "workspace_premium",
  memberships: "card_membership",
  quiz_results: "quiz",
  live_classes: "live_tv",
  learning_paths: "route",
  achievements: "emoji_events",
  wishlist: "favorite",
  downloads: "download",
  my_courses: "school",
  restaurant: "restaurant",
  teachers: "groups",
  teacher: "person",
  teach: "school",
  shipments: "local_shipping",
  food_orders: "receipt_long",
  rides: "local_taxi",
  chat: "chat",
  notifications: "notifications",
  settings: "settings",
  help: "help",
  privacy: "description",
  terms: "description",
};

const STYLE_WORDS: Record<SignInStyle, { label: DashKey; hint: DashKey }> = {
  classic: { label: "studio.styleClassic", hint: "studio.styleClassicHint" },
  photo: { label: "studio.stylePhoto", hint: "studio.stylePhotoHint" },
  card: { label: "studio.styleCard", hint: "studio.styleCardHint" },
  minimal: { label: "studio.styleMinimal", hint: "studio.styleMinimalHint" },
};

type Entry = AccountMenuEntry & { uid: string };

/** The saved entries, then every entry the app knows that isn't there, in its order. */
function startingEntries(saved: AccountMenuEntry[] | undefined): Entry[] {
  const list: Entry[] = (saved ?? []).map((e, i) => ({ ...e, uid: `${e.key}-${i}` }));
  for (const key of ACCOUNT_ITEMS) {
    if (!list.some((e) => e.key === key)) list.push({ key, hidden: false, label: {}, icon: null, uid: key });
  }
  return list;
}

const clean = (texts: ScreenTexts): ScreenTexts => Object.fromEntries(Object.entries(texts).filter(([, v]) => v.trim()));

/**
 * 118.3 Studio › Sign-in & account: the sign-in screen's look and the
 * account menu, with a preview of both. Saved as one; the app shows it at
 * its next start.
 */
export function ScreensEditor({
  initial,
  languages,
  pages,
  appName,
  color,
}: {
  initial: StudioScreens | null;
  languages: { code: string; name: string }[];
  pages: { slug: string; title: string }[];
  appName: string;
  color: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveStudioScreensAction, initialFormState);
  const [look, setLook] = useState<SignInLook>(initial?.sign_in ?? { style: "classic", image_url: null, title: {}, subtitle: {}, show_logo: true });
  const [header, setHeader] = useState<AccountHeader>(initial?.account_menu?.header ?? "plain");
  const [entries, setEntries] = useState<Entry[]>(() => startingEntries(initial?.account_menu?.items));
  const [open, setOpen] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState(languages[0]?.code ?? "en");

  const screens: StudioScreens = useMemo(
    () => ({
      sign_in: { ...look, title: clean(look.title), subtitle: clean(look.subtitle) },
      account_menu: {
        header,
        items: entries.map(({ uid: _uid, ...e }) => {
          void _uid;
          return { ...e, label: clean(e.label) };
        }),
      },
    }),
    [look, header, entries],
  );

  const move = (index: number, by: number) =>
    setEntries((list) => {
      const next = [...list];
      const target = index + by;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  const patch = (uid: string, change: Partial<Entry>) => setEntries((list) => list.map((e) => (e.uid === uid ? { ...e, ...change } : e)));
  const links = entries.filter((e) => e.key === "link").length;
  const nameOf = (e: Entry) => e.label[previewLang] || Object.values(e.label)[0] || (e.key === "link" ? t("studio.ownEntry") : t(`studio.item_${e.key}` as DashKey));
  const iconOf = (e: Entry): IconName => (e.icon ?? (e.key === "link" ? "link" : ITEM_ICONS[e.key])) as IconName;
  const shownTitle = look.title[previewLang] || Object.values(look.title)[0] || t("studio.previewWelcome");
  const shownSubtitle = look.subtitle[previewLang] || Object.values(look.subtitle)[0] || t("studio.previewSignInLine");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form action={action} className="flex min-w-0 flex-col gap-6">
        <input type="hidden" name="screens" value={JSON.stringify(screens)} />
        <FormMessage message={state.message} ok={state.ok} />

        <section aria-labelledby="h-sign-in-look" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-sign-in-look" className="m-0 text-lg font-bold">
            {t("studio.signInLook")}
          </h2>
          <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4">
            <legend className="sr-only">{t("studio.signInLook")}</legend>
            {SIGN_IN_STYLES.map((style) => {
              const on = look.style === style;
              return (
                <label key={style} className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 ${on ? "border-2 border-midnight" : "border-line"}`}>
                  <input type="radio" name="sign_in_style" value={style} checked={on} onChange={() => setLook((l) => ({ ...l, style }))} className="sr-only" />
                  <StyleThumb style={style} color={color} />
                  <span className="text-sm font-bold">{t(STYLE_WORDS[style].label)}</span>
                  <span className="text-xs text-muted">{t(STYLE_WORDS[style].hint)}</span>
                </label>
              );
            })}
          </fieldset>

          {look.style === "photo" || look.style === "card" ? (
            <div className="flex flex-wrap items-center gap-3">
              {look.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={look.image_url} alt="" className="h-20 w-14 rounded-lg object-cover" />
              ) : null}
              <MediaPicker kind="image" library onPick={(url) => setLook((l) => ({ ...l, image_url: url }))} label={t("studio.signInPhoto")} />
              {look.image_url ? (
                <button type="button" className={`${btn.ghost} h-10 text-sm`} onClick={() => setLook((l) => ({ ...l, image_url: null }))}>
                  {t("studio.removePhoto")}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <span className="text-[15px] font-bold">{t("studio.welcomeTitle")}</span>
            <span className="text-sm text-muted">{t("studio.welcomeHint")}</span>
            {languages.map((l) => (
              <div key={l.code} className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold">{t("studio.welcomeIn", { language: l.name })}</span>
                  <input
                    className="h-11 rounded-[10px] border border-line-strong px-3"
                    maxLength={SCREEN_LIMITS.title}
                    value={look.title[l.code] ?? ""}
                    onChange={(e) => setLook((v) => ({ ...v, title: { ...v.title, [l.code]: e.target.value } }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold">{t("studio.welcomeSubtitleIn", { language: l.name })}</span>
                  <input
                    className="h-11 rounded-[10px] border border-line-strong px-3"
                    maxLength={SCREEN_LIMITS.subtitle}
                    value={look.subtitle[l.code] ?? ""}
                    onChange={(e) => setLook((v) => ({ ...v, subtitle: { ...v.subtitle, [l.code]: e.target.value } }))}
                  />
                </label>
              </div>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
            <input type="checkbox" checked={look.show_logo} onChange={(e) => setLook((l) => ({ ...l, show_logo: e.target.checked }))} className="h-4 w-4 accent-midnight" />
            {t("studio.showLogo")}
          </label>
        </section>

        <section aria-labelledby="h-account-menu" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-account-menu" className="m-0 text-lg font-bold">
            {t("studio.accountMenu")}
          </h2>
          <fieldset className="m-0 flex flex-wrap gap-3 border-0 p-0">
            <legend className="mb-1.5 text-[15px] font-bold">{t("studio.menuTop")}</legend>
            {(["plain", "card"] as const).map((h) => (
              <label key={h} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="radio" name="menu_header" checked={header === h} onChange={() => setHeader(h)} className="h-4 w-4 accent-midnight" />
                {t(h === "plain" ? "studio.menuTopPlain" : "studio.menuTopCard")}
              </label>
            ))}
          </fieldset>
          <p className="m-0 text-sm text-muted">{t("studio.menuNote")}</p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {entries.map((e, i) => {
              const required = e.key !== "link" && REQUIRED_ACCOUNT_ITEMS.includes(e.key);
              const expanded = open === e.uid;
              return (
                <li key={e.uid} className={`rounded-xl border border-line ${e.hidden ? "bg-ivory opacity-70" : "bg-white"}`}>
                  <div className="flex items-center gap-2 p-2">
                    <Icon name={iconOf(e)} size={22} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{nameOf(e)}</span>
                    <button type="button" className={`${btn.ghost} h-9 px-2`} aria-label={t("studio.moveUp")} onClick={() => move(i, -1)} disabled={i === 0}>
                      <Icon name="arrow_upward" size={18} />
                    </button>
                    <button type="button" className={`${btn.ghost} h-9 px-2`} aria-label={t("studio.moveDown")} onClick={() => move(i, 1)} disabled={i === entries.length - 1}>
                      <Icon name="arrow_downward" size={18} />
                    </button>
                    {required ? (
                      <span className="text-xs text-muted">{t("studio.alwaysShown")}</span>
                    ) : (
                      <button type="button" className={`${btn.ghost} h-9 px-2 text-sm`} aria-pressed={e.hidden} onClick={() => patch(e.uid, { hidden: !e.hidden })}>
                        {t(e.hidden ? "studio.showItem" : "studio.hideItem")}
                      </button>
                    )}
                    <button type="button" className={`${btn.ghost} h-9 px-2`} aria-expanded={expanded} aria-label={t("studio.editItem")} onClick={() => setOpen(expanded ? null : e.uid)}>
                      <Icon name="edit" size={18} />
                    </button>
                  </div>
                  {expanded ? (
                    <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
                      {languages.map((l) => (
                        <label key={l.code} className="flex flex-col gap-1 text-sm">
                          <span className="font-semibold">{t("studio.itemNameIn", { language: l.name })}</span>
                          <input
                            className="h-10 rounded-[10px] border border-line-strong px-3"
                            maxLength={SCREEN_LIMITS.label}
                            value={e.label[l.code] ?? ""}
                            onChange={(ev) => patch(e.uid, { label: { ...e.label, [l.code]: ev.target.value } })}
                          />
                        </label>
                      ))}
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold">{t("studio.itemIcon")}</span>
                        <select className="h-10 rounded-[10px] border border-line-strong px-2" value={e.icon ?? ""} onChange={(ev) => patch(e.uid, { icon: ev.target.value || null })}>
                          <option value="">{t("studio.appIcon")}</option>
                          {PAGE_ICONS.map((name) => (
                            <option key={name} value={name}>
                              {name.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      {e.key === "link" ? (
                        <>
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-semibold">{t("studio.linkUrl")}</span>
                            <input
                              dir="ltr"
                              className="h-10 rounded-[10px] border border-line-strong px-3"
                              placeholder="https://"
                              value={e.url ?? ""}
                              onChange={(ev) => patch(e.uid, { url: ev.target.value, page_slug: null })}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-semibold">{t("studio.linkPage")}</span>
                            <select className="h-10 rounded-[10px] border border-line-strong px-2" value={e.page_slug ?? ""} onChange={(ev) => patch(e.uid, { page_slug: ev.target.value || null, url: ev.target.value ? null : e.url })}>
                              <option value="">{t("studio.noPage")}</option>
                              {pages.map((p) => (
                                <option key={p.slug} value={p.slug}>
                                  {p.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button type="button" className={`${btn.danger} h-10 self-start text-sm`} onClick={() => setEntries((list) => list.filter((x) => x.uid !== e.uid))}>
                            {t("studio.removeEntry")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className={`${btn.secondary} h-10 self-start text-sm`}
            disabled={links >= SCREEN_LIMITS.links}
            onClick={() => {
              const uid = `link-${Date.now()}`;
              setEntries((list) => [...list, { key: "link", hidden: false, label: {}, icon: "link", url: "", uid }]);
              setOpen(uid);
            }}
          >
            <Icon name="add" size={18} />
            {t("studio.addEntry")}
          </button>
          <p className="m-0 text-sm text-muted">{t("studio.signOutLast")}</p>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <SubmitButton variant="secondary" className="h-11" name="reset" value="1">
            {t("studio.backToAppOwn")}
          </SubmitButton>
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("common.save")}
          </SubmitButton>
        </div>
      </form>

      <aside aria-label={t("studio.preview")} className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-base font-bold">{t("studio.preview")}</h2>
          {languages.length > 1 ? (
            <select aria-label={t("studio.previewLanguage")} className="h-9 rounded-lg border border-line-strong px-2 text-sm" value={previewLang} onChange={(e) => setPreviewLang(e.target.value)}>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SignInPreview look={look} title={shownTitle} subtitle={shownSubtitle} appName={appName} color={color} t={t} />
          <MenuPreview entries={entries.filter((e) => !e.hidden)} header={header} color={color} nameOf={nameOf} iconOf={iconOf} t={t} />
        </div>
      </aside>
    </div>
  );
}

/** The look's small drawing in its choice. */
function StyleThumb({ style, color }: { style: SignInStyle; color: string }) {
  const bar = <span className="block h-1.5 w-full rounded-full bg-[#D9D3C7]" />;
  return (
    <span aria-hidden="true" className="relative block aspect-[9/16] w-full overflow-hidden rounded-lg border border-line" style={{ background: style === "photo" ? "#2A3350" : "#F7F3EC" }}>
      {style === "card" ? <span className="absolute inset-x-0 top-0 h-[45%]" style={{ background: "#2A3350" }} /> : null}
      <span
        className={`absolute inset-x-2 flex flex-col gap-1 rounded-md p-1.5 ${style === "card" ? "top-[38%] bg-white" : style === "minimal" ? "top-[30%] items-center" : "bottom-3"}`}
        style={style === "photo" ? { background: "rgba(255,255,255,.14)" } : undefined}
      >
        {style === "minimal" ? <span className="block h-4 w-4 rounded-full" style={{ background: color }} /> : null}
        {bar}
        {bar}
        <span className="block h-2 w-full rounded" style={{ background: color }} />
      </span>
    </span>
  );
}

function SignInPreview({ look, title, subtitle, appName, color, t }: { look: SignInLook; title: string; subtitle: string; appName: string; color: string; t: ReturnType<typeof useDashT> }) {
  const photo = (look.style === "photo" || look.style === "card") && look.image_url;
  const dark = look.style === "photo" && photo;
  return (
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight bg-[#F7F3EC] text-[10px]" data-testid="sign-in-preview">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={look.image_url!} alt="" className={`absolute inset-x-0 top-0 w-full object-cover ${look.style === "photo" ? "h-full" : "h-[42%]"}`} />
      ) : null}
      {dark ? <span className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" /> : null}
      <div
        className={`absolute inset-x-2.5 flex flex-col gap-1.5 ${look.style === "card" ? "top-[36%] rounded-xl bg-white p-2.5 shadow" : look.style === "minimal" ? "top-[24%] items-center text-center" : "bottom-4"}`}
        style={{ color: dark ? "#fff" : "#0E1424" }}
      >
        {look.show_logo ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: color }}>
            {(appName || "A").slice(0, 1)}
          </span>
        ) : null}
        <span className="text-[13px] leading-tight font-extrabold">{title}</span>
        <span className="leading-snug opacity-80">{subtitle}</span>
        <span className="mt-1 block h-6 w-full rounded-md border" style={{ borderColor: dark ? "rgba(255,255,255,.4)" : "#D9D3C7", background: dark ? "rgba(255,255,255,.12)" : "#fff" }} />
        <span className="flex h-6 w-full items-center justify-center rounded-md font-bold text-white" style={{ background: color }}>
          {t("studio.previewButton")}
        </span>
      </div>
    </div>
  );
}

function MenuPreview({
  entries,
  header,
  color,
  nameOf,
  iconOf,
  t,
}: {
  entries: Entry[];
  header: AccountHeader;
  color: string;
  nameOf: (e: Entry) => string;
  iconOf: (e: Entry) => IconName;
  t: ReturnType<typeof useDashT>;
}) {
  return (
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight bg-[#F7F3EC] p-2 text-[10px]" data-testid="menu-preview">
      <div className={`mb-2 flex items-center gap-1.5 rounded-xl p-2 ${header === "card" ? "text-white" : ""}`} style={header === "card" ? { background: color } : undefined}>
        <span className="h-6 w-6 rounded-full bg-[#D9D3C7]" />
        <span className="flex flex-col">
          <span className="font-extrabold">{t("studio.previewName")}</span>
          <span className="opacity-75">+20 100 000 0000</span>
        </span>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl bg-white">
        {entries.slice(0, 9).map((e) => (
          <span key={e.uid} className="flex items-center gap-1.5 border-b border-[#EFE9DE] px-2 py-1.5">
            <Icon name={iconOf(e)} size={13} />
            <span className="truncate">{nameOf(e)}</span>
          </span>
        ))}
      </div>
      <span className="mt-2 block rounded-xl bg-white px-2 py-1.5 font-bold text-danger">{t("studio.previewSignOut")}</span>
    </div>
  );
}
