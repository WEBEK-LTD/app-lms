import { describe, expect, it } from "vitest";
import { FAILURE_TEXT, failureExplanation } from "@/lib/builds/failures";
import { applyPipelineStatus, pipelineStatusSchema } from "@/lib/builds/pipeline";
import { failureReason } from "@/lib/builds/view";
import { MemoryStore } from "@/lib/data/memory";
import { FAILURE_CODES, type Build } from "@/lib/data/types";
import { getDashT } from "@/i18n/dashboard";
import { knownTranslator } from "@/i18n/dashboard";
import { NOW } from "./helpers";

const build = (patch: Partial<Build> = {}): Build => ({
  id: "0f8e5a52-6c1b-4c39-9d7e-5b0c0e9a1a11",
  clientId: "c1",
  appId: "a1",
  number: 3,
  versionName: "1.0.2",
  versionCode: 3,
  status: "building",
  stages: { queued: "done", android: "running", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
  config: {} as Build["config"],
  storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
  autoPublish: false,
  artifacts: [],
  message: null,
  logUrl: null,
  createdAt: NOW,
  startedAt: NOW,
  finishedAt: null,
  updatedAt: NOW,
  ...patch,
});

describe("87.2 why a build failed", () => {
  it("takes the pipeline's diagnosis and keeps it on the build", async () => {
    const store = new MemoryStore();
    const b = build();
    await store.createBuild(b, { exclusive: false } as never).catch(() => undefined);
    const update = pipelineStatusSchema.parse({ status: "failed", stages: { android: "failed" }, message: "The Android app couldn't be built.", failure: { code: "firebase_android", stage: "android", log: "> No matching client found…" } });
    const applied = await applyPipelineStatus(store, b, update, NOW);
    expect(applied.ok && applied.build.failure).toEqual({ code: "firebase_android", stage: "android", log: "> No matching client found…" });
    // An unknown code, an unknown field or a log too long is refused.
    expect(pipelineStatusSchema.safeParse({ failure: { code: "gremlins" } }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({ failure: { code: "icon", extra: 1 } }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({ failure: { code: "icon", log: "x".repeat(20_001) } }).success).toBe(false);
  });

  it("says what happened and what to do, in the client's words; unknown keeps the pipeline's message", () => {
    const failed = build({ status: "failed", stages: { ...build().stages, android: "failed" }, message: "The Android app couldn't be built." });
    expect(failureReason({ ...failed, failure: { code: "version_used" } })).toBe(FAILURE_TEXT.version_used.text);
    expect(failureExplanation({ failure: { code: "play_app_missing" } })?.link).toBe("/dashboard/publishing");
    expect(failureReason({ ...failed, failure: { code: "unknown" } })).toBe("The Android app couldn't be built.");
    expect(failureReason(failed)).toBe("The Android app couldn't be built.");
  });

  it("has every explanation in Arabic and Turkish", () => {
    for (const lang of ["ar", "tr"] as const) {
      const known = knownTranslator(lang);
      for (const code of FAILURE_CODES) {
        if (code === "unknown") continue;
        const text = FAILURE_TEXT[code].text;
        expect(known(text), `${lang} ${code}`).not.toBe(text);
      }
      expect(getDashT(lang)("builds.failureLog")).not.toBe(getDashT("en")("builds.failureLog"));
    }
  });
});
