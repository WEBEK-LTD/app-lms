import { describe, expect, it } from "vitest";
import { problemsOf, type ProblemsInput } from "@/lib/app/problems";
import type { Integration } from "@/lib/integrations";
import type { PublishingRequest } from "@/lib/data/types";

/** 93.3 What needs the owner now, in one list. */

const NOW = new Date("2026-10-26T10:00:00Z");
const none: ProblemsInput = { integrations: [], latest: null, request: null, ready: null, stability: null, now: NOW };
const row = (key: Integration["key"], state: Integration["state"]): Integration =>
  ({ key, state, reason: "", subject: null, at: null, testable: true, href: "/dashboard/integrations", lastCheck: null, errors: [] }) as Integration;

describe("93.3 the app's problems", () => {
  it("are none for an app where all is well", () => {
    expect(problemsOf(none)).toEqual([]);
    expect(problemsOf({ ...none, integrations: [row("website", "connected"), row("payments", "not_set"), row("push", "waiting")], latest: { number: 3, status: "ready", createdAt: NOW, updatedAt: NOW } })).toEqual([]);
  });

  it("list each connection that stopped, the build that didn't finish, a store's no and what the stores miss, with where to fix it", () => {
    const request = { android: { status: "rejected" }, ios: { status: "in_review" } } as unknown as PublishingRequest;
    const problems = problemsOf({
      ...none,
      integrations: [row("website", "problem"), row("push", "connected"), row("payments", "problem")],
      latest: { number: 7, status: "failed", createdAt: NOW, updatedAt: NOW },
      request,
      ready: [
        { key: "privacy", state: "missing", text: "privacyMissing" },
        { key: "listing", state: "ok", text: "listingOk" },
      ],
      stability: { crashFree: 97.5, sessions: 400 },
    });
    expect(problems.map((p) => [p.kind, p.subject, p.href])).toEqual([
      ["integration", "website", "/dashboard/integrations"],
      ["integration", "payments", "/dashboard/integrations"],
      ["build", "7", "/dashboard/builds"],
      ["rejected", "android", "/dashboard/publishing"],
      ["store_checks", "1", "/dashboard/publishing#h-ready"],
      ["crashes", "97.5", "/dashboard/stability"],
    ]);
  });

  it("count a build that stopped, and crashes only over enough sessions", () => {
    const old = new Date(NOW.getTime() - 3 * 86_400_000);
    expect(problemsOf({ ...none, latest: { number: 2, status: "queued", createdAt: old, updatedAt: old } })).toEqual([{ kind: "build_stalled", subject: "2", href: "/dashboard/builds" }]);
    expect(problemsOf({ ...none, latest: { number: 2, status: "building", createdAt: NOW, updatedAt: NOW } })).toEqual([]);
    expect(problemsOf({ ...none, stability: { crashFree: 90, sessions: 20 } })).toEqual([]);
    expect(problemsOf({ ...none, stability: { crashFree: 99.2, sessions: 2000 } })).toEqual([]);
  });
});
