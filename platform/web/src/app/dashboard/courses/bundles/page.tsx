import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { CardGrid, ItemCard } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
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
  const canAdd = choices.length >= BUNDLE_MIN_COURSES;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the bundles as cards, the form in a Sheet (in place while there are none). */}
      <PageHeader
        back={{ href: "/dashboard/courses", label: t("courses.backToCourses") }}
        title={t("lms.bundlesTitle")}
        description={t("lms.bundlesIntro")}
        actions={
          bundles.length && canAdd ? (
            <SheetButton target="new-bundle" icon="add">
              {t("lms.addBundle")}
            </SheetButton>
          ) : null
        }
      />
      <Notice tone="neutral" icon="local_offer">
        {t("lms.bundleCoupons")}
      </Notice>

      <Section titleId="h-bundles" title={t("lms.bundlesCount", { count: bundles.length })}>
        {bundles.length ? (
          <CardGrid>
            {bundles.map((b, i) => {
              const { courses, compareCents } = bundleSums(setup, b);
              const saves = compareCents - b.priceCents;
              return (
                <ItemCard
                  key={b.id}
                  data-bundle={b.id}
                  href={`/dashboard/courses/bundles/${b.id}`}
                  image={b.imageAssetId ? assetUrl(b.imageAssetId) : null}
                  icon="inventory_2"
                  tint={i + 2}
                  title={b.title}
                  badges={
                    <>
                      {!b.active ? <Badge tone="warn">{t("common.hidden")}</Badge> : null}
                      {saves > 0 ? <Badge tone="success">{t("lms.bundleSaves", { amount: money(saves) })}</Badge> : null}
                    </>
                  }
                >
                  <span className="text-sm text-muted">{t("lms.bundleLine", { courses: courses.length, price: money(b.priceCents), compare: money(compareCents) })}</span>
                  {courses.length ? <span className="line-clamp-2 text-[13px] text-ink-4">{courses.map((c) => c.title).join(" · ")}</span> : null}
                  {b.active && courses.length < BUNDLE_MIN_COURSES ? <span className="text-[13px] text-warn">{t("lms.bundleNotShown")}</span> : null}
                </ItemCard>
              );
            })}
          </CardGrid>
        ) : (
          <EmptyState icon="inventory_2" title={t("lms.noBundles")} />
        )}
      </Section>

      <Sheet id="new-bundle" inline={!bundles.length || !canAdd} title={t("lms.addBundle")} description={t("lms.bundleStore")}>
        {canAdd ? (
          <BundleForm current={{ title: "", description: "", price: "", courseIds: "", active: "on" }} courses={choices} currency={setup.currency} imageUrl={null} submit={t("lms.addBundleButton")} />
        ) : (
          <Notice tone="info" icon="info">
            {t("lms.noBundleCourses")}
          </Notice>
        )}
      </Sheet>
    </div>
  );
}
