import { Icon } from "@/components/icon";
import type { DashT } from "@/i18n/dashboard";
import { clockParts } from "@/lib/market/complaint-queue";
import { replyTone } from "@/lib/market/complaints";
import { takeFromQueueAction } from "@/app/actions/market-complaints";

/** 115.53 The complaints pages' small parts (designs 11 and 12). */

/** "9 min", "1 h 12 min", "3 d". */
export function clock(minutes: number, t: DashT): string {
  const p = clockParts(minutes);
  switch (p.kind) {
    case "m":
      return t("complaints.clockMinutes", { m: p.m });
    case "h":
      return t("complaints.clockHours", { h: p.h });
    case "hm":
      return t("complaints.clockHoursMinutes", { h: p.h, m: p.m });
    case "d":
      return t("complaints.clockDays", { d: p.d });
  }
}

const TILES = ["bg-[#2F6F5E]", "bg-[#8A4FBF]", "bg-[#C2410C]", "bg-[#1F5FA8]", "bg-[#8C6D1F]"];

/** A person's round initial, its colour from their name. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const tile = TILES[[...name].reduce((n, ch) => n + ch.codePointAt(0)!, 0) % TILES.length];
  return (
    <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ${tile}`} style={{ width: size, height: size }}>
      {[...name][0]?.toLocaleUpperCase() ?? "?"}
    </span>
  );
}

const TONES = { ok: "text-success", amber: "text-warn", red: "text-danger" } as const;
const DOTS = { ok: "bg-success", amber: "bg-warn", red: "bg-danger" } as const;

/** "Since last reply", green, amber or red by the owner's minutes. */
export function ReplyWait({ minutes, waitingOn, colours, t }: { minutes: number | null; waitingOn: "support" | "customer" | null; colours: { amberMinutes: number; redMinutes: number }; t: DashT }) {
  if (minutes === null) return <span className="text-faint">—</span>;
  const tone = replyTone(minutes, waitingOn, colours);
  if (!tone) return <span className="text-ink-4">{clock(minutes, t)}</span>;
  return (
    <span className={`font-semibold whitespace-nowrap ${TONES[tone]}`}>
      <span aria-hidden="true" className={`me-1.5 inline-block h-1.5 w-1.5 rounded-full align-[1px] ${DOTS[tone]}`} />
      {clock(minutes, t)}
    </span>
  );
}

/** The dashed "Take it" button. */
export function TakeIt({ id, hidden, t }: { id: number; hidden: Record<string, string>; t: DashT }) {
  return (
    <form action={takeFromQueueAction}>
      <input type="hidden" name="id" value={id} />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-line-strong px-2.5 text-[12px] font-semibold text-accent hover:border-accent">
        <Icon name="how_to_reg" size={15} />
        {t("complaints.takeIt")}
      </button>
    </form>
  );
}
