import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { BUNDLE_MIN_COURSES, bundlesOf } from "@/lib/courses/bundles";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { BundleForm } from "./forms";
import { bundleChoices, bundleSums } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("lms.bundlesTitle") };
}

/** 113.1 The academy's course bundles: several courses at one price the owner sets. */
export default async function BundlesPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { t } = await dashboardText();
  const setup = courseSetup(app);
  const bundles = bundlesOf(setup);
  const choices = bundleChoices(setup, t("common.free"));
  const money = (cents: number) => formatCents(cents, setup.currency);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[680px] flex-col gap-2">
        <Link href="/dashboard/courses" className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("courses.backToCourses")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("lms.bundlesTitle")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("lms.bundlesIntro")}</p>
        <p className="m-0 text-sm leading-relaxed text-muted">{t("lms.bundleCoupons")}</p>
      </div>

      <section aria-labelledby="h-bundles" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-bundles" className="m-0 text-lg font-bold">
          {t("lms.bundlesCount", { count: bundles.length })}
        </h2>
        {bundles.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {bundles.map((b) => {
              const { courses, compareCents } = bundleSums(setup, b);
              return (
                <li key={b.id} className="border-t border-line-soft py-3 first:border-t-0" data-bundle={b.id}>
                  <Link href={`/dashboard/courses/bundles/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 no-underline">
                    <span className="text-[15px] font-bold">{b.title}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {t("lms.bundleLine", { courses: courses.length, price: money(b.priceCents), compare: money(compareCents) })}
                      {!b.active ? <Badge tone="warn">{t("common.hidden")}</Badge> : null}
                    </span>
                  </Link>
                  {b.active && courses.length < BUNDLE_MIN_COURSES ? <p className="m-0 mt-1 text-[13px] text-muted">{t("lms.bundleNotShown")}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("lms.noBundles")}</p>
        )}
      </section>

      <section aria-labelledby="h-new-bundle" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-new-bundle" className="m-0 text-lg font-bold">
          {t("lms.addBundle")}
        </h2>
        {choices.length >= BUNDLE_MIN_COURSES ? (
          <BundleForm current={{ title: "", description: "", price: "", courseIds: "", active: "on" }} courses={choices} currency={setup.currency} imageUrl={null} submit={t("lms.addBundleButton")} />
        ) : (
          <Notice tone="info" icon="info">
            {t("lms.noBundleCourses")}
          </Notice>
        )}
        <p className="m-0 text-[13px] text-muted">{t("lms.bundleStore")}</p>
      </section>
    </div>
  );
}
