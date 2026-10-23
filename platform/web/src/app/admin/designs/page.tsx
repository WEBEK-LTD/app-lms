import type { Metadata } from "next";
import { deleteDesignAction, hideDesignAction } from "@/app/actions/admin-designs";
import { ReadOnly } from "@/components/read-only";
import { SubmitButton } from "@/components/form";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { KINDS } from "@/lib/app/kinds";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DESIGNS } from "@/lib/pages/designs";
import { designsSetting } from "@/lib/pages/designs/catalog";
import { AddDesignForm, EditDesignForm } from "./forms";

export const metadata: Metadata = { title: "Designs" };
export const dynamic = "force-dynamic";

/** 84.4 Admin › Designs: the ready-made designs owners choose from, by kind; the team adds its own and hides built-in ones. */
export default async function DesignsPage() {
  const { adminRole } = await requireAdmin();
  const edit = can(adminRole, "settings.edit");
  const setting = await designsSetting(await getStore(), { fresh: true });
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Designs</h1>
        <span className="text-[15px] text-muted">
          The ready-made designs owners choose from in the Branding step and in Pages &amp; look. Add your own from an app&apos;s draft, and hide built-in ones. Apps that
          already use a design keep their pages.
        </span>
      </div>
      <ReadOnly when={!edit} what="change designs">
        <Card id="h-add-design" title="Add a design">
          <AddDesignForm />
        </Card>
      </ReadOnly>
      {KINDS.map((kind) => {
        const builtIn = DESIGNS.filter((d) => d.kind === kind.id);
        const team = setting.custom.filter((d) => d.kind === kind.id);
        return (
          <Card key={kind.id} id={`h-designs-${kind.id}`} title={`${kind.name} (${builtIn.length - builtIn.filter((d) => setting.hidden.includes(d.id)).length + team.length} shown)`}>
            <ul className="m-0 flex list-none flex-col p-0" aria-label={`${kind.name} designs`}>
              {builtIn.map((d) => {
                const hidden = setting.hidden.includes(d.id);
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-2.5 first:border-t-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 font-semibold">
                        {d.name} {hidden ? <Badge tone="neutral">Hidden</Badge> : null}
                      </span>
                      <span className="text-[13px] text-muted">
                        Built in · {d.pages.length} pages · {d.description}
                      </span>
                    </span>
                    {edit ? (
                      <form action={hideDesignAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="hidden" value={hidden ? "0" : "1"} />
                        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                          <span>
                            {hidden ? "Show" : "Hide"}
                            <span className="sr-only"> {d.name}</span>
                          </span>
                        </SubmitButton>
                      </form>
                    ) : null}
                  </li>
                );
              })}
              {team.map((d) => (
                <li key={d.id} className="flex flex-col gap-2 border-t border-line-soft py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 font-semibold">
                      {d.name} <Badge tone="neutral">Team</Badge>
                    </span>
                    <span className="text-[13px] text-muted">
                      {d.pages.length} pages · {d.description}
                    </span>
                  </span>
                  {edit ? (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold">Edit or delete {d.name}</summary>
                      <div className="mt-2 flex flex-col gap-3">
                        <EditDesignForm id={d.id} name={d.name} description={d.description} />
                        <form action={deleteDesignAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                            <span>
                              Delete<span className="sr-only"> {d.name}</span>
                            </span>
                          </SubmitButton>
                        </form>
                      </div>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 text-[19px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
