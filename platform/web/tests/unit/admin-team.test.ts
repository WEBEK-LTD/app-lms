import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditChanges, recordAudit, redactSecrets, REDACTED } from "@/lib/admin/audit";
import { ADMIN_PERMISSIONS, ADMIN_ROLES, can, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";
import { adminRoleOf, listTeam } from "@/lib/admin/team";
import { MemoryStore } from "@/lib/data/memory";
import { NOW, days } from "./helpers";

describe("admin roles", () => {
  // The whole matrix, so a change to a role is a deliberate change here too.
  const MATRIX: Record<AdminRole, AdminPermission[]> = {
    owner: [...ADMIN_PERMISSIONS],
    admin: ADMIN_PERMISSIONS.filter((p) => p !== "team.manage"),
    support: ["view", "clients.license", "clients.edit", "clients.email", "builds.manage"],
    viewer: ["view"],
  };

  it.each(ADMIN_ROLES)("%s may do exactly what the matrix says", (role) => {
    for (const permission of ADMIN_PERMISSIONS) {
      expect(can(role, permission), `${role} ${permission}`).toBe(MATRIX[role].includes(permission));
    }
  });

  it("support can activate clients but can't touch prices, payments, settings or releases", () => {
    expect(can("support", "clients.license")).toBe(true);
    for (const p of ["plans.edit", "payments.manage", "settings.edit", "releases.manage", "switches.edit", "team.manage", "clients.suspend"] as const) {
      expect(can("support", p)).toBe(false);
    }
  });

  it("no role may do nothing", () => {
    expect(can(null, "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
  });
});

describe("admin team", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    vi.stubEnv("SUPER_ADMIN_EMAILS", "boss@yallapp.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("makes SUPER_ADMIN_EMAILS owners and reads everyone else's role from the database", async () => {
    const boss = await store.createUser({ email: "Boss@yallapp.test", name: "Boss", passwordHash: "x", now: NOW });
    const helper = await store.createUser({ email: "help@yallapp.test", name: "Helper", passwordHash: null, now: NOW });
    const stranger = await store.createUser({ email: "someone@else.test", name: "Someone", passwordHash: "x", now: NOW });
    await store.saveAdminMember({ userId: helper.id, role: "support", addedBy: boss.email, addedAt: NOW, updatedAt: NOW });

    expect(await adminRoleOf(store, boss)).toBe("owner");
    expect(await adminRoleOf(store, helper)).toBe("support");
    expect(await adminRoleOf(store, stranger)).toBeNull();

    const team = await listTeam(store);
    expect(team.map((m) => [m.email, m.role, m.bootstrap, m.invited])).toEqual([
      ["boss@yallapp.test", "owner", true, false],
      ["help@yallapp.test", "support", false, true],
    ]);

    await store.saveAdminMember({ userId: helper.id, role: "viewer", addedBy: boss.email, addedAt: NOW, updatedAt: days(1) });
    expect(await adminRoleOf(store, helper)).toBe("viewer");
    await store.deleteAdminMember(helper.id);
    expect(await adminRoleOf(store, helper)).toBeNull();
  });
});

describe("audit log", () => {
  it("never keeps secret values", () => {
    const redacted = redactSecrets({
      kind: "whatsapp",
      accessTokenEncrypted: "v1:abc",
      phoneNumberId: "123456",
      nested: { apiKey: "live-key", secretKey: "live-secret", sandbox: true, password: "p", passEncrypted: null },
      list: [{ storefrontToken: "shpat_1" }],
      reviewCode: "246810",
      keyHash: "deadbeef",
      when: NOW,
    });
    expect(redacted).toEqual({
      kind: "whatsapp",
      accessTokenEncrypted: REDACTED,
      phoneNumberId: "123456",
      nested: { apiKey: REDACTED, secretKey: REDACTED, sandbox: true, password: REDACTED, passEncrypted: null },
      list: [{ storefrontToken: REDACTED }],
      reviewCode: REDACTED,
      keyHash: REDACTED,
      when: NOW.toISOString(),
    });
    expect(JSON.stringify(redacted)).not.toMatch(/live-key|live-secret|shpat_1|abc|246810/);
  });

  it("keeps only the fields that changed, and says a secret changed without its value", () => {
    expect(
      auditChanges(
        { host: "mail.a.test", port: 465, passEncrypted: "v1:old", from: "a@a.test" },
        { host: "mail.b.test", port: 465, passEncrypted: "v1:new", from: "a@a.test" },
      ),
    ).toEqual({ before: { host: "mail.a.test", passEncrypted: REDACTED }, after: { host: "mail.b.test", passEncrypted: REDACTED } });
    expect(auditChanges({ a: 1 }, { a: 1 })).toBeNull();
    expect(auditChanges(null, { commissionPercent: 8 })).toEqual({ before: null, after: { commissionPercent: 8 } });
    expect(auditChanges(undefined, undefined)).toBeNull();
  });

  it("records entries and finds them by who, what, target, client and date", async () => {
    const store = new MemoryStore();
    const owner = { id: "u-1", email: "boss@yallapp.test" };
    const support = { id: "u-2", email: "help@yallapp.test" };
    await recordAudit(
      { actor: owner, action: "plan.save", target: { type: "plan", id: "pro" }, summary: "Saved Pro", before: { priceCents: 1 }, after: { priceCents: 2 } },
      { store, now: days(-2) },
    );
    await recordAudit(
      { actor: support, action: "client.activate", target: { type: "client", id: "c-1" }, clientId: "c-1", summary: "Activated Ada" },
      { store, now: days(-1) },
    );
    await recordAudit(
      {
        actor: support,
        action: "settings.save",
        target: { type: "setting", id: "iyzico" },
        summary: "Saved iyzico",
        after: { apiKeyEncrypted: "v1:secret-value", sandbox: true },
      },
      { store, now: NOW },
    );

    const all = await store.listAuditEntries({ offset: 0, limit: 10 });
    expect(all.total).toBe(3);
    expect(all.items.map((e) => e.action)).toEqual(["settings.save", "client.activate", "plan.save"]);
    expect(JSON.stringify(all.items)).not.toContain("secret-value");
    expect(all.items[2]!.changes).toEqual({ before: { priceCents: 1 }, after: { priceCents: 2 } });

    expect((await store.listAuditEntries({ actor: "help@", offset: 0, limit: 10 })).total).toBe(2);
    expect((await store.listAuditEntries({ action: "plan.save", offset: 0, limit: 10 })).items[0]!.summary).toBe("Saved Pro");
    expect((await store.listAuditEntries({ targetType: "client", targetId: "c-1", offset: 0, limit: 10 })).total).toBe(1);
    expect((await store.listAuditEntries({ clientId: "c-1", offset: 0, limit: 10 })).total).toBe(1);
    expect((await store.listAuditEntries({ from: days(-1), to: NOW, offset: 0, limit: 10 })).items.map((e) => e.action)).toEqual(["client.activate"]);
    const paged = await store.listAuditEntries({ offset: 1, limit: 1 });
    expect(paged).toMatchObject({ total: 3, items: [{ action: "client.activate" }] });
  });

  it("doesn't throw when the log can't be written", async () => {
    const store = new MemoryStore();
    vi.spyOn(store, "createAuditEntry").mockRejectedValue(new Error("down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await recordAudit({ actor: { id: "u", email: "a@b.test" }, action: "plan.reset", target: { type: "plan" }, summary: "x" }, { store })).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
