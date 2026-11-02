import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteBundleAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
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
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/courses/bundles" className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("lms.backToBundles")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{bundle.title}</h1>
        <p className="m-0 text-[15px] text-ink-4" data-compare-at>
          {saving > 0 ? t("lms.bundleCompare", { amount: money(compareCents), saving: money(saving) }) : t("lms.bundleCompareNone", { amount: money(compareCents) })}
        </p>
      </div>
      {bundle.active && courses.length < BUNDLE_MIN_COURSES ? (
        <Notice tone="warn" icon="warning">
          {t("lms.bundleNotShown")}
        </Notice>
      ) : null}

      <section aria-labelledby="h-bundle" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-bundle" className="m-0 text-lg font-bold">
          {t("common.details")}
        </h2>
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
      </section>

      <form action={deleteBundleAction}>
        <input type="hidden" name="id" value={bundle.id} />
        <SubmitButton variant="danger" className="h-10">
          {t("lms.deleteBundle")}
        </SubmitButton>
      </form>
    </div>
  );
}
