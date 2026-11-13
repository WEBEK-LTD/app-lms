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
  ACCOUNT_HEADERS,
  ACCOUNT_ITEMS,
  COURSE_CARD_FACTS,
  COURSE_CARD_STYLES,
  SCREEN_LOOKS,
  type ScreenLookKey,
  type ScreenLooks,
  COURSE_PAGE_BARS,
  COURSE_PAGE_COVERS,
  COURSE_PAGE_FACTS,
  COURSE_PAGE_TABS,
  REQUIRED_ACCOUNT_ITEMS,
  SCREEN_LIMITS,
  SIGN_IN_STYLES,
  type AccountHeader,
  type AccountItemKey,
  type AccountMenuEntry,
  type CourseCardFact,
  type CourseCardLook,
  type CourseCardStyle,
  type CoursePageLook,
  type ScreenTexts,
  type SignInLook,
  type SignInStyle,
  type StudioScreens,
} from "@/lib/studio/screens";
import type { LaunchBrand } from "./launch-preview";
import { LaunchSection, newLaunch } from "./launch-section";

/** 118.3 The night look's card colour when the owner keeps the default. */
const NIGHT_GOLD = "#D9B36C";
const NIGHT_ACCENTS = [NIGHT_GOLD, "#C9CED6", "#E8A27C", "#8FD1B8"] as const;

const HEADER_NAMES: Record<AccountHeader, DashKey> = {
  plain: "studio.menuTopPlain",
  card: "studio.menuTopCard",
  cover: "studio.menuTopCover",
  tiles: "studio.menuTopTiles",
  night: "studio.menuTopNight",
  academy: "studio.menuTopAcademy",
};
const HEADER_HINTS: Record<AccountHeader, DashKey> = {
  plain: "studio.menuTopPlainHint",
  card: "studio.menuTopCardHint",
  cover: "studio.menuTopCoverHint",
  tiles: "studio.menuTopTilesHint",
  night: "studio.menuTopNightHint",
  academy: "studio.menuTopAcademyHint",
};

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
  premium: { label: "studio.stylePremium", hint: "studio.stylePremiumHint" },
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
  courses = false,
  brand,
}: {
  initial: StudioScreens | null;
  languages: { code: string; name: string }[];
  pages: { slug: string; title: string }[];
  appName: string;
  color: string;
  /** 122 An academy: its courses' card is designed here too. */
  courses?: boolean;
  /** 124.15 The project's colours, name, logo and icon, for the launch screen's preview. */
  brand?: LaunchBrand;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveStudioScreensAction, initialFormState);
  const [look, setLook] = useState<SignInLook>(initial?.sign_in ?? { style: "classic", image_url: null, title: {}, subtitle: {}, show_logo: true });
  const [header, setHeader] = useState<AccountHeader>(initial?.account_menu?.header ?? "plain");
  const [accent, setAccent] = useState<string>(initial?.account_menu?.accent ?? NIGHT_GOLD);
  const [entries, setEntries] = useState<Entry[]>(() => startingEntries(initial?.account_menu?.items));
  const [open, setOpen] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState(languages[0]?.code ?? "en");
  // 119 Every look in light and dark mode: the preview shows either.
  const [previewDark, setPreviewDark] = useState(false);
  // 122 The courses' card.
  const [card, setCard] = useState<CourseCardLook>(initial?.course_card ?? { style: "classic", hide: [] });
  // 123 The screens drawn in a look of their own.
  const [looks, setLooks] = useState<ScreenLooks>(initial?.looks ?? {});
  const [coursePage, setCoursePage] = useState<CoursePageLook>(initial?.course_page ?? { cover: "classic", bar: "classic", hide: [] });
  // 124.15 The launch screen: saved once the owner has designed it.
  const [launch, setLaunch] = useState(() => initial?.launch ?? newLaunch());
  const [launchOwn, setLaunchOwn] = useState(!!initial?.launch);

  const screens: StudioScreens = useMemo(
    () => ({
      sign_in: { ...look, title: clean(look.title), subtitle: clean(look.subtitle) },
      account_menu: {
        header,
        ...(header === "night" && accent.toUpperCase() !== NIGHT_GOLD ? { accent: accent.toUpperCase() } : {}),
        items: entries.map(({ uid: _uid, ...e }) => {
          void _uid;
          return { ...e, label: clean(e.label) };
        }),
      },
      ...(courses ? { course_card: card, course_page: coursePage } : {}),
      ...(courses && Object.keys(looks).length ? { looks } : {}),
      ...(launchOwn ? { launch: { ...launch, title: clean(launch.title), subtitle: clean(launch.subtitle) } } : {}),
    }),
    [look, header, accent, entries, courses, card, coursePage, looks, launch, launchOwn],
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

        <LaunchSection
          launch={launch}
          onChange={(next) => {
            setLaunch(next);
            setLaunchOwn(true);
          }}
          brand={brand ?? { main: color, second: null, appName, logoUrl: null, iconUrl: null }}
          languages={languages}
          previewLang={previewLang}
        />

        <section aria-labelledby="h-sign-in-look" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-sign-in-look" className="m-0 text-lg font-bold">
            {t("studio.signInLook")}
          </h2>
          <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-5">
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

          {look.style === "photo" || look.style === "card" || look.style === "premium" ? (
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
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-[15px] font-bold">{t("studio.menuTop")}</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {ACCOUNT_HEADERS.map((h) => (
                <label
                  key={h}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-[14px] ${header === h ? "border-midnight ring-1 ring-midnight" : "border-line"}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="menu_header" checked={header === h} onChange={() => setHeader(h)} className="h-4 w-4 accent-midnight" />
                    {t(HEADER_NAMES[h])}
                  </span>
                  <span className="text-[13px] text-muted">{t(HEADER_HINTS[h])}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {header === "night" ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-[15px] font-bold">{t("studio.nightAccent")}</legend>
              <div className="flex flex-wrap items-center gap-2">
                {NIGHT_ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    aria-label={c}
                    aria-pressed={accent.toUpperCase() === c}
                    className={`h-9 w-9 rounded-full border-2 ${accent.toUpperCase() === c ? "border-midnight" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-line bg-white" />
                  {t("studio.nightAccentOwn")}
                </label>
              </div>
            </fieldset>
          ) : null}
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

        {courses ? (
          <section aria-labelledby="h-looks" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-looks" className="m-0 text-lg font-bold">
                {t("studio.looksTitle")}
              </h2>
              <p className="m-0 text-sm text-muted">{t("studio.looksText")}</p>
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="sr-only">{t("studio.looksTitle")}</legend>
              {(Object.keys(SCREEN_LOOKS) as ScreenLookKey[]).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    data-screen-look={key}
                    checked={looks[key] === SCREEN_LOOKS[key]}
                    onChange={(e) => {
                      const next: Record<string, string> = { ...looks };
                      if (e.target.checked) next[key] = SCREEN_LOOKS[key];
                      else delete next[key];
                      setLooks(next as ScreenLooks);
                    }}
                  />
                  {t(`studio.look_${key}` as DashKey)}
                </label>
              ))}
            </fieldset>
          </section>
        ) : null}

        {courses ? (
          <section aria-labelledby="h-course-card" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-course-card" className="m-0 text-lg font-bold">
                {t("studio.courseCardTitle")}
              </h2>
              <p className="m-0 text-sm text-muted">{t("studio.courseCardText")}</p>
            </div>
            <div role="radiogroup" aria-label={t("studio.courseCardTitle")} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {COURSE_CARD_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={card.style === s}
                  data-course-card-style={s}
                  onClick={() => setCard({ ...card, style: s })}
                  className="flex flex-col gap-2 rounded-xl border p-2.5 text-start text-sm"
                  style={card.style === s ? { borderColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
                >
                  <CourseCardSample style={s} color={color} dark={false} hide={card.hide} radius={card.radius} />
                  <span className="font-bold">{t(`studio.courseCard_${s}` as DashKey)}</span>
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t("studio.courseCardCorners")}
              <input type="range" min={0} max={32} value={card.radius ?? 16} onChange={(e) => setCard({ ...card, radius: Number(e.target.value) })} aria-valuetext={`${card.radius ?? 16}px`} />
            </label>
            <fieldset className="m-0 flex flex-wrap gap-x-5 gap-y-2 border-0 p-0">
              <legend className="mb-1.5 text-sm font-bold">{t("studio.courseCardShows")}</legend>
              {COURSE_CARD_FACTS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!card.hide.includes(f)} onChange={(e) => setCard({ ...card, hide: e.target.checked ? card.hide.filter((x) => x !== f) : [...card.hide, f] })} />
                  {t(`studio.courseFact_${f}` as DashKey)}
                </label>
              ))}
            </fieldset>
          </section>
        ) : null}

        {courses ? (
          <section aria-labelledby="h-course-page" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-course-page" className="m-0 text-lg font-bold">
                {t("studio.coursePageTitle")}
              </h2>
              <p className="m-0 text-sm text-muted">{t("studio.coursePageText")}</p>
            </div>
            {(
              [
                ["cover", COURSE_PAGE_COVERS, "studio.coursePageCover"],
                ["bar", COURSE_PAGE_BARS, "studio.coursePageBar"],
              ] as const
            ).map(([field, options, label]) => (
              <div key={field} role="radiogroup" aria-label={t(label as DashKey)} className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">{t(label as DashKey)}</span>
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (
                    <button key={o} type="button" role="radio" aria-checked={coursePage[field] === o} data-course-page={`${field}-${o}`} onClick={() => setCoursePage({ ...coursePage, [field]: o })} className="rounded-lg border px-3 py-1.5 text-sm" style={coursePage[field] === o ? { borderColor: color, boxShadow: `0 0 0 2px ${color}`, fontWeight: 700 } : undefined}>
                      {t(`studio.coursePage_${field}_${o}` as DashKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" data-course-page="look-premium" checked={coursePage.look === "premium"} onChange={(e) => setCoursePage({ ...coursePage, look: e.target.checked ? "premium" : undefined })} />
              {t("studio.coursePagePremium")}
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t("studio.coursePageFirst")}
              <select className="h-10 rounded-lg border border-line-strong px-2 font-normal" value={coursePage.first_tab ?? ""} onChange={(e) => setCoursePage({ ...coursePage, first_tab: (e.target.value || undefined) as CoursePageLook["first_tab"] })}>
                <option value="">{t("studio.coursePageFirstAuto")}</option>
                {COURSE_PAGE_TABS.map((tab) => (
                  <option key={tab} value={tab}>
                    {t(`studio.coursePageTab_${tab}` as DashKey)}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="m-0 flex flex-wrap gap-x-5 gap-y-2 border-0 p-0">
              <legend className="mb-1.5 text-sm font-bold">{t("studio.coursePageShows")}</legend>
              {COURSE_PAGE_FACTS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!coursePage.hide.includes(f)} onChange={(e) => setCoursePage({ ...coursePage, hide: e.target.checked ? coursePage.hide.filter((x) => x !== f) : [...coursePage.hide, f] })} />
                  {t(`studio.coursePageFact_${f}` as DashKey)}
                </label>
              ))}
            </fieldset>
          </section>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <SubmitButton variant="secondary" className="h-11" name="back_to_own" value="1">
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
          <div role="group" aria-label={t("studio.previewMode")} className="flex rounded-lg border border-line-strong p-0.5 text-sm">
            {[false, true].map((d) => (
              <button key={String(d)} type="button" aria-pressed={previewDark === d} onClick={() => setPreviewDark(d)} className={`h-8 rounded-md px-2.5 ${previewDark === d ? "bg-midnight font-bold text-white" : ""}`}>
                {t(d ? "studio.previewDark" : "studio.previewLight")}
              </button>
            ))}
          </div>
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
          <SignInPreview look={look} title={shownTitle} subtitle={shownSubtitle} appName={appName} color={color} dark={previewDark} t={t} />
          <MenuPreview entries={entries.filter((e) => !e.hidden)} header={header} color={color} accent={accent} dark={previewDark} nameOf={nameOf} iconOf={iconOf} t={t} />
        </div>
      </aside>
    </div>
  );
}

/** The look's small drawing in its choice. */
function StyleThumb({ style, color }: { style: SignInStyle; color: string }) {
  const bar = <span className="block h-1.5 w-full rounded-full bg-[#D9D3C7]" />;
  if (style === "premium") {
    // 123 The welcome over the photo, the form on a card at the foot, the button in gold.
    return (
      <span aria-hidden="true" className="relative block aspect-[9/16] w-full overflow-hidden rounded-lg border border-line" style={{ background: "linear-gradient(200deg,#D9B36C 0%,#2A2D5C 38%,#F7F3EC 72%)" }}>
        <span className="absolute inset-x-2 top-3 flex flex-col gap-1">
          <span className="block h-2 w-3/4 rounded-full bg-white/90" />
          <span className="block h-1.5 w-1/2 rounded-full bg-white/60" />
        </span>
        <span className="absolute inset-x-1.5 bottom-1.5 flex flex-col gap-1 rounded-md bg-white p-1.5 shadow-sm">
          {bar}
          <span className="block h-2 w-full rounded" style={{ background: "linear-gradient(90deg,#E7C982,#B8893A)" }} />
        </span>
      </span>
    );
  }
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

/** 119 The app's colours in light or dark mode, for the previews. */
function previewTheme(dark: boolean) {
  return dark
    ? { page: "#121614", surface: "#1C2320", text: "#EEF1EF", muted: "#A3ADA8", line: "#2A322E", field: "#151B18", fieldLine: "#36403B", placeholder: "#3A4440" }
    : { page: "#F7F3EC", surface: "#FFFFFF", text: "#0E1424", muted: "#5B6470", line: "#EFE9DE", field: "#FFFFFF", fieldLine: "#D9D3C7", placeholder: "#D9D3C7" };
}

function SignInPreview({ look, title, subtitle, appName, color, dark, t }: { look: SignInLook; title: string; subtitle: string; appName: string; color: string; dark: boolean; t: ReturnType<typeof useDashT> }) {
  const th = previewTheme(dark);
  if (look.style === "premium") return <PremiumSignInPreview look={look} title={title} subtitle={subtitle} appName={appName} color={color} dark={dark} t={t} />;
  const photo = (look.style === "photo" || look.style === "card") && look.image_url;
  const panel = look.style === "photo" && photo;
  return (
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight text-[10px]" style={{ background: th.page }} data-testid="sign-in-preview" data-dark={dark ? "" : undefined}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={look.image_url!} alt="" className={`absolute inset-x-0 top-0 w-full object-cover ${look.style === "photo" ? "h-full" : "h-[42%]"}`} />
      ) : null}
      {panel ? <span className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" /> : null}
      <div
        className={`absolute inset-x-2.5 flex flex-col gap-1.5 ${look.style === "card" ? "top-[36%] rounded-xl p-2.5 shadow" : look.style === "minimal" ? "top-[24%] items-center text-center" : panel ? "bottom-3 rounded-xl p-2.5" : "bottom-4"}`}
        style={{ color: th.text, background: look.style === "card" ? th.page : panel ? th.surface : undefined, opacity: 1 }}
      >
        {look.show_logo ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: color }}>
            {(appName || "A").slice(0, 1)}
          </span>
        ) : null}
        <span className="text-[13px] leading-tight font-extrabold">{title}</span>
        <span className="leading-snug" style={{ color: th.muted }}>
          {subtitle}
        </span>
        <span className="mt-1 block h-6 w-full rounded-md border" style={{ borderColor: th.fieldLine, background: th.field }} />
        <span className="flex h-6 w-full items-center justify-center rounded-md font-bold text-white" style={{ background: color }}>
          {t("studio.previewButton")}
        </span>
      </div>
    </div>
  );
}

/** 123 The premium sign-in: the welcome large in white over the photo (or the app's colours), the form on a card at the foot with the button in gold. */
function PremiumSignInPreview({ look, title, subtitle, appName, color, dark, t }: { look: SignInLook; title: string; subtitle: string; appName: string; color: string; dark: boolean; t: ReturnType<typeof useDashT> }) {
  const th = previewTheme(dark);
  return (
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight text-[10px]" style={{ background: th.page }} data-testid="sign-in-preview" data-dark={dark ? "" : undefined}>
      {look.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={look.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0" style={{ background: `linear-gradient(200deg,#D9B36C 0%,${color} 45%,#0E1424 100%)` }} />
      )}
      <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,transparent 0%,transparent 35%,${th.page} 72%)` }} />
      <div className="absolute inset-x-3 top-4 flex flex-col gap-1.5 text-white">
        {look.show_logo ? (
          <span className="flex items-center gap-1.5 font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-[10px]">{(appName || "A").slice(0, 1)}</span>
            {appName}
          </span>
        ) : null}
        <span className="mt-2 text-[17px] leading-tight font-black">{title}</span>
        <span className="leading-snug opacity-80">{subtitle}</span>
      </div>
      <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5 rounded-xl border p-2.5 shadow" style={{ background: th.surface, borderColor: th.line, color: th.text }}>
        <span className="block h-6 w-full rounded-md border" style={{ borderColor: th.fieldLine, background: th.field }} />
        <span className="flex h-6 w-full items-center justify-center rounded-md font-bold" style={{ background: "linear-gradient(90deg,#E7C982,#B8893A)", color: "#2A1D05" }}>
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
  accent,
  dark,
  nameOf,
  iconOf,
  t,
}: {
  entries: Entry[];
  header: AccountHeader;
  color: string;
  accent: string;
  dark: boolean;
  nameOf: (e: Entry) => string;
  iconOf: (e: Entry) => IconName;
  t: ReturnType<typeof useDashT>;
}) {
  const night = header === "night";
  // 119 The premium look: a dark page in dark mode, a warm light one in light mode; its card stays dark.
  const th = night ? (dark ? { page: "#0D1210", surface: "#141B18", text: "#F2F4F3", muted: "#A3ADA8", line: "#222B27" } : { page: "#F6F2EA", surface: "#FFFFFF", text: "#1C1A16", muted: "#6B6457", line: "#E9E1D0" }) : previewTheme(dark);
  const required = (e: Entry) => e.key !== "link" && REQUIRED_ACCOUNT_ITEMS.includes(e.key);
  const quick = header === "cover" || header === "night" ? entries.filter((e) => !required(e) && e.key !== "link").slice(0, 3) : [];
  const tiles = header === "tiles" ? entries.filter((e) => !required(e) && e.key !== "link").slice(0, 4) : [];
  const banner = header === "tiles" ? entries.find((e) => e.key === "link") : undefined;
  const listed = entries.filter((e) => !quick.includes(e) && !tiles.includes(e) && e !== banner);
  const deepAccent = night && !dark ? darken(accent) : accent;
  const name = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-extrabold">{t("studio.previewName")}</span>
      <span style={{ color: header === "card" ? undefined : th.muted, opacity: header === "card" ? 0.8 : 1 }}>+20 100 000 0000</span>
    </span>
  );
  return (
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] border-[5px] border-midnight text-[10px]" style={{ background: th.page, color: th.text }} data-testid="menu-preview" data-header={header} data-dark={dark ? "" : undefined}>
      {header === "cover" ? <div className="absolute inset-x-0 top-0 h-16" style={{ background: color }} /> : null}
      <div className="relative flex flex-col gap-2 p-2">
        {header === "cover" ? (
          <div className="mt-7 flex flex-col items-center rounded-xl px-2 pt-1 pb-1.5 text-center shadow-sm" style={{ background: th.surface }}>
            <span className="-mt-5 h-8 w-8 rounded-full border-2" style={{ borderColor: th.surface, background: dark ? "#3A4440" : "#D9D3C7" }} />
            {name}
            <span className="mt-1 flex w-full justify-around border-t pt-1" style={{ borderColor: th.line }}>
              {quick.map((e) => (
                <span key={e.uid} className="flex min-w-0 flex-col items-center">
                  <Icon name={iconOf(e)} size={12} />
                  <span className="max-w-[48px] truncate text-[8px]">{nameOf(e)}</span>
                </span>
              ))}
            </span>
          </div>
        ) : header === "tiles" ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-lg" style={{ background: color }} />
              {name}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {tiles.map((e) => (
                <span key={e.uid} className="flex flex-col gap-1 rounded-lg p-1.5" style={{ background: th.surface }}>
                  <Icon name={iconOf(e)} size={12} />
                  <span className="truncate font-semibold">{nameOf(e)}</span>
                </span>
              ))}
            </div>
            {banner ? (
              <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-white" style={{ background: color }}>
                <Icon name={iconOf(banner)} size={12} />
                <span className="truncate">{nameOf(banner)}</span>
              </span>
            ) : null}
          </>
        ) : header === "academy" ? (
          <>
            {/* 123 The student's card in gold on dark, then the entries and the switches. */}
            <div className="flex flex-col gap-1 rounded-xl p-1.5 text-white" style={{ background: "linear-gradient(225deg,#1C1710,#3A2D18,#6E5427)" }} data-testid="menu-preview-academy">
              <span className="flex items-center gap-1.5">
                <span className="h-6 w-6 rounded-full border-2" style={{ borderColor: accent, background: "#3A3326" }} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-extrabold">{t("studio.previewName")}</span>
                  <span className="opacity-70">+20 100 000 0000</span>
                </span>
              </span>
              <span className="text-[8px]" style={{ color: accent }}>
                4 · 2 · 38
              </span>
            </div>
          </>
        ) : night ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-full border" style={{ borderColor: deepAccent }} />
              {name}
            </div>
            <div className="flex h-14 flex-col justify-between rounded-xl border p-1.5" style={{ background: "#18211D", borderColor: "#2A3530" }}>
              <span className="text-[8px] text-[#A3ADA8]">{t("studio.previewMemberCard")}</span>
              <span className="text-[13px] font-extrabold" style={{ color: accent }}>
                {t("studio.previewName")}
              </span>
            </div>
            <span className="grid grid-cols-3 gap-1">
              {quick.map((e) => (
                <span key={e.uid} className="flex min-w-0 flex-col items-center rounded-lg border p-1" style={{ background: th.surface, borderColor: th.line, color: deepAccent }}>
                  <Icon name={iconOf(e)} size={12} />
                  <span className="max-w-full truncate text-[8px]" style={{ color: th.text }}>
                    {nameOf(e)}
                  </span>
                </span>
              ))}
            </span>
          </>
        ) : (
          <div className={`flex items-center gap-1.5 rounded-xl p-2 ${header === "card" ? "text-white" : ""}`} style={header === "card" ? { background: color } : undefined}>
            <span className="h-6 w-6 rounded-full" style={{ background: dark ? "#3A4440" : "#D9D3C7" }} />
            {name}
          </div>
        )}
        <div className={`flex flex-col overflow-hidden rounded-xl ${night ? "border" : ""}`} style={{ background: th.surface, borderColor: th.line }}>
          {listed.slice(0, header === "plain" || header === "card" ? 9 : 5).map((e) => (
            <span key={e.uid} className="flex items-center gap-1.5 border-b px-2 py-1.5" style={{ borderColor: th.line }}>
              <Icon name={iconOf(e)} size={13} />
              <span className="truncate">{nameOf(e)}</span>
            </span>
          ))}
        </div>
        <span className="block rounded-xl px-2 py-1.5 font-bold" style={{ background: th.surface, color: dark ? "#F0907F" : "#B42318" }}>
          {t("studio.previewSignOut")}
        </span>
      </div>
    </div>
  );
}

/** 119 The premium look's accent on a light page: deeper, so icons stay easy to see. */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * 0.62).toString(16).padStart(2, "0");
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** 122 A course card in the look chosen, as the app draws it: in light or dark, the facts left out. */
function CourseCardSample({ style, color, dark, hide, radius }: { style: CourseCardStyle; color: string; dark: boolean; hide: CourseCardFact[]; radius?: number }) {
  const r = radius ?? (style === "rich" || style === "cover" ? 18 : 12);
  const ink = dark ? "#F3F1EC" : "#15131A";
  const mute = dark ? "#9A98A2" : "#6E6A72";
  const cardBg = dark ? "#151823" : "#FFFFFF";
  const pic = `linear-gradient(135deg, ${color}, #2F4FB5 60%, #F2C879)`;
  const shows = (f: CourseCardFact) => !hide.includes(f);
  const meta = [shows("teacher") ? "Reem S." : null, shows("lessons") ? "20" : null].filter(Boolean).join(" · ");
  const line = (w: string, h = 6, c = mute) => <span style={{ display: "block", width: w, height: h, borderRadius: 3, background: c, opacity: 0.55 }} />;
  if (style === "cover") {
    return (
      <span aria-hidden="true" style={{ position: "relative", display: "block", height: 74, borderRadius: Math.min(r, 20), background: pic, overflow: "hidden" }}>
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(0,0,0,.6))" }} />
        <span style={{ position: "absolute", insetInline: 8, bottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {line("70%", 7, "#fff")}
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#fff" }}>
            <span>{meta}</span>
            {shows("price") ? <span style={{ background: "#fff", color: "#15131A", borderRadius: 5, padding: "1px 4px", fontWeight: 800 }}>390</span> : null}
          </span>
        </span>
      </span>
    );
  }
  if (style === "tile") {
    return (
      <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 4, padding: 5, borderRadius: 10, background: cardBg, border: "1px solid rgba(127,127,127,.2)" }}>
        <span style={{ height: 38, borderRadius: Math.min(r, 14), background: pic }} />
        {line("80%", 6, ink)}
        <span style={{ fontSize: 8.5, color: mute }}>{meta}</span>
        {shows("price") ? <span style={{ fontSize: 9, fontWeight: 800, color }}>390</span> : null}
      </span>
    );
  }
  const big = style === "rich";
  return (
    <span aria-hidden="true" style={{ display: "flex", gap: 6, padding: 5, borderRadius: 10, background: cardBg, border: "1px solid rgba(127,127,127,.2)", alignItems: "center" }}>
      <span style={{ width: big ? 42 : 36, height: big ? 42 : 36, flex: "none", borderRadius: Math.min(r, 14), background: pic }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        {big && shows("rating") ? <span style={{ fontSize: 8.5, color: "#E5A00D" }}>★ 4.8</span> : null}
        {line("85%", 6, ink)}
        <span style={{ fontSize: 8.5, color: mute, whiteSpace: "nowrap", overflow: "hidden" }}>{meta}</span>
        {shows("price") ? <span style={{ fontSize: 9, fontWeight: 800, color: big ? color : ink }}>390</span> : null}
      </span>
    </span>
  );
}
