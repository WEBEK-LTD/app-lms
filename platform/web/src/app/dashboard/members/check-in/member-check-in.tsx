"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { memberCheckInAction, type MemberCheckInState } from "@/app/actions/members";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { MemberCheckInOutcome } from "@/lib/bookings/door";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { formatDate } from "@/i18n/format";
import { richText } from "@/i18n/rich";
import { QrScanner } from "../../check-in/scanner";

const TONE: Record<MemberCheckInOutcome, "ok" | "stop" | "warn"> = {
  admitted: "ok",
  already_in: "stop",
  expired: "stop",
  cancelled: "stop",
  not_started: "stop",
  frozen: "stop",
  no_credits: "stop",
  forged: "stop",
  not_found: "warn",
  not_a_code: "warn",
};

/** 63 What the door says, as big as the events' check-in. */
export function MemberResult({ state, timeZone }: { state: MemberCheckInState; timeZone: string }) {
  const t = useDashT();
  const lang = useDashLang();
  const answer = state.answer;
  if (!answer) return null;
  const m = answer.member;
  const time = (at: Date | string) => formatDate(lang, new Date(at), { hour: "2-digit", minute: "2-digit", timeZone });
  const day = (at: Date | string) => formatDate(lang, new Date(at), { day: "numeric", month: "short", year: "numeric", timeZone });
  const headline: Record<MemberCheckInOutcome, string> = {
    admitted: t("door.admitted"),
    already_in: m?.checkedInAt ? t("door.alreadyInAt", { time: time(m.checkedInAt) }) : t("door.alreadyIn"),
    expired: m?.endsAt ? t("door.expiredOn", { date: day(m.endsAt) }) : t("door.expired"),
    cancelled: t("door.cancelled"),
    not_started: t("door.notStarted"),
    // 64 "Frozen until …", the day it's back.
    frozen: m?.frozenUntil ? t("door.frozenUntil", { date: day(m.frozenUntil) }) : t("door.frozen"),
    no_credits: t("door.noCredits"),
    forged: t("door.forged"),
    not_found: t("door.notFound"),
    not_a_code: t("door.notACode"),
  };
  const tone = TONE[answer.outcome];
  const colors = tone === "ok" ? "bg-success-bg text-success" : tone === "stop" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn";
  return (
    <div role="status" aria-live="polite" className={`flex flex-col gap-2 rounded-2xl px-5 py-4 ${colors}`} data-testid="member-result">
      <p className="m-0 flex items-center gap-2 text-[20px] leading-tight font-extrabold">
        <Icon name={tone === "ok" ? "check_circle" : tone === "stop" ? "block" : "warning"} size={28} filled />
        {headline[answer.outcome]}
      </p>
      {m ? (
        <p className="m-0 text-[16px] text-ink-2">
          <b>{m.name}</b> · {m.planName} · {m.endsAt ? t("door.ends", { date: day(m.endsAt) }) : t("door.noEnd")} ·{" "}
          {m.creditsLeft === null ? t("door.unlimited") : t("door.classesLeft", { count: m.creditsLeft })}
        </p>
      ) : null}
    </div>
  );
}

/** 63 The member code, scanned with the camera or typed. */
export function MemberCheckIn({ timeZone }: { timeZone: string }) {
  const t = useDashT();
  const [state, action, pending] = useActionState(memberCheckInAction, {});
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  // A new answer: ready for the next member.
  useEffect(() => {
    if (!state.at || !input.current) return;
    input.current.value = "";
    if (!scanning) input.current.focus();
  }, [state.at, scanning]);

  return (
    <div className="flex flex-col gap-5">
      <form ref={form} action={action} className="flex flex-col gap-1.5" autoComplete="off">
        <label htmlFor="f-member-code" className="text-sm font-semibold">
          {t("door.code")}
        </label>
        <div className="flex gap-2">
          <input
            ref={input}
            id="f-member-code"
            name="code"
            className="input min-w-0 flex-1 font-mono text-[18px] tracking-wider uppercase"
            placeholder="Q4MZ-7KP2-XH9D"
            dir="ltr"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-describedby="f-member-code-hint"
            required
          />
          <button type="submit" className={`${btn.primary} h-12 shrink-0`} disabled={pending}>
            {pending ? t("door.checking") : t("door.checkInButton")}
          </button>
        </div>
        <span id="f-member-code-hint" className="text-xs text-muted">
          {t("door.codeHint")}
        </span>
      </form>
      <QrScanner
        onScanning={setScanning}
        onRead={(value) => {
          if (input.current) input.current.value = value;
          form.current?.requestSubmit();
        }}
      />
      <MemberResult state={state} timeZone={timeZone} />
    </div>
  );
}

/** 63 Checking in a member found by name. */
export function NameCheckIn({ membershipId, name, timeZone }: { membershipId: number; name: string; timeZone: string }) {
  const t = useDashT();
  const [state, action, pending] = useActionState(memberCheckInAction, {});
  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <input type="hidden" name="membershipId" value={membershipId} />
        <button type="submit" className={`${btn.secondary} h-10 text-sm`} disabled={pending}>
          {pending ? t("door.checking") : richText(t("door.checkInNamed", { name }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
        </button>
      </form>
      <MemberResult state={state} timeZone={timeZone} />
    </div>
  );
}
