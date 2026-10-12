import Link from "next/link";
import { Icon } from "@/components/icon";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <section className="flex w-full max-w-[560px] flex-col gap-6 rounded-[20px] border border-line bg-white px-6 py-10 sm:px-9">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-peach text-accent">
            <Icon name="link_off" size={32} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px]">We can&apos;t find this page</h1>
            <p className="m-0 text-base leading-relaxed text-ink-4">The link may be old or mistyped. Try the home page, or message us if you need help.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={`${btn.primary} h-[50px] flex-[1_1_180px]`}>
              Go to the home page
            </Link>
            <Link href="/guides" className={`${btn.secondary} h-[50px] flex-[1_1_160px]`}>
              Read the guides
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
