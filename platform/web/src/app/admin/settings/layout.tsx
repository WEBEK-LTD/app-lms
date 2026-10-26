import { SettingsTabs } from "./tabs";

/** 95.1 Every settings page: the title, what saving does, and the tabs to the others. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Settings</h1>
        <span className="text-[15px] text-muted">
          Settings saved here replace the Netlify variables and apply within 30 seconds. Secrets are stored encrypted and never shown again.
        </span>
      </div>
      <SettingsTabs />
      {children}
    </>
  );
}
