import type { App } from "@/lib/data/types";
import { assetUrl } from "@/lib/assets";

/** Readable text on the client's colour: dark or white. */
export function textOn(hex: string): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(n)) return "#ffffff";
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45 ? "#14121F" : "#ffffff";
}

/** The page frame in the client's branding: this page opens inside their app. */
export function PayShell({ app, children }: { app: App | null; children: React.ReactNode }) {
  const name = app?.appName ?? "Checkout";
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col gap-5 bg-white px-4 py-6 sm:my-8 sm:min-h-0 sm:rounded-2xl sm:border sm:border-line sm:px-7">
      <header className="flex items-center gap-3">
        {app?.logoAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(app.logoAssetId)} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
        ) : null}
        <span className="text-[17px] font-bold">{name}</span>
      </header>
      {children}
    </main>
  );
}
