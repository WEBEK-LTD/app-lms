import Link from "next/link";
import { setAccountManagerAction, updateCallAction } from "@/app/actions/admin-account-managers";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
import type { CallRow } from "@/lib/admin/calls";
import type { AccountManagerCallStatus } from "@/lib/data/types";

/** 125 What Admin › Calls and a client's page share: the calls clients asked for with their account manager. */

export const CALL_STATUS: Record<AccountManagerCallStatus, { label: string; tone: "warn" | "success" | "info" | "neutral" }> = {
  requested: { label: "Asked for", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "success" },
  moved: { label: "Moved", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** The calls, soonest first, each with Confirm, Move to a day and time, and Cancel. */
export function CallList({ rows, back, edit, showClient }: { rows: CallRow[]; back: string; edit: boolean; showClient: boolean }) {
  if (rows.length === 0) return <p className="m-0 text-sm text-muted">No calls asked for.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {rows.map(({ call, clientName, managerName, timezone }) => {
        const open = call.status !== "cancelled";
        return (
          <li key={call.id} className="flex flex-col gap-2 rounded-xl border border-line-soft p-3.5">
            <div className="flex flex-wrap items-center gap-2 text-[15px]">
              <span className="font-bold">
                {call.date} {call.time}
              </span>
              {timezone ? <span className="text-xs text-muted">{timezone}</span> : null}
              <Badge tone={CALL_STATUS[call.status].tone}>{CALL_STATUS[call.status].label}</Badge>
            </div>
            <span className="text-sm">
              {showClient ? (
                <>
                  <Link href={`/admin/clients/${call.clientId}`}>{clientName}</Link> ·{" "}
                </>
              ) : null}
              Asked by {call.requesterName} for {managerName}
            </span>
            {call.note ? <span className="text-sm text-muted">{call.note}</span> : null}
            {edit && open ? (
              <div className="flex flex-wrap items-end gap-2">
                {call.status !== "confirmed" ? (
                  <form action={updateCallAction}>
                    <input type="hidden" name="id" value={call.id} />
                    <input type="hidden" name="op" value="confirm" />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                      <span>
                        Confirm<span className="sr-only"> the call on {call.date} at {call.time}</span>
                      </span>
                    </SubmitButton>
                  </form>
                ) : null}
                <form action={updateCallAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={call.id} />
                  <input type="hidden" name="op" value="move" />
                  <input type="hidden" name="back" value={back} />
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    New day
                    <input type="date" name="date" defaultValue={call.date} required className="input input-sm w-auto" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    Time
                    <input type="time" name="time" step={1800} defaultValue={call.time} required className="input input-sm w-auto" />
                  </label>
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    <span>
                      Move<span className="sr-only"> the call on {call.date} at {call.time}</span>
                    </span>
                  </SubmitButton>
                </form>
                <form action={updateCallAction}>
                  <input type="hidden" name="id" value={call.id} />
                  <input type="hidden" name="op" value="cancel" />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                    <span>
                      Cancel<span className="sr-only"> the call on {call.date} at {call.time}</span>
                    </span>
                  </SubmitButton>
                </form>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** A client's account manager: one of the team marked "Account manager" (Admin › Team), or none. */
export function ManagerPicker({ clientId, current, managers, edit }: { clientId: string; current: string | null; managers: { id: string; name: string; email: string }[]; edit: boolean }) {
  const chosen = managers.find((m) => m.id === current) ?? null;
  if (!edit) return <p className="m-0 text-[15px]">{chosen ? `${chosen.name} (${chosen.email})` : "None chosen"}</p>;
  if (managers.length === 0)
    return (
      <p className="m-0 text-sm text-muted">
        Nobody on the team is an account manager yet. Mark someone on <Link href="/admin/team">Team</Link>.
      </p>
    );
  return (
    <form action={setAccountManagerAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="back" value={`/admin/clients/${clientId}`} />
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Account manager
        <select name="managerId" defaultValue={chosen?.id ?? ""} className="input input-sm w-auto">
          <option value="">None</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
      </label>
      <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
        Save
      </SubmitButton>
    </form>
  );
}
