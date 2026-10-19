import type { DataStore } from "../data/store";
import type { Client, User } from "../data/types";
import { hashPassword, verifyPassword } from "./password";

export async function registerClient(
  store: DataStore,
  /** 52 `country`: where the sign-up came from (the request's country), for the currency of Yallapp's prices. */
  input: { name: string; email: string; whatsapp: string; siteUrl: string; password: string | null; country?: string | null },
  now: Date,
): Promise<{ user: User; client: Client }> {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const user = await store.createUser({ email: input.email, name: input.name, passwordHash, now });
  const client = await store.createClient({ userId: user.id, whatsapp: input.whatsapp, siteUrl: input.siteUrl, country: input.country ?? null, now });
  return { user, client };
}

/** Returns the user when the email and password match. Takes similar time either way. */
export async function authenticate(store: DataStore, email: string, password: string, now: Date): Promise<User | null> {
  const user = await store.getUserByEmail(email);
  const valid = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !valid) return null;
  await store.updateUser(user.id, { lastSignInAt: now }, now);
  return user;
}
