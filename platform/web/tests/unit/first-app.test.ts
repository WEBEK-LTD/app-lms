import { describe, expect, it } from "vitest";
import { firstAppGuide, type GuideInput } from "@/lib/app/first-app";
import type { ReadyItem } from "@/lib/publishing/readiness";

/** 93.1 The guide through the first app: from setup to the stores. */

const NONE = { "app-type": true, website: false, branding: false, listing: false, publishing: false };
const SETUP = { "app-type": true, website: true, branding: true, listing: true, publishing: true };
const start: GuideInput = { status: NONE, state: "pending", building: false, built: false, ready: null, publishingMode: null, live: false };
const states = (input: GuideInput) => firstAppGuide(input).steps.map((s) => `${s.key}:${s.state}`);

describe("93.1 the guide through the first app", () => {
  it("starts after the app type, the next step leading", () => {
    const guide = firstAppGuide(start);
    expect(guide).toMatchObject({ done: 1, total: 9, complete: false });
    expect(states(start)).toEqual(["app-type:done", "website:next", "branding:todo", "listing:todo", "publishing:todo", "activate:todo", "build:todo", "ready:todo", "live:todo"]);
    expect(guide.steps.find((s) => s.key === "website")!.href).toBe("/dashboard/setup?step=website");
    // Before choosing who publishes, the stores' checks aren't known yet.
    expect(guide.steps.find((s) => s.key === "ready")).toEqual({ key: "ready", state: "todo", href: "/dashboard/publishing" });
  });

  it("waits on a build running and on our team publishing, and counts what the stores still miss", () => {
    const missing: ReadyItem[] = [
      { key: "privacy", state: "missing", text: "privacyMissing" },
      { key: "screenshots", state: "missing", text: "shotsMissing" },
      { key: "deletion", state: "ok", text: "deletionOk" },
    ];
    const input: GuideInput = { status: SETUP, state: "active", building: true, built: false, ready: missing, publishingMode: "managed", live: false };
    expect(states(input)).toEqual([
      "app-type:done", "website:done", "branding:done", "listing:done", "publishing:done", "activate:done",
      "build:waiting", "ready:next", "live:waiting",
    ]);
    expect(firstAppGuide(input).steps.find((s) => s.key === "ready")).toEqual({ key: "ready", state: "next", href: "/dashboard/publishing#h-ready", missing: 2 });
  });

  it("is complete once a store shows the app", () => {
    const ready: ReadyItem[] = [{ key: "deletion", state: "ok", text: "deletionOk" }];
    const almost: GuideInput = { status: SETUP, state: "active", building: false, built: true, ready, publishingMode: "self", live: false };
    expect(states(almost).slice(-3)).toEqual(["build:done", "ready:done", "live:next"]);
    expect(firstAppGuide({ ...almost, live: true })).toMatchObject({ done: 9, complete: true });
    // An expired plan isn't an active one.
    expect(states({ ...almost, state: "expired" })[5]).toBe("activate:next");
  });
});
