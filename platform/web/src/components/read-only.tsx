import type { ReactNode } from "react";
import { Notice } from "./ui";

/**
 * Admin content a team member may see but not change (roadmap 11.7): every
 * form control inside is disabled, and a notice says why. The server actions
 * check the role again, so this is only for clarity.
 */
export function ReadOnly({ when, children, what = "change this page" }: { when: boolean; children: ReactNode; what?: string }) {
  if (!when) return <>{children}</>;
  return (
    <>
      <Notice tone="neutral" icon="lock">
        Your role can see this but not {what}.
      </Notice>
      <fieldset disabled className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
        {children}
      </fieldset>
    </>
  );
}
