import { dashboardText } from "@/lib/dashboard-lang";

/** What a dashboard page shows while it loads: the shape of a page, so nothing jumps when it arrives. */
export default async function DashboardLoading() {
  const { t } = await dashboardText();
  const block = "animate-pulse rounded-2xl bg-white/70 motion-reduce:animate-none";
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{t("overview.loading")}</span>
      <div className="flex flex-col gap-2.5" aria-hidden="true">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-white/80 motion-reduce:animate-none" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-white/60 motion-reduce:animate-none" />
      </div>
      <div className={`h-28 ${block}`} aria-hidden="true" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]" aria-hidden="true">
        <div className={`h-48 ${block}`} />
        <div className={`h-48 ${block}`} />
        <div className={`h-48 ${block}`} />
      </div>
    </div>
  );
}
