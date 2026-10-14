"use client";

/* eslint-disable @next/next/no-img-element -- the article's picture, served by our own asset route */
import { useActionState, type ReactNode } from "react";
import { addArticleCategoryAction, renameArticleCategoryAction, saveArticleAction, saveNewsSettingsAction } from "@/app/actions/articles";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface ArticleFormValues {
  id: number | null;
  title: string;
  excerpt: string;
  author: string;
  body: string;
  categoryIds: number[];
  image: { url: string } | null;
  published: boolean;
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 border-0 border-t border-line-soft p-0 pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[17px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Writing or editing an article. A new one is saved as a draft or published, optionally as breaking news. */
export function ArticleForm({
  article,
  categories,
  limits,
  push,
}: {
  article: ArticleFormValues;
  categories: { id: number; name: string }[];
  limits: { title: number; excerpt: number; author: number; body: number; imageMb: number };
  /** Whether breaking news reaches phones (else only the inboxes). */
  push: boolean;
}) {
  const [state, action] = useActionState(saveArticleAction, initialFormState);
  const v = (key: "title" | "excerpt" | "author" | "body", fallback: string) => state.values?.[key] ?? fallback;
  const e = state.errors ?? {};
  const ticked = new Set(article.categoryIds);
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {article.id !== null ? <input type="hidden" name="id" value={article.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />

      <Group title="Article">
        <Field label="Title" name="title" required maxLength={limits.title} defaultValue={v("title", article.title)} error={e.title} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-body" className="text-sm font-semibold">
            Text
          </label>
          <textarea
            id="f-body"
            name="body"
            rows={14}
            maxLength={limits.body}
            defaultValue={v("body", article.body)}
            className="input min-h-64 py-3"
            aria-describedby="f-body-hint"
            aria-invalid={e.body ? true : undefined}
          />
          <span id="f-body-hint" className="text-[13px] text-muted">
            Leave an empty line between paragraphs. Simple HTML works too: headings, bold, lists, quotes, links, pictures from https addresses, and YouTube or Vimeo
            videos pasted as their embed code.
          </span>
          <FieldError id="f-body-error" error={e.body} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-excerpt" className="text-sm font-semibold">
            Summary
          </label>
          <textarea
            id="f-excerpt"
            name="excerpt"
            rows={3}
            maxLength={limits.excerpt}
            defaultValue={v("excerpt", article.excerpt)}
            className="input min-h-20 py-3"
            aria-describedby="f-excerpt-hint"
          />
          <span id="f-excerpt-hint" className="text-[13px] text-muted">
            Optional. Shown in lists and in breaking news. Left empty, the first lines of the article are used.
          </span>
          <FieldError id="f-excerpt-error" error={e.excerpt} />
        </div>
        <Field label="Author" name="author" maxLength={limits.author} defaultValue={v("author", article.author)} hint="Optional. The name shown in the app." error={e.author} />
      </Group>

      <Group title="Sections">
        {categories.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  defaultChecked={ticked.has(c.id)}
                  className="h-4 w-4 accent-midnight"
                />
                {c.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="m-0 text-[15px] text-muted">No sections yet. Add them on the Articles page.</p>
        )}
      </Group>

      <Group title="Picture">
        {article.image ? (
          <div className="flex flex-wrap items-center gap-4">
            <img src={article.image.url} alt="The article's picture" className="h-24 w-40 rounded-lg border border-line object-cover" />
            <Check name="removeImage" label="Remove the picture" defaultChecked={false} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-image" className="text-sm font-semibold">
            {article.image ? "Replace the picture" : "Add a picture"}
          </label>
          <input
            id="f-image"
            type="file"
            name="image"
            accept="image/png,image/jpeg"
            className="text-sm"
            aria-describedby="f-image-hint"
            aria-invalid={e.image ? true : undefined}
          />
          <span id="f-image-hint" className="text-[13px] text-muted">
            PNG or JPEG, up to {limits.imageMb} MB. Wide pictures look best.
          </span>
          <FieldError id="f-image-error" error={e.image} />
        </div>
      </Group>

      {!article.published ? (
        <Check
          name="breaking"
          label="Send as breaking news when I publish"
          hint={
            push
              ? "Readers get a notification that opens the article, and it's in their notifications inbox."
              : "It goes to your readers' notifications inbox. Set up Firebase on App notifications to send it to their phones too."
          }
          defaultChecked={state.values ? state.values.breaking === "on" : false}
        />
      ) : null}

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {article.published ? (
          <SubmitButton className="h-11" pendingText="Saving…">
            Save article
          </SubmitButton>
        ) : (
          <>
            <SubmitButton variant="secondary" className="h-11" name="intent" value="draft" pendingText="Saving…">
              Save as draft
            </SubmitButton>
            <SubmitButton className="h-11" name="intent" value="publish" pendingText="Publishing…">
              Publish
            </SubmitButton>
          </>
        )}
      </div>
    </form>
  );
}

export function AddCategoryForm() {
  const [state, action] = useActionState(addArticleCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3">
      <Field
        label="New section"
        name="name"
        small
        maxLength={60}
        placeholder="Sport"
        defaultValue={state.ok ? "" : (state.values?.name ?? "")}
        key={state.ok ? state.message : "add"}
        error={state.errors?.name}
        className="min-w-[200px] flex-1"
      />
      <SubmitButton variant="secondary" className="h-10" pendingText="Adding…">
        Add section
      </SubmitButton>
      <div className="w-full">
        <FormMessage message={state.errors ? undefined : state.message} ok={state.ok} />
      </div>
    </form>
  );
}

export function RenameCategoryForm({ category }: { category: { id: number; name: string } }) {
  const [state, action] = useActionState(renameArticleCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={category.id} />
      <Field
        label={<span className="sr-only">Name of {category.name}</span>}
        id={`f-category-${category.id}`}
        name="name"
        small
        maxLength={60}
        defaultValue={state.values?.name ?? category.name}
        error={state.errors?.name}
        className="min-w-[160px] flex-1"
      />
      <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
        Rename
      </SubmitButton>
    </form>
  );
}

export function NewsSettingsForm({ settings }: { settings: { showAuthor: boolean; showDates: boolean } }) {
  const [state, action] = useActionState(saveNewsSettingsAction, initialFormState);
  const checked = (key: "showAuthor" | "showDates") => (state.values ? state.values[key] === "on" : settings[key]);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Check name="showAuthor" label="Show who wrote each article" defaultChecked={checked("showAuthor")} />
      <Check name="showDates" label="Show when each article was published" defaultChecked={checked("showDates")} />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
