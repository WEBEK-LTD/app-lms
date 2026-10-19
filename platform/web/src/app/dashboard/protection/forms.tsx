"use client";

import { useActionState } from "react";
import { saveScreenProtectionAction } from "@/app/actions/screen-protection";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 53 What the app protects from screenshots and screen recording. */
export function ScreenProtectionForm({ current, academy, wordpress }: { current: string; academy: boolean; wordpress: boolean }) {
  const [state, action] = useActionState(saveScreenProtectionAction, initialFormState);
  const value = state.values?.protection ?? current;
  const choices = [
    { value: "off", label: "Off", hint: "People can take screenshots and record the screen anywhere in the app." },
    ...(academy
      ? [
          {
            value: "content",
            label: "Course content only",
            hint: "Lessons, quizzes, their attachments and lesson videos (full screen too) are protected. The rest of the app isn't.",
          },
        ]
      : []),
    { value: "app", label: "The whole app", hint: "Every screen of the app is protected." },
    ...(wordpress
      ? [{ value: "plugin", label: "As set in the Yallapp plugin", hint: "Follows \"Block screenshots & screen recording\" in the plugin's settings on your website." }]
      : []),
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={value}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.protection ? "protection-error" : undefined}>
        <legend className="mb-1 text-[15px] font-bold">Block screenshots and screen recording</legend>
        {choices.map((c) => (
          <label key={c.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input type="radio" name="protection" value={c.value} defaultChecked={value === c.value} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col">
              <span className="font-semibold">{c.label}</span>
              <span className="text-sm text-muted">{c.hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="protection-error" error={state.errors?.protection} />
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
