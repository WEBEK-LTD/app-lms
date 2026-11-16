/**
 * 132.10 The management kit (with manage-kit-client.tsx): what a list page
 * and an editor show while they load, in the shape they will have, so
 * nothing jumps when they arrive.
 */

const pulse = "animate-pulse motion-reduce:animate-none";

/** A list page: its header, tabs, the list's bar and rows. */
export function ListSkeleton({ label, rows = 6, grid = false }: { label: string; rows?: number; grid?: boolean }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <div className={`h-8 w-48 rounded-lg bg-white/80 ${pulse}`} />
          <div className={`h-4 w-72 max-w-full rounded bg-white/60 ${pulse}`} />
        </div>
        <div className={`h-11 w-36 rounded-xl bg-white/80 ${pulse}`} />
      </div>
      <div aria-hidden="true" className="flex gap-4 border-b border-line pb-3">
        {[88, 104, 80, 96].map((w) => (
          <div key={w} className={`h-5 rounded bg-white/70 ${pulse}`} style={{ width: w }} />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap gap-2 border-b border-line-soft px-5 py-3">
          <div className={`h-10 w-64 max-w-full rounded-[10px] bg-sand ${pulse}`} />
          <div className={`h-10 w-32 rounded-[10px] bg-sand ${pulse}`} />
          <div className={`h-10 w-28 rounded-[10px] bg-sand ${pulse}`} />
        </div>
        {grid ? (
          <div className="grid gap-4 p-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className={`aspect-[4/3] rounded-xl bg-sand ${pulse}`} />
                <div className={`h-4 w-3/4 rounded bg-sand ${pulse}`} />
                <div className={`h-3 w-1/3 rounded bg-sand ${pulse}`} />
              </div>
            ))}
          </div>
        ) : (
          Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-t border-line-soft px-5 py-3.5 first:border-t-0">
              <div className={`h-12 w-12 shrink-0 rounded-xl bg-sand ${pulse}`} />
              <div className="flex flex-1 flex-col gap-2">
                <div className={`h-4 rounded bg-sand ${pulse}`} style={{ width: `${40 + ((i * 17) % 35)}%` }} />
                <div className={`h-3 w-1/4 rounded bg-sand ${pulse}`} />
              </div>
              <div className={`h-6 w-20 rounded-full bg-sand ${pulse}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** An editor: its header, then its cards beside a narrower side. */
export function EditorSkeleton({ label }: { label: string }) {
  const card = (h: number, key: number) => <div key={key} className={`rounded-2xl border border-line bg-white ${pulse}`} style={{ height: h }} />;
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        <div className={`h-4 w-24 rounded bg-white/60 ${pulse}`} />
        <div className={`h-8 w-64 max-w-full rounded-lg bg-white/80 ${pulse}`} />
      </div>
      <div aria-hidden="true" className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">{[220, 180, 160].map(card)}</div>
        <div className="flex flex-col gap-5">{[150, 120].map(card)}</div>
      </div>
    </div>
  );
}
