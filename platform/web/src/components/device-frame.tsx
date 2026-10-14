import Image from "next/image";
import { SCREEN_ALT, type AppScreen, type DashboardScreen } from "@/lib/marketing";

/**
 * Screenshots of the app and the dashboard in simple frames drawn with CSS:
 * no pictures of real phones or browsers. The app screens are 1080 × 2340
 * PNGs in public/screens, the dashboard screens 1920 × 1200.
 */

const PHONE_SIZES = {
  xs: "w-[136px]",
  sm: "w-[180px]",
  md: "w-[232px]",
  lg: "w-[272px]",
} as const;

export function DeviceFrame({
  screen,
  size = "md",
  priority = false,
  className = "",
  caption,
}: {
  screen: AppScreen;
  size?: keyof typeof PHONE_SIZES;
  /** Loads the image first (the hero). */
  priority?: boolean;
  className?: string;
  caption?: string;
}) {
  return (
    <figure className={`m-0 flex max-w-full flex-none flex-col items-center gap-3 ${className}`}>
      <div
        className={`relative max-w-full rounded-[38px] bg-midnight p-[9px] shadow-[0_24px_48px_-28px_rgba(14,13,36,0.55)] ${PHONE_SIZES[size]}`}
        data-screen={screen}
      >
        {/* Side buttons. */}
        <span aria-hidden="true" className="absolute top-[22%] -left-[3px] h-[9%] w-[3px] rounded-l bg-night-3" />
        <span aria-hidden="true" className="absolute top-[18%] -right-[3px] h-[13%] w-[3px] rounded-r bg-night-3" />
        <div className="relative aspect-[1080/2340] overflow-hidden rounded-[30px] bg-ivory">
          <Image
            src={`/screens/${screen}.png`}
            alt={SCREEN_ALT[screen]}
            fill
            sizes="(max-width: 640px) 60vw, 280px"
            priority={priority}
            className="object-cover"
          />
          {/* The camera. */}
          <span aria-hidden="true" className="absolute top-[1.6%] left-1/2 h-[2.6%] w-[28%] -translate-x-1/2 rounded-full bg-midnight" />
        </div>
      </div>
      {caption ? <figcaption className="text-center text-sm font-semibold text-ink-4">{caption}</figcaption> : null}
    </figure>
  );
}

/** A dashboard screenshot in a plain window frame with the page's address. */
export function BrowserFrame({ screen, path, className = "" }: { screen: DashboardScreen; path: string; className?: string }) {
  return (
    <figure className={`m-0 min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_48px_-32px_rgba(14,13,36,0.45)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line-soft bg-sand px-3.5 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span className="ml-2.5 min-w-0 flex-1 truncate rounded-md border border-line-soft bg-white px-2.5 py-1 text-xs text-muted">yallapp.com.tr{path}</span>
      </div>
      <Image
        src={`/screens/${screen}.png`}
        alt={SCREEN_ALT[screen]}
        width={1920}
        height={1200}
        sizes="(max-width: 1160px) 100vw, 760px"
        className="block h-auto w-full"
      />
    </figure>
  );
}

/** Where each dashboard screenshot was taken, for the frame's address bar. */
export const DASHBOARD_PATHS: Record<DashboardScreen, string> = {
  "dashboard-pages": "/dashboard/pages",
  "dashboard-setup": "/dashboard/setup?step=branding",
  "dashboard-builds": "/dashboard/builds",
};
