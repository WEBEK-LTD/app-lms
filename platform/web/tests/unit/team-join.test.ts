import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { Client, User } from "@/lib/data/types";
import { inviteMember, type TeamDeps } from "@/lib/team/service";
import { KEY, NOW, days } from "./helpers";

/**
 * 60 Joining with the link (`joinTeamAction`). The link goes only to the
 * invited address, and joining never sets a password on an account that
 * already exists, nor makes an account for Yallapp's own team: the owner who
 * sends an invitation can't use it to sign in as someone else.
 */

class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect ${to}`);
  }
}

const state = vi.hoisted(() => ({ store: null as unknown as MemoryStore, sessions: [] as string[] }));

vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined, has: () => false }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    requestIp: async () => "203.0.113.7",
    startSession: async (user: User) => void state.sessions.push(user.email),
    chooseBusiness: async () => undefined,
  };
});

const { joinTeamAction } = await import("@/app/actions/team");

describe("60 joining a team with the link", () => {
  let owner: User;
  let client: Client;

  const deps = (): TeamDeps => ({
    store: state.store,
    now: NOW,
    baseUrl: "https://yallapp.test",
    mail: async () => undefined,
    words: () => ({ role: (role) => role, date: (date) => date.toISOString().slice(0, 10) }),
  });
  async function linkFor(email: string): Promise<string> {
    const apps = await state.store.listAppsByClient(client.id);
    const result = await inviteMember(deps(), {
      client,
      owner,
      apps,
      inviter: owner,
      lang: "en",
      values: { name: "Kerem", email, role: "manager", areas: [], appIds: null },
      parse: (input) => ({ ok: true, name: String(input.name), email: String(input.email) }),
    });
    if (!result.ok) throw new Error(JSON.stringify(result));
    return new URL(result.link).searchParams.get("token")!;
  }
  function form(values: Record<string, string>): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }
  const join = (token: string, password = "a long new password 42") => joinTeamAction({}, form({ token, name: "Mallory", password, confirm: password }));

  beforeEach(async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    state.store = new MemoryStore();
    state.sessions = [];
    ({ user: owner, client } = await registerClient(state.store, { name: "Leyla Kaya", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: "owner password 123" }, NOW));
    await activateClient(state.store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    client = (await state.store.getClientById(client.id))!;
    await state.store.createApp({ ...newApp(client.id, null, NOW, "store", "restaurant"), appName: "Moda Café" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("never sets a password on an account that has none: it asks for Forgot your password first", async () => {
    // A client the admin added: their account has no password until they set one by email.
    const { user: victim } = await registerClient(state.store, { name: "Victim", email: "victim@shop.test", whatsapp: "+905446731943", siteUrl: "", password: null }, NOW);
    const token = await linkFor("victim@shop.test");
    const result = await join(token);
    expect(result.message).toBe("Set a password for this email with “Forgot your password?” first, then open this link again.");
    const after = (await state.store.getUserById(victim.id))!;
    expect(after.passwordHash).toBeNull();
    expect(after.sessionVersion).toBe(victim.sessionVersion);
    expect(after.name).toBe("Victim");
    expect(state.sessions).toEqual([]);
    expect(await state.store.getTeamMember(client.id, victim.id)).toBeNull();
    // The invitation stays open for them once they have a password.
    expect((await state.store.listOpenTeamInvitations(client.id)).map((i) => i.email)).toEqual(["victim@shop.test"]);
  });

  it("makes no account for Yallapp's own team, even when the email was added after the invitation", async () => {
    const token = await linkFor("boss@yallapp.test");
    vi.stubEnv("SUPER_ADMIN_EMAILS", "boss@yallapp.test");
    const result = await join(token);
    expect(result.message).toBe("This invitation can't be used with this email. Ask for an invitation to another email.");
    expect(await state.store.getUserByEmail("boss@yallapp.test")).toBeNull();
    expect(state.sessions).toEqual([]);
  });

  it("refuses to invite Yallapp's own team before they have an account", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAILS", "boss@yallapp.test");
    await expect(
      inviteMember(deps(), {
        client,
        owner,
        apps: await state.store.listAppsByClient(client.id),
        inviter: owner,
        lang: "en",
        values: { name: "Boss", email: "boss@yallapp.test", role: "manager", areas: [], appIds: null },
        parse: (input) => ({ ok: true, name: String(input.name), email: String(input.email) }),
      }),
    ).resolves.toMatchObject({ ok: false, errors: { email: "This email can't be invited. Use another email." } });
  });

  it("a new email sets its name and password and joins; an existing one gives its password", async () => {
    await expect(join(await linkFor("new@cafe.test"))).rejects.toThrow(new Redirected("/dashboard"));
    const created = (await state.store.getUserByEmail("new@cafe.test"))!;
    expect(created.name).toBe("Mallory");
    expect(await state.store.getTeamMember(client.id, created.id)).toMatchObject({ role: "manager" });

    await state.store.createUser({ email: "has@cafe.test", name: "Has", passwordHash: await hashPassword("their own password 1"), now: NOW });
    const token = await linkFor("has@cafe.test");
    expect((await joinTeamAction({}, form({ token, password: "a guess" }))).errors?.password).toBe("The password is incorrect.");
    await expect(joinTeamAction({}, form({ token, password: "their own password 1" }))).rejects.toThrow(new Redirected("/dashboard"));
    expect(state.sessions).toEqual(["new@cafe.test", "has@cafe.test"]);
  });
});
