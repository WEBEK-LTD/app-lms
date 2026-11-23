"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveDesignerPageAction } from "@/app/actions/designer-page";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { DesignerAvatar } from "@/components/studio-market/parts";
import { btn, Notice } from "@/components/ui";
import type { DesignerProfileReview } from "@/lib/data/types";
import type { DesignerChip } from "@/lib/studio-market/catalog";
import { initialFormState } from "@/lib/forms";
import { safePhotoUrl } from "@/lib/studio-market/photo-url";

/**
 * 106.14 Designer area › Your page: the photo (chosen, shown before it is
 * sent), the name, the page's address, the line about them, the country
 * and links with whether each shows, the team's first look, and "See my
 * page".
 */

export interface ProfileValues {
  name: string;
  slug: string;
  country: string;
  bio: string;
  showCountry: boolean;
  showLinks: boolean;
  links: string[];
  photoUrl: string | null;
  review: DesignerProfileReview;
  note: string | null;
  /** The team's reason when they locked the page ("" without one); null when it isn't locked. */
  locked: string | null;
}

export function ProfileForm({ profile, chip, countries, host, pageHref }: { profile: ProfileValues; chip: DesignerChip; countries: { code: string; name: string }[]; host: string; pageHref: string | null }) {
  const t = useDashT();
  const [state, action] = useActionState(saveDesignerPageAction, initialFormState);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const [slug, setSlug] = useState(profile.slug);
  const [bio, setBio] = useState(profile.bio);
  // The chosen photo is drawn on a canvas, never put in the page as an address.
  const [preview, setPreview] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const errors = state.errors ?? {};
  // The uploaded photo only at the address the server made for it.
  const savedPhoto = remove ? null : safePhotoUrl(profile.photoUrl);

  const review =
    profile.review === "pending" ? (
      <Notice tone="warn" icon="hourglass_top">
        {t("marketPage.reviewPending")}
      </Notice>
    ) : profile.review === "approved" ? (
      <Notice tone="success" icon="check_circle">
        {t("marketPage.reviewApproved")}
      </Notice>
    ) : profile.review === "declined" ? (
      <Notice tone="danger" icon="cancel">
        {t("marketPage.reviewDeclined")}
        {profile.note ? (
          <>
            <br />
            {t("marketPage.reviewNote", { note: profile.note })}
          </>
        ) : null}
      </Notice>
    ) : (
      <Notice tone="neutral" icon="info">
        {t("marketPage.reviewNone")}
      </Notice>
    );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={action} noValidate className="mk-panel flex flex-col gap-5 rounded-[28px] px-5 py-6 sm:px-8 sm:py-[30px]" data-designer-profile="">
        {profile.locked !== null ? (
          <Notice tone="danger" icon="lock">
            {t("marketPage.locked")}
            {profile.locked ? (
              <>
                <br />
                {t("marketPage.lockedReason", { reason: profile.locked })}
              </>
            ) : null}
          </Notice>
        ) : null}
        {review}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold" id="f-photo-label">
            {t("marketPage.photoLabel")}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {preview && !remove ? (
              <PhotoCanvas file={preview} size={84} />
            ) : savedPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- The uploaded photo, at the platform's own asset address.
              <img src={savedPhoto} alt="" className="h-[84px] w-[84px] rounded-full object-cover" data-photo-preview="" />
            ) : (
              <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[28px] font-extrabold" style={{ background: chip.bg, color: chip.fg }} aria-hidden="true">
                {chip.initials}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <label className={`${btn.secondary} h-10 cursor-pointer`}>
                <Icon name="photo_camera" size={18} />
                {profile.photoUrl || preview ? t("marketPage.photoChange") : t("marketPage.photoChoose")}
                <input
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  aria-labelledby="f-photo-label"
                  aria-describedby="f-photo-hint"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setRemove(false);
                    setPreview(file && /^image\/(png|jpeg)$/.test(file.type) ? file : null);
                  }}
                />
              </label>
              {profile.photoUrl ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" name="removePhoto" checked={remove} onChange={(e) => setRemove(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--color-midnight)]" />
                  {t("marketPage.photoRemove")}
                </label>
              ) : null}
            </div>
          </div>
          <span id="f-photo-hint" className="text-xs text-muted">
            {t("marketPage.photoHint")}
          </span>
          <FieldError id="f-photo-error" error={errors.photo} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-name" className="text-sm font-semibold">
            {t("studioMarket.nameLabel")}
          </label>
          <input id="f-name" name="name" defaultValue={v("name", profile.name)} maxLength={60} className="input" aria-invalid={errors.name ? true : undefined} autoComplete="organization" />
          <FieldError id="f-name-error" error={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-slug" className="text-sm font-semibold">
            {t("studioMarket.slugLabel")}
          </label>
          <div className="input flex items-center gap-0 px-0" dir="ltr">
            <span className="ps-3.5 text-sm font-semibold whitespace-nowrap text-muted">{host}/designers/</span>
            <input
              id="f-slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={40}
              className="h-full min-w-0 flex-1 border-0 bg-transparent pe-3.5 text-[15px] outline-none"
              aria-describedby="f-slug-hint"
              aria-invalid={errors.slug ? true : undefined}
            />
          </div>
          <span id="f-slug-hint" className="text-xs text-muted">
            {t("studioMarket.slugHint")}
          </span>
          <FieldError id="f-slug-error" error={errors.slug} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-bio" className="text-sm font-semibold">
            {t("studioMarket.bioLabel")}
          </label>
          <textarea id="f-bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} rows={3} className="input min-h-[88px] py-3" aria-invalid={errors.bio ? true : undefined} />
          <span className="text-end text-xs text-muted" dir="ltr">
            {bio.length}/400
          </span>
          <FieldError id="f-bio-error" error={errors.bio} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-country" className="text-sm font-semibold">
            {t("studioMarket.countryLabel")}
          </label>
          <select id="f-country" name="country" defaultValue={v("country", profile.country)} className="input" aria-invalid={errors.country ? true : undefined}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError id="f-country-error" error={errors.country} />
          <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[15px]">
            <input type="checkbox" name="showCountry" defaultChecked={state.values ? state.values.showCountry === "on" : profile.showCountry} className="h-5 w-5 accent-[var(--color-midnight)]" />
            {t("marketPage.showCountry")}
          </label>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{t("marketPage.linksLabel")}</legend>
          <span id="f-links-hint" className="text-xs text-muted">
            {t("marketPage.linksHint")}
          </span>
          {profile.links.map((link, i) => (
            <input
              key={i}
              name={`link${i + 1}`}
              type="url"
              inputMode="url"
              dir="ltr"
              defaultValue={v(`link${i + 1}`, link)}
              placeholder="https://"
              aria-label={t("marketPage.linkField", { n: i + 1 })}
              aria-describedby="f-links-hint"
              aria-invalid={errors.links ? true : undefined}
              maxLength={200}
              className="input"
            />
          ))}
          <FieldError id="f-links-error" error={errors.links} />
          <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[15px]">
            <input type="checkbox" name="showLinks" defaultChecked={state.values ? state.values.showLinks === "on" : profile.showLinks} className="h-5 w-5 accent-[var(--color-midnight)]" />
            {t("marketPage.showLinks")}
          </label>
        </fieldset>

        <FormMessage message={errors.form ?? (state.ok ? undefined : state.message)} />
        {state.ok ? <FormMessage ok message={state.message} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="h-11">{t("marketPage.save")}</SubmitButton>
          {pageHref ? (
            <a href={pageHref} target="_blank" rel="noopener" className={`${btn.secondary} h-11`} data-see-page="">
              <Icon name="open_in_new" size={18} />
              {t("marketPage.seePage")}
            </a>
          ) : null}
        </div>
        {pageHref ? null : <p className="m-0 text-sm text-muted">{t("marketPage.pageNotYet")}</p>}
      </form>

      <aside className="mk-panel flex flex-col gap-3 rounded-[28px] px-5 py-6" aria-label={t("marketPage.title")}>
        <div className="flex items-center gap-3">
          {preview && !remove ? <PhotoCanvas file={preview} size={56} rounded="rounded-2xl" /> : <DesignerAvatar designer={{ ...chip, photoUrl: savedPhoto }} size="lg" />}
          <span className="flex min-w-0 flex-col">
            <b dir="auto" className="truncate text-base">
              {v("name", profile.name)}
            </b>
            <bdi dir="ltr" className="truncate text-xs text-muted">
              {host}/designers/{slug}
            </bdi>
          </span>
        </div>
        <p className="m-0 flex gap-2 text-sm leading-relaxed text-ink-3">
          <Icon name="public" size={18} className="mt-0.5 flex-none text-accent" />
          {t("marketPage.publicNote")}
        </p>
      </aside>
    </div>
  );
}

/** The chosen photo, decoded by the browser and drawn on a canvas (cropped to a square), as partner-photo.tsx does. */
function PhotoCanvas({ file, size, rounded = "rounded-full" }: { file: File; size: number; rounded?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void createImageBitmap(file)
      .then((bitmap) => {
        const c = canvas.current;
        const ctx = c?.getContext("2d");
        if (cancelled || !c || !ctx) return bitmap.close();
        const side = Math.min(bitmap.width, bitmap.height);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, c.width, c.height);
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [file]);
  return <canvas ref={canvas} width={size * 2} height={size * 2} aria-hidden="true" data-photo-preview="" className={`flex-none bg-sand ${rounded}`} style={{ width: size, height: size }} />;
}
