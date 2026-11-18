import type { DataStore } from "../data/store";
import type { User } from "../data/types";
import { agentFirstName } from "./complaints";

/** 115.53 Who a complaint can be given to: the account's owner and its team (Manager or Staff), with the first name the customer reads. */
export interface SupportPerson {
  email: string;
  name: string;
  firstName: string;
}

export async function supportTeam(store: Pick<DataStore, "listTeamMembers">, clientId: string, owner: Pick<User, "email" | "name">): Promise<SupportPerson[]> {
  const people = new Map<string, SupportPerson>();
  const add = (u: Pick<User, "email" | "name">) => {
    if (!people.has(u.email)) people.set(u.email, { email: u.email, name: u.name || u.email, firstName: agentFirstName(u.name, u.email) ?? u.email });
  };
  add(owner);
  for (const row of await store.listTeamMembers(clientId)) add(row.user);
  return [...people.values()];
}

/** The first name a ticket's assignee goes by, for the queue and the page. */
export function assigneeName(team: SupportPerson[], email: string | null): string | null {
  if (!email) return null;
  return team.find((p) => p.email === email)?.firstName ?? agentFirstName(null, email);
}
