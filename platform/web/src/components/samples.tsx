import Link from "next/link";
import { removeSamplesAction } from "@/app/actions/samples";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, btn } from "@/components/ui";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { countList, LIST_PAGE, samplesLeft, sampleListsOf, type SampleList } from "@/lib/samples/lists";

/** The list page's query: `samples` asks about a list, `samplesRemoved` says what went (`<list>.<count>`). */
export interface SampleQuery {
  samples?: string;
  samplesRemoved?: string;
}

/**
 * 110.2 Above a dashboard list with sample entries: how many it has and
 * "Remove all samples"; after the owner's first own entry
 * (`?samples=<list>`), the question whether to remove them now; after
 * removing (`?samplesRemoved=<list>.<n>`), what went.
 */
export async function SampleEntries({ app, list, query }: { app: App; list: SampleList; query: SampleQuery }) {
  if (!sampleListsOf(app).includes(list)) return null;
  const { t } = await dashboardText();
  // `<list>.<count>`: two lists can share a page (a salon's services and its team).
  const [removedList, removedCount] = (query.samplesRemoved ?? "").split(".");
  const removed = removedList === list && removedCount ? Number(removedCount) : null;
  const { samples } = await countList(await getStore(), app, list);
  const done =
    removed !== null && Number.isSafeInteger(removed) ? (
      <Notice tone="success" icon="check_circle" role="status">
        {t("samples.removed", { count: removed })}
      </Notice>
    ) : null;
  if (samples === 0) return done;
  const form = (label: string, variant: "primary" | "secondary") => (
    <form action={removeSamplesAction}>
      <input type="hidden" name="list" value={list} />
      <SubmitButton variant={variant} className="h-10 px-4 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
  if (query.samples === list) {
    return (
      <div data-samples={list}>
        <Notice tone="warn" icon="help" role="status">
          <p className="m-0 font-bold">{t("samples.askTitle")}</p>
          <p className="m-0">{t("samples.askText")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {form(t("samples.askYes"), "primary")}
            <Link href={LIST_PAGE[list]} className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("samples.askNo")}
            </Link>
          </div>
        </Notice>
      </div>
    );
  }
  return (
    <div data-samples={list} className="flex flex-col gap-3">
      {done}
      <Notice tone="info" icon="info">
        <p className="m-0 font-bold">{t("samples.banner", { count: samples })}</p>
        <p className="m-0">{t("samples.bannerText")}</p>
        <div className="mt-3">{form(t("samples.removeAll"), "secondary")}</div>
      </Notice>
    </div>
  );
}

/** The "Sample" badge of an entry in a dashboard list. */
export async function SampleBadge({ sample }: { sample: boolean | undefined }) {
  if (!sample) return null;
  const { t } = await dashboardText();
  return <Badge tone="info">{t("samples.badge")}</Badge>;
}

/** 110.2 On Builds and Publishing: the app can't go to the stores while sample entries are left. */
export async function SamplesStoreNotice({ app }: { app: App }) {
  const left = await samplesLeft(await getStore(), app);
  if (!left.length) return null;
  const { t } = await dashboardText();
  const count = left.reduce((sum, l) => sum + l.count, 0);
  return (
    <div data-samples-guard="">
      <Notice tone="warn" icon="warning" role="status">
        {richText(t("samples.stores", { count }), { link: (chunk) => <Link href={LIST_PAGE[left[0]!.list]}>{chunk}</Link> })}
      </Notice>
    </div>
  );
}
