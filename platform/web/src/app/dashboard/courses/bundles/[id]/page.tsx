import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteBundleAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { DetailLayout, ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { BUNDLE_MIN_COURSES, bundlesOf } from "@/lib/courses/bundles";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { BundleForm } from "../forms";
import { bundleChoices, bundleSums } from "../parts";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/bundles/[id]">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const bundle = app ? bundlesOf(courseSetup(app)).find((b) => b.id === id) : null;
  return { title: bundle?.title ?? (await dashboardText()).t("lms.bundlesTitle") };
}

/** 113.1 A bundle: its courses, the owner's price next to what the courses cost on their own, shown or not. */
export default async function BundlePage({ params }: PageProps<"/dashboard/courses/bundles/[id]">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const id = Number((await params).id);
  const bundle = bundlesOf(setup).find((b) => b.id === id);
  if (!bundle) notFound();
  const { t } = await dashboardText();
  const money = (cents: number) => formatCents(cents, setup.currency);
  const { courses, compareCents } = bundleSums(setup, bundle);
  const saving = compareCents - bundle.priceCents;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the form beside the bundle's price and courses. */}
      <PageHeader
        back={{ href: "/dashboard/courses/bundles", label: t("lms.backToBundles") }}
        title={bundle.title}
        description={
          <span data-compare-at>{saving > 0 ? t("lms.bundleCompare", { amount: money(compareCents), saving: money(saving) }) : t("lms.bundleCompareNone", { amount: money(compareCents) })}</span>
        }
      />
      {bundle.active && courses.length < BUNDLE_MIN_COURSES ? (
        <Notice tone="warn" icon="warning">
          {t("lms.bundleNotShown")}
        </Notice>
      ) : null}

      <DetailLayout
        main={
          <Section titleId="h-bundle" title={t("common.details")}>
            <BundleForm
              current={{
                id: String(bundle.id),
                title: bundle.title,
                description: bundle.description,
                price: centsToDecimal(bundle.priceCents),
                courseIds: bundle.courseIds.join(","),
                active: bundle.active ? "on" : "",
              }}
              courses={bundleChoices(setup, t("common.free"))}
              currency={setup.currency}
              imageUrl={bundle.imageAssetId ? assetUrl(bundle.imageAssetId) : null}
              submit={t("lms.saveBundle")}
            />
          </Section>
        }
        side={
          <>
            <StatRow label={bundle.title}>
              <Stat icon="sell" tone="accent" label={t("lms.bundlePriceStat")} value={money(bundle.priceCents)} hint={saving > 0 ? t("lms.bundleSaves", { amount: money(saving) }) : undefined} />
              <Stat icon={bundle.active ? "visibility" : "visibility_off"} tone={bundle.active ? "success" : "warn"} label={t("lms.bundleInApp")} value={bundle.active ? t("lms.bundleShownShort") : t("common.hidden")} />
            </StatRow>
            <Section titleId="h-bundle-courses" title={t("lms.bundleCourses")} actions={<Badge tone="neutral">{courses.length}</Badge>} flush>
              {courses.length ? (
                <ItemList>
                  {courses.map((c, i) => (
                    <ItemRow
                      key={c.id}
                      href={`/dashboard/courses/${c.id}`}
                      media={<Thumb src={c.imageAssetId ? assetUrl(c.imageAssetId) : null} icon="school" shape="square" tint={i} />}
                      title={c.title}
                      meta={c.priceCents ? money(c.priceCents) : t("common.free")}
                    />
                  ))}
                </ItemList>
              ) : (
                <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("lms.bundleNotShown")}</p>
              )}
            </Section>
            <form action={deleteBundleAction} className="flex justify-end">
              <input type="hidden" name="id" value={bundle.id} />
              <SubmitButton variant="danger" className="h-10">
                <Icon name="delete" size={18} />
                {t("lms.deleteBundle")}
              </SubmitButton>
            </form>
          </>
        }
      />
    </div>
  );
}
