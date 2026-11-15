import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { MarketHeader } from "@/components/studio-market/header";
import { PageThumb, MarketPhones } from "@/components/studio-market/phone";
import { formatDateTime } from "@/components/ui";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { kindById } from "@/lib/app/kinds";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import type { MarketTemplate, TemplateDesigner } from "@/lib/data/types";
import { coverView, designerChip, type CoverView } from "@/lib/studio-market/catalog";
import { publishedCount, REVIEW_CHECK_LABELS, REVIEW_CHECKS, reviewQueue } from "@/lib/studio-market/review";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { templateText } from "@/lib/studio-market/templates";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { DecisionForm, ReviewPreview } from "./forms";

export const metadata: Metadata = { title: "Studio Market review queue" };
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** "2 days", "5 h". */
function waited(since: Date | null, now: Date): string {
  const ms = Math.max(0, now.getTime() - (since?.getTime() ?? now.getTime()));
  if (ms >= DAY) {
    const days = Math.floor(ms / DAY);
    return days === 1 ? "1 day" : `${days} days`;
  }
  const hours = Math.max(1, Math.floor(ms / HOUR));
  return `${hours} h`;
}

function Avatar({ designer, size = 22 }: { designer: TemplateDesigner; size?: number }) {
  const chip = designerChip(designer);
  return (
    <span aria-hidden="true" className="inline-flex flex-none items-center justify-center rounded-full font-extrabold" style={{ width: size, height: size, fontSize: size * 0.43, background: chip.bg, color: chip.fg }}>
      {chip.initials}
    </span>
  );
}

/**
 * 106.1 Admin › Studio Market › Review queue, as the owner approved it: the
 * templates sent for their first publish, oldest first; the chosen one
 * drawn page by page, its texts, plans and choices, the checklist, and the
 * decision: approve and publish, or request changes with notes (emailed to
 * the designer). Later updates of a published template aren't reviewed.
 * Anyone on the team sees it; `market.review` decides.
 */
export default async function MarketReviewPage({ searchParams }: PageProps<"/admin/market">) {
  await requireAdmin();
  const mayDecide = await adminCan("market.review");
  const store = await getStore();
  const now = new Date();
  const params = await searchParams;
  const queue = await reviewQueue(store);
  const designers = new Map((await store.listTemplateDesigners([...new Set(queue.map((t) => t.designerId))])).map((d) => [d.id, d]));
  const versions = new Map((await store.listMarketTemplateVersions(queue.map((t) => t.reviewVersionId).filter((v): v is string => Boolean(v)))).map((v) => [v.id, v]));
  const approvedThisWeek = (await store.listMarketTemplates({ statuses: ["published"] })).filter((t) => t.publishedAt && now.getTime() - t.publishedAt.getTime() < 7 * DAY).length;
  const selected: MarketTemplate | null = queue.find((t) => t.id === params.id) ?? queue[0] ?? null;
  const sentBefore = new Map(await Promise.all(queue.map(async (t) => [t.id, (await store.listMarketTemplateReviews(t.id)).length > 0] as const)));
  const next = selected ? (queue[queue.indexOf(selected) + 1] ?? null) : null;

  const done = params.done === "approved" ? "Approved and published. The designer was emailed." : params.done === "changes" ? "Changes requested. The designer was emailed with your notes." : null;

  const header = (
    <MarketHeader
      eyebrow="Studio Market"
      title="Review queue"
      lead="Templates designers sent us for their first publish, oldest first. We answer within 2 working days; later updates go live without a review."
      actions={
        <>
          <span className="inline-flex items-center gap-1 rounded-xl bg-warn-bg px-3 py-1.5 text-[13px] font-bold text-warn">
            <Icon name="hourglass_top" size={16} filled />
            {queue.length} waiting{queue[0] ? ` · oldest ${waited(queue[0].submittedAt, now)}` : ""}
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl bg-success-bg px-3 py-1.5 text-[13px] font-bold text-success">
            <Icon name="task_alt" size={16} filled />
            {approvedThisWeek} approved this week
          </span>
        </>
      }
    />
  );

  if (!selected) {
    return (
      <div className="mk mk-page flex flex-col gap-6">
        {header}
        {done ? (
          <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
            {done}
          </p>
        ) : null}
        <div className="mk-panel flex flex-col items-center gap-2.5 px-5 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted">
            <Icon name="task_alt" size={26} />
          </span>
          <p className="m-0 text-base font-bold">Nothing waiting</p>
          <p className="m-0 max-w-[440px] text-sm text-muted">Templates designers send for their first publish show here, oldest first.</p>
        </div>
      </div>
    );
  }

  const designer = designers.get(selected.designerId)!;
  const version = selected.reviewVersionId ? versions.get(selected.reviewVersionId) : undefined;
  const file = version ? await versionDesign(getBlobStore(), version) : null;
  const text = templateText(selected, "en");
  const pages = file
    ? file.pages.flatMap((p) => {
        const view = coverView(version!.cover ? { ...version!.cover, page: p.studio } : null, version!.languages, "en", text.title);
        return view ? [{ slug: p.slug, title: p.title, view }] : [];
      })
    : [];
  const languages = (version?.languages ?? []).filter((l) => l === "en" || l === "ar" || l === "tr");
  const kinds = selected.kinds.map((id) => kindById(id)?.name ?? id);
  const published = await publishedCount(store, designer);
  const kv = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 border-t border-line-soft py-[9px] text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-end font-semibold">{value}</span>
    </div>
  );

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <div className="mk mk-page flex flex-col gap-6">
      {header}
      {done ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {done}
        </p>
      ) : null}
      <div className="grid items-start gap-5 lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside aria-label="Waiting" className="mk-panel flex flex-col gap-0.5 p-2 lg:sticky lg:top-20">
          <div className="flex items-center justify-between px-2.5 pt-2.5 pb-2">
            <b className="text-[15px]">
              Waiting <span className="font-medium text-muted">{queue.length}</span>
            </b>
            <span className="flex items-center gap-1 text-[13px] text-muted">
              <Icon name="unfold_more" size={16} />
              Oldest first
            </span>
          </div>
          {queue.map((t) => {
            const d = designers.get(t.designerId)!;
            const v = t.reviewVersionId ? versions.get(t.reviewVersionId) : undefined;
            const cover: CoverView | null = v ? coverView(v.cover, v.languages, "en", templateText(t, "en").title) : null;
            const on = t.id === selected.id;
            const again = sentBefore.get(t.id);
            return (
              <Link
                key={t.id}
                href={`/admin/market?id=${t.id}`}
                aria-current={on ? "true" : undefined}
                className={`flex items-center gap-3 rounded-xl p-2.5 no-underline ${on ? "bg-peach shadow-[inset_3px_0_0_var(--color-ember)]" : "hover:bg-ivory"}`}
              >
                <span className="h-[52px] w-[38px] flex-none overflow-hidden rounded-lg border border-line">{cover ? <PageThumb view={cover} width={38} height={52} /> : null}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-1.5">
                    <b className="truncate text-sm text-midnight">{templateText(t, "en").title}</b>
                    <span className="text-xs whitespace-nowrap text-muted">{waited(t.submittedAt, now)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-4">
                    <Avatar designer={d} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {kindById(t.kinds[0])?.name ?? ""}
                    <span className={`rounded-xl px-[7px] py-px text-[11px] font-bold ${again ? "bg-warn-bg text-warn" : "bg-line-soft text-muted"}`}>{again ? "Sent again" : "New"}</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label={text.title} className="mk-panel flex flex-col gap-4 px-[22px] py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 text-2xl font-extrabold tracking-[-0.4px]">{text.title}</h2>
                  <span className="rounded-xl bg-line-soft px-2.5 py-1 text-xs font-bold text-muted">{sentBefore.get(selected.id) ? "Sent again" : "New template"}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-ink-4">
                  <Avatar designer={designer} size={28} />
                  <b className="text-midnight">{designer.name}</b>
                  <span className="text-faint">·</span>
                  {kinds.join(", ")}
                  <span className="text-faint">·</span>
                  Sent {formatDateTime(selected.submittedAt)}
                </span>
              </div>
              <Link href={`/admin/clients/${selected.clientId}`} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline">
                <Icon name="person" size={18} />
                The designer&apos;s account
              </Link>
            </div>
            {pages.length ? <ReviewPreview pages={pages} languages={languages.length ? languages : ["en"]} samples={{ items: {}, categories: {}, samples: sampleEntries(now) }} /> : <p className="m-0 text-sm text-danger">The sent design can&apos;t be read.</p>}
            <p className="m-0 text-sm leading-relaxed text-ink-3">
              {text.short ? <b>“{text.short}” </b> : null}
              {text.description}
            </p>
            {selected.noteToTeam ? (
              <div className="flex gap-2.5 rounded-xl border border-line bg-sand px-4 py-3 text-sm text-ink-2">
                <Icon name="chat" size={20} className="text-muted" />
                <span>
                  <b>From the designer: </b>
                  <span className="whitespace-pre-line">{selected.noteToTeam}</span>
                </span>
              </div>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col">
                <b className="pb-1.5 text-[15px]">Plans and prices</b>
                {kv("Plan", selected.free ? "Free (never ends)" : "Paid")}
                {kv("Tags", selected.tags.length ? selected.tags.join(", ") : "—")}
              </div>
              <div className="flex flex-col">
                <b className="pb-1.5 text-[15px]">The page</b>
                {kv("After the plan ends", selected.afterEnd === "keep" ? "Design stays, no updates" : "App goes back to its design")}
                {kv("App kinds", kinds.join(", "))}
                {kv("Languages", languages.map((l) => ({ en: "English", ar: "Arabic", tr: "Turkish" })[l] ?? l).join(", "))}
                {kv("Rights to photos & fonts", selected.rightsConfirmedAt ? <span className="text-success">Confirmed by designer</span> : "Not confirmed")}
                {kv("Designer", `${published} published`)}
              </div>
            </div>
          </section>
          <DecisionForm id={selected.id} checks={REVIEW_CHECKS.map((key) => ({ key, label: REVIEW_CHECK_LABELS[key] }))} next={next?.id ?? null} mayDecide={mayDecide} />
        </div>
      </div>
      </div>
    </MarketPhones>
  );
}
