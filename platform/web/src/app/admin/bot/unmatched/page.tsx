import type { Metadata } from "next";
import { ignoreBotUnmatchedAction } from "@/app/actions/admin-bot";
import { SubmitButton } from "@/components/form";
import { ReadOnly } from "@/components/read-only";
import { Badge, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { groupUnmatched, openUnmatchedGroups, TAB_LABEL, UNMATCHED_READ, type UnmatchedGroup } from "@/lib/bot/admin";
import { intentLabel, isMatchedStep, MATCHED_STEPS, PHRASE_LANG_LABEL, PHRASE_LANGS, STEP_INTENTS, type MatchedStep } from "@/lib/bot/intents";
import { getStore } from "@/lib/data";
import { MapButton, MapForm } from "../forms";
import { BotHeader, Card, FilterLinks } from "../shared";

export const metadata: Metadata = { title: "Unmatched phrases" };
export const dynamic = "force-dynamic";

const LANG_OPTIONS = PHRASE_LANGS.map((l) => ({ value: l, label: PHRASE_LANG_LABEL[l] }));
const DASH_LANG = { en: "English", ar: "Arabic", tr: "Turkish" } as const;
/** How many of the latest resolved rows the page shows. */
const DONE_SHOWN = 40;

/**
 * Admin › Unmatched phrases: what owners typed that the bot didn't
 * understand, grouped by question and text, with the buttons they chose
 * next; one click adds it to the dictionary, or it is ignored.
 */
export default async function UnmatchedPage({ searchParams }: PageProps<"/admin/bot/unmatched">) {
  const { adminRole } = await requireAdmin();
  const edit = can(adminRole, "bot.edit");
  const params = await searchParams;
  const step: MatchedStep | null = isMatchedStep(params.step) ? params.step : null;
  const store = await getStore();
  const [{ groups, rows, total }, mapped, ignored, all] = await Promise.all([
    openUnmatchedGroups(store, step),
    store.listBotUnmatched({ status: "mapped", step: step ?? undefined, offset: 0, limit: DONE_SHOWN }),
    store.listBotUnmatched({ status: "ignored", step: step ?? undefined, offset: 0, limit: DONE_SHOWN }),
    step ? store.listBotUnmatched({ status: "open", offset: 0, limit: 1 }) : null,
  ]);
  const done = groupUnmatched([...mapped.items, ...ignored.items])
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0))
    .slice(0, DONE_SHOWN);
  const at = (s: MatchedStep | null) => (s ? `/admin/bot/unmatched?step=${s}` : "/admin/bot/unmatched");
  return (
    <>
      <BotHeader current="unmatched" open={all ? all.total : total} />
      <FilterLinks label="Question" items={[{ href: at(null), label: "All", on: step === null }, ...MATCHED_STEPS.map((s) => ({ href: at(s), label: TAB_LABEL[s], on: s === step }))]} />
      <ReadOnly when={!edit} what="teach the bot">
        <Card id="h-open" title={`Not understood yet: ${groups.length} ${groups.length === 1 ? "phrase" : "phrases"}`}>
          {rows < total ? (
            <p className="m-0 text-sm text-muted">
              From the latest {UNMATCHED_READ} of {total} rows. The rest show as these are added or ignored.
            </p>
          ) : null}
          {groups.length ? (
            <ul className="m-0 flex list-none flex-col p-0" aria-label="Phrases not understood">
              {groups.map((group) => (
                <OpenItem key={`${group.step}-${group.normalized}`} group={group} edit={edit} />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[15px] text-muted">Nothing waiting. Phrases the bot doesn&apos;t understand show here.</p>
          )}
        </Card>
      </ReadOnly>
      {done.length ? (
        <Card id="h-done" title="Lately added or ignored">
          <ul className="m-0 flex list-none flex-col p-0" aria-label="Phrases added or ignored">
            {done.map((group) => (
              <li key={`${group.status}-${group.step}-${group.normalized}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-2.5 first:border-t-0">
                <span className="flex min-w-0 flex-col">
                  <span dir="auto" className="font-semibold">
                    {group.text}
                  </span>
                  <span className="text-[13px] text-muted">
                    {TAB_LABEL[group.step]} · {group.status === "mapped" && group.mappedIntent ? `added to ${intentLabel(group.mappedIntent)}` : "ignored"}
                    {group.resolvedBy ? ` by ${group.resolvedBy}` : ""} · {formatDateTime(group.resolvedAt)}
                  </span>
                </span>
                <Badge tone={group.status === "mapped" ? "success" : "neutral"}>{group.status === "mapped" ? "Added" : "Ignored"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function OpenItem({ group, edit }: { group: UnmatchedGroup; edit: boolean }) {
  const row = { step: group.step, normalized: group.normalized, text: group.text };
  const intents = STEP_INTENTS[group.step].map((intent) => ({ value: intent, label: intentLabel(intent) }));
  const told = group.dialects.map((d) => PHRASE_LANG_LABEL[d]);
  return (
    <li className="flex flex-col gap-2.5 border-t border-line-soft py-3.5 first:border-t-0">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span dir="auto" className="text-[17px] font-semibold">
            {group.text}
          </span>
          <Badge tone="neutral">
            {group.count} {group.count === 1 ? "time" : "times"}
          </Badge>
        </span>
        <span className="text-[13px] text-muted">
          {TAB_LABEL[group.step]} question · last {formatDateTime(group.lastAt)} · dashboard in {group.dashLangs.map((l) => DASH_LANG[l]).join(", ")}
          {told.length ? ` · written in ${told.join(", ")}` : ""}
        </span>
      </div>
      <p className="m-0 text-sm">
        <span className="font-semibold">Chosen next: </span>
        {group.chosen.length ? group.chosen.map((c) => `${intentLabel(c.intent)} (${c.count})`).join(", ") : "no button yet"}
        {group.nowFound.length ? (
          <>
            <br />
            <span className="font-semibold">The dictionary finds now: </span>
            {group.nowFound.slice(0, 4).map(intentLabel).join(", ")}
          </>
        ) : null}
      </p>
      {edit ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-start gap-2.5">
            {group.suggested ? <MapButton row={row} intent={group.suggested} intentLabel={intentLabel(group.suggested)} lang={group.lang} langLabel={PHRASE_LANG_LABEL[group.lang]} /> : null}
            <form action={ignoreBotUnmatchedAction}>
              <input type="hidden" name="step" value={group.step} />
              <input type="hidden" name="normalized" value={group.normalized} />
              <input type="hidden" name="text" value={group.text} />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                <span>
                  Ignore<span className="sr-only"> {group.text}</span>
                </span>
              </SubmitButton>
            </form>
          </div>
          <details open={!group.suggested}>
            <summary className="cursor-pointer text-sm font-semibold">{group.suggested ? "Another intent or language" : "Add it to an intent"}</summary>
            <div className="mt-2">
              <MapForm row={row} intents={intents} intent={group.suggested} langs={LANG_OPTIONS} lang={group.lang} />
            </div>
          </details>
        </div>
      ) : null}
    </li>
  );
}
