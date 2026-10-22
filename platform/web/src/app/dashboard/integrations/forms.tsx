"use client";

import { useActionState } from "react";
import { testIntegrationAction } from "@/app/actions/integrations";
import { FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import type { IntegrationKey } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";

/** 80.1 "Test": asks the connection now and keeps the result (the page shows it). */
export function TestIntegrationForm({ integration }: { integration: IntegrationKey }) {
  const t = useDashT();
  const [state, action] = useActionState(testIntegrationAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="key" value={integration} />
      <SubmitButton className="h-9 px-4 text-sm">
        {t("integrations.test")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}
