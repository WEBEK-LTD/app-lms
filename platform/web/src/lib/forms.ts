import type { z } from "zod";

/** State returned by server actions to forms (useActionState). */
export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Submitted values, echoed back so fields keep what the user typed. Never contains secrets. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = {};

/** The first error message for each top-level field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** String values from FormData, skipping files and the listed secret fields. */
export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$ACTION")) values[key] = value;
  });
  return values;
}
