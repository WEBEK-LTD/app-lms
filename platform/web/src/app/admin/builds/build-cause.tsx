import { adminFailureDetail } from "@/lib/builds/failures";
import type { Build } from "@/lib/data/types";

/**
 * 151 The admin's technical cause of a build: the reason code and stage, what
 * it means (GitHub had no macOS runner…), and what the build printed. The
 * client sees the cause in plain words only (lib/builds/failures.ts).
 */
export function BuildCause({ build }: { build: Pick<Build, "failure"> }) {
  const detail = adminFailureDetail(build);
  if (!detail) return null;
  return (
    <span className="mt-1 block max-w-[320px] text-xs" data-build-cause={build.failure?.code}>
      <span className="font-semibold">Cause: </span>
      <span className="text-muted">{detail}</span>
      {build.failure?.log ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-muted">What the build printed</summary>
          <pre dir="ltr" className="m-0 mt-1 max-h-[240px] overflow-auto rounded-lg bg-midnight p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-white">
            {build.failure.log}
          </pre>
        </details>
      ) : null}
    </span>
  );
}
