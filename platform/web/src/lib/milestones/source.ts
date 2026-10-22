import type { SignupSource } from "../data/types";

/**
 * 78 The sign-up form's source fields (components/campaign.tsx), checked: a
 * UTM value is up to 100 printable characters, the website a host name,
 * `from` a short word. Null when nothing says where the sign-up came from.
 */
export function signupSourceFrom(form: FormData): SignupSource | null {
  const text = (name: string): string | null => {
    const value = form.get(`src_${name}`);
    if (typeof value !== "string") return null;
    // Printable characters only, and no control or angle characters.
    const clean = value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 100);
    return clean || null;
  };
  const host = text("ref")?.toLowerCase() ?? null;
  const from = text("from")?.toLowerCase() ?? null;
  const source: SignupSource = {
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrer: host && /^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) ? host : null,
    from: from && /^[a-z0-9_-]{1,32}$/.test(from) ? from : null,
  };
  return Object.values(source).some(Boolean) ? source : null;
}
