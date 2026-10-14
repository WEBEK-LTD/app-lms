import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expect } from "vitest";
import { parse } from "yaml";

// Responses of the platform API checked against docs/api/platform.yaml, as the plugin reads them.
const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/platform.yaml"), "utf8")) as {
  paths: Record<string, Record<string, { responses: Record<string, { $ref?: string; content?: unknown }> }>>;
};
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "platform");

const pointer = (...parts: string[]) => parts.map((p) => p.replaceAll("~", "~0").replaceAll("/", "~1")).join("/");

export function expectPlatformContract(method: string, route: string, result: { status: number; body?: unknown }) {
  const response = contract.paths[route]?.[method.toLowerCase()]?.responses[String(result.status)];
  expect(response, `${method} ${route} ${result.status} is in the contract`).toBeDefined();
  if (!response!.$ref && !response!.content) return;
  const ref = response!.$ref
    ? `platform#/components/responses/${pointer(response!.$ref.split("/").pop()!)}/content/application~1json/schema`
    : `platform#/paths/${pointer(route)}/${method.toLowerCase()}/responses/${result.status}/content/application~1json/schema`;
  const validate = ajv.getSchema(ref);
  expect(validate, ref).toBeDefined();
  const valid = validate!(result.body);
  expect(valid, `${method} ${route}: ${JSON.stringify(validate!.errors)}`).toBe(true);
}
