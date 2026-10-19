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

/**
 * 19 The one phone frame, around any screen: a screenshot, a drawn preview or
 * the live app preview (17). Give it a width (`className`); the bezel, the
 * corners and the camera scale with it (the `.phone` styles in globals.css).
 * The screen keeps a modern phone's 19.5:9 unless `screenClassName` sizes it.
 * `island` draws the camera pill over the top of the screen: leave it off
 * when the screen has no status bar under it.
 */
export function PhoneFrame({
  children,
  className = "",
  screenClassName = "aspect-[1080/2340] bg-ivory",
  island = true,
  ...rest
}: {
  children?: React.ReactNode;
  className?: string;
  screenClassName?: string;
  island?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div {...rest} className={`phone max-w-full ${className}`} data-phone-frame="">
      <div className="phone-body">
        {/* Side buttons: volume on the left, power on the right. */}
        <span aria-hidden="true" className="phone-button top-[21%] -left-[2px] h-[6%] rounded-l-sm" />
        <span aria-hidden="true" className="phone-button top-[29%] -left-[2px] h-[6%] rounded-l-sm" />
        <span aria-hidden="true" className="phone-button top-[25%] -right-[2px] h-[10%] rounded-r-sm" />
        <div className={`phone-screen ${screenClassName}`}>
          {children}
          {island ? <span aria-hidden="true" className="phone-island" data-phone-island="" /> : null}
        </div>
      </div>
    </div>
  );
}

export function DeviceFrame({
  screen,
  size = "md",
  priority = false,
  className = "",
  caption,
  alt,
}: {
  /** 55 The screenshot's description in the page's language (lib/marketing-lang.ts `screenAltFor`); English by default. */
  alt?: string;
  screen: AppScreen;
  size?: keyof typeof PHONE_SIZES;
  /** Loads the image first (the hero). */
  priority?: boolean;
  className?: string;
  caption?: string;
}) {
  return (
    <figure className={`m-0 flex max-w-full flex-none flex-col items-center gap-3 ${className}`}>
      <PhoneFrame className={PHONE_SIZES[size]} data-screen={screen}>
        <Image
          src={`/screens/${screen}.png`}
          alt={alt ?? SCREEN_ALT[screen]}
          fill
          sizes="(max-width: 640px) 60vw, 280px"
          priority={priority}
          className="object-cover"
        />
      </PhoneFrame>
      {caption ? <figcaption className="text-center text-sm font-semibold text-ink-4">{caption}</figcaption> : null}
    </figure>
  );
}

/** A dashboard screenshot in a plain window frame with the page's address. */
export function BrowserFrame({ screen, path, className = "", alt }: { screen: DashboardScreen; path: string; className?: string; alt?: string }) {
  return (
    <figure className={`m-0 min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_48px_-32px_rgba(14,13,36,0.45)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line-soft bg-sand px-3.5 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-line-strong" />
        <span dir="ltr" className="ms-2.5 min-w-0 flex-1 truncate rounded-md border border-line-soft bg-white px-2.5 py-1 text-start text-xs text-muted">yallapp.com.tr{path}</span>
      </div>
      <Image
        src={`/screens/${screen}.png`}
        alt={alt ?? SCREEN_ALT[screen]}
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
