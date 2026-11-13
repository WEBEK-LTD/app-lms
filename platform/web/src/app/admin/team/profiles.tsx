import { saveStaffProfileAction } from "@/app/actions/admin-account-managers";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
import { DEFAULT_STAFF_TIMEZONE, hoursLabel, STAFF_TIMEZONES } from "@/lib/admin/account-managers";
import type { TeamRow } from "@/lib/admin/team";
import type { StaffProfile } from "@/lib/data/types";

const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [7, "Sun"],
] as const;

/**
 * 125 VIP: each team member's contact card (photo, WhatsApp, phone, working
 * hours) and whether they are an account manager, whom Admin › Clients can
 * give a client. Clients see it in Yallapp Business and ask for calls in
 * those hours. Owners change it; everyone sees it.
 */
export function ContactCards({ team, profiles, manage, error }: { team: TeamRow[]; profiles: Map<string, StaffProfile>; manage: boolean; error: { for: string | null; text: string } | null }) {
  const members = team.filter((m) => m.userId);
  return (
    <section aria-labelledby="h-contact-cards" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 id="h-contact-cards" className="m-0 text-[17px] font-bold">
          Contact cards and account managers
        </h2>
        <p className="m-0 text-sm text-muted">
          A client whose plan comes with an account manager sees their manager in Yallapp Business: the photo, WhatsApp and phone, and the hours they take calls. Mark someone as an account manager to choose them on a client&apos;s page.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {members.map((m) => {
          const p = profiles.get(m.userId!) ?? null;
          const hours = p?.hours ?? null;
          const formId = `profile-${m.userId}`;
          return (
            <details key={m.userId} className="rounded-xl border border-line-soft p-3.5" open={error?.for === m.userId}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[15px]">
                <span className="font-bold">{m.name}</span>
                <span className="text-xs break-all text-muted">{m.email}</span>
                {p?.accountManager ? <Badge tone="info">Account manager</Badge> : null}
                {hours ? <span className="text-xs text-muted">{hoursLabel(hours, "en")} ({hours.timezone})</span> : null}
              </summary>
              {error?.for === m.userId ? (
                <p role="alert" className="m-0 mt-2 text-sm font-semibold text-danger">
                  {error.text}
                </p>
              ) : null}
              {manage ? (
                <form id={formId} action={saveStaffProfileAction} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="userId" value={m.userId!} />
                  <input type="hidden" name="back" value="/admin/team" />
                  <div className="flex flex-wrap gap-3">
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-semibold">
                      WhatsApp
                      <input name="whatsapp" defaultValue={p?.whatsapp ?? ""} placeholder="+90 532 123 45 67" inputMode="tel" className="input input-sm" />
                    </label>
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm font-semibold">
                      Phone
                      <input name="phone" defaultValue={p?.phone ?? ""} placeholder="+90 212 123 45 67" inputMode="tel" className="input input-sm" />
                    </label>
                  </div>
                  <fieldset className="m-0 flex flex-wrap items-center gap-3 border-0 p-0">
                    <legend className="mb-1 text-sm font-semibold">Days they take calls</legend>
                    {DAYS.map(([day, label]) => (
                      <label key={day} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="days" value={day} defaultChecked={hours?.days.includes(day) ?? false} className="h-4 w-4 accent-midnight" />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      From
                      <input type="time" name="from" step={1800} defaultValue={hours?.from ?? ""} className="input input-sm w-auto" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      To
                      <input type="time" name="to" step={1800} defaultValue={hours?.to ?? ""} className="input input-sm w-auto" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      Time zone
                      <select name="timezone" defaultValue={hours?.timezone ?? DEFAULT_STAFF_TIMEZONE} className="input input-sm w-auto">
                        {STAFF_TIMEZONES.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                      Photo (PNG, JPEG or WebP, up to 5 MB)
                      <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="text-sm" />
                    </label>
                    {p?.photo ? (
                      <label className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-midnight" />
                        Remove the photo
                      </label>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold">
                    <input type="checkbox" name="accountManager" defaultChecked={p?.accountManager ?? false} className="h-[18px] w-[18px] accent-midnight" />
                    Account manager: clients can be given them
                  </label>
                  <span>
                    <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                      <span>
                        Save<span className="sr-only"> the contact card of {m.email}</span>
                      </span>
                    </SubmitButton>
                  </span>
                </form>
              ) : (
                <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="font-semibold">WhatsApp</dt>
                  <dd className="m-0">{p?.whatsapp ?? "—"}</dd>
                  <dt className="font-semibold">Phone</dt>
                  <dd className="m-0">{p?.phone ?? "—"}</dd>
                </dl>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
