import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startFromWebsiteAction } from "@/app/actions/dashboard";
import { SignOutButton } from "@/components/sign-out";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { getAdminRole, getClientContext, getCurrentUser, signInPath } from "@/lib/auth/session";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import type { DemoId } from "@/lib/demo/constants";
import { demoLoop } from "@/lib/demo/loops";
import { pickerPath, pickerSections } from "@/lib/demo/picker";
import { cardWords, demoScreens, Phone, PickerShell, ProductBadge, STUDIO, tintStyle } from "./parts";
import { PickerFilter, type PickerShow } from "./filter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("start.title"), robots: { index: false } };
}

/**
 * 121 Where a new account starts; 127 what its business does, and our real
 * demos for it: the App editor's in their light section, Yallapp Studio's in
 * their dark one with gold, every demo once (tests/unit/start-picker.test.ts).
 * A card opens the demo's page (/start/<demo>). "New app" in the dashboard
 * (`new=1&for=editor`) and in Studio (`new=1&for=studio`) open it too, the
 * product's switch chosen. Someone who already has an app and didn't ask
 * for a new one goes to it; a suspended account to the page that says so.
 * 128.9 Each card's phone plays the demo's short loop while in view
 * (public/loops, scripts/demo-loops.sh), its screenshot the poster.
 */
export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  if (await getAdminRole()) redirect("/admin");
  const context = await getClientContext();
  if (!context || context.client.status !== "active") redirect("/pending");
  const query = await searchParams;
  const adding = query.new === "1" && context.apps.length > 0;
  if (context.apps.length && !adding) redirect(context.app?.section === "studio" ? "/studio" : "/dashboard");
  const text = await dashboardText();
  const { t } = text;
  const initial: PickerShow = query.for === "studio" ? "studio" : query.for === "editor" ? "editor" : "all";
  const sections = pickerSections();
  const first = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  const full = adding && context.apps.length >= MAX_APPS_PER_CLIENT;
  return (
    <PickerShell step={1} gap="gap-9">
      <div className="flex max-w-[760px] flex-col gap-3.5">
        {first ? <div className="text-sm font-bold tracking-[0.18em] text-[var(--pk-accent-text)] uppercase">{t("start.welcome", { name: first })}</div> : null}
        <h1 className="m-0 text-[40px] leading-[1.02] font-extrabold tracking-[-0.035em] break-words sm:text-[56px]">{t("start.title")}</h1>
        <p className="m-0 text-[17px] leading-normal text-[var(--pk-ink2)] sm:text-[19px]">{t("start.text")}</p>
      </div>
      {full ? (
        <p role="alert" className="m-0 rounded-2xl bg-[var(--pk-surface)] px-4 py-3 text-[15px] font-semibold">
          {t("setup.maxApps", { max: MAX_APPS_PER_CLIENT })}
        </p>
      ) : null}
      <PickerFilter
        initial={initial}
        labels={{ group: t("start.show"), all: t("start.all"), editor: t("start.editor"), studio: t("start.studio") }}
        editor={<EditorSection text={text} ids={sections.editor} adding={adding} />}
        studio={<StudioSection text={text} ids={sections.studio} adding={adding} />}
        after={<NotSure text={text} adding={adding} />}
      />
      {/* A div, not a p: the sign-out button is a form, which can't be inside a p (a full load wouldn't hydrate). */}
      <div className="m-0 flex flex-wrap items-center gap-1 text-sm text-[var(--pk-ink2)]">
        <span className="break-all" dir="ltr">
          {t("start.signedIn", { email: user.email })}
        </span>
        ·
        <SignOutButton className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[var(--pk-accent-text)] hover:underline">{t("nav.signOut")}</SignOutButton>
      </div>
    </PickerShell>
  );
}

function EditorSection({ text, ids, adding }: { text: DashboardText; ids: readonly DemoId[]; adding: boolean }) {
  const { t } = text;
  return (
    <section aria-labelledby="pk-editor" data-section="editor" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 border-b border-[var(--pk-line)] pb-3">
        <div className="min-w-0 flex-[1_1_280px]">
          <h2 id="pk-editor" className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
            {t("start.editorTitle")}
          </h2>
          <p className="m-0 mt-1 text-[15px] text-[var(--pk-ink2)]">{t("start.editorText")}</p>
        </div>
        <span className="flex h-8 items-center rounded-2xl border border-[var(--pk-line)] px-3.5 text-[13px] font-bold text-[var(--pk-ink2)]">{t("start.apps", { count: ids.length })}</span>
      </div>
      <ul className="m-0 grid list-none gap-[18px] p-0 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
        {ids.map((id, i) => {
          const words = cardWords(text, id);
          const shot = demoScreens(text, id)[0]!;
          return (
            <li key={id} className="flex">
              <Link
                href={pickerPath({ demo: id, adding })}
                data-demo={id}
                className="flex w-full flex-col overflow-hidden rounded-[26px] border border-[var(--pk-line)] bg-[var(--pk-surface)] text-[var(--pk-ink)] no-underline transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(14,13,36,0.45)]"
              >
                <div className="pk-tint relative h-[200px] overflow-hidden" style={tintStyle(i)}>
                  <Phone src={shot.src} alt={shot.alt} loop={demoLoop(id)} width={152} height={330} border={6} radius={24} className="absolute top-6 left-1/2 -ml-[76px] shadow-[0_18px_40px_rgba(14,13,36,0.18)]" />
                  <span className="absolute start-3.5 top-3.5">
                    <ProductBadge text={text} id={id} />
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-[18px] pt-4 pb-[18px]">
                  <span className="text-[19px] font-bold">{words.name}</span>
                  <span className="text-sm leading-[1.4] text-[var(--pk-ink2)]">{words.line}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StudioSection({ text, ids, adding }: { text: DashboardText; ids: readonly DemoId[]; adding: boolean }) {
  const { t } = text;
  return (
    <section aria-labelledby="pk-studio" data-section="studio" className="flex flex-col gap-[18px] rounded-[32px] p-4 sm:p-7" style={{ background: STUDIO.bg, color: STUDIO.text }}>
      <div className="flex flex-wrap items-end gap-4 pb-3.5" style={{ borderBottom: `1px solid ${STUDIO.line}` }}>
        <div className="min-w-0 flex-[1_1_280px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="pk-studio" className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
              {t("start.studioTitle")}
            </h2>
            <span className="flex h-[26px] items-center rounded-[13px] bg-[#E6C26E] px-2.5 text-xs font-extrabold text-[#0E0D24]">{t("start.badgeStudio")}</span>
          </div>
          <p className="m-0 mt-1 text-[15px]" style={{ color: STUDIO.muted }}>
            {t("start.studioText")}
          </p>
        </div>
        <span className="flex h-8 items-center rounded-2xl px-3.5 text-[13px] font-bold" style={{ border: `1px solid ${STUDIO.goldLine}`, color: STUDIO.gold }}>
          {t("start.apps", { count: ids.length })}
        </span>
      </div>
      <ul className="m-0 grid list-none gap-[18px] p-0 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
        {ids.map((id) => {
          const words = cardWords(text, id);
          const shot = demoScreens(text, id)[0]!;
          return (
            <li key={id} className="flex">
              <Link
                href={pickerPath({ demo: id, adding })}
                data-demo={id}
                className="flex w-full flex-col overflow-hidden rounded-[26px] no-underline transition-shadow hover:shadow-[0_24px_48px_-26px_rgba(230,194,110,0.45)]"
                style={{ background: STUDIO.card, border: `1px solid ${STUDIO.cardLine}`, color: STUDIO.text }}
              >
                {/* 128.9 A soft gold light behind the phone. */}
                <div className="relative h-[200px] overflow-hidden" style={{ background: `radial-gradient(circle at 50% 38%, rgba(230,194,110,0.24), rgba(230,194,110,0) 62%), ${STUDIO.tile}` }}>
                  <Phone src={shot.src} alt={shot.alt} loop={demoLoop(id)} width={152} height={330} border={6} radius={24} frame={STUDIO.frame} className="absolute top-6 left-1/2 -ml-[76px] shadow-[0_18px_40px_rgba(0,0,0,0.35)]" />
                  <span className="absolute start-3.5 top-3.5">
                    <ProductBadge text={text} id={id} />
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-[18px] pt-4 pb-[18px]">
                  <span className="text-[19px] font-bold">{words.name}</span>
                  <span className="text-sm leading-[1.4]" style={{ color: STUDIO.muted }}>
                    {words.line}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/studio/new" className="self-start text-sm font-semibold underline-offset-2 hover:underline" style={{ color: STUDIO.gold }}>
        {t("start.emptyStudio")}
      </Link>
    </section>
  );
}

/** The bot, the website, and today's empty start. */
function NotSure({ text, adding }: { text: DashboardText; adding: boolean }) {
  const { t } = text;
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[22px] border border-dashed border-[var(--pk-line)] px-[22px] py-[18px]">
      <div className="min-w-0 flex-[1_1_260px]">
        <div className="text-base font-bold">{t("start.notSureTitle")}</div>
        <div className="text-sm text-[var(--pk-ink2)]">{t("start.notSureText")}</div>
      </div>
      <Link href="/dashboard/builder" className="flex h-12 items-center rounded-[14px] border border-[var(--pk-ink)] px-5 text-[15px] font-semibold text-[var(--pk-ink)] no-underline">
        {t("start.describe")}
      </Link>
      <details className="group">
        <summary className="flex h-12 cursor-pointer list-none items-center rounded-[14px] border border-[var(--pk-line)] px-5 text-[15px] font-semibold text-[var(--pk-ink)] [&::-webkit-details-marker]:hidden">{t("start.useWebsite")}</summary>
        <form action={startFromWebsiteAction} className="mt-3 flex flex-wrap items-end gap-2">
          {adding ? <input type="hidden" name="new" value="1" /> : null}
          <label className="flex min-w-0 flex-[1_1_220px] flex-col gap-1 text-sm font-semibold">
            {t("start.websiteLabel")}
            <input name="site" type="text" inputMode="url" autoComplete="url" required maxLength={300} dir="ltr" className="h-12 rounded-[14px] border border-[var(--pk-line)] bg-[var(--pk-surface)] px-4 text-[15px] text-[var(--pk-ink)]" />
          </label>
          <button type="submit" className="h-12 cursor-pointer rounded-[14px] border-0 bg-[var(--pk-ink)] px-5 font-[inherit] text-[15px] font-bold text-[var(--pk-on-ink)]">
            {t("start.websiteStart")}
          </button>
        </form>
      </details>
      <div className="basis-full">
        <Link href={adding ? "/dashboard/app-type?new=1" : "/dashboard/app-type"} className="text-sm font-semibold text-[var(--pk-ink2)] underline-offset-2 hover:underline">
          {t("start.empty")}
        </Link>
      </div>
    </div>
  );
}
