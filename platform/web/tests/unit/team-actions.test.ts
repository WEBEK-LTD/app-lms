import { describe, expect, it, vi } from "vitest";

/**
 * 60 Every client server action asks the permission helper first, with the
 * permission its group needs: the session's `clientFor` is replaced by one
 * that records what it is asked and stops there, and each exported action is
 * called. A new action without a guard, or with the wrong one, fails here.
 */

class Guarded extends Error {
  constructor(readonly permission: unknown) {
    super("guarded");
  }
}

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    clientFor: vi.fn(async (permission: unknown) => {
      throw new Guarded(permission);
    }),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));

type Expected = Record<string, unknown>;

/** Each action file's group: its default permission and the actions that need another. */
const GROUPS: { file: string; all?: unknown; only?: Expected; skip?: string[] }[] = [
  { file: "analytics", all: "analytics" },
  { file: "announcements", all: "dashboard" },
  { file: "app-links", all: "settings" },
  { file: "app-sign-in", all: "settings" },
  { file: "articles", all: "catalog" },
  { file: "bookings", all: "bookings" },
  { file: "billing", all: "billing", only: { dismissNoticeAction: "settings" } },
  {
    file: "catalog",
    all: "catalog",
    only: { savePaymentKeysAction: "billing", removePaymentKeysAction: "billing", setOrderStatusAction: "orders", moveOrderAction: "orders", shipOrderAction: "orders" },
  },
  { file: "classes", all: "bookings" },
  { file: "courses", all: "catalog", only: { saveOfflineDownloadsAction: "settings" } },
  // 63 Questions are messages; reviews are the catalog's.
  { file: "course-community", all: "catalog", only: { answerQuestionAction: "messages", setQuestionHiddenAction: "messages", setAnswerHiddenAction: "messages" } },
  { file: "members", all: "bookings" },
  {
    file: "dashboard",
    all: "settings",
    only: {
      switchAppAction: "dashboard",
      chooseAppTypeAction: "apps",
      startFromWebsiteAction: "apps",
      saveWebsiteAction: "apps",
      connectPlatformAction: "apps",
      disconnectPlatformAction: "apps",
      checkApiAction: "apps",
      releaseSiteAction: "billing",
    },
  },
  { file: "donations", all: "donations" },
  { file: "events", all: "events" },
  // 81.4 Products and courses are the catalog's, services the bookings': the app decides which.
  { file: "import", all: ["catalog", "bookings"] },
  { file: "listings", all: "catalog", only: { replyInquiryAction: "messages", setInquiryStatusAction: "messages" } },
  { file: "media", all: "media", only: { listMediaAction: ["media", "catalog", "settings"], shareMediaAction: ["media", "catalog", "settings"], buyStorageAction: "billing" } },
  { file: "more-stores", all: "settings" },
  { file: "notifications", all: "notifications", only: { saveServiceAccountAction: "settings", removeServiceAccountAction: "settings" } },
  { file: "owner-devices", all: "dashboard" },
  { file: "pages", all: "settings" },
  { file: "publishing", all: "settings" },
  { file: "refunds", all: "orders", only: { refundDonationAction: "donations" } },
  { file: "screen-protection", all: "settings" },
  { file: "translations", all: "settings" },
  { file: "updates", all: "dashboard" },
  // Switching business and joining a team aren't about one client's data (they check the person themselves).
  { file: "team", all: "team", skip: ["switchBusinessAction", "joinTeamAction"] },
];

async function permissionAsked(action: (...args: unknown[]) => Promise<unknown>): Promise<unknown> {
  const form = new FormData();
  form.set("id", "1");
  form.set("appId", "");
  try {
    await (action.length >= 2 ? action({}, form) : action(form));
  } catch (error) {
    if (error instanceof Guarded) return error.permission;
    throw error;
  }
  return "(no guard)";
}

describe("60 every client action asks for its permission", () => {
  for (const group of GROUPS) {
    it(`${group.file}.ts`, async () => {
      const actionsOf = (await import(`../../src/app/actions/${group.file}.ts`)) as Record<string, unknown>;
      const actions = Object.entries(actionsOf).filter(([name, value]) => typeof value === "function" && name.endsWith("Action") && !group.skip?.includes(name));
      expect(actions.length).toBeGreaterThan(0);
      for (const [name, action] of actions) {
        const wanted = group.only?.[name] ?? group.all;
        expect(await permissionAsked(action as (...args: unknown[]) => Promise<unknown>), `${group.file}.ts ${name}`).toEqual(wanted);
      }
    });
  }
});
