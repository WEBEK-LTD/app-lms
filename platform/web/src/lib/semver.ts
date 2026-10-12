/** Minimal x.y.z comparison for plugin and app versions. */

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function parseVersion(value: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?(?:[-+].*)?$/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? "0")];
}

/** Negative when a < b, 0 when equal, positive when a > b. Unparseable versions sort first. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] as number) - (right[i] as number);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function bumpPatch(version: string): string {
  const parsed = parseVersion(version);
  if (!parsed) return "1.0.0";
  return `${parsed[0]}.${parsed[1]}.${parsed[2] + 1}`;
}
