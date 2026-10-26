import { resetPlatformSettingAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { Badge, formatDateTime } from "@/components/ui";
import type { PlatformSetting, PlatformSettingKey } from "@/lib/data/types";

/** 95.1 The parts every settings page is made of. */

export function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <span className="w-[200px] flex-none text-sm font-semibold">{label}</span>
      <Badge tone={ok ? "success" : "warn"}>{ok ? "OK" : "Check"}</Badge>
      <span className="min-w-0 flex-1 text-sm break-all text-muted">{value}</span>
    </div>
  );
}

/** Where a setting comes from, and the way back to the Netlify variables. */
export function Source({ setting, settingKey, fallback }: { setting: PlatformSetting | undefined; settingKey: PlatformSettingKey; fallback: string }) {
  if (!setting) return <p className="m-0 text-sm text-muted">Now: {fallback}</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted">
        Set here by {setting.updatedBy}, {formatDateTime(setting.updatedAt)}.
      </p>
      <form action={resetPlatformSettingAction}>
        <input type="hidden" name="key" value={settingKey} />
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
          Use the Netlify variables
        </SubmitButton>
      </form>
    </div>
  );
}

/** Who saved a setting, with a button back to what applies without it. */
export function SavedBy({ setting, settingKey, reset, fallback }: { setting: PlatformSetting | undefined; settingKey: PlatformSettingKey; reset: string; fallback: string }) {
  if (!setting) return <p className="m-0 text-sm text-muted">Now: {fallback}</p>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted">
        Set here by {setting.updatedBy}, {formatDateTime(setting.updatedAt)}.
      </p>
      <form action={resetPlatformSettingAction}>
        <input type="hidden" name="key" value={settingKey} />
        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
          {reset}
        </SubmitButton>
      </form>
    </div>
  );
}

export function Section({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[19px] font-bold">
          {title}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{text}</p>
      </div>
      {children}
    </section>
  );
}
