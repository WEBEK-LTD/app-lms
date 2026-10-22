import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/admin/timeline";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { AppError, Build, OwnerNotice, PlanPayment } from "@/lib/data/types";
import { errorOfBody, noteAppError } from "@/lib/watch/app-errors";
import { appErrorsStoreSuite } from "./app-errors-store-suite";
import { setupClient } from "./helpers";
import { newApp } from "@/lib/app/setup";

/** 78.4 Errors per app (what, when, how often) and the client's timeline in the admin. */

const NOW = new Date("2026-10-22T12:00:00.000Z");
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

describe("78.4 errors per app on the memory store", () => {
  const store = new MemoryStore();
  appErrorsStoreSuite(() => store);
});

describe("78.4 noting an error", () => {
  it("keeps codes and messages short and plain, and never throws", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app = newApp(client.id, null, NOW);
    await store.createApp(app);
    await noteAppError(store, { clientId: client.id, appId: app.id, source: "server", code: "unhandled: /store/products?x=1", detail: `  line one\n  line two ${"x".repeat(600)}` }, NOW);
    const [error] = await store.listAppErrors({ appId: app.id, limit: 1 });
    expect(error!.code).toBe("unhandled:_/store/products_x_1".replace(/\//g, "_"));
    expect(error!.message.startsWith("line one line two x")).toBe(true);
    expect(error!.message).toHaveLength(500);
    const broken = { recordAppError: async () => Promise.reject(new Error("db down")) } as unknown as DataStore;
    await expect(noteAppError(broken, { clientId: "c", appId: null, source: "push", code: "x", detail: "y" })).resolves.toBeUndefined();
  });

  it("reads a hosted API answer's code", () => {
    expect(errorOfBody({ code: "shop_unavailable", message: "The shop can't be reached." })).toEqual({ code: "shop_unavailable", message: "The shop can't be reached." });
    expect(errorOfBody({ code: "lms_unavailable" })).toEqual({ code: "lms_unavailable", message: "lms_unavailable" });
    expect(errorOfBody("text")).toBeNull();
    expect(errorOfBody({ items: [] })).toBeNull();
  });
});

describe("78.4 the client's timeline", () => {
  it("puts builds, errors, notices, payments, milestones, store statuses and the team's changes in one list, newest first", () => {
    const build = { appId: "a1", number: 3, versionName: "1.0.2", status: "failed", message: "The Android app couldn't be built.", createdAt: at(1), finishedAt: at(2) } as Build;
    const ready = { appId: "a1", number: 2, versionName: "1.0.1", status: "ready", message: null, createdAt: at(-5), finishedAt: at(-4) } as Build;
    const error: AppError = { id: "e1", clientId: "c", appId: "a1", source: "platform", code: "shop_unavailable", message: "GET /store/products: no answer", count: 7, firstAt: at(-3), lastAt: at(3) };
    const notice = { appId: "a1", title: "Your plan ends in 7 days", tone: "warn", createdAt: at(-1) } as OwnerNotice;
    const paid = { appId: "a1", plan: "growth", months: 12, amountCents: 480000, currency: "TRY", status: "paid", paidAt: at(-2), purpose: "plan" } as PlanPayment;
    const pending = { ...paid, status: "pending", paidAt: null } as PlanPayment;
    const items = buildTimeline({
      appNames: new Map([["a1", "Ada Academy"]]),
      builds: [build, ready],
      errors: [error],
      notices: [notice],
      payments: [paid, pending],
      milestones: [
        { clientId: "c", kind: "signed_up", ref: "", appId: null, at: at(-10), source: null },
        { clientId: "c", kind: "first_build", ref: "a1", appId: "a1", at: at(-5), source: null },
      ],
      publishing: [{ appId: "a1", events: [{ id: 1, appId: "a1", store: "android", status: "live", note: null, actorEmail: "t@y.test", at: at(0) }, { id: 2, appId: "a1", store: "mode", status: "managed", note: null, actorEmail: "o@y.test", at: at(0) }] }],
      audit: [{ id: 1, at: at(-6), actorId: null, actorEmail: "team@yallapp.test", action: "client.activate", targetType: "client", targetId: "c", clientId: "c", summary: "Activated on Growth", changes: null }],
    });
    expect(items.map((i) => [i.kind, i.title])).toEqual([
      ["error", "Connected platform: shop_unavailable"],
      ["build", "Build #3 didn't finish"],
      ["build", "Build #3 queued"],
      ["publishing", "android: live"],
      ["notice", "Owner told: Your plan ends in 7 days"],
      ["payment", "Plan paid: growth, a year"],
      ["build", "Build #2 ready"],
      ["build", "Build #2 queued"],
      ["audit", "Client activated"],
      ["milestone", "Signed up"],
    ]);
    expect(items[0]).toMatchObject({ app: "Ada Academy", tone: "bad", detail: "GET /store/products: no answer (7 times since 2026-10-22)" });
    expect(items[1]!.detail).toBe("The Android app couldn't be built.");
    expect(items[5]!.detail).toBe("₺4,800.00");
    expect(buildTimeline({ appNames: new Map(), builds: [build, ready], errors: [], notices: [], payments: [], milestones: [], publishing: [], audit: [] }, 2)).toHaveLength(2);
  });
});
