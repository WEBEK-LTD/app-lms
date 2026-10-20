import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { OwnerNotice } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 60 A member limited to some apps closes only those apps' notices. */

const state = vi.hoisted(() => ({ store: null as unknown as MemoryStore }));

vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
}));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...real, clientFor: async () => ({ client: { id: "client-1" }, apps: [{ id: "app-a" }] }) };
});

const { dismissNoticeAction } = await import("@/app/actions/billing");

describe("60 closing a notice", () => {
  const notice = (appId: string): Omit<OwnerNotice, "id"> => ({
    clientId: "client-1",
    appId,
    kind: "app_users_80",
    dedupeKey: `app_users_80:${appId}`,
    title: "Users",
    body: "Almost full.",
    linkUrl: null,
    linkLabel: null,
    tone: "warn",
    createdAt: NOW,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
  const close = (id: number) => {
    const data = new FormData();
    data.set("id", String(id));
    return dismissNoticeAction(data);
  };

  beforeEach(() => {
    state.store = new MemoryStore();
  });

  it("closes its own apps' notices, never another app's", async () => {
    const mine = (await state.store.createOwnerNotice(notice("app-a")))!;
    const other = (await state.store.createOwnerNotice(notice("app-b")))!;
    await close(other.id);
    await close(mine.id);
    const open = await state.store.listOwnerNotices({ clientId: "client-1", open: true });
    expect(open.map((n) => n.id)).toEqual([other.id]);
  });
});
