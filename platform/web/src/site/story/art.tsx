import { Icon } from "@/components/icon";
import type { ChapterArt } from "./stories";
import type { StoryArtText } from "./types";

/**
 * The story pages' drawn pictures, made here in SVG and CSS (no images,
 * nothing generated): a city with a route the vehicle drives along, the
 * gate's code, the class register, a fare's rule, a ride offer's countdown,
 * a place running late, and a scale; 131.40 the flower shop's day and slot,
 * flash sale, gift card and delivery fee. They move once they are seen
 * (./effects.tsx) and stand still with "reduce motion".
 */

/** The route, in the map's 400 × 300 box. */
const ROUTE = "M52 238 C 92 232, 104 196, 138 188 S 196 196, 214 160 S 246 96, 292 92 S 336 70, 352 54";

/**
 * A stylised city at night: streets, blocks, a river with its bridges, and
 * the route drawn from the pickup to the drop-off with the vehicle on it.
 */
export function RouteMap({ label, icon = "two_wheeler" }: { label: string; icon?: "two_wheeler" | "local_taxi" | "directions_bus" | "delivery_dining" }) {
  const streets = [36, 84, 132, 180, 228, 276];
  const avenues = [40, 100, 160, 220, 280, 340];
  return (
    <figure className="story-route m-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1530] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]" data-reveal="" data-route="">
      <svg viewBox="0 0 400 300" className="block h-auto w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="story-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1d3a6b" />
            <stop offset="1" stopColor="#15305c" />
          </linearGradient>
          <radialGradient id="story-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Blocks between the streets, a few of them parks. */}
        {streets.slice(0, -1).map((y, row) =>
          avenues.slice(0, -1).map((x, col) => (
            <rect
              key={`${row}-${col}`}
              x={x + 6}
              y={y + 6}
              width={48}
              height={36}
              rx={5}
              fill={(row * 7 + col * 3) % 5 === 0 ? "#14324a" : "#121c3a"}
            />
          )),
        )}
        {streets.map((y) => (
          <line key={`s${y}`} x1="0" x2="400" y1={y} y2={y} stroke="#1f2a4f" strokeWidth="3" />
        ))}
        {avenues.map((x) => (
          <line key={`a${x}`} y1="0" y2="300" x1={x} x2={x} stroke="#1f2a4f" strokeWidth="3" />
        ))}
        {/* The river and two bridges. */}
        <path d="M250 -10 C 236 60, 262 120, 244 180 S 230 260, 252 320" fill="none" stroke="url(#story-river)" strokeWidth="26" />
        <line x1="226" x2="276" y1="84" y2="84" stroke="#3a4670" strokeWidth="6" />
        <line x1="216" x2="268" y1="228" y2="228" stroke="#3a4670" strokeWidth="6" />
        {/* The route: a faint full line, then the drawn one. */}
        <path d={ROUTE} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="6" strokeLinecap="round" />
        <path d={ROUTE} pathLength={1} className="story-route-line" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
        {/* Pickup and drop-off. */}
        <circle cx="52" cy="238" r="9" fill="#0d1530" stroke="#fff" strokeWidth="3" />
        <circle cx="352" cy="54" r="22" fill="url(#story-glow)" />
        <path d="M352 30 c -9 0 -16 7 -16 16 c 0 12 16 26 16 26 s 16 -14 16 -26 c 0 -9 -7 -16 -16 -16z" fill="var(--accent)" />
        <circle cx="352" cy="46" r="5.5" fill="#0d1530" />
        {/* The vehicle, driving the route once it is seen; at the drop-off without motion. */}
        <g className="story-route-vehicle">
          <circle r="13" fill="#fff" />
          <circle r="13" fill="none" stroke="var(--accent)" strokeWidth="3" />
          <circle r="4.5" fill="var(--accent)" />
          <animateMotion dur="5.5s" begin="indefinite" fill="freeze" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.25 1" />
        </g>
      </svg>
      <figcaption className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[13px] font-semibold text-white/80">
        <span className="story-live-dot" aria-hidden="true" />
        <Icon name={icon} size={18} />
        {label}
      </figcaption>
    </figure>
  );
}

/** A QR-like square: a fixed pattern, drawn, not a code anyone can scan. */
function GatePattern() {
  const cells: [number, number][] = [];
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const corner = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      if (corner) continue;
      if ((x * 31 + y * 17 + x * y) % 3 === 0) cells.push([x, y]);
    }
  }
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="3" height="3" rx="0.6" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <rect x={x + 1} y={y + 1} width="1" height="1" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox="-0.5 -0.5 12 12" className="h-full w-full text-midnight" aria-hidden="true">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="0.9" height="0.9" rx="0.2" fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(8, 0)}
      {finder(0, 8)}
    </svg>
  );
}

function GateCard({ t }: { t: StoryArtText }) {
  return (
    <div className="flex w-[260px] max-w-full flex-col gap-4 rounded-[22px] bg-white p-5 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      <span className="flex items-center gap-2 text-xs font-bold tracking-[0.8px] text-muted uppercase">
        <Icon name="qr_code_2" size={18} />
        {t.gate}
      </span>
      <div className="mx-auto h-[120px] w-[120px]">
        <GatePattern />
      </div>
      <span dir="ltr" className="text-center font-mono text-[34px] font-extrabold tracking-[6px] tabular-nums" data-gate="">
        482 913
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
        <span className="story-gate-bar block h-full rounded-full bg-[var(--accent)]" />
      </span>
      <span className="text-center text-[13px] font-semibold text-muted">{t.gateNote}</span>
    </div>
  );
}

function RegisterCard({ t }: { t: StoryArtText }) {
  const marks: ["present" | "late" | "absent", string][] = [
    ["present", "07:46"],
    ["present", "07:51"],
    ["late", "08:07"],
    ["absent", ""],
    ["present", "07:58"],
  ];
  const rows = marks.map(([status, time], i) => [t.registerNames[i] ?? "", status, time] as const);
  const tone = { present: "bg-success-bg text-success", late: "bg-warn-bg text-warn", absent: "bg-danger-bg text-danger" };
  return (
    <ul className="m-0 flex w-[280px] max-w-full list-none flex-col gap-1.5 rounded-[22px] bg-white p-3 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      {rows.map(([name, status, time], i) => (
        <li key={name} className="story-stagger flex items-center gap-3 rounded-xl px-2.5 py-2" style={{ ["--i" as string]: i }}>
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand text-xs font-bold">{name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 text-[15px] font-semibold">{name}</span>
          {time ? (
            <span dir="ltr" className="text-xs text-muted tabular-nums">
              {time}
            </span>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone[status]}`}>{t[status]}</span>
        </li>
      ))}
    </ul>
  );
}

function RuleCard({ parts }: { parts: string[] }) {
  return (
    <ul className="m-0 flex w-[280px] max-w-full list-none flex-col gap-2 rounded-[22px] border border-white/12 bg-white/8 p-3 backdrop-blur-md" data-reveal="pop">
      {parts.map((part, i) => (
        <li key={part} className="story-stagger flex items-center gap-3 rounded-xl bg-white/8 px-3.5 py-2.5 text-[15px] font-semibold text-white" style={{ ["--i" as string]: i }}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-xs font-extrabold text-midnight">{i + 1}</span>
          {part}
        </li>
      ))}
    </ul>
  );
}

function OfferCard({ t }: { t: StoryArtText }) {
  return (
    <div className="flex w-[240px] max-w-full flex-col items-center gap-3 rounded-[22px] bg-white p-5 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      <span className="text-sm font-bold">{t.newRide}</span>
      <span className="relative flex h-[120px] w-[120px] items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-line-soft)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" pathLength={1} className="story-countdown" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" />
        </svg>
        <span className="flex flex-col items-center leading-none">
          <span className="text-[38px] font-extrabold tabular-nums">20</span>
          <span className="text-[11px] font-semibold text-muted">{t.secondsLeft}</span>
        </span>
      </span>
      <span className="flex h-11 w-full items-center justify-center rounded-xl bg-midnight text-[15px] font-bold text-white">{t.accept}</span>
    </div>
  );
}

function LateCard({ t }: { t: StoryArtText }) {
  return (
    <div className="flex w-[300px] max-w-full flex-col gap-3 rounded-[22px] bg-white p-4 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      <span className="flex items-start gap-3 rounded-2xl bg-warn-bg p-3.5 text-warn">
        <Icon name="hourglass_top" size={22} className="story-hourglass mt-px flex-none" />
        <span className="text-[15px] leading-snug font-bold">{t.running}</span>
      </span>
      <span className="flex items-center justify-between gap-3 px-1 text-[13px] font-semibold text-muted">
        <span dir="ltr" className="rounded-full bg-sand px-2.5 py-1 text-midnight tabular-nums">
          +20 min
        </span>
        {t.runningNote}
      </span>
    </div>
  );
}

function ScaleCard({ t }: { t: StoryArtText }) {
  return (
    <div className="flex w-[260px] max-w-full flex-col gap-3 rounded-[22px] bg-white p-5 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      <span className="flex items-center gap-2 text-xs font-bold tracking-[0.8px] text-muted uppercase">
        <Icon name="grocery" size={18} />
        {t.weighed}
      </span>
      <span dir="ltr" className="rounded-2xl bg-midnight px-4 py-3 text-end font-mono text-[34px] font-extrabold tracking-[2px] text-[var(--accent)] tabular-nums">
        1.5 kg
      </span>
      <span className="flex items-baseline justify-between gap-2 text-[14px]">
        <span dir="ltr" className="font-semibold">
          EGP 90.00
        </span>
        <span className="text-muted">{t.perKg}</span>
      </span>
      <span className="flex items-baseline justify-between gap-2 border-t border-line-soft pt-3 text-[14px]">
        <span className="text-muted">{t.estimate}</span>
        <span dir="ltr" className="font-bold">
          EGP 135.00
        </span>
      </span>
    </div>
  );
}

/**
 * 131.40 The flower shop's "when" (the gift checkout's third step, as the
 * app draws it): today struck through after the cut-off, tomorrow chosen, a
 * full slot that can't be picked and the evening slots with their extra.
 */
function SlotsCard({ t }: { t: StoryArtText }) {
  const slots: { time: string; note?: string; state: "full" | "chosen" | "open" }[] = [
    { time: "10:00–13:00", note: t.slotFull, state: "full" },
    { time: "13:00–16:00", state: "chosen" },
    { time: "16:00–19:00", note: "+E£50", state: "open" },
    { time: "19:00–22:00", note: "+E£80", state: "open" },
  ];
  const chip = "flex min-w-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-[12.5px] font-bold";
  return (
    <div className="flex w-[290px] max-w-full flex-col gap-2.5 rounded-[22px] bg-white p-3.5 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] sm:gap-3 sm:p-4" data-reveal="pop">
      <span className="flex items-center gap-2 text-xs font-bold tracking-[0.8px] text-muted uppercase">
        <Icon name="schedule" size={18} className="flex-none" />
        {t.when}
      </span>
      <span className="flex flex-wrap gap-1.5">
        <span className={`${chip} border-line-soft text-faint line-through`}>{t.today}</span>
        <span className={`${chip} border-transparent bg-[#8E2445] text-white`}>
          <Icon name="wb_sunny" size={15} />
          {t.tomorrow}
        </span>
        <span className={`${chip} border-line text-ink-3`}>
          <Icon name="calendar_month" size={15} />
          {t.pickDate}
        </span>
      </span>
      <span className="text-[12.5px] leading-snug text-muted">{t.todayClosed}</span>
      {/* One slot a row on a phone, two by two from a tablet up. */}
      <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2 sm:gap-2">
        {slots.map((slot, i) => (
          <li
            key={slot.time}
            className={`story-stagger flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 sm:flex-col sm:justify-center sm:gap-0.5 sm:px-2 sm:py-2.5 ${slot.state === "chosen" ? "border-[#8E2445] bg-[#FBEFF2]" : slot.state === "full" ? "border-line-soft bg-sand opacity-60" : "border-line"}`}
            style={{ ["--i" as string]: i }}
          >
            <span dir="ltr" className={`text-[13.5px] font-extrabold whitespace-nowrap tabular-nums sm:text-[14px] ${slot.state === "full" ? "text-faint line-through" : ""}`}>
              {slot.time}
            </span>
            {slot.note ? (
              <span dir={slot.state === "full" ? undefined : "ltr"} className="text-[11.5px] font-semibold text-muted">
                {slot.note}
              </span>
            ) : (
              <Icon name="check_circle" size={16} className="text-[#8E2445]" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 131.40 A flash sale on the shop's garnet band (Leqaa's "Blush hour"): the timer counting down, the sale price, the share off and how few are left. */
function FlashCard({ t }: { t: StoryArtText }) {
  return (
    <div className="flex w-[280px] max-w-full flex-col gap-3 rounded-[22px] bg-[#4A1328] p-4 text-white shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)] sm:p-5" data-reveal="pop">
      <span className="flex items-center gap-2 text-xs font-bold tracking-[0.8px] text-[#F5B9CB] uppercase">
        <Icon name="bolt" size={18} />
        {t.flashSale}
      </span>
      <span dir="ltr" className="font-mono text-[28px] leading-none font-extrabold tabular-nums sm:text-[40px] sm:tracking-[1px]" data-countdown="7152">
        01:59:12
      </span>
      <span className="flex flex-col gap-1 rounded-2xl bg-[#5E2238] p-3">
        <span className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[15px] leading-snug font-bold">
            <Icon name="local_florist" size={18} className="flex-none text-[#FFC9A8]" />
            {t.flashItem}
          </span>
          <span dir="ltr" className="flex-none rounded-full bg-[#FFC9A8] px-2 py-0.5 text-[12px] font-extrabold text-[#4A1328]">
            −25%
          </span>
        </span>
        <span dir="ltr" className="flex flex-wrap items-baseline gap-x-2 self-start text-[13px] tabular-nums">
          <span className="font-extrabold text-[#FFC9A8]">E£1,575</span>
          <span className="text-white/55 line-through">E£2,100</span>
        </span>
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <span className="block h-full w-[34%] rounded-full bg-[#FFC9A8]" />
        </span>
        <span className="text-[12.5px] font-semibold text-white/75">{t.onlyLeft}</span>
      </span>
    </div>
  );
}

/** 131.40 The gift card as the checkout previews it: the occasion, the words, who it's to and from, the shop's seal. */
function GiftCard({ t }: { t: StoryArtText }) {
  return (
    <figure className="relative m-0 flex w-[200px] max-w-full flex-col gap-2 rounded-[22px] bg-[#FFF8F4] p-3.5 text-[#2A121C] shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] sm:w-[280px] sm:gap-3 sm:p-5" data-reveal="pop">
      <span aria-hidden="true" className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#8E2445] text-[#FBEFF2] shadow-[0_6px_14px_-6px_rgba(142,36,69,0.8)] sm:end-4 sm:top-4 sm:h-11 sm:w-11">
        <Icon name="local_florist" size={22} />
      </span>
      <span className="flex items-center gap-2 pe-11 text-xs font-bold tracking-[0.8px] text-[#A8325A] uppercase">
        <Icon name="cake" size={18} />
        {t.cardOccasion}
      </span>
      <span className="text-[14px] text-[#7B5E67]">{t.cardTo}</span>
      <blockquote className="m-0 text-[16px] leading-snug sm:text-[20px] ltr:font-serif ltr:italic">{t.cardMessage}</blockquote>
      <figcaption className="text-[14px] text-[#7B5E67]">{t.cardFrom}</figcaption>
    </figure>
  );
}

/** 131.40 The last step's lines: the shop's code applied, the delivery fee worked out, tomorrow's slot. */
function FeeCard({ t }: { t: StoryArtText }) {
  const lines: [string, string][] = [
    [t.feeParts[0], "E£60"],
    [t.feeParts[1], "E£10"],
    [t.feeParts[2], "E£0"],
  ];
  return (
    <div className="flex w-[280px] max-w-full flex-col gap-3 rounded-[22px] bg-white p-4 text-midnight shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]" data-reveal="pop">
      <span className="flex items-center gap-3 rounded-2xl border border-dashed border-[#8E2445]/50 bg-[#FBEFF2] px-3.5 py-2.5">
        <Icon name="confirmation_number" size={20} className="flex-none text-[#8E2445]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span dir="ltr" className="self-start font-mono text-[15px] font-extrabold tracking-[1.5px]">
            LEQAA10
          </span>
          <span className="text-[12px] font-semibold text-muted">{t.codeApplied}</span>
        </span>
        <span dir="ltr" className="text-[15px] font-extrabold text-[#8E2445]">
          −10%
        </span>
      </span>
      <span className="text-xs font-bold tracking-[0.8px] text-muted uppercase">{t.feeTitle}</span>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
        {lines.map(([label, amount], i) => (
          <li key={label} className="story-stagger flex items-baseline justify-between gap-3" style={{ ["--i" as string]: i }}>
            <span className="text-ink-4">{label}</span>
            <span dir="ltr" className="font-semibold tabular-nums">
              {amount}
            </span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-2 font-bold">
          <span>{t.feeParts[3]}</span>
          <span dir="ltr" className="tabular-nums">
            E£70
          </span>
        </li>
      </ul>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 self-start rounded-2xl bg-sand px-3 py-1.5 text-[12.5px] font-bold">
        <Icon name="event_available" size={16} />
        <span className="whitespace-nowrap">{t.tomorrow}</span>
        <span dir="ltr" className="whitespace-nowrap tabular-nums">
          13:00–16:00
        </span>
      </span>
    </div>
  );
}

/** The drawn picture a scene shows over its photo, if any. */
export function ChapterArtView({ art, t, vehicle }: { art: ChapterArt; t: StoryArtText; vehicle: "two_wheeler" | "local_taxi" | "directions_bus" | "delivery_dining" }) {
  switch (art) {
    case "route":
      return <RouteMap label={t.liveMap} icon={vehicle} />;
    case "gate":
      return <GateCard t={t} />;
    case "register":
      return <RegisterCard t={t} />;
    case "price":
      return <RuleCard parts={vehicle === "local_taxi" ? t.fareParts : t.priceWays} />;
    case "offer":
      return <OfferCard t={t} />;
    case "late":
      return <LateCard t={t} />;
    case "scale":
      return <ScaleCard t={t} />;
    case "slots":
      return <SlotsCard t={t} />;
    case "flash":
      return <FlashCard t={t} />;
    case "card":
      return <GiftCard t={t} />;
    case "fee":
      return <FeeCard t={t} />;
    default:
      return null;
  }
}
