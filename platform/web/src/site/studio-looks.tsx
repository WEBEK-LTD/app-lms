import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { DEMO_SLUGS, type StudioDemoId } from "@/lib/demo/constants";
import { screenAltFor } from "@/lib/marketing-lang";
import { messagesFor, type Lang } from "@/i18n";
import { LOOK_SHOT_KEYS, lookScreen, type LookShotKey } from "./look-shots";

export { LOOK_SHOT_KEYS, lookScreen, otherLookKeys, studioDemoOfSlug, type LookShotKey } from "./look-shots";

/** "Look A · Dark", in the page's language. */
export function lookCaption(lang: Lang, key: LookShotKey): string {
  const m = messagesFor(lang).studio;
  const look = { a: m.lookA, b: m.lookB, c: m.lookC, d: m.lookD }[key.split("-")[0] as "a" | "b" | "c" | "d"];
  return `${look} · ${key.endsWith("dark") ? m.lookNight : m.lookDay}`;
}

/** 130.49 A Studio demo's Signature looks (site/look-shots.ts; 223 C, D, A, B): their phones with their captions, light and dark, in a card. */
export function StudioLooks({ id, lang, keys = LOOK_SHOT_KEYS, size = "sm", className = "" }: { id: StudioDemoId; lang: Lang; keys?: readonly LookShotKey[]; size?: "xs" | "sm"; className?: string }) {
  const m = messagesFor(lang).studio;
  const alt = screenAltFor(lang);
  const shots = keys.flatMap((key) => {
    const screen = lookScreen(id, key);
    return screen ? [{ key, screen }] : [];
  });
  if (!shots.length) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-10 gap-y-7 rounded-[24px] border border-line bg-[linear-gradient(135deg,var(--color-white),var(--color-sand))] p-5 sm:p-8 ${className}`}
      data-studio-looks={DEMO_SLUGS[id]}
    >
      {/* Three phones beside the words; four under them, in one row. */}
      <div className={`flex min-w-0 flex-col gap-2 ${shots.length > 3 ? "flex-[1_1_100%]" : "flex-[1_1_240px]"}`}>
        <h3 className="m-0 flex items-center gap-2 text-xl font-bold">
          <Icon name="palette" size={24} className="text-accent" />
          {m.looksTitle}
        </h3>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{m.looksText}</p>
      </div>
      <div className="flex min-w-0 flex-[2_1_480px] flex-wrap justify-center gap-x-6 gap-y-6">
        {shots.map(({ key, screen }) => (
          <DeviceFrame key={key} screen={screen} size={size} caption={lookCaption(lang, key)} alt={alt[screen]} />
        ))}
      </div>
    </div>
  );
}
