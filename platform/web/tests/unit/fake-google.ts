/**
 * 136 A fake of the Google APIs Yallapp's Firebase uses, for the unit tests
 * (as a fetch) and the end-to-end tests (as a server, tests/e2e/fake-google.ts):
 * the Security Token Service (it checks the platform's assertion), the IAM
 * credentials API (each subject may become one service account), the
 * Firebase Management API, Resource Manager, Service Usage, API Keys and FCM.
 * Each API sits under its own path, as lib/google/endpoints.ts endpointsAt()
 * puts them. Nothing here is real: no file it makes is a working Firebase file.
 */

export interface FakeGoogleOptions {
  /** The provider the assertions must name (`projects/…/providers/…`). */
  provider: string;
  /** Which service account each subject may become. */
  accounts: Record<string, string>;
  /** Checks an assertion's signature and returns its claims, or throws. */
  verify: (jwt: string) => Promise<{ iss?: string; sub?: string; aud?: string | string[]; iat?: number; exp?: number }>;
  /** How many reads an operation takes before it's done (0: done at once). */
  pollsUntilDone?: number;
  /** The organization or folder the apps account may create projects under. */
  creatableParents?: string[];
}

interface FakeApp {
  appId: string;
  identifier: string;
  displayName: string;
  apiKeyId: string;
}

interface FakeProject {
  projectId: string;
  number: string;
  parent: string;
  firebase: boolean;
  services: Set<string>;
  android: FakeApp[];
  ios: FakeApp[];
  keys: { uid: string; restrictions: unknown }[];
  policy: { bindings: { role: string; members: string[] }[]; etag: string; version: number };
}

interface FakeOperation {
  name: string;
  readsLeft: number;
  response?: unknown;
  error?: { code: number; message: string; status: string };
}

export interface FakeCall {
  method: string;
  path: string;
  authorization: string | null;
  body: unknown;
}

type Answer = { status: number; body: unknown };

const json = (status: number, body: unknown): Answer => ({ status, body });
const problem = (status: number, code: string, message: string): Answer => json(status, { error: { code: status, status: code, message } });

const googleServices = (project: FakeProject) => ({
  project_info: { project_number: project.number, project_id: project.projectId, storage_bucket: `${project.projectId}.appspot.com` },
  // As the real one may: every Android app of the project, other clients' too.
  client: project.android.map((app) => ({
    client_info: { mobilesdk_app_id: app.appId, android_client_info: { package_name: app.identifier } },
    oauth_client: [],
    api_key: [{ current_key: `AIza-fake-${project.projectId}` }],
    services: { appinvite_service: { other_platform_oauth_client: [] } },
  })),
  configuration_version: "1",
});

const plist = (project: FakeProject, app: FakeApp) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>API_KEY</key>\n\t<string>AIza-fake-${project.projectId}</string>\n\t<key>GCM_SENDER_ID</key>\n\t<string>${project.number}</string>\n\t<key>BUNDLE_ID</key>\n\t<string>${app.identifier}</string>\n\t<key>PROJECT_ID</key>\n\t<string>${project.projectId}</string>\n\t<key>GOOGLE_APP_ID</key>\n\t<string>${app.appId}</string>\n</dict>\n</plist>\n`;

export class FakeGoogle {
  readonly calls: FakeCall[] = [];
  readonly projects = new Map<string, FakeProject>();
  readonly operations = new Map<string, FakeOperation>();
  readonly pushes: { project: string; token: string; authorization: string | null; message: Record<string, unknown> }[] = [];
  readonly assertions: { iss?: string; sub?: string; aud?: string | string[]; iat?: number; exp?: number }[] = [];
  /** Requests whose `METHOD path` matches get this answer instead, `times` times (default: always). */
  readonly failures: { match: RegExp; status: number; code: string; message: string; times?: number }[] = [];
  private next = 1;

  constructor(readonly options: FakeGoogleOptions) {}

  /** A project made outside the platform (as the team would by hand). */
  addProject(projectId: string, number: string, apiKeyUid = `key-${projectId}`): FakeProject {
    const project: FakeProject = {
      projectId,
      number,
      parent: "organizations/1",
      firebase: true,
      services: new Set(),
      android: [],
      ios: [],
      keys: [{ uid: apiKeyUid, restrictions: {} }],
      policy: { bindings: [], etag: "e0", version: 1 },
    };
    this.projects.set(projectId, project);
    return project;
  }

  private operation(prefix: string, response?: unknown, error?: FakeOperation["error"]): Record<string, unknown> {
    const name = `operations/${prefix}${this.next++}`;
    const op: FakeOperation = { name, readsLeft: this.options.pollsUntilDone ?? 0, response, error };
    this.operations.set(name, op);
    return this.view(op);
  }

  private view(op: FakeOperation): Record<string, unknown> {
    if (op.readsLeft > 0) return { name: op.name, done: false };
    return { name: op.name, done: true, ...(op.error ? { error: op.error } : { response: op.response }) };
  }

  private readOperation(name: string): Answer {
    const op = this.operations.get(name);
    if (!op) return problem(404, "NOT_FOUND", `Operation ${name} not found.`);
    if (op.readsLeft > 0) op.readsLeft--;
    return json(200, this.view(op));
  }

  private bearer(authorization: string | null, account: string): boolean {
    return authorization === `Bearer ya29.${account}`;
  }

  private projectByIdOrNumber(id: string): FakeProject | undefined {
    return this.projects.get(id) ?? [...this.projects.values()].find((p) => p.number === id);
  }

  async handle(method: string, url: string, authorization: string | null, text: string): Promise<Answer> {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname);
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }
    this.calls.push({ method, path, authorization, body });
    const failure = this.failures.find((f) => f.match.test(`${method} ${path}`) && (f.times === undefined || f.times > 0));
    if (failure) {
      if (failure.times !== undefined) failure.times--;
      return problem(failure.status, failure.code, failure.message);
    }
    const apps = this.options.accounts["firebase-apps"] ?? "";
    const push = this.options.accounts["push-sender"] ?? "";
    let m: RegExpExecArray | null;

    // The Security Token Service: the assertion is checked as Google would, with the issuer's keys.
    if (method === "POST" && path === "/sts/v1/token") {
      const form = body as Record<string, string>;
      if (form.grant_type !== "urn:ietf:params:oauth:grant-type:token-exchange" || form.subject_token_type !== "urn:ietf:params:oauth:token-type:jwt") {
        return json(400, { error: "invalid_request", error_description: "Not a token exchange of a JWT." });
      }
      if (form.audience !== `//iam.googleapis.com/${this.options.provider}`) return json(400, { error: "invalid_target", error_description: "The audience isn't the provider." });
      let claims: Awaited<ReturnType<FakeGoogleOptions["verify"]>>;
      try {
        claims = await this.options.verify(form.subject_token ?? "");
      } catch (error) {
        return json(400, { error: "invalid_grant", error_description: `The assertion can't be verified: ${error instanceof Error ? error.message : String(error)}` });
      }
      this.assertions.push(claims);
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!aud.includes(`https://iam.googleapis.com/${this.options.provider}`)) return json(400, { error: "invalid_grant", error_description: "The audience is wrong." });
      if (!claims.sub || !(claims.sub in this.options.accounts)) return json(400, { error: "invalid_grant", error_description: "The attribute condition refuses this subject." });
      if ((claims.exp ?? 0) - (claims.iat ?? 0) > 3600) return json(400, { error: "invalid_grant", error_description: "The assertion lasts too long." });
      return json(200, { access_token: `sts.${claims.sub}`, issued_token_type: "urn:ietf:params:oauth:token-type:access_token", token_type: "Bearer", expires_in: 3600 });
    }

    // The IAM credentials API: the federated subject becomes its service account only.
    if (method === "POST" && (m = /^\/iamcredentials\/v1\/projects\/-\/serviceAccounts\/([^/:]+):generateAccessToken$/.exec(path))) {
      const email = m[1]!;
      const subject = authorization?.startsWith("Bearer sts.") ? authorization.slice("Bearer sts.".length) : null;
      if (!subject || this.options.accounts[subject] !== email) return problem(403, "PERMISSION_DENIED", `Permission 'iam.serviceAccounts.getAccessToken' denied on resource (or it may not exist).`);
      const scope = (body as { scope?: string[] }).scope ?? [];
      return json(200, { accessToken: `ya29.${email}`, expireTime: new Date(Date.now() + 3600_000).toISOString(), scope });
    }

    // FCM: the push sender sends to Yallapp's project.
    if (method === "POST" && (m = /^\/fcm\/v1\/projects\/([^/]+)\/messages:send$/.exec(path))) {
      if (!this.bearer(authorization, push)) return problem(401, "UNAUTHENTICATED", "Request had invalid authentication credentials.");
      const message = (body as { message?: Record<string, unknown> }).message ?? {};
      const token = String(message.token ?? "");
      if (token.startsWith("gone-")) return problem(404, "NOT_FOUND", "Requested entity was not found. UNREGISTERED");
      this.pushes.push({ project: m[1]!, token, authorization, message });
      return json(200, { name: `projects/${m[1]}/messages/${this.next++}` });
    }

    // Every other API is the apps account's.
    if (!this.bearer(authorization, apps)) return problem(401, "UNAUTHENTICATED", "Request had invalid authentication credentials.");

    // Resource Manager v3
    if (method === "POST" && path === "/cloudresourcemanager/v3/projects") {
      const input = body as { projectId: string; displayName: string; parent: string };
      if (!(this.options.creatableParents ?? []).includes(input.parent)) return problem(403, "PERMISSION_DENIED", `The caller does not have permission (resourcemanager.projects.create on ${input.parent}).`);
      if (this.projects.has(input.projectId)) return problem(409, "ALREADY_EXISTS", "Requested entity already exists");
      const number = String(900000000000 + this.next++);
      const project: FakeProject = {
        projectId: input.projectId,
        number,
        parent: input.parent,
        firebase: false,
        services: new Set(),
        android: [],
        ios: [],
        keys: [],
        policy: { bindings: [{ role: "roles/owner", members: [`serviceAccount:${apps}`] }], etag: "e1", version: 1 },
      };
      this.projects.set(input.projectId, project);
      return json(200, this.operation("cp.", { name: `projects/${number}`, projectId: input.projectId, displayName: input.displayName, parent: input.parent, state: "ACTIVE" }));
    }
    if (method === "GET" && (m = /^\/cloudresourcemanager\/v3\/(operations\/.+)$/.exec(path))) return this.readOperation(m[1]!);
    if ((m = /^\/cloudresourcemanager\/v3\/projects\/([^/:]+)(:getIamPolicy|:setIamPolicy)?$/.exec(path))) {
      const project = this.projects.get(m[1]!);
      if (!project) return problem(403, "PERMISSION_DENIED", "The caller does not have permission");
      if (!m[2]) return json(200, { name: `projects/${project.number}`, projectId: project.projectId, parent: project.parent, state: "ACTIVE" });
      if (m[2] === ":getIamPolicy") return json(200, project.policy);
      const policy = (body as { policy: FakeProject["policy"] }).policy;
      project.policy = { ...policy, etag: `e${this.next++}` };
      return json(200, project.policy);
    }
    if (method === "POST" && (m = /^\/cloudresourcemanager\/v3\/((?:organizations|folders)\/\d+):testIamPermissions$/.exec(path))) {
      const asked = (body as { permissions?: string[] }).permissions ?? [];
      return json(200, (this.options.creatableParents ?? []).includes(m[1]!) ? { permissions: asked } : {});
    }

    // Service Usage
    if (method === "POST" && (m = /^\/serviceusage\/v1\/projects\/([^/]+)\/services:batchEnable$/.exec(path))) {
      const project = this.projectByIdOrNumber(m[1]!);
      if (!project) return problem(403, "PERMISSION_DENIED", "The caller does not have permission");
      for (const id of (body as { serviceIds: string[] }).serviceIds) project.services.add(id);
      return json(200, this.operation("acf.", { services: [...project.services].map((s) => ({ name: `projects/${project.number}/services/${s}`, state: "ENABLED" })) }));
    }
    if (method === "GET" && (m = /^\/serviceusage\/v1\/(operations\/.+)$/.exec(path))) return this.readOperation(m[1]!);

    // API Keys v2
    if (method === "POST" && (m = /^\/apikeys\/v2\/projects\/([^/]+)\/locations\/global\/keys$/.exec(path))) {
      const project = this.projectByIdOrNumber(m[1]!);
      if (!project) return problem(403, "PERMISSION_DENIED", "The caller does not have permission");
      const uid = `0000-${project.projectId}-${this.next++}`;
      const restrictions = (body as { restrictions?: unknown }).restrictions ?? {};
      project.keys.push({ uid, restrictions });
      return json(200, this.operation("akmf.", { name: `projects/${project.number}/locations/global/keys/${uid}`, uid, displayName: (body as { displayName?: string }).displayName, restrictions }));
    }
    if (method === "GET" && (m = /^\/apikeys\/v2\/(operations\/.+)$/.exec(path))) return this.readOperation(m[1]!);

    // Firebase Management v1beta1
    if (method === "GET" && (m = /^\/firebase\/v1beta1\/(operations\/.+)$/.exec(path))) return this.readOperation(m[1]!);
    if ((m = /^\/firebase\/v1beta1\/projects\/([^/:]+)(:addFirebase)?$/.exec(path))) {
      const project = this.projects.get(m[1]!);
      if (!project) return problem(403, "PERMISSION_DENIED", "The caller does not have permission");
      if (m[2]) {
        if (project.firebase) return problem(409, "ALREADY_EXISTS", "Firebase is already on this project.");
        project.firebase = true;
        return json(200, this.operation("af.", { projectId: project.projectId, projectNumber: project.number, state: "ACTIVE" }));
      }
      if (!project.firebase) return problem(404, "NOT_FOUND", "No Firebase project.");
      return json(200, { projectId: project.projectId, projectNumber: project.number, displayName: project.projectId, state: "ACTIVE", name: `projects/${project.projectId}` });
    }
    if ((m = /^\/firebase\/v1beta1\/projects\/([^/]+)\/(androidApps|iosApps)(?:\/(.+?))?(\/config|:remove)?$/.exec(path))) {
      const project = this.projects.get(m[1]!);
      if (!project || !project.firebase) return problem(403, "PERMISSION_DENIED", "The caller does not have permission");
      const android = m[2] === "androidApps";
      const list = android ? project.android : project.ios;
      const record = (app: FakeApp) => ({ name: `projects/${project.projectId}/${m![2]}/${app.appId}`, appId: app.appId, displayName: app.displayName, projectId: project.projectId, state: "ACTIVE", ...(android ? { packageName: app.identifier } : { bundleId: app.identifier }) });
      if (!m[3] && method === "POST") {
        const input = body as { packageName?: string; bundleId?: string; displayName: string; apiKeyId: string };
        const identifier = (android ? input.packageName : input.bundleId) ?? "";
        if (list.some((a) => a.identifier === identifier)) return problem(409, "ALREADY_EXISTS", "Requested entity already exists");
        if (!project.keys.some((k) => k.uid === input.apiKeyId)) return problem(400, "INVALID_ARGUMENT", "The API key doesn't belong to this project.");
        const app: FakeApp = { appId: `1:${project.number}:${android ? "android" : "ios"}:${(this.next++).toString(16).padStart(12, "0")}`, identifier, displayName: input.displayName, apiKeyId: input.apiKeyId };
        list.push(app);
        return json(200, this.operation("fa.", record(app)));
      }
      if (!m[3] && method === "GET") {
        const size = Number(parsed.searchParams.get("pageSize") ?? 100);
        const start = Number(parsed.searchParams.get("pageToken") || 0);
        const page = list.slice(start, start + Math.min(size, 2));
        const next = start + page.length < list.length ? String(start + page.length) : undefined;
        return json(200, { apps: page.map(record), ...(next ? { nextPageToken: next } : {}) });
      }
      const app = list.find((a) => a.appId === m![3]);
      if (m[4] === ":remove" && method === "POST") {
        if (app) list.splice(list.indexOf(app), 1);
        else if (!(body as { allowMissing?: boolean }).allowMissing) return problem(404, "NOT_FOUND", "No such app.");
        return json(200, this.operation("rm.", {}));
      }
      if (!app) return problem(404, "NOT_FOUND", "No such app.");
      if (m[4] === "/config") {
        const file = android ? JSON.stringify(googleServices(project), null, 2) : plist(project, app);
        return json(200, { configFilename: android ? "google-services.json" : "GoogleService-Info.plist", configFileContents: Buffer.from(file).toString("base64") });
      }
    }
    return problem(404, "NOT_FOUND", `The fake has no ${method} ${path}.`);
  }

  /** As a fetch, for unit tests. */
  readonly fetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const headers = new Headers(init?.headers);
    const text = typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : "";
    const answer = await this.handle(init?.method ?? "GET", url, headers.get("authorization"), text);
    return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { "content-type": "application/json" } });
  };
}
