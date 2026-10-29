/**
 * 108.5 A reader for Kiwi, the binary format Figma's own file (`.fig`) is
 * written in. The file carries its schema, so the reader first decodes the
 * schema and then the message with it, into plain objects (enum values as
 * their names, byte arrays as Uint8Array).
 */

export interface KiwiField {
  name: string;
  /** A definition's index, or a built-in type (negative). */
  type: number;
  isArray: boolean;
  value: number;
}

export interface KiwiDefinition {
  name: string;
  /** 0 enum, 1 struct, 2 message. */
  kind: number;
  fields: KiwiField[];
}

const BUILT_IN: Record<number, string> = { [-1]: "bool", [-2]: "byte", [-3]: "int", [-4]: "uint", [-5]: "float", [-6]: "string", [-7]: "int64", [-8]: "uint64" };

class Reader {
  at = 0;
  private readonly text = new TextDecoder();
  constructor(private readonly bytes: Uint8Array) {
  }

  byte(): number {
    if (this.at >= this.bytes.length) throw new Error("kiwi: past the end");
    return this.bytes[this.at++]!;
  }

  bytesOf(n: number): Uint8Array {
    if (this.at + n > this.bytes.length) throw new Error("kiwi: past the end");
    const out = this.bytes.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }

  uint(): number {
    let value = 0;
    let shift = 0;
    for (;;) {
      const b = this.byte();
      value += (b & 127) * 2 ** shift;
      shift += 7;
      if (!(b & 128) || shift >= 35) break;
    }
    return value;
  }

  int(): number {
    const v = this.uint();
    return v % 2 === 1 ? -(v + 1) / 2 : v / 2;
  }

  uint64(): bigint {
    let value = 0n;
    let shift = 0n;
    for (;;) {
      const b = this.byte();
      value |= BigInt(b & 127) << shift;
      shift += 7n;
      if (!(b & 128) || shift >= 70n) break;
    }
    return value;
  }

  int64(): bigint {
    const v = this.uint64();
    return v & 1n ? -((v + 1n) >> 1n) : v >> 1n;
  }

  float(): number {
    const first = this.byte();
    if (first === 0) return 0;
    if (this.at + 3 > this.bytes.length) throw new Error("kiwi: past the end");
    let bits = first | (this.bytes[this.at]! << 8) | (this.bytes[this.at + 1]! << 16) | (this.bytes[this.at + 2]! << 24);
    this.at += 3;
    bits = (bits << 23) | (bits >>> 9);
    const scratch = new DataView(new ArrayBuffer(4));
    scratch.setInt32(0, bits, true);
    return scratch.getFloat32(0, true);
  }

  string(): string {
    const start = this.at;
    while (this.at < this.bytes.length && this.bytes[this.at] !== 0) this.at += 1;
    const out = this.text.decode(this.bytes.subarray(start, this.at));
    this.at += 1;
    return out;
  }
}

export function decodeSchema(bytes: Uint8Array): KiwiDefinition[] {
  const r = new Reader(bytes);
  const count = r.uint();
  const definitions: KiwiDefinition[] = [];
  for (let i = 0; i < count; i += 1) {
    const name = r.string();
    const kind = r.byte();
    const fieldCount = r.uint();
    const fields: KiwiField[] = [];
    for (let j = 0; j < fieldCount; j += 1) fields.push({ name: r.string(), type: r.int(), isArray: r.byte() === 1, value: r.uint() });
    definitions.push({ name, kind, fields });
  }
  return definitions;
}

/** The message decoded with its schema, from the definition named `root`. */
export function decodeMessage(definitions: KiwiDefinition[], bytes: Uint8Array, root = "Message"): Record<string, unknown> {
  const r = new Reader(bytes);
  const byName = new Map(definitions.map((d) => [d.name, d]));
  const start = byName.get(root);
  if (!start) throw new Error(`kiwi: no ${root}`);

  const value = (type: number): unknown => {
    if (type < 0) {
      switch (BUILT_IN[type]) {
        case "bool":
          return r.byte() !== 0;
        case "byte":
          return r.byte();
        case "int":
          return r.int();
        case "uint":
          return r.uint();
        case "float":
          return r.float();
        case "string":
          return r.string();
        case "int64":
          return r.int64();
        case "uint64":
          return r.uint64();
        default:
          throw new Error("kiwi: unknown type");
      }
    }
    return decode(definitions[type]!);
  };

  const field = (f: KiwiField): unknown => {
    if (!f.isArray) return value(f.type);
    const length = r.uint();
    // Byte arrays as they are.
    if (f.type === -2) return r.bytesOf(length);
    const out: unknown[] = [];
    for (let i = 0; i < length; i += 1) out.push(value(f.type));
    return out;
  };

  function decode(def: KiwiDefinition): unknown {
    if (def.kind === 0) {
      const v = r.uint();
      return def.fields.find((f) => f.value === v)?.name ?? v;
    }
    const out: Record<string, unknown> = {};
    if (def.kind === 1) {
      for (const f of def.fields) out[f.name] = field(f);
      return out;
    }
    for (;;) {
      const id = r.uint();
      if (id === 0) return out;
      const f = def.fields.find((x) => x.value === id);
      if (!f) throw new Error("kiwi: unknown field");
      out[f.name] = field(f);
    }
  }

  return decode(start) as Record<string, unknown>;
}

/** For tests: a schema written back in Kiwi's binary form. */
export function encodeSchema(definitions: KiwiDefinition[]): Uint8Array {
  const out: number[] = [];
  const uint = (v: number) => {
    do {
      let b = v & 127;
      v = Math.floor(v / 128);
      if (v) b |= 128;
      out.push(b);
    } while (v);
  };
  const str = (s: string) => {
    out.push(...new TextEncoder().encode(s), 0);
  };
  uint(definitions.length);
  for (const d of definitions) {
    str(d.name);
    out.push(d.kind);
    uint(d.fields.length);
    for (const f of d.fields) {
      str(f.name);
      uint(f.type < 0 ? -f.type * 2 - 1 : f.type * 2);
      out.push(f.isArray ? 1 : 0);
      uint(f.value);
    }
  }
  return new Uint8Array(out);
}
