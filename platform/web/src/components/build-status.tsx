import type { BuildStages as Stages, BuildStatus, StageKey, StageStatus } from "@/lib/data/types";
import type { Lang } from "@/i18n/config";
import { getDashT, knownTranslator, type DashKey } from "@/i18n/dashboard";
import { BUILD_STATUS_LABEL } from "@/lib/builds/view";
import { Badge } from "./ui";
import { Icon } from "./icon";

export { BUILD_STATUS_LABEL };

/** 56 The admin passes no language: English. */
export function BuildBadge({ status, lang = "en" }: { status: BuildStatus; lang?: Lang }) {
  const tone = status === "ready" ? "success" : status === "failed" ? "danger" : status === "building" ? "warn" : "neutral";
  return <Badge tone={tone}>{knownTranslator(lang)(BUILD_STATUS_LABEL[status])}</Badge>;
}

export function BuildStatusText({ status, lang = "en" }: { status: BuildStatus; lang?: Lang }) {
  const color = status === "ready" ? "text-success" : status === "failed" ? "text-danger" : status === "building" ? "text-warn" : "text-muted";
  return <span className={`font-bold ${color}`}>{knownTranslator(lang)(BUILD_STATUS_LABEL[status])}</span>;
}

const STAGE_LABEL: Record<StageKey, DashKey> = {
  queued: "overview.stageQueued",
  android: "overview.stageAndroid",
  ios: "overview.stageIos",
  upload_play: "overview.stagePlay",
  upload_testflight: "overview.stageTestflight",
  upload_galaxy: "overview.stageGalaxy",
  upload_appgallery: "overview.stageAppgallery",
  upload_xiaomi: "overview.stageXiaomi",
};

const ORDER: StageKey[] = ["queued", "android", "ios", "upload_play", "upload_testflight", "upload_galaxy", "upload_appgallery", "upload_xiaomi"];

/** 132.141 A build's status as the premium kit's pill tones. */
export const BUILD_TONE: Record<BuildStatus, "success" | "danger" | "warn" | "neutral"> = { ready: "success", failed: "danger", building: "warn", queued: "neutral" };

const STAGE_PILL: Record<StageStatus, string> = {
  done: "bg-success-bg font-bold text-success",
  running: "bg-(--sp-surface) font-bold text-(--sp-ink) ring-1 ring-(--sp-ink)",
  failed: "bg-danger-bg font-bold text-danger",
  pending: "bg-(--sp-soft) text-(--sp-muted)",
  skipped: "",
};

/** The stages of a build: tiles (the admin), or 132.141 small pills on one line (the premium kit). */
export function BuildStages({ stages, lang = "en", look = "tiles" }: { stages: Stages; lang?: Lang; look?: "tiles" | "pills" }) {
  const t = getDashT(lang);
  if (look === "pills") {
    return (
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
        {ORDER.filter((key) => stages[key] !== undefined && stages[key] !== "skipped").map((key) => {
          const status = stages[key]!;
          return (
            <li key={key} aria-current={status === "running" ? "step" : undefined} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${STAGE_PILL[status]}`}>
              {status === "done" ? <Icon name="check" size={16} /> : null}
              {status === "running" ? <Icon name="progress_activity" size={16} className="animate-spin" /> : null}
              {status === "failed" ? <Icon name="error" size={16} /> : null}
              {status === "pending" ? <Icon name="radio_button_unchecked" size={16} /> : null}
              <span>
                {t(STAGE_LABEL[key])}
                <span className="sr-only">
                  {" "}
                  ({t(status === "done" ? "overview.stageDone" : status === "running" ? "overview.stageRunning" : status === "failed" ? "overview.stageFailed" : "overview.stageWaiting")})
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }
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
              {t(STAGE_LABEL[key])}
              <span className="sr-only">
                {" "}
                ({t(status === "done" ? "overview.stageDone" : status === "running" ? "overview.stageRunning" : status === "failed" ? "overview.stageFailed" : "overview.stageWaiting")})
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
