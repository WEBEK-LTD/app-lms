import type { DataStore } from "../data/store";
import type { AccountManagerCall } from "../data/types";
import { businessName } from "../team/service";

/** 125 A call clients asked for with their account manager, with the names Admin shows. */
export interface CallRow {
  call: AccountManagerCall;
  clientName: string;
  managerName: string;
  /** The manager's time zone, which the call's day and time are in. */
  timezone: string | null;
}

/** The calls with their names: the client's business, the manager, the manager's time zone. */
export async function callRows(store: DataStore, calls: AccountManagerCall[]): Promise<CallRow[]> {
  const names = new Map<string, string>();
  const zones = new Map<string, string | null>();
  const rows: CallRow[] = [];
  for (const call of calls) {
    if (!names.has(call.clientId)) {
      const client = await store.getClientById(call.clientId);
      const owner = client ? await store.getUserById(client.userId) : null;
      names.set(call.clientId, owner ? businessName(owner, await store.listAppsByClient(call.clientId)) : "A client");
    }
    if (!names.has(call.managerId)) names.set(call.managerId, (await store.getUserById(call.managerId))?.name ?? "Someone who left the team");
    if (!zones.has(call.managerId)) zones.set(call.managerId, (await store.getStaffProfile(call.managerId))?.hours?.timezone ?? null);
    rows.push({ call, clientName: names.get(call.clientId)!, managerName: names.get(call.managerId)!, timezone: zones.get(call.managerId) ?? null });
  }
  return rows;
}
