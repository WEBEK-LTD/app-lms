/* eslint-disable @next/next/no-img-element -- SVG logos are tiny and need no optimisation. */
import Link from "next/link";

const LOGO_RATIO = 3009.88 / 977.88;

/** The "yallapp." wordmark. `reversed` is the Ivory version for dark backgrounds. */
export function Logo({ height = 30, reversed = false, alt = "Yallapp" }: { height?: number; reversed?: boolean; alt?: string }) {
  return (
    <img
      src={reversed ? "/brand/yallapp-logo-reversed-transparent.svg" : "/brand/yallapp-logo-primary-transparent.svg"}
      alt={alt}
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      style={{ height, width: "auto" }}
      className="block"
    />
  );
}

export function LogoLink({ href = "/", reversed = false, height = 30 }: { href?: string; reversed?: boolean; height?: number }) {
  return (
    <Link href={href} className="flex rounded-md">
      <Logo height={height} reversed={reversed} alt="Yallapp home" />
    </Link>
  );
}
