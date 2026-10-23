"use client";

import { useActionState } from "react";
import { addDesignAction, editDesignAction } from "@/app/actions/admin-designs";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 84.4 A new design from an app's draft. */
export function AddDesignForm() {
  const [state, action] = useActionState(addDesignAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5" aria-label="Add a design">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        id="f-design-app"
        label="The app's ID"
        name="appId"
        required
        defaultValue={state.ok ? "" : state.values?.appId}
        hint="Build the design in that app's Pages & look (a demo app or a client's, with their agreement), then copy the ID from the app's section on the client's page. The design is for that app's kind."
        error={state.errors?.appId}
        small
      />
      <Field id="f-design-name" label="Name" name="name" required maxLength={40} defaultValue={state.ok ? "" : state.values?.name} error={state.errors?.name} small />
      <Field
        id="f-design-description"
        label="One line about it"
        name="description"
        required
        maxLength={110}
        defaultValue={state.ok ? "" : state.values?.description}
        error={state.errors?.description}
        small
      />
      <SubmitButton className="h-10 self-start px-4 text-sm" pendingText="Adding…">
        Add the design
      </SubmitButton>
    </form>
  );
}

/** 84.4 A team design's name and line. */
export function EditDesignForm({ id, name, description }: { id: string; name: string; description: string }) {
  const [state, action] = useActionState(editDesignAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2.5" aria-label={`Edit ${name}`}>
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field id={`f-${id}-name`} label="Name" name="name" required maxLength={40} defaultValue={state.values?.name ?? name} error={state.errors?.name} small />
      <Field id={`f-${id}-description`} label="One line about it" name="description" required maxLength={110} defaultValue={state.values?.description ?? description} error={state.errors?.description} small />
      <SubmitButton variant="secondary" className="h-9 self-start px-3 text-sm" pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
