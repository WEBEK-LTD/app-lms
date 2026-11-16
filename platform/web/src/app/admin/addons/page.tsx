import type { Metadata } from "next";
import Link from "next/link";
import { deleteAddonAction, updateAddonTaskAction } from "@/app/actions/admin-addons";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { ICON_NAMES, type IconName } from "@/components/icon-names";
import { ReadOnly } from "@/components/read-only";
import { formatDate } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { appLabel } from "@/lib/app/label";
import { formatMoney } from "@/lib/billing/prices";
import { addonsOf, billingLabel, isBuiltInAddon, topPlansOf } from "@/lib/addons/catalog";
import { topPlanOf } from "@/lib/addons/rules";
import { ADDON_BILLINGS, BUILT_IN_ADDON_LIMITS, type AddonDef, type AppAddon } from "@/lib/addons/types";
import { cleanLimitDefs, PLAN_FEATURES, plansInOrder, plansShown } from "@/lib/plans";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { AddonForm, TopPlansForm, type AddonFormValues } from "./forms";

export const metadata: Metadata = { title: "Add-ons" };
export const dynamic = "force-dynamic";

const KIND_LABEL = { service: "Service", quantity: "More of a limit", feature: "Feature" } as const;
const LIMIT_LABEL: Record<(typeof BUILT_IN_ADDON_LIMITS)[number], string> = {
  pages: "Pages (a Studio project's Pages per project)",
  storageGb: "Storage (GB)",
  appUsers: "App users",
  languages: "App languages",
  sources: "Connected platforms",
  teamMembers: "Team members",
};
const TASK_LABEL = { new: "New", in_progress: "In progress", done: "Done" } as const;

/**
 * 133 Admin › Add-ons: what clients can buy on top of their plan (a
 * service, more of a limit, a feature), its prices per way to pay, who may
 * buy it and whether it's offered; the services' tasks for the team; and
 * the top plan of each family. A client's add-ons, and giving one by hand,
 * are on the client's page.
 */
export default async function AddonsAdminPage({ searchParams }: PageProps<"/admin/addons">) {
  const { adminRole } = await requireAdmin();
  const query = await searchParams;
  const tab = query.tab === "tasks" ? "tasks" : query.tab === "top" ? "top" : "addons";
  const store = await getStore();
  const [setting, plans, editsSetting, extras] = await Promise.all([
    platformSetting(store, "addons", { fresh: true }),
    getPlans(store),
    platformSetting(store, "plans", { fresh: true }),
    platformSetting(store, "planExtras", { fresh: true }),
  ]);
  const addons = addonsOf(setting?.value);
  const editing = typeof query.addon === "string" ? (query.addon === "new" ? "new" : (addons.find((a) => a.id === query.addon) ?? null)) : null;
  const shownPlans = [...plansInOrder(plansShown("regular", editsSetting?.value), plans), ...plansInOrder(plansShown("studio", editsSetting?.value), plans)];
  const limitDefs = cleanLimitDefs(extras?.value);
  const tasks = tab === "tasks" ? await store.listAppAddons({ taskStatus: ["new", "in_progress", "done"], limit: 200 }) : [];
  const owners = new Map<string, { app: string; client: string; clientId: string }>();
  for (const t of tasks) {
    if (owners.has(t.id)) continue;
    const [app, client] = await Promise.all([store.getAppById(t.appId), store.getClientById(t.clientId)]);
    const user = client ? await store.getUserById(client.userId) : null;
    owners.set(t.id, { app: app ? appLabel(app) : t.appId, client: user?.name ?? client?.id ?? "", clientId: t.clientId });
  }
  const open = tasks.filter((t) => t.taskStatus !== "done");
  const tabs = [
    ["addons", "Add-ons", "/admin/addons"],
    ["tasks", `Tasks${open.length || tab !== "tasks" ? "" : ""}`, "/admin/addons?tab=tasks"],
    ["top", "Top plans", "/admin/addons?tab=top"],
  ] as const;
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold">Add-ons</h1>
        <p className="m-0 max-w-[760px] text-[15px] text-muted">
          What clients can buy for an app on top of its plan, in Dashboard › Add-ons: a service our team does, more of a limit (pages, storage, team members…) or a
          feature. Each is paid like a plan, by card through Yallapp&apos;s plan gateway, once, for a period or for life, at the prices you set here.
        </p>
      </div>
      <div role="tablist" aria-label="Add-ons" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={key === tab}
            className={`flex h-10 items-center px-4 text-sm no-underline ${key === tab ? "border-b-2 border-midnight font-bold text-ink" : "border-b-2 border-transparent text-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {query.removed === "used" ? <p role="alert" className="m-0 rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">Apps have this add-on, so it can&apos;t be removed. Switch it off instead: clients stop seeing it and what they bought keeps running.</p> : null}
      {query.removed === "1" ? <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">Add-on removed.</p> : null}

      {tab === "tasks" ? (
        <ReadOnly when={!can(adminRole, "addons.tasks")} what="work on add-on tasks">
          <section aria-labelledby="h-tasks" className="flex flex-col gap-3">
            <h2 id="h-tasks" className="m-0 text-lg font-bold">
              Services to do ({open.length} open)
            </h2>
            {tasks.length ? (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} owner={owners.get(t.id)!} saved={query.saved === t.id} />
                ))}
              </ul>
            ) : (
              <p className="m-0 rounded-xl border border-dashed border-line-strong bg-sand px-4 py-6 text-center text-sm text-muted">No service has been bought yet.</p>
            )}
          </section>
        </ReadOnly>
      ) : tab === "top" ? (
        <ReadOnly when={!can(adminRole, "addons.edit")} what="change the top plans">
          <section aria-labelledby="h-top" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-top" className="m-0 text-xl font-bold">
                Top plans
              </h2>
              <p className="m-0 text-sm text-muted">An add-on for &ldquo;only apps below the top plan&rdquo; is offered to apps on a lower plan of their family than this one.</p>
            </div>
            <TopPlansForm
              families={(["regular", "studio"] as const).map((family) => {
                const defaultPlan = topPlanOf(plans, family, { addons: [] });
                return {
                  family,
                  label: family === "studio" ? "Yallapp Studio" : "Regular apps",
                  value: topPlansOf(setting?.value)?.[family] ?? "",
                  defaultName: defaultPlan ? plans[defaultPlan].name : null,
                  plans: plansInOrder(plansShown(family, editsSetting?.value), plans).map((id) => ({ id, name: plans[id].name })),
                };
              })}
            />
          </section>
        </ReadOnly>
      ) : (
        <ReadOnly when={!can(adminRole, "addons.edit")} what="change add-ons or their prices">
          {editing ? (
            <section aria-labelledby="h-addon" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="h-addon" className="m-0 text-2xl font-extrabold">
                  {editing === "new" ? "New add-on" : editing.en.name}
                </h2>
                <Link href="/admin/addons" className="text-sm font-semibold">
                  All add-ons
                </Link>
              </div>
              <AddonForm
                key={editing === "new" ? "new" : editing.id}
                addon={formValues(editing === "new" ? null : editing)}
                iconNames={ICON_NAMES}
                limits={[...BUILT_IN_ADDON_LIMITS.map((id) => ({ id, label: LIMIT_LABEL[id] })), ...limitDefs.map((d) => ({ id: `x:${d.id}`, label: `${d.name} (your own limit)` }))]}
                features={PLAN_FEATURES.map((f) => ({ id: f.id, label: f.label }))}
                plans={shownPlans.map((id) => ({ id, name: plans[id].name, family: id.startsWith("studio") ? "studio" : "regular" }))}
              />
              {editing !== "new" && !isBuiltInAddon(editing.id) ? (
                <form action={deleteAddonAction} className="flex justify-end">
                  <input type="hidden" name="id" value={editing.id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText="Removing…">
                    <Icon name="delete" size={18} />
                    Remove this add-on
                  </SubmitButton>
                </form>
              ) : null}
            </section>
          ) : (
            <section aria-labelledby="h-addons" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="h-addons" className="m-0 text-lg font-bold">
                  The add-ons
                </h2>
                <Link href="/admin/addons?addon=new" className="flex h-10 items-center gap-1.5 rounded-xl bg-midnight px-4 text-sm font-bold text-white no-underline hover:text-white">
                  <Icon name="add" size={18} />
                  New add-on
                </Link>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-start text-muted">
                      <th className="px-4 py-3 text-start font-semibold">Add-on</th>
                      <th className="px-4 py-3 text-start font-semibold">Type</th>
                      <th className="px-4 py-3 text-start font-semibold">Prices</th>
                      <th className="px-4 py-3 text-start font-semibold">Who</th>
                      <th className="px-4 py-3 text-start font-semibold">Offered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addons.map((a) => (
                      <tr key={a.id} data-addon-row={a.id} className="border-b border-line-soft last:border-b-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/addons?addon=${a.id}`} className="flex items-center gap-2.5 font-semibold no-underline">
                            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-peach text-accent">
                              <Icon name={a.icon as IconName} size={20} />
                            </span>
                            {a.en.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{effectOf(a, limitDefs)}</td>
                        <td className="px-4 py-3">{pricesOf(a)}</td>
                        <td className="px-4 py-3">{ruleOf(a, plans)}</td>
                        <td className="px-4 py-3">{a.active ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </ReadOnly>
      )}
    </>
  );
}

function effectOf(a: AddonDef, defs: { id: string; name: string }[]): string {
  if (a.kind === "quantity") {
    const name = a.limit?.startsWith("x:") ? (defs.find((d) => `x:${d.id}` === a.limit)?.name ?? a.limit) : LIMIT_LABEL[a.limit as keyof typeof LIMIT_LABEL];
    return `+${a.amount} · ${name}`;
  }
  const feature = a.feature ? PLAN_FEATURES.find((f) => f.id === a.feature)?.label : null;
  return feature ? `${KIND_LABEL[a.kind]} · ${feature}` : KIND_LABEL[a.kind];
}

function pricesOf(a: AddonDef): string {
  const list = ADDON_BILLINGS.flatMap((b) => {
    const p = a.prices[b];
    if (!p?.on) return [];
    return [`${billingLabel(b)}: ${p.egpCents ? formatMoney({ cents: p.egpCents, currency: "EGP" }) : "no price yet"}`];
  });
  return list.length ? list.join(" · ") : "Not priced";
}

function ruleOf(a: AddonDef, plans: Awaited<ReturnType<typeof getPlans>>): string {
  const parts = [a.rule.family === "both" ? "Every app" : a.rule.family === "studio" ? "Studio projects" : "Regular apps"];
  if (a.rule.belowTop) parts.push("below the top plan");
  if (a.rule.plans) parts.push(`on ${a.rule.plans.map((p) => plans[p].name).join(", ")}`);
  if (a.repeatable) parts.push("more than once");
  return parts.join(", ");
}

function formValues(a: AddonDef | null): AddonFormValues {
  return {
    original: a?.id ?? "",
    id: a?.id ?? "",
    kind: a?.kind ?? "service",
    icon: a?.icon ?? "widgets",
    enName: a?.en.name ?? "",
    enDescription: a?.en.description ?? "",
    arName: a?.ar?.name ?? "",
    arDescription: a?.ar?.description ?? "",
    trName: a?.tr?.name ?? "",
    trDescription: a?.tr?.description ?? "",
    limit: a?.limit ?? "",
    amount: a?.amount ? String(a.amount) : "",
    feature: a?.feature ?? "",
    family: a?.rule.family ?? "both",
    belowTop: a?.rule.belowTop ?? false,
    plans: a?.rule.plans ?? [],
    repeatable: a?.repeatable ?? false,
    active: a?.active ?? false,
    order: a ? String(a.order) : "",
    prices: Object.fromEntries(ADDON_BILLINGS.map((b) => [b, { on: a?.prices[b]?.on ?? false, egp: a?.prices[b]?.egpCents ? centsToDecimal(a.prices[b]!.egpCents!) : "", usd: a?.prices[b]?.usdCents ? centsToDecimal(a.prices[b]!.usdCents!) : "" }])),
  };
}

function TaskRow({ task, owner, saved }: { task: AppAddon; owner: { app: string; client: string; clientId: string }; saved: boolean }) {
  return (
    <li data-addon-task={task.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[15px] font-bold">
          {task.name} · <Link href={`/admin/clients/${owner.clientId}`}>{owner.client}</Link> · {owner.app}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${task.taskStatus === "done" ? "bg-success-bg text-success" : task.taskStatus === "in_progress" ? "bg-warn-bg text-warn" : "bg-peach text-ink-2"}`}>{TASK_LABEL[task.taskStatus ?? "new"]}</span>
      </div>
      <span className="text-[13px] text-muted">
        {billingLabel(task.billing)} · since {formatDate(task.createdAt)}
        {task.grantedBy ? ` · given by ${task.grantedBy}` : ""}
      </span>
      <form action={updateAddonTaskAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={task.id} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`task-${task.id}-status`} className="text-sm font-semibold">
            Status
          </label>
          <select id={`task-${task.id}-status`} name="status" defaultValue={task.taskStatus ?? "new"} className="input input-sm">
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label htmlFor={`task-${task.id}-note`} className="text-sm font-semibold">
            Note for the team
          </label>
          <input id={`task-${task.id}-note`} name="note" defaultValue={task.taskNote ?? ""} maxLength={2000} className="input input-sm" />
        </div>
        <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Saving…">
          Save
        </SubmitButton>
        {saved ? (
          <span role="status" className="text-sm font-semibold text-success">
            Saved.
          </span>
        ) : null}
      </form>
    </li>
  );
}
