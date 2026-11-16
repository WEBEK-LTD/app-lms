import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_PERMISSIONS, can } from "@/lib/admin/permissions";

/**
 * 132.111–132.115 Every action of the admin's app tools asks for its team
 * permission before anything else (a client, or anyone outside the team,
 * goes away from requireAdmin), and only owners and admins may move or copy
 * apps; the owner's approve and decline check that it's the account's own
 * user. The move's pages need the admin too.
 */
const read = (file: string) => readFileSync(path.resolve(__dirname, "../../src", file), "utf8");
const actions = (source: string) => [...source.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\n([^\n]*)/g)].map((m) => ({ name: m[1]!, first: m[2]!.trim() }));

describe("132 the admin's app tools are the team's only", () => {
  it("asks for the permission first in every action", () => {
    const found = actions(read("app/actions/admin-apps.ts"));
    expect(found.map((a) => a.name).sort()).toEqual(["cancelMoveAction", "confirmMoveCodeAction", "copyAppAction", "createAppForClientAction", "requestMoveAction", "requestPlanMoveAction"]);
    const wanted: Record<string, string> = {
      createAppForClientAction: "clients.edit",
      requestMoveAction: "apps.transfer",
      requestPlanMoveAction: "apps.transfer",
      confirmMoveCodeAction: "apps.transfer",
      cancelMoveAction: "apps.transfer",
      copyAppAction: "apps.copy",
    };
    for (const action of found) expect(action.first, action.name).toBe(`const admin = await requireAdmin("${wanted[action.name]}");`);
  });

  it("lets only owners and admins move or copy apps", () => {
    expect(ADMIN_PERMISSIONS).toContain("apps.transfer");
    expect(ADMIN_PERMISSIONS).toContain("apps.copy");
    for (const permission of ["apps.transfer", "apps.copy"] as const) {
      expect(can("owner", permission)).toBe(true);
      expect(can("admin", permission)).toBe(true);
      expect(can("support", permission)).toBe(false);
      expect(can("viewer", permission)).toBe(false);
      expect(can(null, permission)).toBe(false);
    }
  });

  it("checks the owner and the link on the owner's approve and decline, and the admin on the pages", () => {
    const owner = read("app/actions/app-moves.ts");
    expect(owner).toContain("from.userId !== user.id || (await getAdminRole())");
    expect(owner).toContain('checkMoveLink(id, link) !== "valid"');
    for (const page of ["move", "copy", "plan"]) expect(read(`app/admin/clients/[id]/${page}/page.tsx`)).toContain("await requireAdmin();");
  });
});
