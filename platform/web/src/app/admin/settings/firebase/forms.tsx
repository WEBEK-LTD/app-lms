"use client";

import { useActionState } from "react";
import {
  addFirebaseProjectAction,
  checkFirebaseAction,
  makeNextFirebaseProjectAction,
  saveFirebaseParentAction,
  updateFirebaseProjectAction,
  type FirebaseCheckState,
} from "@/app/actions/admin-firebase";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { FirebaseProjectStatus } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";

/** 136 Admin › Settings › Yallapp Firebase projects: its forms (the admin is in English). */

export function FirebaseCheckForm() {
  const [state, action] = useActionState<FirebaseCheckState>(checkFirebaseAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      {state.lines?.length ? (
        <ul aria-label="Check results" className="m-0 flex list-none flex-col gap-2 p-0">
          {state.lines.map((line) => (
            <li key={line.label} className="flex items-start gap-2 text-sm">
              <Icon name={line.ok ? "check_circle" : "error"} size={20} filled className={line.ok ? "text-success" : "text-danger"} />
              <span>
                <b>{line.label}</b>: <span dir="auto">{line.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <SubmitButton className="h-11" pendingText="Checking…">
          Check
        </SubmitButton>
      </div>
    </form>
  );
}

export function MakeNextProjectForm({ canMake }: { canMake: boolean }) {
  const [state, action] = useActionState(makeNextFirebaseProjectAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <p className="m-0 text-sm text-ink-4">
        {canMake
          ? "The platform makes the next project by itself when the pool runs low. You can start it now."
          : "Set where new projects are made, below, so the platform can make them by itself."}
      </p>
      {canMake ? (
        <div>
          <SubmitButton variant="secondary" className="h-10" pendingText="Making it…">
            Make the next project now
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}

export function FirebaseProjectForm({ projectId, status, maxApps }: { projectId: string; status: FirebaseProjectStatus; maxApps: number }) {
  const [state, action] = useActionState(updateFirebaseProjectAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`status-${projectId}`} className="text-sm font-semibold">
          Takes new clients
        </label>
        <select id={`status-${projectId}`} name="status" defaultValue={state.values?.status ?? status} className="h-10 rounded-[10px] border border-line-strong bg-white px-3 text-sm">
          <option value="open">Open</option>
          <option value="full">Full</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <Field small className="w-[140px]" label="Most apps" name="maxApps" id={`max-${projectId}`} inputMode="numeric" defaultValue={state.values?.maxApps ?? String(maxApps)} error={state.errors?.maxApps} />
      <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
        Save {projectId}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

export function FirebaseParentForm({ parent }: { parent: string }) {
  const [state, action] = useActionState(saveFirebaseParentAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Organization or folder"
        name="parent"
        dir="ltr"
        defaultValue={state.values?.parent ?? parent}
        placeholder="organizations/123456789012"
        hint="organizations/ or folders/ and its number, from Google Cloud › IAM & Admin › Settings. Empty: GOOGLE_FIREBASE_PROJECT_PARENT."
        error={state.errors?.parent}
      />
      <div>
        <SubmitButton className="h-11" pendingText="Saving…">
          Save where projects are made
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddFirebaseProjectForm() {
  const [state, action] = useActionState(addFirebaseProjectAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-wrap gap-3">
        <Field className="flex-[1_1_220px]" label="Project ID" name="projectId" dir="ltr" placeholder="yallapp-push-01" defaultValue={state.values?.projectId ?? ""} error={state.errors?.projectId} />
        <Field className="flex-[1_1_180px]" label="Project number" name="projectNumber" dir="ltr" inputMode="numeric" placeholder="123456789012" defaultValue={state.values?.projectNumber ?? ""} error={state.errors?.projectNumber} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Field
          className="flex-[1_1_260px]"
          label="API key ID"
          name="apiKeyId"
          dir="ltr"
          placeholder="the key's uid"
          hint="Its uid from gcloud services api-keys list: the ID, never the key string."
          defaultValue={state.values?.apiKeyId ?? ""}
          error={state.errors?.apiKeyId}
        />
        <Field className="flex-[0_1_140px]" label="Most apps" name="maxApps" inputMode="numeric" placeholder="28" defaultValue={state.values?.maxApps ?? ""} error={state.errors?.maxApps} />
      </div>
      <div>
        <SubmitButton className="h-11" pendingText="Adding…">
          Add the project
        </SubmitButton>
      </div>
    </form>
  );
}
