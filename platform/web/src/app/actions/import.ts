"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, contextCan, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { imageType } from "@/lib/images";
import { applyImport, type ImportReport } from "@/lib/import/apply";
import { importKindOf } from "@/lib/import/kinds";
import { planImport, type ImportField, type ImportKind, type ImportPlan } from "@/lib/import/plan";
import { ImportSourceError, readImportUrl } from "@/lib/import/source";
import { IMPORT_MAX_BYTES, ImportFormatError, parseImport, type Table } from "@/lib/import/table";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchSiteImage } from "@/lib/scan/site-scan";
import { siteScanDeps } from "@/lib/scan/start";

/**
 * 81.4 Import for apps without a connector (lib/import): the owner chooses a
 * file or gives a link, sees what would be imported (`intent` "check"), then
 * imports it (`intent` "import"), which reads the same source again.
 * Products and a restaurant's menu, and courses, are the catalog's; services
 * are the bookings'.
 */

const PICTURE_MAX_BYTES = 2 * 1024 * 1024;
/** Pictures are read for this long; the rest are added by hand. */
const PICTURES_BUDGET_MS = 12_000;

async function requireImport(): Promise<ClientContext & { app: App; kind: ImportKind }> {
  const context = await clientFor(["catalog", "bookings"]);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const kind = context.app ? importKindOf(context.app) : null;
  if (!kind || !contextCan(context, kind === "services" ? "bookings" : "catalog")) redirect("/dashboard");
  return { ...context, app: context.app!, kind };
}

export interface ImportPreview {
  kind: ImportKind;
  columns: { field: ImportField; column: string }[];
  missing: ImportField[];
  total: number;
  ready: number;
  /** The first rows, as they'd be imported. */
  sample: { row: number; name: string; price: string | null; category: string | null; picture: boolean }[];
  /** Rows that can't be imported, with why (the first 20). */
  problems: { row: number; name: string; errors: string[] }[];
}

export type ImportState =
  | { step: "start"; error?: string }
  | { step: "checked"; preview: ImportPreview }
  | { step: "done"; report: ImportReport; kind: ImportKind };

async function readSource(formData: FormData): Promise<Table> {
  const file = formData.get("file");
  const link = String(formData.get("link") ?? "").trim();
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > IMPORT_MAX_BYTES) throw new ImportFormatError("too_large", `The file is too large. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
    return parseImport(new TextDecoder("utf-8").decode(await file.arrayBuffer()), file.type);
  }
  if (link) return readImportUrl(link, siteScanDeps());
  throw new ImportFormatError("empty", "Choose a file, or enter a link.");
}

async function planFrom(context: ClientContext & { kind: ImportKind }, formData: FormData): Promise<{ plan: ImportPlan } | { error: string }> {
  // Each check reads a file or someone's link: limited like other reads of an address given.
  if (!(await hitRateLimit(await getStore(), RATE_LIMITS.importRead, context.client.id)).allowed) return { error: "You've checked many files this hour. Try again later." };
  try {
    return { plan: planImport(context.kind, await readSource(formData)) };
  } catch (error) {
    if (error instanceof ImportFormatError || error instanceof ImportSourceError) return { error: error.message };
    console.error("[import]", error instanceof Error ? error.message : String(error));
    return { error: "The file couldn't be read. Save it as CSV (UTF-8) and try again." };
  }
}

export async function importAction(_: ImportState, formData: FormData): Promise<ImportState> {
  const context = await requireImport();
  const intent = formData.get("intent");
  // "Choose another file": back to the start, nothing read.
  if (intent === "reset") return { step: "start" };
  return intent === "import" ? runImport(context, formData) : checkImport(context, formData);
}

async function checkImport(context: ClientContext & { app: App; kind: ImportKind }, formData: FormData): Promise<ImportState> {
  const planned = await planFrom(context, formData);
  if ("error" in planned) return { step: "start", error: planned.error };
  const { plan } = planned;
  const ok = plan.missing.length ? [] : plan.items.filter((i) => i.errors.length === 0);
  return {
    step: "checked",
    preview: {
      kind: plan.kind,
      columns: plan.columns,
      missing: plan.missing,
      total: plan.items.length,
      ready: ok.length,
      sample: ok.slice(0, 8).map((i) => ({ row: i.row, name: i.name, price: i.values.price || null, category: i.values.category || null, picture: Boolean(i.values.image) })),
      problems: plan.items
        .filter((i) => i.errors.length)
        .slice(0, 20)
        .map((i) => ({ row: i.row, name: i.name, errors: i.errors })),
    },
  };
}

async function runImport(context: ClientContext & { app: App; kind: ImportKind }, formData: FormData): Promise<ImportState> {
  const planned = await planFrom(context, formData);
  if ("error" in planned) return { step: "start", error: planned.error };
  if (planned.plan.missing.length) return { step: "start", error: "The file has no column for some details every row needs. Check it again." };
  const store = await getStore();
  const now = new Date();
  const deps = siteScanDeps();
  const savePicture = async (url: string): Promise<string | null> => {
    const data = await fetchSiteImage(url, PICTURE_MAX_BYTES, deps);
    const type = data ? imageType(data) : null;
    if (!data || !type) return null;
    const id = newId();
    const blobKey = `assets/${context.client.id}/${id}.${type.extension}`;
    await getBlobStore().put(blobKey, data, type.contentType);
    await store.createAsset({ id, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
    return id;
  };
  const report = await applyImport({ store, app: context.app, now, savePicture, budgetMs: PICTURES_BUDGET_MS }, planned.plan);
  await recordStaffChange(context, `Imported ${context.kind}: ${report.added} added, ${report.updated} updated`);
  revalidatePath("/dashboard/catalog", "layout");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/courses", "layout");
  return { step: "done", report, kind: context.kind };
}
