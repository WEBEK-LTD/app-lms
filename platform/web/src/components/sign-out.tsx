import { signOutAction } from "@/app/actions/auth";

/** Sign-out is a POST form so it can't be triggered by a link or prefetch. */
export function SignOutButton({ className = "", children = "Sign out" }: { className?: string; children?: React.ReactNode }) {
  return (
    <form action={signOutAction} className="inline">
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
