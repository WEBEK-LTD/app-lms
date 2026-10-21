import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_QUEUE_LIMIT, databaseQueueLimit, resolveDatabaseCa } from "@/lib/env";

describe("DATABASE_CA", () => {
  it("is optional", () => {
    expect(resolveDatabaseCa(undefined)).toBeUndefined();
    expect(resolveDatabaseCa("  ")).toBeUndefined();
  });

  it("names the bundled CA of host.webek.org", () => {
    const pem = resolveDatabaseCa("host.webek.org");
    const cert = new X509Certificate(pem!);
    expect(cert.subject).toBe("CN=Yallapp MySQL CA");
    expect(cert.ca).toBe(true);
    expect(new Date(cert.validTo).getUTCFullYear()).toBe(2036);
  });

  it("accepts a PEM with escaped newlines", () => {
    const pem = resolveDatabaseCa("host.webek.org")!;
    expect(resolveDatabaseCa(pem.trim().replace(/\n/g, "\\n"))).toBe(pem.trim());
  });

  it("refuses anything else, including the comment entry", () => {
    expect(() => resolveDatabaseCa("db.example.com")).toThrow(/host\.webek\.org/);
    expect(() => resolveDatabaseCa("_comment")).toThrow();
  });
});

describe("DATABASE_QUEUE_LIMIT", () => {
  it("keeps 50 unless a whole number is given; 0 means no limit", () => {
    expect(databaseQueueLimit(undefined)).toBe(DEFAULT_QUEUE_LIMIT);
    expect(DEFAULT_QUEUE_LIMIT).toBe(50);
    expect(databaseQueueLimit("0")).toBe(0);
    expect(databaseQueueLimit(" 200 ")).toBe(200);
    expect(databaseQueueLimit("")).toBe(50);
    expect(databaseQueueLimit("-1")).toBe(50);
    expect(databaseQueueLimit("2.5")).toBe(50);
    expect(databaseQueueLimit("many")).toBe(50);
  });
});
