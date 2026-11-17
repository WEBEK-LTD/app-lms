import type { GoogleEndpoints } from "./endpoints";
import { googleJson, type Fetch, type Operation } from "./http";

/**
 * 136 Google Cloud's APIs the platform makes a new pool project with, as the
 * `firebase-apps` service account (the project's creator, so its owner):
 * Resource Manager v3 (the project, its IAM policy, and whether the account
 * may create projects under the parent), Service Usage (the APIs a project
 * for push needs) and API Keys v2 (the one key the apps carry, restricted
 * to push).
 */

/** The APIs a pool project needs: Firebase, Cloud Messaging and what the apps register with, and API keys. */
export const POOL_PROJECT_SERVICES = [
  "firebase.googleapis.com",
  "fcm.googleapis.com",
  "fcmregistrations.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "apikeys.googleapis.com",
] as const;

/** The only APIs the apps' key opens. */
export const PUSH_KEY_TARGETS = ["firebaseinstallations.googleapis.com", "fcmregistrations.googleapis.com"] as const;

export interface IamPolicy {
  version?: number;
  etag?: string;
  bindings?: { role: string; members: string[]; condition?: unknown }[];
}

export interface CloudProjects {
  /** Starts creating the project under the parent (`organizations/<id>` or `folders/<id>`). */
  createProject(input: { projectId: string; displayName: string; parent: string }): Promise<Operation>;
  getOperation(name: string): Promise<Operation>;
  /** The project's number, or null when there's no such project the account can see. */
  projectNumber(projectId: string): Promise<string | null>;
  enableServices(projectNumber: string, services: readonly string[]): Promise<Operation>;
  getServiceOperation(name: string): Promise<Operation>;
  createPushKey(projectNumber: string, displayName: string): Promise<Operation>;
  getKeyOperation(name: string): Promise<Operation>;
  getIamPolicy(projectId: string): Promise<IamPolicy>;
  setIamPolicy(projectId: string, policy: IamPolicy): Promise<IamPolicy>;
  /** Which of these permissions the account has on the resource (`organizations/<id>`, `folders/<id>`). */
  testPermissions(resource: string, permissions: string[]): Promise<string[]>;
}

/** The project number in a Resource Manager project (`name: "projects/123"`). */
export function projectNumberOf(value: unknown): string | null {
  const name = (value as { name?: unknown } | null)?.name;
  const match = typeof name === "string" ? /^projects\/(\d+)$/.exec(name) : null;
  return match ? match[1]! : null;
}

/** The key's `uid` in an API Keys response (`name: "projects/1/locations/global/keys/<uid>"`). */
export function keyUidOf(value: unknown): string | null {
  const v = value as { uid?: unknown; name?: unknown } | null;
  if (typeof v?.uid === "string" && v.uid) return v.uid;
  const match = typeof v?.name === "string" ? /\/keys\/([^/]+)$/.exec(v.name) : null;
  return match ? match[1]! : null;
}

/** The policy with each role given to the member, the other bindings kept as they are. */
export function withRoles(policy: IamPolicy, grants: { member: string; role: string }[]): { policy: IamPolicy; changed: boolean } {
  const bindings = (policy.bindings ?? []).map((b) => ({ ...b, members: [...b.members] }));
  let changed = false;
  for (const { member, role } of grants) {
    const binding = bindings.find((b) => b.role === role && !b.condition);
    if (binding?.members.includes(member)) continue;
    changed = true;
    if (binding) binding.members.push(member);
    else bindings.push({ role, members: [member] });
  }
  return { policy: { ...policy, bindings }, changed };
}

export function cloudProjects(deps: { token: () => Promise<string>; endpoints: Pick<GoogleEndpoints, "resourceManager" | "serviceUsage" | "apiKeys">; fetcher?: Fetch }): CloudProjects {
  const fetcher = deps.fetcher ?? fetch;
  const call = async <T>(url: string, init: { method?: string; body?: unknown } = {}) => googleJson<T>(fetcher, url, { ...init, token: await deps.token() });
  const rm = `${deps.endpoints.resourceManager}/v3`;
  const su = `${deps.endpoints.serviceUsage}/v1`;
  const keys = `${deps.endpoints.apiKeys}/v2`;
  const path = (name: string) => name.split("/").map(encodeURIComponent).join("/");
  return {
    createProject(input) {
      return call<Operation>(`${rm}/projects`, { body: { projectId: input.projectId, displayName: input.displayName, parent: input.parent } });
    },
    getOperation(name) {
      return call<Operation>(`${rm}/${path(name)}`);
    },
    async projectNumber(projectId) {
      try {
        return projectNumberOf(await call<unknown>(`${rm}/projects/${encodeURIComponent(projectId)}`));
      } catch (error) {
        const status = (error as { httpStatus?: number }).httpStatus;
        if (status === 403 || status === 404) return null;
        throw error;
      }
    },
    enableServices(projectNumber, services) {
      return call<Operation>(`${su}/projects/${encodeURIComponent(projectNumber)}/services:batchEnable`, { body: { serviceIds: [...services] } });
    },
    getServiceOperation(name) {
      return call<Operation>(`${su}/${path(name)}`);
    },
    createPushKey(projectNumber, displayName) {
      return call<Operation>(`${keys}/projects/${encodeURIComponent(projectNumber)}/locations/global/keys`, {
        body: { displayName, restrictions: { apiTargets: PUSH_KEY_TARGETS.map((service) => ({ service })) } },
      });
    },
    getKeyOperation(name) {
      return call<Operation>(`${keys}/${path(name)}`);
    },
    getIamPolicy(projectId) {
      return call<IamPolicy>(`${rm}/projects/${encodeURIComponent(projectId)}:getIamPolicy`, { body: { options: { requestedPolicyVersion: 3 } } });
    },
    setIamPolicy(projectId, policy) {
      return call<IamPolicy>(`${rm}/projects/${encodeURIComponent(projectId)}:setIamPolicy`, { body: { policy } });
    },
    async testPermissions(resource, permissions) {
      const answer = await call<{ permissions?: string[] }>(`${rm}/${path(resource)}:testIamPermissions`, { body: { permissions } });
      return answer.permissions ?? [];
    },
  };
}
