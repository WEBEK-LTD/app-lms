import { randomBytes, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { activateClient, revealLicenseKey } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { keyContext } from "@/lib/builds/signing";
import { decrypt, encrypt, keyId, keyIdOf, withOldKeys } from "@/lib/crypto/encryption";
import { rekeyText } from "@/lib/crypto/rekey";
import { contextsFor } from "@/lib/jobs/rekey";
import type { DataStore } from "@/lib/data/store";
import type { RekeyCell } from "@/lib/data/types";

/**
 * 79.2 The store's side of the rekey job, the same on the memory store and on
 * MySQL or MariaDB: cells holding values of another key (a column, or a string
 * in a JSON column) are listed page by page with the row's strings, and
 * written back unless they changed. Only this test's rows are written: the
 * database is shared with the other tests.
 */

const NOW = new Date("2031-06-01T09:00:00.000Z");

export function rekeyStoreSuite(store: () => DataStore) {
  it("lists the cells of another key with their row's strings, and writes them back unless they changed", async () => {
    const s = store();
    const oldKey = randomBytes(32);
    const ring = withOldKeys(randomBytes(32), [oldKey]);
    const current = keyId(ring);

    const tag = randomUUID().slice(0, 8);
    const { client } = await registerClient(
      s,
      { name: "Rekey Academy", email: `rekey-${tag}@academy.test`, whatsapp: "+905446731942", siteUrl: `https://rekey-${tag}.test`, password: null },
      NOW,
    );
    const { license } = await activateClient(s, { clientId: client.id, plan: "growth", activeUntil: new Date(NOW.getTime() + 86_400_000), paymentNote: "test" }, oldKey, NOW);
    const app = newApp(client.id, null, NOW);
    const shopifyContext = `app:connector:${app.id}`;
    const storefront = encrypt("storefront", oldKey, shopifyContext);
    await s.createApp({
      ...app,
      googlePlayKeyEncrypted: encrypt('{"type":"service_account"}', oldKey, keyContext.googlePlay(app.id)),
      // Already on the current key: not listed.
      ascPrivateKeyEncrypted: encrypt("p8", ring, keyContext.appStore(app.id)),
      connector: { kind: "shopify", shopDomain: `rekey-${tag}.myshopify.com`, storefrontTokenEncrypted: storefront, adminTokenEncrypted: null },
    });

    // Every page, keeping this test's cells.
    const mine: RekeyCell[] = [];
    let after: string | null = null;
    let pages = 0;
    do {
      const page = await s.listCellsToRekey({ currentKeyId: current, after, limit: 5 });
      mine.push(...page.cells.filter((c) => c.candidates.includes(app.id) || c.candidates.includes(license.id)));
      after = page.next;
      pages++;
    } while (after !== null && pages < 10_000);
    expect(after).toBeNull();
    const texts = mine.map((c) => c.text);
    // MySQL: the connector's JSON; the memory store: the string inside it.
    expect(texts.some((t) => t.includes(storefront))).toBe(true);
    expect(texts).toContain(license.keyEncrypted);
    expect(mine.find((c) => c.text.startsWith("v2.") && c.text !== license.keyEncrypted)).toBeTruthy();
    expect(mine.some((c) => keyIdOf(c.text) === current)).toBe(false);
    expect(mine).toHaveLength(3);

    for (const cell of mine) {
      const result = rekeyText(cell.text, ring, contextsFor(cell.candidates), current);
      expect(result).toMatchObject({ moved: 1, failed: 0 });
      expect(await s.updateRekeyedCell(cell, result.text)).toBe(true);
      // Written once: the listed text no longer matches.
      expect(await s.updateRekeyedCell(cell, result.text)).toBe(false);
    }

    const plainNew = Buffer.from(ring);
    expect(revealLicenseKey((await s.getLicenseById(license.id))!, plainNew)).toMatch(/\S{16,}/);
    const saved = (await s.getAppById(app.id))!;
    expect(decrypt(saved.googlePlayKeyEncrypted!, plainNew, keyContext.googlePlay(app.id))).toBe('{"type":"service_account"}');
    expect(decrypt(saved.ascPrivateKeyEncrypted!, plainNew, keyContext.appStore(app.id))).toBe("p8");
    expect(saved.connector?.kind).toBe("shopify");
    const connector = saved.connector as { storefrontTokenEncrypted: string; shopDomain: string };
    expect(decrypt(connector.storefrontTokenEncrypted, plainNew, shopifyContext)).toBe("storefront");
    expect(connector.shopDomain).toBe(`rekey-${tag}.myshopify.com`);

    // Nothing of this test's is left to move.
    let left = 0;
    after = null;
    do {
      const page = await s.listCellsToRekey({ currentKeyId: current, after, limit: 100 });
      left += page.cells.filter((c) => c.candidates.includes(app.id) || c.candidates.includes(license.id)).length;
      after = page.next;
    } while (after !== null);
    expect(left).toBe(0);
  });
}
