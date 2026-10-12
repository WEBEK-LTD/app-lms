import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "./build-config.schema.json";
import type { BuildConfig } from "./types";

/**
 * Validates a build config against docs/build-config.schema.json.
 * The schema file here is a copy; a unit test keeps it identical to docs/.
 */

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validator = ajv.compile<BuildConfig>(schema);

export interface ConfigError {
  path: string;
  message: string;
}

export function validateBuildConfig(value: unknown): { ok: true; config: BuildConfig } | { ok: false; errors: ConfigError[] } {
  if (validator(value)) return { ok: true, config: value };
  const errors = (validator.errors ?? []).map((error) => ({
    path: error.instancePath || "/",
    message: error.message ?? "is invalid",
  }));
  return { ok: false, errors };
}
