/**
 * The endpoint list on /developers, made from the app contract
 * (docs/api/openapi.yaml). The page reads src/content/api-reference.json,
 * which tests/unit/api-reference.test.ts keeps equal to what this function
 * makes from the contract: after a contract change, run
 * `UPDATE_API_REFERENCE=1 npx vitest run tests/unit/api-reference.test.ts`.
 */

export interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  description: string | null;
  /** "public": no token; "signed-in": a token is required; "optional": works both ways. */
  access: "public" | "signed-in" | "optional";
}

export interface ApiTag {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export interface ApiReference {
  title: string;
  version: string;
  tags: ApiTag[];
}

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Obj) : {});
const str = (value: unknown): string => (typeof value === "string" ? value : "");
/** One paragraph of text: line breaks inside YAML blocks become spaces. */
const tidy = (value: string): string =>
  value
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

function access(operation: Obj, defaultSecurity: unknown): ApiEndpoint["access"] {
  const security = Array.isArray(operation.security) ? operation.security : Array.isArray(defaultSecurity) ? defaultSecurity : [];
  if (security.length === 0) return "public";
  const anonymous = security.some((s) => Object.keys(obj(s)).length === 0);
  return anonymous ? "optional" : "signed-in";
}

export function buildApiReference(contract: unknown): ApiReference {
  const root = obj(contract);
  const info = obj(root.info);
  const tags: ApiTag[] = (Array.isArray(root.tags) ? root.tags : []).map((t) => ({
    name: str(obj(t).name),
    description: tidy(str(obj(t).description)),
    endpoints: [],
  }));
  const byName = new Map(tags.map((t) => [t.name, t]));
  for (const [path, item] of Object.entries(obj(root.paths))) {
    for (const method of METHODS) {
      const operation = obj(obj(item)[method]);
      if (!Object.keys(operation).length) continue;
      const tagName = str((Array.isArray(operation.tags) ? operation.tags : [])[0]);
      const tag = byName.get(tagName);
      if (!tag) continue;
      const description = tidy(str(operation.description));
      tag.endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: str(operation.summary),
        description: description || null,
        access: access(operation, root.security),
      });
    }
  }
  return { title: str(info.title), version: str(info.version), tags: tags.filter((t) => t.endpoints.length > 0) };
}
