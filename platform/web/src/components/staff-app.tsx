import Link from "next/link";
import { saveStaffAppAction } from "@/app/actions/staff-app";
import { BuildBadge } from "./build-status";
import { SubmitButton } from "./form";
import { Icon } from "./icon";
import { Notice } from "./ui";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { Build, StaffAppPlace } from "@/lib/data/types";

export interface StaffAppCard {
  name: string;
  android: string;
  ios: string;
  latest: Build | null;
}

export interface StaffAppChoiceData {
  academy: boolean;
  place: StaffAppPlace;
  /** No choice saved: a project made before the staff app (its staff work in the main app). */
  before: boolean;
  main: StaffAppCard;
  staff: StaffAppCard;
  onPlan: boolean;
}

/**
 * 116 Studio › Settings for a school (a university) or an academy with many
 * teachers: its main app (students and parents) and its staff app side by
 * side, and where the staff work: in the staff app of the bundle (every new
 * project) or in the main app (projects made before, until the owner
 * switches).
 */
export function StaffAppChoice({
  text,
  data,
  href,
  step,
  saved,
}: {
  text: DashboardText;
  data: StaffAppChoiceData;
  href: (path: string) => string;
  step: string;
  saved: boolean;
}) {
  const { t, lang } = text;
  const { academy, place, main, staff, onPlan, before } = data;
  const cards = [
    { key: "main", title: t(academy ? "builds.staffMainAppAcademy" : "builds.staffMainApp"), app: main, icon: "school" as const, builds: `${href("/dashboard/builds")}#h-files` },
    { key: "staff", title: t("builds.staffAppCard"), app: staff, icon: "groups" as const, builds: `${href("/dashboard/builds")}#h-staff-app` },
  ];
  const choices = [
    { value: "bundle" as const, label: t("builds.staffChoiceBundle"), hint: t(academy ? "builds.staffChoiceBundleHintAcademy" : "builds.staffChoiceBundleHint", { name: staff.name }) },
    { value: "same" as const, label: t("builds.staffChoiceSame"), hint: t("builds.staffChoiceSameHint") },
  ];
  return (
    <section aria-labelledby="h-staff-app" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-staff-app="">
      <div className="flex flex-col gap-1">
        <h2 id="h-staff-app" className="m-0 text-lg font-bold">
          {t("builds.staffWhereTitle")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t(academy ? "builds.staffWhereTextAcademy" : "builds.staffWhereText")}</p>
      </div>
      {saved ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("builds.staffSaved")}
        </Notice>
      ) : null}
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {cards
          .filter((card) => card.key === "main" || place === "bundle")
          .map((card) => (
            <li key={card.key} data-app={card.key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sand text-ink-3">
                  <Icon name={card.icon} size={22} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-semibold text-muted">{card.title}</span>
                  <h3 className="m-0 truncate text-base font-bold">{card.app.name}</h3>
                </div>
              </div>
              <span className="text-[13px] break-all text-muted">
                <bdi dir="ltr">{t("builds.appIds", { android: card.app.android, ios: card.app.ios })}</bdi>
              </span>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {card.app.latest ? (
                  <>
                    <BuildBadge status={card.app.latest.status} lang={lang} />
                    <span className="text-ink-4">{t("builds.buildLine", { number: card.app.latest.number, version: card.app.latest.versionName })}</span>
                  </>
                ) : (
                  <span className="text-muted">{t("builds.noBuildYet")}</span>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold">
                <Link href={card.builds}>{t("builds.appBuilds")}</Link>
              </div>
            </li>
          ))}
      </ul>
      <form action={saveStaffAppAction} className="flex flex-col gap-3">
        <input type="hidden" name="step" value={step} />
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-bold">{t("builds.staffChoice")}</legend>
          {choices.map((choice) => (
            <label key={choice.value} className="flex items-start gap-2.5 rounded-xl border border-line p-3.5 text-[15px]">
              <input type="radio" name="staffApp" value={choice.value} defaultChecked={place === choice.value} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{choice.label}</span>
                <span className="text-[14px] text-muted">{choice.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {before && place === "same" ? <Notice icon="devices">{t("builds.staffSwitchNote", { name: staff.name })}</Notice> : null}
        {!onPlan ? (
          <Notice tone="warn" icon="info">
            {t("builds.staffOff")}
          </Notice>
        ) : null}
        <SubmitButton variant="secondary" className="h-10 self-start px-4 text-sm">
          {t("builds.staffSave")}
        </SubmitButton>
      </form>
    </section>
  );
}
