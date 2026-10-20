"use client";

import { useActionState, useState } from "react";
import { inviteMemberAction, updateMemberAction, type InviteState } from "@/app/actions/team";
import { useDashT } from "@/components/dashboard-i18n";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import type { DashKey } from "@/i18n/dashboard";
import { initialFormState } from "@/lib/forms";
import { TEAM_AREAS, type MemberRole, type TeamArea } from "@/lib/team/permissions";

export interface TeamAppChoice {
  id: string;
  label: string;
}

/**
 * 60 Role, what Staff can work on, and which apps: the same fields when
 * inviting and when changing someone's access. `prefix` keeps the ids apart
 * when several are on the page.
 */
function AccessFields({
  prefix,
  apps,
  initial,
  errors,
}: {
  prefix: string;
  apps: TeamAppChoice[];
  initial: { role: MemberRole; areas: readonly string[]; appIds: readonly string[] | null };
  errors?: Record<string, string>;
}) {
  const t = useDashT();
  const [role, setRole] = useState<MemberRole>(initial.role);
  const [some, setSome] = useState(initial.appIds !== null);
  return (
    <>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={errors?.role ? `${prefix}-role-error` : undefined}>
        <legend className="mb-1.5 text-sm font-semibold">{t("team.role")}</legend>
        {(["manager", "staff"] as const).map((value) => (
          <label key={value} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line px-3.5 py-3 has-[:checked]:border-midnight">
            <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="mt-1" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{t(`team.roles.${value}` as DashKey)}</span>
              <span className="text-[13px] text-muted">{t(`team.roleText.${value}` as DashKey)}</span>
            </span>
          </label>
        ))}
        <FieldError id={`${prefix}-role-error`} error={errors?.role} />
      </fieldset>
      {role === "staff" ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={errors?.areas ? `${prefix}-areas-error` : undefined}>
          <legend className="mb-1.5 text-sm font-semibold">{t("team.whatStaff")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEAM_AREAS.map((area: TeamArea) => (
              <label key={area} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3.5 py-2 text-sm">
                <input type="checkbox" name="areas" value={area} defaultChecked={initial.areas.includes(area)} />
                {t(`team.areas.${area}` as DashKey)}
              </label>
            ))}
          </div>
          <FieldError id={`${prefix}-areas-error`} error={errors?.areas} />
        </fieldset>
      ) : null}
      {apps.length > 1 ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={errors?.appIds ? `${prefix}-apps-error` : undefined}>
          <legend className="mb-1.5 text-sm font-semibold">{t("team.apps")}</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name="apps" value="all" checked={!some} onChange={() => setSome(false)} />
            {t("team.allApps")}
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name="apps" value="some" checked={some} onChange={() => setSome(true)} />
            {t("team.someApps")}
          </label>
          {some ? (
            <div className="flex flex-col gap-2 ps-7">
              {apps.map((app) => (
                <label key={app.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" name="appIds" value={app.id} defaultChecked={initial.appIds?.includes(app.id) ?? false} />
                  {app.label}
                </label>
              ))}
            </div>
          ) : null}
          <FieldError id={`${prefix}-apps-error`} error={errors?.appIds} />
        </fieldset>
      ) : (
        <input type="hidden" name="apps" value="all" />
      )}
    </>
  );
}

export function InviteForm({ apps }: { apps: TeamAppChoice[] }) {
  const t = useDashT();
  const [state, action] = useActionState<InviteState, FormData>(inviteMemberAction, initialFormState);
  return (
    <form action={action} noValidate className="flex max-w-[640px] flex-col gap-4" key={state.ok ? `sent-${state.sent}` : "invite"}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("team.name")} name="name" required maxLength={120} autoComplete="off" defaultValue={state.ok ? "" : state.values?.name} error={state.errors?.name} />
        <Field label={t("team.email")} name="email" type="email" required maxLength={191} autoComplete="off" dir="ltr" defaultValue={state.ok ? "" : state.values?.email} error={state.errors?.email} />
      </div>
      <AccessFields prefix="invite" apps={apps} initial={{ role: "staff", areas: [], appIds: null }} errors={state.errors} />
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.sending")}>
          {t("team.sendInvite")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function MemberForm({ userId, apps, initial }: { userId: string; apps: TeamAppChoice[]; initial: { role: MemberRole; areas: readonly string[]; appIds: readonly string[] | null } }) {
  const t = useDashT();
  const [state, action] = useActionState(updateMemberAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4 pt-3">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage message={state.message} ok={state.ok} />
      <AccessFields prefix={`m-${userId}`} apps={apps} initial={initial} errors={state.errors} />
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("team.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
