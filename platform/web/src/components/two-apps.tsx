import Link from "next/link";
import { BuildBadge } from "./build-status";
import { Icon } from "./icon";
import { Notice } from "./ui";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { TwoAppsData } from "@/lib/delivery/two-apps";

/**
 * 112.3 A delivery, food, ride or taxi project's two apps side by side, in
 * Setup and on Builds: the customers' (riders') app and the couriers'
 * (drivers') app, each with its name, package and bundle ID, newest build,
 * listing and builds, the reviewers' notes for both; the plan's note when
 * the second app isn't in it, and the change for a company whose couriers
 * or drivers worked in the customers' app until now.
 */
export function TwoApps({
  text,
  data,
  href,
}: {
  text: DashboardText;
  data: TwoAppsData;
  /** A dashboard address in the frame this page is in (Studio's for a Studio project). */
  href: (path: string) => string;
}) {
  const { t, lang } = text;
  const { role, customers, second, onPlan, before, settingsPath } = data;
  const driver = role === "driver";
  const cards = [
    {
      key: "customers",
      title: t(driver ? "builds.ridersApp" : "builds.customersApp"),
      app: customers,
      icon: "person" as const,
      links: [
        { label: t("builds.appListing"), to: href("/dashboard/setup?step=listing") },
        { label: t("builds.appBuilds"), to: `${href("/dashboard/builds")}#h-files` },
      ],
      note: null,
    },
    {
      key: role,
      title: t(driver ? "builds.driversApp" : "builds.couriersApp"),
      app: second,
      icon: driver ? ("local_taxi" as const) : ("two_wheeler" as const),
      links: [
        { label: t("builds.appNameIcon"), to: href(settingsPath) },
        { label: t("builds.appBuilds"), to: `${href("/dashboard/builds")}#courier-app` },
      ],
      note: t(driver ? "builds.secondListingDriver" : "builds.secondListingCourier"),
    },
  ];
  return (
    <section aria-labelledby="h-two-apps" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-two-apps="">
      <div className="flex flex-col gap-1">
        <h2 id="h-two-apps" className="m-0 text-lg font-bold">
          {t("builds.twoAppsTitle")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t(driver ? "builds.twoAppsDriver" : "builds.twoAppsCourier")}</p>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {cards.map((card) => (
          <li key={card.key} data-app={card.key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-4">
            <div className="flex items-center gap-3">
              {card.app.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.app.iconUrl} alt="" width={44} height={44} className="h-11 w-11 flex-none rounded-xl border border-line object-cover" />
              ) : (
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sand text-ink-3">
                  <Icon name={card.icon} size={22} />
                </span>
              )}
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
            {card.note ? <p className="m-0 text-[13px] leading-snug text-muted">{card.note}</p> : null}
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-semibold">
              {card.links.map((link) => (
                <Link key={link.label} href={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {!onPlan ? (
        <Notice tone="warn" icon="info">
          {t(driver ? "builds.driverOff" : "builds.courierOff")}
        </Notice>
      ) : null}
      {before ? (
        <Notice icon="devices">{t(driver ? "rides.driverAppBefore" : "delivery.courierAppBefore", { name: second.name })}</Notice>
      ) : null}
      <Link href={`${href("/dashboard/publishing")}#h-review`} className="flex items-center gap-1.5 self-start text-sm font-semibold">
        <Icon name="assignment" size={18} />
        {t("builds.reviewNotesBoth")}
      </Link>
    </section>
  );
}
