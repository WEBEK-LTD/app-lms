import { AccountLink } from "./account-link";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { CheckList } from "./marketing";
import { planPriceFor, storageText } from "./plan-cards";
import { WhatsAppLink } from "./whatsapp-link";
import type { Contact } from "@/lib/contact";
import { hasFeature, STUDIO_PLAN_CHOICES, type PlanInfo, type PriceView } from "@/lib/plans";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 103R What each Studio plan choice is called on the website, by plan feature. */
function choiceLabels(lang: Lang): Record<string, { label: string; icon: IconName }> {
  const m = messagesFor(lang).studio;
  return {
    ios: { label: m.choiceIos, icon: "smartphone" },
    auto_publish: { label: m.choicePublish, icon: "rocket_launch" },
    delivery: { label: m.choiceDelivery, icon: "local_shipping" },
    courier_app: { label: m.choiceCourierApp, icon: "two_wheeler" },
    food: { label: m.choiceFood, icon: "restaurant" },
    rides: { label: m.choiceRides, icon: "directions_car" },
    instructors: { label: m.choiceInstructors, icon: "groups" },
    school: { label: m.choiceSchool, icon: "school" },
    studio_motion: { label: m.choiceMotion, icon: "touch_app" },
    studio_templates: { label: m.choiceTemplates, icon: "dashboard_customize" },
  };
}

/** "12 Studio pages per project", or unlimited. */
function pagesText(lang: Lang, plan: PlanInfo): string {
  const m = messagesFor(lang).studio;
  const pages = plan.limits.studioPages ?? null;
  return pages === null ? m.unlimitedPages : formatMessage(lang, m.pages, { count: pages });
}

/**
 * 103R Yallapp Studio's own plans, apart from the regular ones: the plans the
 * team offers (`planOffered`), each with its price, pages, storage and the
 * choices it includes. With none offered yet, Studio plans are on request.
 * What every Studio plan has, and what changes plan by plan, follow.
 */
export function StudioPlans({ lang, plans, view, contact }: { lang: Lang; plans: PlanInfo[]; view: PriceView; contact: Contact }) {
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
        <ul aria-label={m.plansTitle} className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          {plans.map((plan) => {
            const shown = planPriceFor(lang, plan, view);
            return (
              <li key={plan.id} data-plan={plan.id} className="flex flex-col gap-5 rounded-[22px] border border-line bg-white p-6">
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.8px] text-accent uppercase">
                    <Icon name="dashboard_customize" size={16} />
                    {m.studio}
                  </span>
                  <h3 className="m-0 text-xl font-extrabold tracking-[-0.3px]">{plan.name}</h3>
                  {plan.tagline ? <span className="text-sm leading-snug text-muted">{plan.tagline}</span> : null}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span dir={shown.period ? "ltr" : undefined} className={`font-extrabold tracking-[-0.5px] ${shown.period ? "text-[34px]" : "text-[26px]"}`}>
                    {shown.price}
                  </span>
                  {shown.period ? <span className="text-[15px] font-medium text-muted">{formatMessage(lang, words.perPeriod, { period: shown.period })}</span> : null}
                </div>
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
                <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line-soft p-0 pt-5 text-[15px]">
                  {shownChoices.map((id) => {
                    const on = (plan.features as readonly string[]).includes(id);
                    return (
                      <li key={id} className={`flex gap-2.5 ${on ? "" : "text-muted"}`} data-included={on ? "" : undefined}>
                        <span className={`mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full ${on ? "bg-success-bg text-success" : "bg-sand text-faint"}`}>
                          <Icon name={on ? "check" : "close"} size={15} />
                        </span>
                        <span>
                          {choices[id]!.label}
                          {on ? null : <span className="sr-only">{formatMessage(lang, messagesFor(lang).pricing.notIncluded, { plan: plan.name })}</span>}
                        </span>
                      </li>
                    );
                  })}
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                        <Icon name="check" size={15} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
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
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
          <h3 className="m-0 text-lg font-bold">{m.everyPlan}</h3>
          <CheckList items={[m.base1, m.base2, m.base3, m.base4, m.base5, m.base6]} />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
          <h3 className="m-0 text-lg font-bold">{m.byPlan}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {[...shownChoices.map((id) => choices[id]!), { label: m.choicePages, icon: "view_agenda" as IconName }].map((choice) => (
              <li key={choice.label} className="flex gap-2.5">
                <Icon name={choice.icon} size={20} className="mt-0.5 text-ink-4" />
                <span>{choice.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
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
    <div className="overflow-x-auto rounded-2xl border border-line bg-white" data-studio-differences="">
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
  );
}
