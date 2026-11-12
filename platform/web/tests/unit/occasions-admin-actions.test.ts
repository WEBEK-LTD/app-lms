import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { AUDIT_ACTIONS, AUDIT_TARGETS } from "@/lib/admin/audit-actions";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { MemoryStore } from "@/lib/data/memory";
import { occasionsOf } from "@/lib/occasions/store";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/** 124 Admin › Occasions' actions and pages: who may change occasions, the forms, and what the list shows. */

const state: { store: MemoryStore; role: AdminRole } = { store: new MemoryStore(), role: "admin" };
type Entry = { action: string; target: { type: string; id: unknown }; summary: string };
const audit = vi.fn<(entry: Entry) => Promise<null>>(async () => null);

class Redirected extends Error {
  constructor(readonly url: string) {
    super(`redirect ${url}`);
  }
}

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(async (permission = "view") => {
    if (!can(state.role, permission)) throw new Redirected(`/admin?denied=${permission}`);
    return { id: "u-admin", email: "team@yallapp.test", name: "Team", adminRole: state.role };
  }),
}));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: (entry: Entry) => audit(entry) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirected(url);
  },
  notFound: () => {
    throw new Redirected("not-found");
  },
}));

const { createOccasionAction, updateOccasionAction, deleteOccasionAction } = await import("@/app/actions/admin-occasions");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const BLACK_FRIDAY = { template: "black_friday", year: "2026", name: "Black Friday 2026", startsOn: "2026-11-01", endsOn: "2026-11-30", percent: "50", couponCode: "blackfriday50", plans: "all", active: "on" };

beforeEach(() => {
  state.store = new MemoryStore();
  state.role = "admin";
  audit.mockClear();
  clearPlatformSettingsCache();
});

describe("124 Admin › Occasions actions", () => {
  it("lets those who edit plans change occasions; support and viewers only see them", async () => {
    expect((["owner", "admin", "support", "viewer"] as const).map((role) => can(role, "plans.edit"))).toEqual([true, true, false, false]);
    state.role = "support";
    await expect(createOccasionAction({}, form(BLACK_FRIDAY))).rejects.toThrow("redirect /admin?denied=plans.edit");
    expect(await state.store.listCoupons()).toEqual([]);
  });

  it("creates, saves and deletes from the forms, with their errors", async () => {
    const created = await createOccasionAction({}, form(BLACK_FRIDAY)).catch((e: unknown) => e);
    expect(created).toBeInstanceOf(Redirected);
    const [occasion] = await occasionsOf(state.store, { fresh: true });
    expect((created as Redirected).url).toBe(`/admin/occasions/${occasion!.id}?done=created`);
    expect(occasion).toMatchObject({ couponCode: "BLACKFRIDAY50", percent: 50, plans: "all", active: true });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "occasion.create", target: { type: "occasion", id: occasion!.id } }));

    const wrong = await updateOccasionAction({}, form({ ...BLACK_FRIDAY, id: occasion!.id, percent: "95", endsOn: "2026-10-01" }));
    expect(Object.keys(wrong.errors ?? {}).sort()).toEqual(["endsOn", "percent"]);
    expect(wrong.values?.percent).toBe("95");

    const saved = await updateOccasionAction({}, form({ ...BLACK_FRIDAY, id: occasion!.id, endsOn: "2026-12-06", plans: "regular" }));
    expect(saved).toMatchObject({ ok: true, message: "Black Friday 2026 saved. Its coupon BLACKFRIDAY50 is updated." });
    expect((await state.store.getCoupon(occasion!.couponId!))?.plans).toEqual(["starter", "growth", "pro", "business"]);

    await expect(deleteOccasionAction({}, form({ id: occasion!.id }))).rejects.toThrow("redirect /admin/occasions?done=deleted");
    expect((await state.store.getCoupon(occasion!.couponId!))?.active).toBe(false);
    expect(await deleteOccasionAction({}, form({ id: occasion!.id }))).toEqual({ message: "This occasion no longer exists." });
  });

  it("lists each occasion with its days, code, plans, state and page, and opens its form", async () => {
    await createOccasionAction({}, form(BLACK_FRIDAY)).catch(() => null);
    const [occasion] = await occasionsOf(state.store, { fresh: true });
    const { default: ListPage } = await import("@/app/admin/occasions/page");
    const { default: EditPage } = await import("@/app/admin/occasions/[id]/page");
    const { default: NewPage } = await import("@/app/admin/occasions/new/page");
    const html = async (page: (props: never) => Promise<ReactElement>, params: Record<string, string> = {}) =>
      renderToStaticMarkup(await page({ searchParams: Promise.resolve({}), params: Promise.resolve(params) } as never));

    const list = await html(ListPage);
    for (const text of ["Black Friday 2026", "1–30 November 2026", "50% off", "BLACKFRIDAY50", "All plans", 'href="/black-friday"', `href="/admin/coupons/${occasion!.couponId}"`, "New occasion"]) {
      expect(list).toContain(text);
    }
    expect(list).toMatch(/On now, \d+ days? left|Upcoming|Ended/);

    const edit = await html(EditPage, { id: occasion!.id });
    expect(edit).toContain('value="2026-11-30"');
    expect(edit).toContain("A new occasion copying this one, on 1–30 November 2027");
    expect(edit).toContain("Run it again next year");
    expect(edit).toContain("Delete occasion");
    expect(await html(NewPage)).toContain("Create occasion");

    state.role = "viewer";
    expect(await html(EditPage, { id: occasion!.id })).toContain("Your role can see this but not change occasions.");
    expect(await html(ListPage)).not.toContain("New occasion");
  });

  it("has audit labels, and a place in the admin's menu next to Coupons with an icon of the set", () => {
    for (const action of ["occasion.create", "occasion.update", "occasion.next_year", "occasion.delete"]) expect(AUDIT_ACTIONS).toHaveProperty([action]);
    expect(AUDIT_TARGETS).toMatchObject({ occasion: "Occasion" });
    const layout = readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");
    expect(layout).toMatch(/"\/admin\/coupons".*\n.*\n\s*\{ href: "\/admin\/occasions", label: "Occasions", icon: "event" \}/);
    expect(ICON_NAMES).toContain("event");
  });
});
