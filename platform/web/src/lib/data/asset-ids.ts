/** 73 The asset IDs (UUIDs) named in a text: an app's rows, their columns and JSON, for its purge. */
export function assetIdsIn(text: string): string[] {
  return [...new Set((text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []).map((id) => id.toLowerCase()))];
}
