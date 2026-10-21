import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { requestAccountDeletion } from "@/lib/account/deletion";
import { carryOutAccountDeletion, type AccountPurgeDeps } from "@/lib/account/purge";
import { deleteApp, restoreApp, runAppPurges } from "@/lib/apps/deletion";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { hashLicenseKey } from "@/lib/license/key";
import { fakeFiles, PASSWORD, seedAccount } from "./phase73-fixtures";

/**
 * 73 Deleted apps and deleted accounts on MySQL or MariaDB (migration 0051):
 * a deleted app and its license are left out of every read; of two
 * deletions at once one wins; restoring brings it back; the purge deletes
 * the app's rows by cascade while its plan payments stay; deleting an
 * account keeps its billing records in `kept_billing_records` while the
 * client's payments go with it, and another account is untouched.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-21T09:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe.skipIf(!url)("73 deleted apps and accounts on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("leaves a deleted app out of every read, restores it, and purges it with its rows while its payments stay", async () => {
    const seed = await seedAccount(store, NOW);
    const asker = { user: seed.user, staff: null, member: null, client: seed.client };
    // Two deletions at the same moment: one wins.
    const both = await Promise.all([
      deleteApp({ store, now: NOW }, asker, { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD }),
      deleteApp({ store, now: NOW }, asker, { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD }),
    ]);
    expect(both.filter((r) => r.ok)).toHaveLength(1);
    const won = both.find((r) => r.ok);
    if (!won?.ok) throw new Error("not deleted");
    const deletion = won.deletion;

    expect(await store.getAppById(seed.appA.id)).toBeNull();
    expect((await store.listAppsByClient(seed.client.id)).map((a) => a.id)).toEqual([seed.appB.id]);
    expect((await store.listApps()).some((a) => a.id === seed.appA.id)).toBe(false);
    expect(await store.getLicenseByHash(hashLicenseKey(seed.licenseKey))).toBeNull();
    expect(await store.getLicenseForApp(seed.client.id, seed.appA.id)).toBeNull();
    expect(await store.listLicensesByClient(seed.client.id)).toEqual([]);
    expect((await store.listLicenses()).some((l) => l.id === seed.license.id)).toBe(false);
    const row = (await store.listClients({ filter: "all", query: seed.user.email, now: NOW }))[0];
    expect(row?.apps.map((a) => a.app?.id)).toEqual([seed.appB.id]);
    expect(row?.license).toBeNull();
    // An update to a deleted app changes nothing.
    await store.updateApp(seed.appA.id, { appName: "Changed" }, NOW);
    expect((await store.getAppIncludingDeleted(seed.appA.id))?.appName).toBe("Ada Academy");
    expect((await store.listAppDeletions({ statuses: ["waiting"], clientId: seed.client.id, limit: 10 })).map((d) => d.id)).toEqual([deletion.id]);

    // Restored as it was.
    const twice = await Promise.all([restoreApp({ store, now: day(1) }, deletion.id, "a@yallapp.test"), restoreApp({ store, now: day(1) }, deletion.id, "b@yallapp.test")]);
    expect(twice.filter(Boolean)).toHaveLength(1);
    expect(await store.getAppById(seed.appA.id)).toMatchObject({ appName: "Ada Academy", deletedAt: null, deletedBy: null });
    expect((await store.getLicenseByHash(hashLicenseKey(seed.licenseKey)))?.id).toBe(seed.license.id);

    // Deleted again, then purged after its 7 days.
    const again = await deleteApp({ store, now: day(2) }, asker, { app: seed.appA, shownName: "Ada Academy", name: "Ada Academy", password: PASSWORD });
    if (!again.ok) throw new Error("not deleted again");
    expect(await store.getAppDeletion(deletion.id)).toMatchObject({ status: "restored" });
    const { deps, calls } = fakeFiles(store, day(10));
    expect(await store.listDueAppDeletions(day(10), 500)).toContainEqual(expect.objectContaining({ id: again.deletion.id }));
    const report = await runAppPurges(deps, 500);
    expect(report.failed).toBe(0);
    expect(calls.mediaApps).toContain(seed.appA.id);
    expect(calls.blobs).toEqual([seed.assets.icon.blobKey]);
    expect(await store.getAppIncludingDeleted(seed.appA.id)).toBeNull();
    expect(await store.getLicenseById(seed.license.id)).toBeNull();
    expect(await store.listBuildsByApp(seed.appA.id, 10)).toEqual([]);
    expect(await store.getHostedUser(seed.appA.id, seed.customer.id)).toBeNull();
    expect(await store.listMediaFiles(seed.appA.id, { limit: 10 })).toEqual([]);
    expect(await store.getAsset(seed.assets.icon.id)).toBeNull();
    expect(await store.getAsset(seed.assets.shared.id)).not.toBeNull();
    const payments = await store.listPlanPayments({ clientId: seed.client.id, limit: 10 });
    expect(payments).toEqual([expect.objectContaining({ id: seed.payment.id, appId: null, status: "paid", amountCents: 150_000 })]);
    expect(await store.getAppDeletion(again.deletion.id)).toMatchObject({ status: "purged", closedBy: "daily job", pendingBuilds: [] });
    expect(await store.getAppById(seed.appB.id)).toMatchObject({ appName: "Ada Shop" });
  });

  it("deletes an account with its rows and keeps its billing records; another account is untouched", async () => {
    const seed = await seedAccount(store, NOW);
    const other = await seedAccount(store, NOW);
    const asked = await requestAccountDeletion(
      { store, now: NOW, mail: async () => undefined, teamEmail: "info@yallapp.test", baseUrl: "https://yallapp.test" },
      { user: seed.user, staff: null, member: null, client: seed.client, apps: [seed.appA, seed.appB], licenses: [seed.license] },
      { password: PASSWORD, confirmEmail: seed.user.email, reason: "", lang: "ar" },
    );
    if (!asked.ok) throw new Error("not asked");
    // One of its apps was deleted by the owner first and waits.
    await deleteApp({ store, now: NOW }, { user: seed.user, staff: null, member: null, client: seed.client }, { app: seed.appB, shownName: "Ada Shop", name: "Ada Shop", password: PASSWORD });
    const sent: string[] = [];
    const deps: AccountPurgeDeps = {
      ...fakeFiles(store, day(7)).deps,
      mail: async (key, to, _values, lang) => void sent.push(`${key} ${to} ${lang}`),
      receipt: async (payment) => ({ title: "Receipt", numberLine: `No. ${payment.id}`, items: [{ name: "Growth", amount: "EGP 1,500" }] }) as never,
    };
    expect(await carryOutAccountDeletion(deps, asked.request.id, "daily job")).toMatchObject({ ok: true, kept: 1, apps: 2 });

    // The payments went with the client (on delete cascade)…
    expect(await store.listPlanPayments({ clientId: seed.client.id, limit: 10 })).toEqual([]);
    // …and their record stays, with who paid and the receipt.
    const kept = await store.getKeptBillingRecord(seed.payment.id);
    expect(kept).toMatchObject({
      clientId: seed.client.id,
      userId: seed.user.id,
      appId: seed.appA.id,
      buyerName: "Ada",
      buyerEmail: seed.user.email,
      buyerWhatsapp: "+201001234567",
      buyerCountry: "EG",
      amountCents: 150_000,
      currency: "EGP",
      status: "paid",
      paidAt: NOW,
      receipt: { numberLine: `No. ${seed.payment.id}`, items: [{ amount: "EGP 1,500" }] },
      details: { appName: "Ada Academy", payment: { providerRef: "ref-1", paymentProvider: "kashier" }, coupon: null },
    });
    expect((await store.listKeptBillingRecords({ clientId: seed.client.id, limit: 10 })).map((r) => r.id)).toEqual([seed.payment.id]);
    // Keeping them twice replaces them.
    await store.keepBillingRecords([{ ...kept!, keptAt: day(8) }]);
    expect((await store.getKeptBillingRecord(seed.payment.id))?.keptAt).toEqual(day(8));

    expect(await store.getUserById(seed.user.id)).toBeNull();
    expect(await store.getClientById(seed.client.id)).toBeNull();
    expect(await store.getAppIncludingDeleted(seed.appA.id)).toBeNull();
    expect(await store.getAppIncludingDeleted(seed.appB.id)).toBeNull();
    expect(await store.getLicenseById(seed.license.id)).toBeNull();
    expect(await store.listAssetsByClient(seed.client.id)).toEqual([]);
    expect(await store.deleteUserSessions(seed.user.id)).toBe(0);
    expect(await store.getTeamMember(seed.client.id, seed.teammate.id)).toBeNull();
    expect(await store.getUserById(seed.teammate.id)).not.toBeNull();
    expect(await store.getAccountDeletionRequest(asked.request.id)).toMatchObject({ status: "done", closedBy: "daily job" });
    const records = await store.listAppDeletions({ statuses: [], clientId: seed.client.id, limit: 10 });
    expect(records.map((r) => `${r.appName} ${r.status} ${r.reason}`).sort()).toEqual(["Ada Academy purged account", "Ada Shop purged owner"]);
    expect(sent).toEqual([`account_deletion_done ${seed.user.email} ar`]);

    // The other account is as it was.
    expect(await store.getUserById(other.user.id)).not.toBeNull();
    expect(await store.getAppById(other.appA.id)).not.toBeNull();
    expect(await store.listPlanPayments({ clientId: other.client.id, limit: 10 })).toHaveLength(1);
    expect((await store.getLicenseByHash(hashLicenseKey(other.licenseKey)))?.id).toBe(other.license.id);
    expect(await store.deleteUserAccount(randomUUID())).toBe(false);
  });
});
