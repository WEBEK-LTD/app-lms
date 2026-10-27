import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

/** 100.3 A test certificate chain shaped like Apple's (root, WWDR intermediate, receipt-signing leaf), and JWS signed with it. */

const ec = () => generateKeyPairSync("ec", { namedCurve: "prime256v1" });

/** A minimal DER writer, enough for X.509 v3 certificates signed with ECDSA P-256. */
const der = (tag: number, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  const n = body.length;
  const length = n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.concat([Buffer.from([tag]), length, body]);
};
const seq = (...parts: Buffer[]) => der(0x30, ...parts);
const oid = (dotted: string) => {
  const [first = 0, second = 0, ...rest] = dotted.split(".").map(Number);
  const bytes = [first * 40 + second];
  for (const n of rest) {
    const chunk = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) chunk.unshift((v & 0x7f) | 0x80);
    bytes.push(...chunk);
  }
  return der(0x06, Buffer.from(bytes));
};
const TRUE = der(0x01, Buffer.from([0xff]));
const utcTime = (date: Date) => der(0x17, Buffer.from(`${date.toISOString().replace(/[-:T]/g, "").slice(2, 14)}Z`));
const cn = (name: string) => seq(der(0x31, seq(oid("2.5.4.3"), der(0x0c, Buffer.from(name)))));
const ECDSA_SHA256 = seq(oid("1.2.840.10045.4.3.2"));
export const LEAF_OID = "1.2.840.113635.100.6.11.1";
export const INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

export function certificate(options: { serial: number; subject: string; issuer: string; key: KeyObject; signer: KeyObject; from: Date; to: Date; ca: boolean; marks: string[] }): Buffer {
  const extensions = [
    seq(oid("2.5.29.19"), TRUE, der(0x04, seq(...(options.ca ? [TRUE] : [])))),
    ...options.marks.map((mark) => seq(oid(mark), der(0x04, der(0x05)))),
  ];
  const tbs = seq(
    der(0xa0, der(0x02, Buffer.from([2]))),
    der(0x02, Buffer.from([options.serial])),
    ECDSA_SHA256,
    cn(options.issuer),
    seq(utcTime(options.from), utcTime(options.to)),
    cn(options.subject),
    options.key.export({ type: "spki", format: "der" }),
    der(0xa3, seq(...extensions)),
  );
  const signature = sign("sha256", tbs, options.signer);
  return seq(tbs, ECDSA_SHA256, der(0x03, Buffer.concat([Buffer.from([0]), signature])));
}

const toPem = (raw: Buffer) => `-----BEGIN CERTIFICATE-----\n${raw.toString("base64").replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----\n`;

export function chain(options: { leafTo?: Date; leafMarks?: string[]; leafSigner?: "intermediate" | "stranger" } = {}) {
  const root = ec();
  const intermediate = ec();
  const leaf = ec();
  const stranger = ec();
  const rootCert = certificate({ serial: 1, subject: "Test Root CA - G3", issuer: "Test Root CA - G3", key: root.publicKey, signer: root.privateKey, from: new Date("2020-01-01T00:00:00Z"), to: new Date("2040-01-01T00:00:00Z"), ca: true, marks: [] });
  const intermediateCert = certificate({
    serial: 2,
    subject: "Test Worldwide Developer Relations CA - G6",
    issuer: "Test Root CA - G3",
    key: intermediate.publicKey,
    signer: root.privateKey,
    from: new Date("2020-01-01T00:00:00Z"),
    to: new Date("2035-01-01T00:00:00Z"),
    ca: true,
    marks: [INTERMEDIATE_OID],
  });
  const leafCert = certificate({
    serial: 3,
    subject: "Test Prod ECC Mac App Store and iTunes Store Receipt Signing",
    issuer: "Test Worldwide Developer Relations CA - G6",
    key: leaf.publicKey,
    signer: options.leafSigner === "stranger" ? stranger.privateKey : intermediate.privateKey,
    from: new Date("2026-01-01T00:00:00Z"),
    to: options.leafTo ?? new Date("2028-01-01T00:00:00Z"),
    ca: false,
    marks: options.leafMarks ?? [LEAF_OID],
  });
  const jws = (payload: object, header: object = {}) => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const head = encode({ alg: "ES256", x5c: [leafCert, intermediateCert, rootCert].map((raw) => raw.toString("base64")), ...header });
    const body = encode(payload);
    const signature = sign("sha256", Buffer.from(`${head}.${body}`), { key: leaf.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
    return `${head}.${body}.${signature}`;
  };
  return { jws, rootPem: toPem(rootCert), leafCert };
}

