import type { Metadata } from "next";
import { removeBotPhraseAction, switchBotPhraseAction } from "@/app/actions/admin-bot";
import { ReadOnly } from "@/components/read-only";
import { Badge, btn } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { dictionaryView, DICTIONARY_TABS, isDictionaryTab, TAB_LABEL, type DictionaryTab, type IntentView } from "@/lib/bot/admin";
import { dictionaryFor, PHRASE_MAX } from "@/lib/bot/dictionary";
import { intentLabel, isPhraseLang, PHRASE_LANG_LABEL, PHRASE_LANGS, STEP_INTENTS, type PhraseLang } from "@/lib/bot/intents";
import { detectDialect, matchAll, matchOne } from "@/lib/bot/match";
import { getStore } from "@/lib/data";
import { AddPhraseForm } from "./forms";
import { BotHeader, Card, FilterLinks } from "./shared";

export const metadata: Metadata = { title: "Bot dictionary" };
export const dynamic = "force-dynamic";

const LANG_OPTIONS = PHRASE_LANGS.map((l) => ({ value: l, label: PHRASE_LANG_LABEL[l] }));

function href(tab: DictionaryTab, lang: PhraseLang | null, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...(tab === "kind" ? {} : { step: tab }), ...(lang ? { lang } : {}), ...extra });
  const query = params.toString();
  return `/admin/bot${query ? `?${query}` : ""}`;
}

/**
 * Admin › Bot dictionary: each question's intents with the words the bot
 * understands for them, built in (switched off when they mislead it) and
 * the team's own, per language and dialect; and a box to try a phrase.
 */
export default async function BotDictionaryPage({ searchParams }: PageProps<"/admin/bot">) {
  const { adminRole } = await requireAdmin();
  const edit = can(adminRole, "bot.edit");
  const params = await searchParams;
  const tab: DictionaryTab = isDictionaryTab(params.step) ? params.step : "kind";
  const lang = isPhraseLang(params.lang) ? params.lang : null;
  const tried = typeof params.try === "string" ? params.try.trim().slice(0, 200) : "";
  const store = await getStore();
  const [changes, open] = await Promise.all([store.listBotPhrases(), store.listBotUnmatched({ status: "open", offset: 0, limit: 1 })]);
  const intents = dictionaryView(tab, changes, lang);
  const offCount = changes.filter((c) => c.kind === "off").length;
  const addedCount = changes.filter((c) => c.kind === "added").length;
  return (
    <>
      <BotHeader current="dictionary" open={open.total} />
      <p className="m-0 text-sm text-ink-4">
        The team added {addedCount} {addedCount === 1 ? "phrase" : "phrases"} and switched off {offCount} built-in {offCount === 1 ? "one" : "ones"}. Spelling is forgiven: the bot
        reads ة as ه, ى as ي, every alif alike, without diacritics or tatweel, Turkish letters as plain ones, any casing, and small typos.
      </p>
      <FilterLinks label="Question" items={DICTIONARY_TABS.map((t) => ({ href: href(t, lang), label: TAB_LABEL[t], on: t === tab }))} />
      <FilterLinks
        label="Language"
        items={[{ href: href(tab, null), label: "All", on: lang === null }, ...PHRASE_LANGS.map((l) => ({ href: href(tab, l), label: PHRASE_LANG_LABEL[l], on: l === lang }))]}
      />
      <TryIt tab={tab} lang={lang} tried={tried} dictionary={tried ? dictionaryFor(changes) : null} />
      <ReadOnly when={!edit} what="change the bot's dictionary">
        <Card id="h-intents" title={`${TAB_LABEL[tab]}: ${intents.length} ${intents.length === 1 ? "intent" : "intents"}`}>
          <ul className="m-0 flex list-none flex-col p-0" aria-label={`${TAB_LABEL[tab]} intents`}>
            {intents.map((view) => (
              <IntentItem key={view.intent} view={view} edit={edit} lang={lang} open={lang !== null || intents.length === 1} />
            ))}
          </ul>
        </Card>
      </ReadOnly>
    </>
  );
}

function IntentItem({ view, edit, lang, open }: { view: IntentView; edit: boolean; lang: PhraseLang | null; open: boolean }) {
  const off = view.builtIn.filter((p) => p.off).length;
  const byLang = PHRASE_LANGS.map((l) => ({ lang: l, builtIn: view.builtIn.filter((p) => p.lang === l), added: view.added.filter((p) => p.lang === l) })).filter(
    (g) => g.builtIn.length || g.added.length,
  );
  return (
    <li className="border-t border-line-soft py-2.5 first:border-t-0">
      <details open={open}>
        <summary className="cursor-pointer">
          <span className="font-semibold">{view.label}</span>{" "}
          <span className="text-[13px] text-muted">
            · {view.builtIn.length} built in{off ? `, ${off} off` : ""} · {view.added.length} added
            {view.alsoOn.length ? ` · also on ${view.alsoOn.map((s) => TAB_LABEL[s]).join(", ")}` : ""}
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {byLang.length ? (
            <form action={switchBotPhraseAction} className="flex flex-col gap-2.5">
              <input type="hidden" name="intent" value={view.intent} />
              {byLang.map((group) => (
                <div key={group.lang} className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-ink-4">{PHRASE_LANG_LABEL[group.lang]}</span>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={`${view.label}, ${PHRASE_LANG_LABEL[group.lang]}`}>
                    {group.builtIn.map((p) => (
                      <li key={`b-${p.text}`} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm ${p.off ? "border-dashed border-line text-muted line-through" : "border-line"}`}>
                        <span dir="auto">{p.text}</span>
                        {edit ? (
                          <button
                            type="submit"
                            name="phrase"
                            value={JSON.stringify({ lang: p.lang, text: p.text, off: !p.off })}
                            className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-midnight underline"
                          >
                            {p.off ? "Switch on" : "Switch off"}
                            <span className="sr-only"> {p.text}</span>
                          </button>
                        ) : null}
                      </li>
                    ))}
                    {group.added.map((p) => (
                      <li key={`a-${p.id}`} className="flex items-center gap-1.5 rounded-full border border-midnight px-2.5 py-1 text-sm" title={`Added by ${p.createdBy}`}>
                        <span dir="auto">{p.text}</span>
                        <Badge tone="info">Team</Badge>
                        {edit ? (
                          <button type="submit" formAction={removeBotPhraseAction} name="id" value={p.id} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-danger underline">
                            Remove<span className="sr-only"> {p.text}</span>
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </form>
          ) : (
            <p className="m-0 text-sm text-muted">No phrases{lang ? ` in ${PHRASE_LANG_LABEL[lang]}` : ""} yet.</p>
          )}
          {edit ? <AddPhraseForm intent={view.intent} label={view.label} langs={LANG_OPTIONS} lang={lang ?? "en"} max={PHRASE_MAX} /> : null}
        </div>
      </details>
    </li>
  );
}

/** What the bot makes of a phrase on this question now, as the dashboard's guide would. */
function TryIt({ tab, lang, tried, dictionary }: { tab: DictionaryTab; lang: PhraseLang | null; tried: string; dictionary: ReturnType<typeof dictionaryFor> | null }) {
  let answer: string | null = null;
  if (dictionary && tried) {
    const dialect = detectDialect(dictionary, tried);
    const told = dialect ? ` Written in ${PHRASE_LANG_LABEL[dialect]}.` : "";
    if (tab === "want") answer = dialect ? `It tells the dialect: ${PHRASE_LANG_LABEL[dialect]}.` : "It doesn't tell the dialect.";
    else if (tab === "languages" || tab === "features") {
      const found = matchAll(dictionary, tried, STEP_INTENTS[tab]);
      answer = found.length
        ? `Understood: ${found.map((m) => `${intentLabel(m.intent)}${m.negated ? " (turned down)" : ""}${m.fuzzy ? " (a typo, so it asks)" : ""}`).join(", ")}.${told}`
        : `Not understood: the owner sees all the question's buttons, and it is logged.${told}`;
    } else {
      const found = matchOne(dictionary, tried, STEP_INTENTS[tab]);
      answer =
        found.kind === "sure"
          ? `Sure: ${intentLabel(found.intent)}.${told}`
          : found.kind === "choices"
            ? `Not sure, so it shows: ${found.intents.map(intentLabel).join(", ")}.${told}`
            : `Not understood: the owner sees all the question's buttons, and it is logged.${told}`;
    }
  }
  return (
    <form method="get" action="/admin/bot" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
      {tab === "kind" ? null : <input type="hidden" name="step" value={tab} />}
      {lang ? <input type="hidden" name="lang" value={lang} /> : null}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex min-w-[min(280px,100%)] flex-1 flex-col gap-1.5">
          <label htmlFor="f-try" className="text-sm font-semibold">
            Try a phrase on the {TAB_LABEL[tab].toLowerCase()} question
          </label>
          <input id="f-try" name="try" dir="auto" maxLength={200} defaultValue={tried} className="input input-sm" />
        </div>
        <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
          Try it
        </button>
      </div>
      {answer ? (
        <p role="status" className="m-0 text-[15px]">
          <span dir="auto" className="font-semibold">
            “{tried}”
          </span>{" "}
          {answer}
        </p>
      ) : null}
    </form>
  );
}
