import type { StoragePack } from "../data/types";
import type { PlanInfo } from "../plans";

/**
 * 51 How much an app may keep in its Media library: its plan's storage
 * (PlanLimits.storageGb) plus the storage packs still running. Uploads past
 * it are refused; nothing already there is ever deleted for being over.
 */

/** A gigabyte, as the dashboard counts it. */
export const GB = 1024 ** 3;

/** Packs that count now: until their end date. */
export function activePacks(packs: StoragePack[], now: Date): StoragePack[] {
  return packs.filter((p) => p.activeUntil.getTime() > now.getTime());
}

/** The app's storage in bytes; null: unlimited. Without a plan (no license): nothing. */
export function storageLimitBytes(plan: Pick<PlanInfo, "limits"> | null, packs: StoragePack[], now: Date): number | null {
  if (!plan) return 0;
  const gb = plan.limits.storageGb;
  if (gb === null) return null;
  return (gb + activePacks(packs, now).reduce((sum, p) => sum + p.gb, 0)) * GB;
}

export interface StorageState {
  usedBytes: number;
  limitBytes: number | null;
  /** 0 to 1 (more when over); 0 when unlimited. */
  share: number;
  /** Over the limit: uploads are refused until files are deleted or storage is added. */
  over: boolean;
}

export function storageState(usedBytes: number, limitBytes: number | null): StorageState {
  if (limitBytes === null) return { usedBytes, limitBytes, share: 0, over: false };
  return { usedBytes, limitBytes, share: limitBytes === 0 ? (usedBytes > 0 ? 1 : 0) : usedBytes / limitBytes, over: usedBytes > limitBytes };
}

/** Whether a new file of `size` bytes fits. */
export function fits(usedBytes: number, limitBytes: number | null, size: number): boolean {
  return limitBytes === null || usedBytes + size <= limitBytes;
}

/** "1.2 GB", "350 MB", "12 KB", "0 B". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value >= 100 || Number.isInteger(value) ? 0 : 1;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)} ${units[unit]}`;
}
