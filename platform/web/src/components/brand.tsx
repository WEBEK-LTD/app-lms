/* eslint-disable @next/next/no-img-element -- SVG logos are tiny and need no optimisation. */
import Link from "next/link";

const LOGO_RATIO = 3009.88 / 977.88;

/**
 * The "yallapp." wordmark. `reversed` is the Ivory version for dark backgrounds;
 * `adaptive` (41) switches to it when the public site is in dark mode.
 */
export function Logo({ height = 30, reversed = false, adaptive = false, alt = "Yallapp" }: { height?: number; reversed?: boolean; adaptive?: boolean; alt?: string }) {
  const img = (
    <img
      src={reversed ? "/brand/yallapp-logo-reversed-transparent.svg" : "/brand/yallapp-logo-primary-transparent.svg"}
      alt={alt}
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      style={{ height, width: "auto" }}
      className="block"
    />
  );
  if (!adaptive || reversed) return img;
  return (
    <picture className="block">
      <source media="(prefers-color-scheme: dark)" srcSet="/brand/yallapp-logo-reversed-transparent.svg" />
      {img}
    </picture>
  );
}

export function LogoLink({
  href = "/",
  reversed = false,
  adaptive = false,
  height = 30,
  alt = "Yallapp home",
}: {
  href?: string;
  reversed?: boolean;
  adaptive?: boolean;
  height?: number;
  /** 55 In the page's language. */
  alt?: string;
}) {
  return (
    <Link href={href} className="flex rounded-md">
      <Logo height={height} reversed={reversed} adaptive={adaptive} alt={alt} />
    </Link>
  );
}
