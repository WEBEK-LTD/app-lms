"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { botChoiceAction, botCreateAction, botUnderstandAction, type BotCreateError, type BotReply } from "@/app/actions/bot";
import { uploadAssetAction } from "@/app/actions/dashboard";
import { FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { BOT_NAME_MAX, websiteAddress } from "@/lib/bot/answers";
import type { BotFeature } from "@/lib/bot/intents";

export interface BuilderKind {
  id: string;
  intent: string;
  name: string;
  icon: IconName;
  /** Made in Yallapp Studio. */
  studio: boolean;
  /** Asked whether there is a website. */
  website: boolean;
  features: BotFeature[];
  university: boolean;
}

interface Colour {
  id: string;
  intent: string;
  hex: string;
  name: string;
}

interface Feature {
  id: BotFeature;
  intent: string;
  name: string;
  /** What the plan says about it, for a regular app and a Studio project. */
  regular: string;
  studio: string;
}

type Step = "kind" | "name" | "colour" | "logo" | "languages" | "features" | "website" | "address" | "summary";

interface Answers {
  kind: BuilderKind | null;
  name: string;
  /** Null: the demo's colours. */
  colour: string | null;
  logo: { id: string; url: string } | null;
  languages: string[];
  features: BotFeature[];
  website: string | null;
}

interface Line {
  from: "guide" | "you";
  text: string;
}

const QUESTION: Record<Step, DashKey> = {
  kind: "bot.qKind",
  name: "bot.qName",
  colour: "bot.qColour",
  logo: "bot.qLogo",
  languages: "bot.qLanguages",
  features: "bot.qFeatures",
  website: "bot.qWebsite",
  address: "bot.qAddress",
  summary: "bot.summary",
};

const ERROR_KEY: Record<BotCreateError, DashKey> = {
  kind: "bot.errKind",
  name: "bot.errName",
  colour: "bot.errColour",
  logo: "bot.errLogo",
  languages: "bot.errLanguages",
  website: "bot.errWebsite",
  limit: "bot.errLimit",
  unavailable: "bot.errUnavailable",
  failed: "bot.errFailed",
};

const HEX = /^#?([0-9a-f]{6})$/i;

/**
 * The app-builder bot's conversation: one question at a time, answered
 * with its buttons or in the owner's words (matched on the server against
 * the dictionary). When it isn't sure it shows the likely buttons; when it
 * didn't understand, all of them, so it never stops.
 */
export function Builder({
  kinds,
  colours,
  languages,
  features,
}: {
  kinds: BuilderKind[];
  colours: Colour[];
  languages: { names: Record<string, string>; offered: string[] };
  features: Feature[];
}) {
  const t = useDashT();
  const lang = useDashLang();
  const [step, setStep] = useState<Step>("kind");
  const [answers, setAnswers] = useState<Answers>({ kind: null, name: "", colour: null, logo: null, languages: [], features: [], website: null });
  const [lines, setLines] = useState<Line[]>([{ from: "guide", text: t("bot.qKind") }]);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [egyptian, setEgyptian] = useState(false);
  const [backToSummary, setBackToSummary] = useState(false);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [ownColour, setOwnColour] = useState("#1E63E9");
  const [busy, startBusy] = useTransition();
  const [creating, startCreating] = useTransition();
  const logoInput = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [lines, step]);

  const kind = answers.kind;
  const offeredFeatures = features.filter((f) => !kind || kind.features.includes(f.id));
  const say = (from: Line["from"], text: string) => setLines((all) => [...all, { from, text }]);
  // The few replies the bot says in Egyptian-friendly words to an owner who writes Egyptian.
  const list = (items: string[]) => items.join(lang === "ar" ? "، " : ", ");
  const reply = (key: "understood" | "notSure" | "notUnderstood", values?: Record<string, string>) => t((egyptian ? `bot.eg.${key}` : `bot.${key}`) as DashKey, values);

  function stepAfter(current: Step, next: Answers): Step {
    if (backToSummary && current !== "website") return "summary";
    const order: Step[] = ["kind", "name", "colour", "logo", "languages", "features", "website", "summary"];
    let at = order.indexOf(current === "address" ? "website" : current) + 1;
    if (order[at] === "website" && !next.kind?.website) at += 1;
    return order[at] ?? "summary";
  }

  function go(next: Step) {
    setStep(next);
    setChoices(null);
    setTicket(null);
    setProblem(null);
    setTyped("");
    if (next === "summary") setBackToSummary(false);
    say("guide", t(QUESTION[next]));
  }

  /** The button the owner chose, after something the bot didn't understand: the team learns from it. */
  function chose(intent: string) {
    if (ticket) void botChoiceAction(ticket, intent);
    setTicket(null);
  }

  function finish(current: Step, next: Answers, label: string) {
    setAnswers(next);
    say("you", label);
    go(stepAfter(current, next));
  }

  // ——— The answers ———

  function pickKind(chosen: BuilderKind) {
    chose(chosen.intent);
    finish("kind", { ...answers, kind: chosen, features: answers.features.filter((f) => chosen.features.includes(f)), website: chosen.website ? answers.website : null }, chosen.name);
  }

  function pickColour(colour: Colour | null, hex?: string) {
    if (colour) chose(colour.intent);
    else chose("answer.skip");
    const value = colour?.hex ?? hex ?? null;
    finish("colour", { ...answers, colour: value }, colour?.name ?? (value ? value.toUpperCase() : t("bot.colourDemo")));
  }

  function skipLogo() {
    chose("answer.skip");
    finish("logo", { ...answers, logo: null }, t("bot.logoSkip"));
  }

  function toggleLanguage(code: string) {
    chose(`lang.${code}`);
    setAnswers((a) => ({ ...a, languages: a.languages.includes(code) ? a.languages.filter((c) => c !== code) : [...a.languages, code] }));
  }

  function doneLanguages(next = answers) {
    chose("answer.done");
    const picked = next.languages.length ? next.languages : [lang];
    finish("languages", { ...next, languages: picked }, list(picked.map((c) => languages.names[c] ?? c)));
  }

  function toggleFeature(id: BotFeature) {
    chose(`feature.${id}`);
    setAnswers((a) => ({ ...a, features: a.features.includes(id) ? a.features.filter((f) => f !== id) : [...a.features, id] }));
  }

  function doneFeatures(next = answers, none = false) {
    chose(none ? "answer.no" : "answer.done");
    const picked = none ? [] : next.features;
    const names = offeredFeatures.filter((f) => picked.includes(f.id)).map((f) => f.name);
    finish("features", { ...next, features: picked }, names.length ? list(names) : t("bot.featuresNone"));
  }

  function answerWebsite(has: boolean) {
    chose(has ? "answer.yes" : "answer.no");
    if (has) {
      say("you", t("bot.yes"));
      go("address");
    } else finish("website", { ...answers, website: null }, t("bot.no"));
  }

  function giveAddress(text: string) {
    const address = websiteAddress(text);
    if (!address) {
      setProblem(t("bot.addressBad"));
      return;
    }
    finish("address", { ...answers, website: address }, address.replace(/^https:\/\//, ""));
  }

  function giveName(text: string) {
    const name = text.trim().replace(/\s+/g, " ");
    if (!name || name.length > BOT_NAME_MAX) {
      setProblem(t("bot.nameLong"));
      return;
    }
    finish("name", { ...answers, name }, name);
  }

  async function uploadLogo(file: File) {
    const data = new FormData();
    data.set("kind", "logo");
    data.set("file", file);
    setProblem(null);
    const result = await uploadAssetAction(data);
    if (!result.ok || !result.id || !result.url) {
      setProblem(result.error ?? t("bot.errLogo"));
      return;
    }
    chose("answer.yes");
    finish("logo", { ...answers, logo: { id: result.id, url: result.url } }, file.name);
  }

  // ——— Typed answers ———

  function understood(label: string) {
    say("guide", reply("understood", { answer: label }));
  }

  function unsure(found: BotReply) {
    setTicket(found.ticket);
    const shown = found.kind === "choices" ? found.intents : null;
    setChoices(shown);
    say("guide", shown?.length ? reply("notSure") : reply("notUnderstood"));
  }

  function apply(found: BotReply) {
    if (found.dialect) setEgyptian(found.dialect === "ar-eg");
    if (found.limited) {
      say("guide", t("bot.tooFast"));
      return;
    }
    const top = found.kind === "sure" ? found.intents[0] : null;
    if (step === "kind") {
      const match = top ? kinds.find((k) => k.intent === top) : null;
      if (match) {
        understood(match.name);
        return pickKind(match);
      }
      const offered = found.intents.filter((i) => kinds.some((k) => k.intent === i));
      return unsure({ ...found, kind: offered.length ? "choices" : "none", intents: offered });
    }
    if (step === "colour") {
      const colour = colours.find((c) => c.intent === top);
      if (colour) {
        understood(colour.name);
        return pickColour(colour);
      }
      if (top === "answer.skip") return pickColour(null);
      return unsure(found);
    }
    if (step === "logo") {
      if (top === "answer.skip" || top === "answer.no") return skipLogo();
      if (top === "answer.yes") return logoInput.current?.click();
      return unsure(found);
    }
    if (step === "languages") {
      const found_ = found.intents.filter((i) => i.startsWith("lang.")).map((i) => i.slice(5));
      const off = found.negated.filter((i) => i.startsWith("lang.")).map((i) => i.slice(5));
      if (found.kind !== "many" || (!found_.length && !off.length && !found.intents.includes("answer.done"))) return unsure(found);
      const next = { ...answers, languages: [...answers.languages.filter((c) => !off.includes(c)), ...found_.filter((c) => !answers.languages.includes(c))] };
      if (found_.length) understood(list(found_.map((c) => languages.names[c] ?? c)));
      if (found.intents.includes("answer.done")) return doneLanguages(next);
      setAnswers(next);
      return;
    }
    if (step === "features") {
      const on = found.intents.filter((i) => i.startsWith("feature.")).map((i) => i.slice(8) as BotFeature).filter((f) => offeredFeatures.some((x) => x.id === f));
      const off = found.negated.filter((i) => i.startsWith("feature.")).map((i) => i.slice(8) as BotFeature);
      if (found.kind !== "many") return unsure(found);
      if (found.intents.includes("answer.no") && !on.length) return doneFeatures(answers, true);
      if (!on.length && !off.length && !found.intents.includes("answer.done")) return unsure(found);
      const next = { ...answers, features: [...answers.features.filter((f) => !off.includes(f)), ...on.filter((f) => !answers.features.includes(f))] };
      if (on.length) understood(list(offeredFeatures.filter((f) => on.includes(f.id)).map((f) => f.name)));
      if (found.intents.includes("answer.done")) return doneFeatures(next);
      setAnswers(next);
      return;
    }
    if (step === "website") {
      if (top === "answer.yes") return answerWebsite(true);
      if (top === "answer.no") return answerWebsite(false);
      return unsure(found);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setProblem(null);
    if (step === "name") return giveName(text);
    if (step === "address") return giveAddress(text);
    if (step === "summary") return;
    // A colour code, or the website's address, needs no dictionary.
    const hex = step === "colour" ? HEX.exec(text) : null;
    if (hex) return pickColour(null, `#${hex[1]!.toUpperCase()}`);
    if (step === "website" && websiteAddress(text) && /\.[a-z]{2,}/i.test(text)) {
      chose("answer.yes");
      say("you", t("bot.yes"));
      return finish("address", { ...answers, website: websiteAddress(text) }, text);
    }
    say("you", text);
    setTyped("");
    startBusy(async () => {
      apply(await botUnderstandAction(step, text));
    });
  }

  function change(to: Step) {
    setBackToSummary(true);
    go(to === "website" && !kind?.website ? "summary" : to);
  }

  function create() {
    if (!kind) return;
    setProblem(null);
    startCreating(async () => {
      const result = await botCreateAction({
        kind: kind.id,
        university: kind.university,
        name: answers.name,
        colour: answers.colour,
        logoAssetId: answers.logo?.id ?? null,
        languages: answers.languages,
        features: answers.features,
        website: answers.website,
      });
      if (result?.error) setProblem(t(ERROR_KEY[result.error]));
    });
  }

  function restart() {
    setAnswers({ kind: null, name: "", colour: null, logo: null, languages: [], features: [], website: null });
    setLines([]);
    setBackToSummary(false);
    go("kind");
  }

  const chip = "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-midnight hover:border-midnight disabled:opacity-60";
  const chipOn = "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-midnight bg-white px-4 text-[15px] font-bold text-midnight disabled:opacity-60";
  const shownKinds = choices ? kinds.filter((k) => choices.includes(k.intent)) : kinds;
  const shownColours = choices ? colours.filter((c) => choices.includes(c.intent)) : colours;
  const plainSteps: Step[] = ["summary"];

  return (
    <section aria-label={t("bot.title")} className="flex max-w-[760px] flex-col gap-4 rounded-[20px] border border-line bg-white p-5 sm:p-[26px]">
      <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-live="polite">
        {lines.map((line, i) => (
          <li key={i} className={`flex max-w-[85%] flex-col gap-1 ${line.from === "you" ? "ms-auto items-end" : "items-start"}`}>
            <span className="sr-only">{line.from === "you" ? t("bot.you") : t("bot.guide")}</span>
            <span className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${line.from === "you" ? "bg-midnight text-white" : "bg-sand text-midnight"}`}>{line.text}</span>
          </li>
        ))}
      </ol>
      <div ref={end} />

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {step === "kind" ? (
          <div className="flex flex-wrap gap-2">
            {shownKinds.map((k) => (
              <button key={k.intent} type="button" className={chip} onClick={() => pickKind(k)} disabled={busy}>
                <Icon name={k.icon} size={20} />
                {k.name}
              </button>
            ))}
            {choices ? (
              <button type="button" className={`${btn.ghost} min-h-11`} onClick={() => setChoices(null)}>
                {t("bot.showAll")}
              </button>
            ) : null}
          </div>
        ) : null}

        {step === "name" ? <p className="m-0 text-sm text-muted">{t("bot.nameHint")}</p> : null}

        {step === "colour" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip} onClick={() => pickColour(null)} disabled={busy}>
                <Icon name="palette" size={20} />
                {t("bot.colourDemo")}
              </button>
              {shownColours.map((c) => (
                <button key={c.id} type="button" className={chip} onClick={() => pickColour(c)} disabled={busy}>
                  <span aria-hidden="true" className="h-5 w-5 rounded-full border border-line" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
              {choices ? (
                <button type="button" className={`${btn.ghost} min-h-11`} onClick={() => setChoices(null)}>
                  {t("bot.showAll")}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="color" value={ownColour} onChange={(e) => setOwnColour(e.target.value)} className="h-11 w-14 rounded-lg border border-line" />
                {t("bot.colourOwn")}
              </label>
              <button type="button" className={`${btn.secondary} h-11`} onClick={() => pickColour(null, ownColour.toUpperCase())}>
                {t("bot.colourUse")}
              </button>
            </div>
          </div>
        ) : null}

        {step === "logo" ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/svg+xml,.png,.svg"
              className="sr-only"
              aria-label={t("bot.logoUpload")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) startBusy(() => uploadLogo(file));
                e.target.value = "";
              }}
            />
            <button type="button" className={`${btn.primary} h-11`} onClick={() => logoInput.current?.click()} disabled={busy}>
              <Icon name="upload" size={20} />
              {busy ? t("bot.logoUploading") : t("bot.logoUpload")}
            </button>
            <button type="button" className={chip} onClick={skipLogo} disabled={busy}>
              {t("bot.logoSkip")}
            </button>
          </div>
        ) : null}

        {step === "languages" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {[...languages.offered, ...answers.languages.filter((c) => !languages.offered.includes(c))].map((code) => {
                const at = answers.languages.indexOf(code);
                return (
                  <button key={code} type="button" aria-pressed={at >= 0} className={at >= 0 ? chipOn : chip} onClick={() => toggleLanguage(code)} disabled={busy}>
                    {at >= 0 ? <Icon name="check" size={18} /> : <Icon name="translate" size={18} />}
                    {languages.names[code] ?? code}
                  </button>
                );
              })}
            </div>
            <p className="m-0 text-sm text-muted">{t("bot.languagesTip")}</p>
            <button type="button" className={`${btn.primary} h-11 self-start`} onClick={() => doneLanguages()} disabled={busy}>
              {t("bot.continue")}
            </button>
          </div>
        ) : null}

        {step === "features" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {offeredFeatures.map((f) => {
                const on = answers.features.includes(f.id);
                return (
                  <button key={f.id} type="button" aria-pressed={on} className={`${on ? chipOn : chip} flex-col items-start rounded-2xl py-2`} onClick={() => toggleFeature(f.id)} disabled={busy}>
                    <span className="flex items-center gap-2">
                      <Icon name={on ? "check" : "tune"} size={18} />
                      {f.name}
                    </span>
                    <span className="text-[13px] font-normal text-muted">{kind?.studio ? f.studio : f.regular}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${btn.primary} h-11`} onClick={() => doneFeatures()} disabled={busy}>
                {t("bot.continue")}
              </button>
              <button type="button" className={`${btn.secondary} h-11`} onClick={() => doneFeatures(answers, true)} disabled={busy}>
                {t("bot.featuresNone")}
              </button>
            </div>
          </div>
        ) : null}

        {step === "website" ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip} onClick={() => answerWebsite(true)} disabled={busy}>
              <Icon name="language" size={20} />
              {t("bot.yes")}
            </button>
            <button type="button" className={chip} onClick={() => answerWebsite(false)} disabled={busy}>
              {t("bot.no")}
            </button>
          </div>
        ) : null}

        {step === "summary" && kind ? (
          <div className="flex flex-col gap-4">
            <dl className="m-0 grid gap-x-4 gap-y-3 [grid-template-columns:auto_1fr_auto]">
              {(
                [
                  ["kind", t("bot.sKind"), kind.name],
                  ["name", t("bot.sName"), answers.name],
                  ["colour", t("bot.sColour"), answers.colour ?? t("bot.demoColours")],
                  ["logo", t("bot.sLogo"), answers.logo ? "" : t("bot.noLogo")],
                  ["languages", t("bot.sLanguages"), list(answers.languages.map((c) => languages.names[c] ?? c))],
                  ["features", t("bot.sFeatures"), list(offeredFeatures.filter((f) => answers.features.includes(f.id)).map((f) => f.name)) || t("bot.noFeatures")],
                  ...(kind.website ? [["website", t("bot.sWebsite"), answers.website?.replace(/^https:\/\//, "") ?? t("bot.noWebsite")] as const] : []),
                ] as const
              ).map(([to, label, value]) => (
                <div key={to} className="contents">
                  <dt className="text-sm font-semibold text-muted">{label}</dt>
                  <dd className="m-0 flex items-center gap-2 text-[15px] font-semibold break-words">
                    {to === "colour" && answers.colour ? <span aria-hidden="true" className="h-5 w-5 rounded-full border border-line" style={{ background: answers.colour }} /> : null}
                    {to === "logo" && answers.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the owner's logo, just uploaded
                      <img src={answers.logo.url} alt="" className="h-8 max-w-[120px] object-contain" />
                    ) : null}
                    {value}
                  </dd>
                  <button type="button" className={`${btn.ghost} h-9 px-3 text-sm`} onClick={() => change(to as Step)} disabled={creating}>
                    <Icon name="edit" size={16} />
                    {t("bot.change")}
                  </button>
                </div>
              ))}
            </dl>
            <p className="m-0 text-sm leading-relaxed text-ink-4">{kind.studio ? t("bot.studioNote") : t("bot.regularNote")}</p>
            {answers.website ? <p className="m-0 text-sm leading-relaxed text-ink-4">{t("bot.websiteNote")}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${btn.main} h-12`} onClick={create} disabled={creating}>
                <Icon name="rocket_launch" size={20} />
                {creating ? t("bot.creating") : t("bot.create")}
              </button>
              <button type="button" className={`${btn.secondary} h-12`} onClick={restart} disabled={creating}>
                {t("bot.startAgain")}
              </button>
            </div>
          </div>
        ) : null}

        <FormMessage message={problem ?? undefined} />

        {!plainSteps.includes(step) ? (
          <form onSubmit={submit} className="flex gap-2">
            <label htmlFor="bot-answer" className="sr-only">
              {step === "name" ? t("bot.qName") : step === "address" ? t("bot.qAddress") : t("bot.typeHere")}
            </label>
            <input
              id="bot-answer"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={step === "name" ? BOT_NAME_MAX : 200}
              placeholder={step === "name" ? t("bot.qName") : step === "address" ? "example.com" : t("bot.typeHere")}
              dir={step === "address" ? "ltr" : "auto"}
              autoComplete="off"
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-[15px]"
            />
            <button type="submit" className={`${btn.primary} h-12`} disabled={busy || !typed.trim()} aria-label={t("bot.send")}>
              <Icon name="send" size={20} />
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
