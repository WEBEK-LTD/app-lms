"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  givePrimeGift,
  readGiftForm,
  removePrimeGift,
} from "@/lib/admin/prime-gift";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/**
 * 132 Admin › client › Prime as a gift: give Prime to one of the client's
 * apps or all of them, with an optional last day and a note for the team,
 * or take it back. `prime.gift` only; audited; never charged.
 */

const ID = /^[0-9a-f-]{36}$/i;

async function from(formData: FormData) {
  const admin = await requireAdmin("prime.gift");
  const clientId = String(formData.get("clientId") ?? "");
  const store = await getStore();
  const client = ID.test(clientId) ? await store.getClientById(clientId) : null;
  if (!client) redirect("/admin/clients");
  const apps = (await store.listAppsByClient(client.id)).filter(
    (a) => !a.deletedAt,
  );
  const which = String(formData.get("appId") ?? "");
  const chosen = which === "all" ? apps : apps.filter((a) => a.id === which);
  return { admin, store, client, chosen };
}

const back = (clientId: string, query: string): never => {
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}?${query}#prime-gift`);
};

export async function givePrimeGiftAction(formData: FormData): Promise<void> {
  const { admin, store, client, chosen } = await from(formData);
  if (chosen.length === 0) back(client.id, "gift_error=Choose+an+app.");
  const now = new Date();
  const form = readGiftForm(
    {
      until: String(formData.get("until") ?? ""),
      note: String(formData.get("note") ?? ""),
    },
    now,
  );
  if (!form.ok)
    back(
      client.id,
      `gift_error=${encodeURIComponent(Object.values(form.errors)[0]!)}`,
    );
  if (form.ok)
    await givePrimeGift(
      store,
      {
        admin: { id: admin.id, email: admin.email },
        clientId: client.id,
        apps: chosen,
        until: form.until,
        note: form.note,
      },
      now,
    );
  back(client.id, "done=prime_gift");
}

export async function removePrimeGiftAction(formData: FormData): Promise<void> {
  const { admin, store, client, chosen } = await from(formData);
  await removePrimeGift(
    store,
    {
      admin: { id: admin.id, email: admin.email },
      clientId: client.id,
      apps: chosen,
    },
    new Date(),
  );
  back(client.id, "done=prime_gift_removed");
}
