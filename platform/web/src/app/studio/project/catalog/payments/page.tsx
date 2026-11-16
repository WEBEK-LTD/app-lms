import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 132.120 One Payments page: the products' and the courses' own Payments
 * pages went there (/studio/project/payments), so old links, emails and bookmarks open it.
 */
export default function OldPaymentsPage(): never {
  permanentRedirect("/studio/project/payments");
}
