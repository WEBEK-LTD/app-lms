import type { BuildStages as Stages, BuildStatus, StageKey, StageStatus } from "@/lib/data/types";
import { BUILD_STATUS_LABEL } from "@/lib/builds/view";
import { Badge } from "./ui";
import { Icon } from "./icon";

export { BUILD_STATUS_LABEL };

export function BuildBadge({ status }: { status: BuildStatus }) {
  const tone = status === "ready" ? "success" : status === "failed" ? "danger" : status === "building" ? "warn" : "neutral";
  return <Badge tone={tone}>{BUILD_STATUS_LABEL[status]}</Badge>;
}

export function BuildStatusText({ status }: { status: BuildStatus }) {
  const color = status === "ready" ? "text-success" : status === "failed" ? "text-danger" : status === "building" ? "text-warn" : "text-muted";
  return <span className={`font-bold ${color}`}>{BUILD_STATUS_LABEL[status]}</span>;
}

const STAGE_LABEL: Record<StageKey, string> = {
  queued: "Queued",
  android: "Android build",
  ios: "iOS build",
  upload_play: "Upload to Google Play",
  upload_testflight: "Upload to TestFlight",
  upload_galaxy: "Upload to Galaxy Store",
  upload_appgallery: "Upload to AppGallery",
  upload_xiaomi: "Upload to Xiaomi GetApps",
};

const ORDER: StageKey[] = ["queued", "android", "ios", "upload_play", "upload_testflight", "upload_galaxy", "upload_appgallery", "upload_xiaomi"];

export function BuildStages({ stages }: { stages: Stages }) {
  return (
    <ol className="m-0 grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
      {/* 35, 36, 42 Builds queued before the Galaxy Store, AppGallery and Xiaomi GetApps stages don't have them. */}
      {ORDER.filter((key) => stages[key] !== undefined && stages[key] !== "skipped").map((key) => {
        const status = stages[key]!;
        const styles: Record<StageStatus, string> = {
          done: "bg-success-bg p-3.5",
          running: "border border-midnight bg-white p-[13px]",
          failed: "bg-danger-bg p-3.5",
          pending: "bg-ivory p-3.5",
          skipped: "",
        };
        return (
          <li key={key} aria-current={status === "running" ? "step" : undefined} className={`flex flex-col gap-2 rounded-xl ${styles[status]}`}>
            {status === "done" ? <Icon name="check" size={22} className="text-success" /> : null}
            {status === "running" ? <Icon name="progress_activity" size={22} className="animate-spin" /> : null}
            {status === "failed" ? <Icon name="error" size={22} className="text-danger" /> : null}
            {status === "pending" ? <Icon name="radio_button_unchecked" size={22} className="text-faint" /> : null}
            <span className={`text-sm ${status === "pending" ? "text-muted" : "font-bold"}`}>
              {STAGE_LABEL[key]}
              <span className="sr-only">
                {" "}
                ({status === "done" ? "done" : status === "running" ? "in progress" : status === "failed" ? "failed" : "waiting"})
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
