"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createMailCampaignAction } from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { Notice, btn } from "@/components/ui";

export interface PickerTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  picture: string | null;
}

/** 114 The templates' gallery: filter by kind, preview one, start a campaign from it (or from a blank email). */
export function TemplatePicker({ ready, saved }: { ready: PickerTemplate[]; saved: PickerTemplate[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [preview, setPreview] = useState<PickerTemplate | null>(null);
  const all = useMemo(() => [...saved, ...ready], [ready, saved]);
  const categories = useMemo(() => ["All", ...new Set(all.map((t) => t.category))], [all]);
  const shown = category === "All" ? all : all.filter((t) => t.category === category);

  const use = (id: string) => {
    setBusy(id);
    setError(null);
    start(async () => {
      const result = await createMailCampaignAction(id);
      if (result.ok) router.push(`/admin/email-campaigns/${result.id}?step=design`);
      else {
        setError(result.error);
        setBusy(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <Notice tone="danger" icon="error" role="alert">
          {error}
        </Notice>
      ) : null}
      <div role="tablist" aria-label="Kinds of templates" className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            onClick={() => setCategory(c)}
            className={`inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] ${c === category ? "border-midnight bg-midnight font-bold text-ivory" : "border-line bg-white text-midnight hover:border-line-strong"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="m-0 grid list-none gap-5 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))" }}>
        {category === "All" ? (
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => use("blank")}
              disabled={pending}
              data-template="blank"
              className="group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-line-strong bg-white p-8 text-center text-midnight hover:border-midnight disabled:cursor-wait"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand text-ink-3 group-hover:bg-peach group-hover:text-accent">
                <Icon name={busy === "blank" ? "progress_activity" : "add"} size={30} className={busy === "blank" ? "animate-spin" : ""} />
              </span>
              <span className="text-[17px] font-extrabold">Blank email</span>
              <span className="text-[13px] text-muted">The logo, a heading, a paragraph and a button to start from.</span>
            </button>
          </li>
        ) : null}
        {shown.map((t, i) => (
          <li key={t.id} className="min-w-0">
            <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-line bg-white transition-shadow hover:shadow-[0_10px_30px_rgba(14,13,36,0.10)]" data-template={t.id}>
              <button type="button" onClick={() => setPreview(t)} className="relative block cursor-zoom-in border-0 bg-midnight p-0" aria-label={`Preview ${t.name}`}>
                {t.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element -- The template's own picture, a static file.
                  <img src={t.picture} alt="" className="aspect-[15/7] w-full object-cover" />
                ) : (
                  <span aria-hidden="true" className={`flex aspect-[15/7] w-full items-center justify-center ${["bg-peach text-accent", "bg-sand text-ink-3"][i % 2]}`}>
                    <Icon name="bookmark" size={40} />
                  </span>
                )}
                <span className="absolute end-3 top-3 inline-flex h-8 items-center gap-1 rounded-full bg-white/90 px-3 text-[12px] font-bold text-midnight">
                  <Icon name="visibility" size={16} />
                  Preview
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-1.5 px-5 pt-4 pb-5">
                <span className="text-[12px] font-bold tracking-wide text-accent uppercase">{t.category}</span>
                <h2 className="m-0 text-[18px] font-extrabold text-midnight">{t.name}</h2>
                <p className="m-0 flex-1 text-[14px] leading-relaxed text-ink-4">{t.description}</p>
                <button type="button" onClick={() => use(t.id)} disabled={pending} className={`${btn.primary} mt-3 h-11 w-full cursor-pointer`}>
                  {busy === t.id ? <Icon name="progress_activity" size={18} className="animate-spin" /> : null}
                  Use this design
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {preview ? (
        <div role="dialog" aria-modal="true" aria-label={`${preview.name}: preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/60 p-4" onClick={() => setPreview(null)}>
          <div className="flex h-[min(860px,92vh)] w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <strong className="text-[16px] text-midnight">{preview.name}</strong>
              <div className="flex gap-2">
                <button type="button" onClick={() => use(preview.id)} disabled={pending} className={`${btn.primary} h-10 cursor-pointer`}>
                  Use this design
                </button>
                <button type="button" onClick={() => setPreview(null)} className={`${btn.secondary} h-10 w-10 cursor-pointer px-0`} aria-label="Close">
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>
            <iframe title={`${preview.name} preview`} src={`/admin/email-campaigns/templates/preview/${encodeURIComponent(preview.id)}`} sandbox="" className="w-full flex-1 border-0 bg-ivory" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
