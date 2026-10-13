import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expect } from "vitest";
import { parse } from "yaml";

// Every response is checked against docs/api/openapi.yaml, as the app reads it.
const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8")) as {
  paths: Record<string, Record<string, { responses: Record<string, { $ref?: string; content?: unknown }> }>>;
  components: { responses: Record<string, { content: unknown }> };
};
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "openapi");

const pointer = (...parts: string[]) => parts.map((p) => p.replaceAll("~", "~0").replaceAll("/", "~1")).join("/");

export function expectContract(method: string, route: string, result: { status: number; body?: unknown }) {
  const response = contract.paths[route]?.[method.toLowerCase()]?.responses[String(result.status)];
  expect(response, `${method} ${route} ${result.status} is in the contract`).toBeDefined();
  if (result.status === 204) return;
  const ref = response!.$ref
    ? `openapi#/components/responses/${pointer(response!.$ref.split("/").pop()!)}/content/application~1json/schema`
    : `openapi#/paths/${pointer(route)}/${method.toLowerCase()}/responses/${result.status}/content/application~1json/schema`;
  const validate = ajv.getSchema(ref);
  expect(validate, ref).toBeDefined();
  const valid = validate!(result.body);
  expect(valid, `${method} ${route}: ${JSON.stringify(validate!.errors)}`).toBe(true);
}

