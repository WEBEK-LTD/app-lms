import { AccountLink } from "./account-link";
import { StoreMarks } from "./brand-marks";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { CheckList } from "./marketing";
import { PlanPrice, planStoresLineFor, storageText } from "./plan-cards";
import { WhatsAppLink } from "./whatsapp-link";
import type { Contact } from "@/lib/contact";
import { hasFeature, planStores, STUDIO_PLAN_CHOICES, type PlanInfo, type PriceView } from "@/lib/plans";
import type { PeriodKey } from "@/lib/billing/periods";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 103R What each Studio plan choice is called on the website, by plan feature (154 also the pricing page's compact cards). */
export function choiceLabels(lang: Lang): Record<string, { label: string; icon: IconName }> {
  const m = messagesFor(lang).studio;
  return {
    ios: { label: m.choiceIos, icon: "smartphone" },
    auto_publish: { label: m.choicePublish, icon: "rocket_launch" },
    delivery: { label: m.choiceDelivery, icon: "local_shipping" },
    courier_app: { label: m.choiceCourierApp, icon: "two_wheeler" },
    food: { label: m.choiceFood, icon: "restaurant" },
    market: { label: m.choiceMarketplace, icon: "storefront" },
    rides: { label: m.choiceRides, icon: "directions_car" },
    instructors: { label: m.choiceInstructors, icon: "groups" },
    school: { label: m.choiceSchool, icon: "school" },
    university: { label: m.choiceUniversity, icon: "apartment" },
    studio_motion: { label: m.choiceMotion, icon: "touch_app" },
    studio_templates: { label: m.choiceTemplates, icon: "dashboard_customize" },
  };
}

/** "12 Studio pages per project", or unlimited. */
export function pagesText(lang: Lang, plan: PlanInfo): string {
  const m = messagesFor(lang).studio;
  const pages = plan.limits.studioPages ?? null;
  return pages === null ? m.unlimitedPages : formatMessage(lang, m.pages, { count: pages });
}

/**
 * 103R Yallapp Studio's own plans, apart from the regular ones: the plans the
 * team offers (`planOffered`), each with its price, pages, storage and the
 * choices it includes. With none offered yet, Studio plans are on request.
 * What every Studio plan has, and what changes plan by plan, follow
 * (`basics`; 146 the pricing page shows them with Studio's explanation).
 * 146 For the period the visitor chose, with the price per month and the
 * saving, as the regular plans' cards (`PlanPrice`); in a row to swipe
 * through on phones, as theirs.
 */
export function StudioPlans({
  lang,
  plans,
  view,
  contact,
  period = null,
  basics = true,
}: {
  lang: Lang;
  plans: PlanInfo[];
  view: PriceView;
  contact: Contact;
  /** 146 The billing period the visitor chose: each plan shows it when it has it (else its own main price). */
  period?: PeriodKey | null;
  /** 146 What every Studio plan has and what changes plan by plan, under the cards. */
  basics?: boolean;
}) {
  const m = messagesFor(lang).studio;
  const words = messagesFor(lang).plans;
  const choices = choiceLabels(lang);
  const shownChoices = STUDIO_PLAN_CHOICES.filter((id) => choices[id]);
  const wa = (chunk: string) => (
    <WhatsAppLink lines={contact.lines} country={contact.country}>
      {chunk}
    </WhatsAppLink>
  );
  return (
    <div className="flex flex-col gap-8" data-studio-plans="">
      {plans.length > 0 ? (
        <ul
          aria-label={m.plansTitle}
          // 146 As the regular plans' cards: rows of four (two on tablets) at one width, a row to swipe through on phones.
          className="-mx-4 my-0 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-5 sm:overflow-visible sm:px-0"
        >
          {plans.map((plan) => {
            const on = (id: string) => (plan.features as readonly string[]).includes(id);
            // 146 What the plan doesn't include, folded under what it does, so the card stays short.
            const missing = shownChoices.filter((id) => !on(id));
            return (
              <li
                key={plan.id}
                data-plan={plan.id}
                className="flex w-[84%] max-w-[340px] flex-none snap-start flex-col gap-5 rounded-[22px] border border-line bg-white p-6 sm:w-[calc((100%-1.25rem)/2)] sm:max-w-none lg:w-[calc((100%-3.75rem)/4)]"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.8px] text-accent uppercase">
                    <Icon name="dashboard_customize" size={16} />
                    {m.studio}
                  </span>
                  {/* 133 The team's words keep their own direction on a page in another script. */}
                  <h3 className="m-0 text-xl font-extrabold tracking-[-0.3px]">
                    <bdi>{plan.name}</bdi>
                  </h3>
                  {plan.tagline ? (
                    <span dir="auto" className="text-sm leading-snug text-muted">
                      {plan.tagline}
                    </span>
                  ) : null}
                </div>
                <PlanPrice plan={plan} view={view} lang={lang} period={period} />
                <ul className="m-0 flex list-none flex-col gap-2 rounded-xl bg-sand p-3.5 text-sm font-semibold text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <Icon name="view_agenda" size={20} className="text-ink-4" />
                    {pagesText(lang, plan)}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Icon name="smartphone" size={20} className="text-ink-4" />
                    {hasFeature(plan, "ios") ? words.androidIos : words.android}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Icon name="photo_library" size={20} className="text-ink-4" />
                    {formatMessage(lang, words.storage, { size: storageText(lang, plan.limits.storageGb) })}
                  </li>
                </ul>
                {/* The stores the plan's apps can be on, and who publishes them, as on the regular plans' cards. */}
                <div className="flex flex-col gap-2" data-plan-stores="">
                  <span className="text-xs font-bold tracking-[0.8px] text-muted uppercase">{words.publishTo}</span>
                  <StoreMarks stores={planStores(plan).stores} label={formatMessage(lang, words.stores, { plan: plan.name })} size={15} />
                  <span className="text-[13px] font-semibold text-ink-4">{planStoresLineFor(lang, plan)}</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line-soft p-0 pt-5 text-[15px]">
                  {shownChoices.filter(on).map((id) => (
                    <li key={id} className="flex gap-2.5" data-included="">
                      <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                        <Icon name="check" size={15} />
                      </span>
                      <span>{choices[id]!.label}</span>
                    </li>
                  ))}
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                        <Icon name="check" size={15} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                {missing.length ? (
                  <details className="group -mt-2 text-[14px] text-muted" data-not-included="">
                    <summary className="flex cursor-pointer items-center gap-1.5 font-semibold">
                      {formatMessage(lang, m.notInPlan, { count: missing.length })}
                      <Icon name="expand_more" size={18} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
                      {missing.map((id) => (
                        <li key={id} className="flex gap-2.5">
                          <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sand text-faint">
                            <Icon name="close" size={15} />
                          </span>
                          <span>
                            {choices[id]!.label}
                            <span className="sr-only">{formatMessage(lang, messagesFor(lang).pricing.notIncluded, { plan: plan.name })}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <AccountLink
                  href={localePath(lang, "/sign-up")}
                  signedInHref="/studio"
                  signedIn={formatMessage(lang, words.choose, { plan: plan.name })}
                  className="mt-auto flex h-[50px] items-center justify-center rounded-xl border border-midnight text-base font-bold text-midnight no-underline transition-colors hover:bg-midnight hover:text-white"
                >
                  {formatMessage(lang, words.startWith, { plan: plan.name })}
                </AccountLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 flex gap-3 rounded-2xl border border-line bg-white p-5 text-[16px] leading-relaxed text-ink-3" data-studio-on-request="">
          <Icon name="forum" size={22} className="mt-0.5 flex-none text-accent" />
          <span>{richText(m.plansOnRequest, { link: wa })}</span>
        </p>
      )}
      {basics ? <StudioPlanBasics lang={lang} /> : null}
    </div>
  );
}

/** 103R What every Studio plan has, and what the team chooses plan by plan; 146 also with Studio's explanation on the pricing page. */
export function StudioPlanBasics({ lang, headingLevel = 3 }: { lang: Lang; headingLevel?: 3 | 4 }) {
  const m = messagesFor(lang).studio;
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]" data-studio-basics="">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
        <Heading className="m-0 text-lg font-bold">{m.everyPlan}</Heading>
        <CheckList items={[m.base1, m.base2, m.base3, m.base4, m.base5, m.base6, m.base7, m.base8]} />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
        <Heading className="m-0 text-lg font-bold">{m.byPlan}</Heading>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
          {studioPlanChoices(lang).map((choice) => (
            <li key={choice.label} className="flex gap-2.5">
              <Icon name={choice.icon} size={20} className="mt-0.5 text-ink-4" />
              <span>{choice.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 103R What the team chooses plan by plan for Studio, in the page's language: the choices, then the Studio pages a project has. */
export function studioPlanChoices(lang: Lang): { label: string; icon: IconName }[] {
  const m = messagesFor(lang).studio;
  const choices = choiceLabels(lang);
  return [...STUDIO_PLAN_CHOICES.flatMap((id) => (choices[id] ? [choices[id]] : [])), { label: m.choicePages, icon: "view_agenda" }];
}

/** 103R Regular apps next to Studio projects, topic by topic, as a table. */
export function StudioDifferences({ lang }: { lang: Lang }) {
  const m = messagesFor(lang).studio;
  const rows: { icon: IconName; topic: string; regular: string; studio: string }[] = [
    { icon: "dashboard_customize", topic: m.rowPages, regular: m.rowPagesRegular, studio: m.rowPagesStudio },
    { icon: "link", topic: m.rowContent, regular: m.rowContentRegular, studio: m.rowContentStudio },
    { icon: "grid_view", topic: m.rowKinds, regular: m.rowKindsRegular, studio: m.rowKindsStudio },
    { icon: "payments", topic: m.rowPlans, regular: m.rowPlansRegular, studio: m.rowPlansStudio },
    { icon: "dashboard", topic: m.rowAccount, regular: m.rowAccountRegular, studio: m.rowAccountStudio },
    { icon: "rocket_launch", topic: m.rowPublish, regular: m.rowPublishBoth, studio: m.rowPublishBoth },
  ];
  return (
    <div data-studio-differences="">
      {/* 146 On phones, topic by topic, the two one under the other: no table to scroll sideways. */}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 sm:hidden" aria-label={m.diffTitle}>
        {rows.map((row) => (
          <li key={row.topic} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="flex items-center gap-2.5 text-[15px] font-bold">
              <Icon name={row.icon} size={20} className="text-accent" />
              {row.topic}
            </span>
            <span className="flex flex-col gap-0.5 text-[15px] leading-snug text-ink-4">
              <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.6px] text-muted uppercase">
                <Icon name="apps" size={16} />
                {m.regular}
              </span>
              {row.regular}
            </span>
            <span className="flex flex-col gap-0.5 rounded-xl bg-peach-soft p-3 text-[15px] leading-snug text-ink-2">
              <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.6px] text-accent uppercase">
                <Icon name="dashboard_customize" size={16} />
                {m.studio}
              </span>
              {row.studio}
            </span>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white sm:block">
      <table className="w-full min-w-[720px] border-collapse text-[15px]">
        <caption className="sr-only">{m.diffTitle}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="w-[24%] px-5 py-4 text-start font-bold">
              {m.topic}
            </th>
            <th scope="col" className="px-5 py-4 text-start font-bold">
              <span className="flex items-center gap-2">
                <Icon name="apps" size={20} className="text-ink-4" />
                {m.regular}
              </span>
            </th>
            <th scope="col" className="bg-peach-soft px-5 py-4 text-start font-bold">
              <span className="flex items-center gap-2">
                <Icon name="dashboard_customize" size={20} className="text-accent" />
                {m.studio}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.topic} className="border-b border-line-soft align-top last:border-b-0">
              <th scope="row" className="px-5 py-4 text-start font-bold">
                <span className="flex items-center gap-2.5">
                  <Icon name={row.icon} size={20} className="text-accent" />
                  {row.topic}
                </span>
              </th>
              <td className="px-5 py-4 leading-snug text-ink-4">{row.regular}</td>
              <td className="bg-peach-soft px-5 py-4 leading-snug text-ink-2">{row.studio}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
