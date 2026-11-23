import { BUSINESS_APP_LINKS } from "@/lib/business-app";
import { StoreMark } from "./brand-marks";

/** The words of the two store buttons, from the site's or the dashboard's messages. */
export type BusinessAppLabels = {
  appStoreLine: string;
  appStore: string;
  googlePlayLine: string;
  googlePlay: string;
  newTab: string;
};

const TONES = {
  /** On a page of the website: Midnight with white words (in dark mode the tokens swap, so Ivory with dark words). */
  page: "bg-midnight text-white shadow-[0_14px_30px_-18px_rgba(14,13,36,0.7)] hover:-translate-y-px hover:text-white",
  /** In a dark band (the footer): the night with a hairline. */
  night: "border border-night-line bg-night-2 text-white hover:border-ivory hover:text-white",
  /** In the dashboard's kit: its ink and surface, light or dark. */
  kit: "bg-(--sp-ink) text-(--sp-surface) hover:-translate-y-px hover:text-(--sp-surface)",
} as const;

const SIZES = {
  md: { box: "h-[56px] gap-3 rounded-[14px] ps-4 pe-5", icon: 28, line: "text-[11px]", name: "text-[18px]" },
  sm: { box: "h-[46px] gap-2.5 rounded-[12px] ps-3 pe-4", icon: 22, line: "text-[10px]", name: "text-[15px]" },
} as const;

/**
 * 203 "Download on the App Store" and "Get it on Google Play" for Yallapp
 * Business: buttons of our own, each with its store's mark (Apple's logo, Google
 * Play's) in the words' colour, opening the store in a new tab.
 */
export function BusinessAppButtons({
  labels,
  tone = "page",
  size = "md",
  label,
  className = "",
}: {
  labels: BusinessAppLabels;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  /** Names the pair for assistive technology. */
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <ul aria-label={label} className={`m-0 flex list-none flex-wrap gap-3 p-0 ${className}`} data-business-app-buttons="">
      {BUSINESS_APP_LINKS.map((link) => (
        <li key={link.store}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener"
            data-business-app={link.store}
            className={`flex items-center no-underline transition-[translate,border-color,background-color] ${s.box} ${TONES[tone]}`}
          >
            <StoreMark store={link.mark} size={s.icon} />
            <span className="flex flex-col items-start gap-[3px] leading-none">
              <span className={`${s.line} font-medium opacity-80`}>{link.store === "appStore" ? labels.appStoreLine : labels.googlePlayLine}</span>
              <span className={`${s.name} font-bold tracking-[-0.2px]`} dir="ltr">
                {link.store === "appStore" ? labels.appStore : labels.googlePlay}
              </span>
            </span>
            <span className="sr-only">{labels.newTab}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
