import type { Metadata } from "next";
import { chooseAppTypeAction, startFromWebsiteAction } from "@/app/actions/dashboard";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import Link from "next/link";
import { Notice, btn } from "@/components/ui";
import { AppDeletedNotice } from "@/components/app-deletion";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { getStore } from "@/lib/data";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { KINDS, kindOf } from "@/lib/app/kinds";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("setup.typeTitle") };
}

const SITE_ERRORS = ["invalid_url", "unreachable", "not_html", "too_large", "too_many", "unavailable"] as const;

export default async function AppTypePage({ searchParams }: PageProps<"/dashboard/app-type">) {
  const context = await requireClient("apps");
  const { t, k } = await dashboardText();
  const query = await searchParams;
  // "Add an app": a new app for the same account, with its own plan. The account's first app is created here too.
  const adding = query.new === "1" && context.apps.length > 0;
  const app = adding ? null : context.app;
  const license = adding ? null : context.license;
  // 11.5 Switches: types the team switched off aren't offered (the app's own type stays).
  // 20 The picker shows kinds (lib/app/kinds.ts): an engine, with a kind of business for some.
  const switches = await getSwitches(await getStore());
  const types = KINDS.filter((k) => k.engine === app?.appType || appTypeOn(switches, k.engine, license?.plan ?? null));
  const current = app ? kindOf(app).id : (types[0]?.id ?? KINDS[0]!.id);
  const unavailable = query.unavailable === "1";
  // 81.3 A new app can start from the website: its first version made from it.
  const fromSite = !app;
  const siteError = SITE_ERRORS.find((code) => code === query.site_error) ?? null;
  const siteValue = typeof query.site === "string" ? query.site : adding ? "" : (context.client.siteUrl ?? "");
  if (adding && context.apps.length >= MAX_APPS_PER_CLIENT) {
    return (
      <div className="flex max-w-[620px] flex-col gap-4">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("setup.addApp")}</h1>
        <Notice tone="warn" icon="warning" role="alert">
          {t("setup.maxApps", { max: MAX_APPS_PER_CLIENT })}
        </Notice>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-[620px] flex-col gap-2">
        {adding ? (
          <>
            <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("setup.addApp")}</h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("setup.addAppText")}</p>
          </>
        ) : (
          <>
            <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("setup.whatKind")}</h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("setup.whatKindText")}</p>
            {app ? (
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">
                {richText(t("setup.previewNow"), {
                  link: (chunk) => (
                    <Link href="/dashboard/preview" className="inline-flex items-center gap-1.5 font-semibold">
                      <Icon name="visibility" size={18} />
                      {chunk}
                    </Link>
                  ),
                })}
              </p>
            ) : null}
          </>
        )}
      </div>

      <AppDeletedNotice context={context} id={typeof query.deleted === "string" ? query.deleted : null} />

      {fromSite ? (
        <form action={startFromWebsiteAction} aria-labelledby="from-site-title" className="flex max-w-[620px] flex-col gap-3 rounded-[20px] border border-line bg-white p-[26px]">
          {adding ? <input type="hidden" name="new" value="1" /> : null}
          <h2 id="from-site-title" className="m-0 flex items-center gap-2 text-xl font-extrabold">
            <Icon name="language" size={24} />
            {t("setup.fromSite")}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("setup.fromSiteText")}</p>
          {siteError ? (
            <Notice tone="warn" icon="warning" role="alert">
              {t(`setup.siteErrors.${siteError}`)}
            </Notice>
          ) : null}
          <label htmlFor="from-site" className="text-sm font-semibold">
            {t("setup.fromSiteLabel")}
          </label>
          <div className="flex flex-wrap gap-3">
            <input
              id="from-site"
              name="site"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              maxLength={300}
              defaultValue={siteValue}
              placeholder="example.com"
              dir="ltr"
              className="h-12 min-w-0 flex-1 basis-[240px] rounded-xl border border-line bg-white px-4 text-[15px]"
            />
            <SubmitButton className="h-12 px-6" pendingText={t("setup.fromSitePending")}>
              {t("setup.fromSiteButton")}
            </SubmitButton>
          </div>
        </form>
      ) : null}

      <form action={chooseAppTypeAction} className="flex flex-col gap-8">
        {adding ? <input type="hidden" name="new" value="1" /> : null}
        {fromSite ? <h2 className="m-0 text-xl font-extrabold">{t("setup.orPickType")}</h2> : null}
        {unavailable ? (
          <Notice tone="warn" icon="warning" role="alert">
            {t("setup.unavailable")}
          </Notice>
        ) : null}

        <fieldset className="m-0 grid gap-5 border-0 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          <legend className="sr-only">{t("setup.appType")}</legend>
          {types.map((type) => (
            <label
              key={type.id}
              className="group flex cursor-pointer flex-col gap-3.5 rounded-[20px] border border-line bg-white p-[26px] has-[:checked]:border-2 has-[:checked]:border-midnight has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${type.tile}`}>
                  <Icon name={type.icon} size={26} />
                </span>
                <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-midnight text-white group-has-[:checked]:flex">
                  <Icon name="check" size={14} />
                </span>
              </div>
              <span className="flex items-center gap-2 text-xl font-extrabold">
                <input type="radio" name="kind" value={type.id} defaultChecked={type.id === current} className="sr-only" />
                {k(type.name)}
              </span>
              <span className="text-[15px] leading-relaxed text-ink-4">{k(type.description)}</span>
              <span className="text-[13px] leading-normal text-muted">{k(type.requires)}</span>
            </label>
          ))}

        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {adding ? (
            <Link href="/dashboard" className={`${btn.secondary} h-12`}>
              {t("common.cancel")}
            </Link>
          ) : null}
          <SubmitButton className="h-12 px-6" pendingText={adding ? t("common.adding") : t("setup.continuing")}>
            {adding ? t("setup.addTheApp") : t("common.continue")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
