import { Field } from "@/components/form";
import { MediaPickButton } from "@/components/media-picker";
import type { DashT } from "@/i18n/dashboard";
import { LIBRARY_LIMITS } from "@/lib/school/library";

/** 113.11 What the library pages share: a book's fields. */

export function BookFields({ suffix, values, coverUrl, t }: { suffix: string; values: Record<string, string>; coverUrl: string | null; t: DashT }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`f-book-title${suffix}`} label={t("library.bookTitle")} name="title" defaultValue={values.title} maxLength={LIBRARY_LIMITS.title} required className="sm:col-span-2" />
      <Field id={`f-book-author${suffix}`} label={t("library.author")} name="author" defaultValue={values.author} maxLength={LIBRARY_LIMITS.author} required />
      <Field id={`f-book-isbn${suffix}`} label={t("library.isbn")} name="isbn" defaultValue={values.isbn} maxLength={20} dir="ltr" />
      <Field id={`f-book-shelf${suffix}`} label={t("library.shelf")} name="shelf" defaultValue={values.shelf} maxLength={LIBRARY_LIMITS.shelf} placeholder={t("library.shelfExample")} />
      <Field id={`f-book-category${suffix}`} label={t("library.category")} name="category" defaultValue={values.category} maxLength={LIBRARY_LIMITS.category} placeholder={t("library.categoryExample")} />
      <Field id={`f-book-language${suffix}`} label={t("library.language")} name="language" defaultValue={values.language} maxLength={LIBRARY_LIMITS.language} placeholder={t("library.languageExample")} />
      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`f-book-description${suffix}`} className="text-sm font-semibold">
          {t("library.description")}
        </label>
        <textarea id={`f-book-description${suffix}`} name="description" defaultValue={values.description} maxLength={LIBRARY_LIMITS.description} rows={3} className="input min-h-[84px] py-2" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`f-book-cover${suffix}`} className="text-sm font-semibold">
          {t("library.cover")}
        </label>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the school's own picture
          <img src={coverUrl} alt="" className="h-28 w-20 rounded-lg border border-line object-cover" />
        ) : null}
        <input id={`f-book-cover${suffix}`} name="cover" type="file" accept="image/png,image/jpeg" className="text-sm" aria-describedby={`f-book-cover${suffix}-hint`} />
        <span id={`f-book-cover${suffix}-hint`} className="text-[13px] text-muted">
          {t("library.coverHint")}
        </span>
        {coverUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeCover" className="size-4" />
            {t("library.removeCover")}
          </label>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Field id={`f-book-file${suffix}`} label={t("library.ebook")} name="file" defaultValue={values.file} hint={t("library.ebookHint")} dir="ltr" />
        <MediaPickButton kind="pdf" inputId={`f-book-file${suffix}`} label={t("library.ebookPick")} />
      </div>
    </div>
  );
}
