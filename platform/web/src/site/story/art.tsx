import { Icon } from "@/components/icon";
import type { ChapterArt } from "./stories";
import type { StoryArtText } from "./types";

/**
 * The story pages' drawn pictures, made here in SVG and CSS (no images,
 * nothing generated): a city with a route the vehicle drives along, the
 * gate's code, the class register, a fare's rule, a ride offer's countdown,
 * a place running late, and a scale. They move once they are seen
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
    default:
      return null;
  }
}
