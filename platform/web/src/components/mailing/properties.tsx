"use client";

import type { ReactNode } from "react";
import { BRAND_THEME, newBlock } from "@/lib/mailing/blocks";
import type { MailBlock, MailBlockStyle, MailFont, MailSocialNetwork, MailStore, MailTheme } from "@/lib/mailing/types";
import { Choice, ColorField, Field, ImageField, inputClass, PanelSection, RangeField, RichText, Rows, TextField, Toggle } from "./fields";
import { BLOCK_INFO } from "./library";

/** 114 The builder's right panel: the chosen block's content and look, or the whole email's look. */

const FONTS: { value: MailFont; label: string }[] = [
  { value: "brand", label: "Clean (Segoe, Roboto, Helvetica)" },
  { value: "system", label: "System (the reader's own)" },
  { value: "serif", label: "Serif (Georgia)" },
  { value: "mono", label: "Monospace" },
];

const NETWORKS: { value: MailSocialNetwork; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
];

const STORES: { value: MailStore; label: string }[] = [
  { value: "google_play", label: "Google Play" },
  { value: "app_store", label: "App Store" },
  { value: "galaxy_store", label: "Galaxy Store" },
  { value: "appgallery", label: "AppGallery" },
  { value: "getapps", label: "GetApps" },
];

function Select<T extends string>({ label, value, options, onChange }: { label: ReactNode; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputClass} cursor-pointer`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const DEFAULT_PAD: Partial<Record<MailBlock["type"], [number, number, number, number]>> = {
  header: [28, 32, 12, 32],
  heading: [10, 32, 6, 32],
  button: [12, 32, 20, 32],
  divider: [16, 32, 16, 32],
  footer: [20, 32, 8, 32],
};

function StyleEditor({ block, set, theme }: { block: MailBlock; set: (b: MailBlock) => void; theme: MailTheme }) {
  const s = block.style ?? {};
  const put = (patch: Partial<MailBlockStyle>) => set({ ...block, style: { ...s, ...patch } });
  const pad = s.padding ?? DEFAULT_PAD[block.type] ?? [8, 32, 8, 32];
  const setPad = (i: number, v: number) => put({ padding: pad.map((x, j) => (j === i ? v : x)) as [number, number, number, number] });
  const hasText = !["image", "divider", "spacer", "video", "badges"].includes(block.type);
  const hasSurface = ["button", "quote", "cards", "coupon", "badges", "list"].includes(block.type);
  return (
    <PanelSection title="Look" open={false}>
      {block.type !== "spacer" ? (
        <Choice
          label="Alignment"
          value={s.align ?? (["button", "social", "badges", "footer"].includes(block.type) ? "center" : "left")}
          onChange={(align) => put({ align })}
          options={[
            { value: "left", label: "Start", icon: "format_align_left" },
            { value: "center", label: "Center", icon: "format_align_center" },
            { value: "right", label: "End", icon: "format_align_right" },
          ]}
        />
      ) : null}
      <ColorField label="Background (the whole row)" value={s.background} onChange={(background) => put({ background })} fallback={theme.body} />
      {hasText ? <ColorField label="Text color" value={s.color} onChange={(color) => put({ color })} fallback={block.type === "button" ? "#FFFFFF" : theme.text} /> : null}
      {hasSurface ? <ColorField label={block.type === "button" ? "Button color" : block.type === "list" ? "Check mark circle" : "Box color"} value={s.surface} onChange={(surface) => put({ surface })} fallback={block.type === "button" ? theme.brand : "#F8F5EF"} /> : null}
      {["divider", "quote", "cards", "coupon", "social", "list"].includes(block.type) ? <ColorField label={block.type === "list" ? "Check mark" : "Line color"} value={s.borderColor} onChange={(borderColor) => put({ borderColor })} fallback={block.type === "quote" || block.type === "coupon" ? "#FF5A1F" : "#E7E2D8"} /> : null}
      {hasText ? <Select label="Font" value={s.font ?? theme.font} options={FONTS} onChange={(font) => put({ font })} /> : null}
      {["heading", "text", "button", "quote", "list", "footer"].includes(block.type) ? <RangeField label="Text size" value={s.fontSize ?? (block.type === "heading" ? (block.level === 1 ? 32 : block.level === 2 ? 24 : 19) : block.type === "footer" ? 13 : block.type === "quote" ? 19 : 16)} min={11} max={56} onChange={(fontSize) => put({ fontSize })} /> : null}
      {["image", "button", "quote", "cards", "coupon", "video", "imageText"].includes(block.type) ? <RangeField label="Rounded corners" value={s.radius ?? (block.type === "button" ? theme.radius : 12)} min={0} max={40} onChange={(radius) => put({ radius })} /> : null}
      {block.type !== "spacer" ? (
        <Field label="Space around (top, end, bottom, start)">
          <div className="grid grid-cols-4 gap-1.5">
            {["Top", "End", "Bottom", "Start"].map((name, i) => (
              <input key={name} type="number" min={0} max={120} aria-label={`${name} space`} value={pad[i]} onChange={(e) => setPad(i, Math.max(0, Math.min(120, Number(e.target.value) || 0)))} className={`${inputClass} px-2 text-center tabular-nums`} />
            ))}
          </div>
        </Field>
      ) : null}
      {block.type !== "spacer" ? <Toggle label="Full width" hint="No space on the sides (a picture or a colored band edge to edge)." checked={!!s.fullWidth} onChange={(fullWidth) => put({ fullWidth })} /> : null}
    </PanelSection>
  );
}

function link(label: string, value: { label: string; url: string } | null | undefined, set: (v: { label: string; url: string } | null) => void, dir: "ltr" | "rtl") {
  const v = value ?? { label: "", url: "" };
  return (
    <>
      <TextField label={`${label}: words`} value={v.label} dir={dir} onChange={(l) => set({ ...v, label: l })} hint="An arrow → turns around by itself in Arabic." />
      <TextField label={`${label}: link`} value={v.url} dir="ltr" onChange={(url) => set({ ...v, url })} tags placeholder="https://" />
    </>
  );
}

export function BlockProperties({ block, set, theme, dir }: { block: MailBlock; set: (b: MailBlock) => void; theme: MailTheme; dir: "ltr" | "rtl" }) {
  const info = BLOCK_INFO[block.type];
  const put = (patch: Partial<MailBlock>) => set({ ...block, ...patch });
  let content: ReactNode = null;
  switch (block.type) {
    case "header":
      content = (
        <>
          <Choice label="Logo" value={block.logo ?? "dark"} onChange={(logo) => put({ logo })} options={[{ value: "dark", label: "On light" }, { value: "light", label: "On dark" }, { value: "none", label: "None" }]} />
          <TextField label="Logo's link" value={block.href ?? ""} dir="ltr" onChange={(href) => put({ href })} placeholder="https://" />
          <Rows label="Links on the end side" items={block.links ?? []} onChange={(links) => put({ links })} make={() => ({ label: "Link", url: "https://" })} addLabel="Add a link" max={4} render={(l, s) => link("Link", l, (v) => s(v ?? { label: "", url: "" }), dir)} />
        </>
      );
      break;
    case "heading":
      content = (
        <>
          <TextField label="Heading" value={block.text ?? ""} dir={dir} onChange={(text) => put({ text })} tags multiline testId="heading-text" />
          <Choice label="Size" value={block.level ?? 1} onChange={(level) => put({ level })} options={[{ value: 1, label: "Large" }, { value: 2, label: "Medium" }, { value: 3, label: "Small" }]} />
        </>
      );
      break;
    case "text":
    case "footer":
      content = <RichText label="Text" value={block.text ?? ""} onChange={(text) => put({ text })} dir={dir} blockId={block.id} />;
      break;
    case "image":
      content = (
        <>
          <ImageField label="Picture" value={block.src ?? ""} onChange={(src) => put({ src })} />
          <TextField label="Describe the picture" value={block.alt ?? ""} dir={dir} onChange={(alt) => put({ alt })} hint="Read aloud, and shown when pictures are off." />
          <TextField label="Link when tapped" value={block.href ?? ""} dir="ltr" onChange={(href) => put({ href })} tags placeholder="https://" />
          <RangeField label="Width" value={block.width ?? theme.width} min={80} max={theme.width} onChange={(width) => put({ width })} />
        </>
      );
      break;
    case "button":
      content = link("Button", block.button, (button) => put({ button }), dir);
      break;
    case "divider":
      content = <RangeField label="Thickness" value={block.size ?? 1} min={1} max={8} onChange={(size) => put({ size })} />;
      break;
    case "spacer":
      content = <RangeField label="Height" value={block.size ?? 24} min={4} max={120} onChange={(size) => put({ size })} />;
      break;
    case "columns":
      content = (
        <>
          <Choice
            label="Columns"
            value={block.columns?.length ?? 2}
            onChange={(n) => {
              const columns = [...(block.columns ?? [])];
              while (columns.length < n) columns.push([{ ...newBlock("text"), style: { padding: [0, 0, 0, 0] } }]);
              put({ columns: columns.slice(0, n) });
            }}
            options={[{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }]}
          />
          <p className="m-0 text-[12px] leading-snug text-muted">Drag blocks into a column on the email, or click one there to change it. On phones the columns go one under the other; in Arabic they read right to left.</p>
        </>
      );
      break;
    case "imageText":
      content = (
        <>
          <ImageField label="Picture" value={block.src ?? ""} onChange={(src) => put({ src })} />
          <TextField label="Describe the picture" value={block.alt ?? ""} dir={dir} onChange={(alt) => put({ alt })} />
          <Choice label="Picture on the" value={block.imageSide ?? "left"} onChange={(imageSide) => put({ imageSide })} options={[{ value: "left", label: "Start" }, { value: "right", label: "End" }]} />
          <TextField label="Title" value={block.title ?? ""} dir={dir} onChange={(title) => put({ title })} tags />
          <RichText label="Text" value={block.text ?? ""} onChange={(text) => put({ text })} dir={dir} blockId={block.id} />
          <Toggle label="A button" checked={!!block.button} onChange={(on) => put({ button: on ? { label: "Learn more →", url: "https://" } : null })} />
          {block.button ? link("Button", block.button, (button) => put({ button }), dir) : null}
        </>
      );
      break;
    case "social":
      content = (
        <Rows
          label="Profiles"
          items={block.social ?? []}
          onChange={(social) => put({ social })}
          make={() => ({ network: "facebook" as MailSocialNetwork, url: "https://" })}
          addLabel="Add a profile"
          render={(item, s) => (
            <>
              <Select label="Network" value={item.network} options={NETWORKS} onChange={(network) => s({ ...item, network })} />
              <TextField label="Link" value={item.url} dir="ltr" onChange={(url) => s({ ...item, url })} placeholder="https://" />
            </>
          )}
        />
      );
      break;
    case "video":
      content = (
        <>
          <ImageField label="Thumbnail" value={block.src ?? ""} onChange={(src) => put({ src })} />
          <TextField label="The video's link" value={block.href ?? ""} dir="ltr" onChange={(href) => put({ href })} placeholder="https://youtube.com/…" hint="Inboxes don't play videos: the thumbnail and its button open it." />
        </>
      );
      break;
    case "quote":
      content = (
        <>
          <TextField label="Their words" value={block.text ?? ""} dir={dir} onChange={(text) => put({ text })} multiline />
          <TextField label="Name" value={block.title ?? ""} dir={dir} onChange={(title) => put({ title })} />
          <TextField label="Role or business" value={block.caption ?? ""} dir={dir} onChange={(caption) => put({ caption })} />
          <ImageField label="Their photo (optional)" value={block.src ?? ""} onChange={(src) => put({ src })} />
        </>
      );
      break;
    case "cards":
      content = (
        <Rows
          label="Cards (2 or 3 side by side)"
          items={block.cards ?? []}
          onChange={(cards) => put({ cards })}
          make={() => ({ title: "Title", text: "A line about it.", kicker: "", button: null })}
          addLabel="Add a card"
          max={3}
          render={(card, s) => (
            <>
              <TextField label="Small line on top" value={card.kicker ?? ""} dir={dir} onChange={(kicker) => s({ ...card, kicker })} hint="A price you write, “New”, a number." />
              <TextField label="Title" value={card.title} dir={dir} onChange={(title) => s({ ...card, title })} tags />
              <TextField label="Text" value={card.text} dir={dir} onChange={(text) => s({ ...card, text })} multiline />
              <ImageField label="Picture (optional)" value={card.image ?? ""} onChange={(image) => s({ ...card, image: image || null })} />
              <Toggle label="A link" checked={!!card.button} onChange={(on) => s({ ...card, button: on ? { label: "More →", url: "https://" } : null })} />
              {card.button ? link("Link", card.button, (button) => s({ ...card, button }), dir) : null}
            </>
          )}
        />
      );
      break;
    case "coupon":
      content = (
        <>
          <TextField label="Line above the code" value={block.text ?? ""} dir={dir} onChange={(text) => put({ text })} />
          <TextField label="Code" value={block.code ?? ""} dir="ltr" onChange={(code) => put({ code })} hint="Write the real code before sending: a {{placeholder}} stops the campaign." testId="coupon-code" />
          <Toggle label="A button" checked={!!block.button} onChange={(on) => put({ button: on ? { label: "Use it now", url: "{{sign_in_link}}" } : null })} />
          {block.button ? link("Button", block.button, (button) => put({ button }), dir) : null}
        </>
      );
      break;
    case "badges":
      content = (
        <Rows
          label="Stores"
          items={block.stores ?? []}
          onChange={(stores) => put({ stores })}
          make={() => ({ store: "google_play" as MailStore, url: "https://" })}
          addLabel="Add a store"
          max={5}
          render={(item, s) => (
            <>
              <Select label="Store" value={item.store} options={STORES} onChange={(store) => s({ ...item, store })} />
              <TextField label="Link" value={item.url} dir="ltr" onChange={(url) => s({ ...item, url })} placeholder="https://" />
            </>
          )}
        />
      );
      break;
    case "list":
      content = <Rows label="Points" items={block.items ?? []} onChange={(items) => put({ items })} make={() => "A new point"} addLabel="Add a point" max={10} render={(item, s) => <TextField label="Point" value={item} dir={dir} onChange={s} tags />} />;
      break;
    case "html":
      content = <TextField label="Your HTML" value={block.html ?? ""} dir="ltr" onChange={(html) => put({ html })} multiline mono hint="Scripts, forms, frames and event handlers are taken out when it's sent." />;
      break;
  }
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <span className="text-[15px] font-extrabold text-midnight">{info.label}</span>
        <span className="text-[12px] text-muted">{info.hint}</span>
      </div>
      <PanelSection title="Content">{content}</PanelSection>
      <StyleEditor block={block} set={set} theme={theme} />
    </>
  );
}

/** The whole email's look, when no block is chosen. */
export function EmailProperties({ theme, setTheme, dir, setDir, preview, setPreview, subject, setSubject }: { theme: MailTheme; setTheme: (t: MailTheme) => void; dir: "ltr" | "rtl"; setDir: (d: "ltr" | "rtl") => void; preview: string; setPreview: (p: string) => void; subject: string; setSubject: (s: string) => void }) {
  const put = (patch: Partial<MailTheme>) => setTheme({ ...theme, ...patch });
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <span className="text-[15px] font-extrabold text-midnight">The email</span>
        <span className="text-[12px] text-muted">Click a block to change it</span>
      </div>
      <PanelSection title="Inbox">
        <TextField label="Subject" value={subject} dir={dir} onChange={setSubject} tags testId="subject" />
        <TextField label="Preview line" value={preview} dir={dir} onChange={setPreview} hint="Shown after the subject in most inboxes." />
        <Choice label="Direction" value={dir} onChange={setDir} options={[{ value: "ltr", label: "Left to right" }, { value: "rtl", label: "Right to left" }]} />
      </PanelSection>
      <PanelSection title="Colors">
        <ColorField label="Around the email" value={theme.background} onChange={(v) => put({ background: v ?? BRAND_THEME.background })} fallback={BRAND_THEME.background} />
        <ColorField label="The email" value={theme.body} onChange={(v) => put({ body: v ?? BRAND_THEME.body })} fallback={BRAND_THEME.body} />
        <ColorField label="Text" value={theme.text} onChange={(v) => put({ text: v ?? BRAND_THEME.text })} fallback={BRAND_THEME.text} />
        <ColorField label="Quieter text" value={theme.muted} onChange={(v) => put({ muted: v ?? BRAND_THEME.muted })} fallback={BRAND_THEME.muted} />
        <ColorField label="Buttons" value={theme.brand} onChange={(v) => put({ brand: v ?? BRAND_THEME.brand })} fallback={BRAND_THEME.brand} />
        <ColorField label="Links and accents" value={theme.accent} onChange={(v) => put({ accent: v ?? BRAND_THEME.accent })} fallback={BRAND_THEME.accent} />
        <button type="button" onClick={() => setTheme({ ...BRAND_THEME, width: theme.width })} className="h-9 cursor-pointer rounded-[10px] border border-line bg-white text-[13px] font-semibold text-ink-3 hover:border-midnight hover:text-midnight">
          Yallapp&apos;s colors
        </button>
      </PanelSection>
      <PanelSection title="Layout" open={false}>
        <Select label="Font" value={theme.font} options={FONTS} onChange={(font) => put({ font })} />
        <RangeField label="Width" value={theme.width} min={480} max={720} step={10} onChange={(width) => put({ width })} />
        <RangeField label="Rounded corners" value={theme.radius} min={0} max={32} onChange={(radius) => put({ radius })} />
      </PanelSection>
    </>
  );
}
