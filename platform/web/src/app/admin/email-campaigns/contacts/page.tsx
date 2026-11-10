import type { Metadata } from "next";
import { ContactsTable, ContactTools, type ContactRow } from "@/components/mailing/contacts";
import { Icon } from "@/components/icon";
import { ChipLinks, ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import { PageHeader, btn } from "@/components/ui";
import { countryOptions } from "@/lib/account/country";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { MailTabs } from "../shared";

export const metadata: Metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

const PAGE = 50;

/**
 * 114 The admin's contacts: customers and leads without a Yallapp account,
 * whom campaigns can go to (the Audience step's "Contacts"). Only the team
 * members who write campaigns (marketing.edit) see them.
 */
export default async function ContactsPage({ searchParams }: PageProps<"/admin/email-campaigns/contacts">) {
  await requireAdmin("marketing.edit");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const tag = typeof query.tag === "string" ? query.tag.slice(0, 40) : "";
  const page = Math.max(1, Number(query.page) || 1);
  const store = await getStore();
  const [list, tags] = await Promise.all([store.listMailContacts({ query: q || undefined, tag: tag || undefined, offset: (page - 1) * PAGE, limit: PAGE }), store.listMailContactTags()]);
  const suppressions = await Promise.all(list.items.map((c) => store.getMailSuppression(c.email)));
  const countries = countryOptions("en");
  const rows: ContactRow[] = list.items.map((c, i) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    company: c.company,
    lang: c.lang,
    country: c.country,
    tags: c.tags,
    source: c.source,
    sourceNote: c.sourceNote,
    addedBy: c.addedBy,
    addedAt: c.addedAt.toISOString(),
    status: suppressions[i]?.reason ?? (c.unsubscribedAt ? "unsubscribed" : "subscribed"),
  }));
  const params = (patch: Record<string, string>) => {
    const all = { ...(q ? { q } : {}), ...(tag ? { tag } : {}), ...patch };
    const clean = Object.fromEntries(Object.entries(all).filter(([, v]) => v));
    const search = new URLSearchParams(clean).toString();
    return search ? `?${search}` : "";
  };
  const link = (p: number) => `/admin/email-campaigns/contacts${params({ page: String(p) })}`;
  const exportHref = `/admin/email-campaigns/contacts/export${params({})}`;
  return (
    <>
      <PageHeader
        title="Contacts"
        description="Customers and business contacts without a Yallapp account, to include in campaigns. Each has where you know them from and who added them. Addresses that unsubscribed, bounced or complained never get a campaign."
        actions={
          <a href={exportHref} className={`${btn.secondary} h-10`} data-testid="export-contacts">
            <Icon name="download" size={18} />
            Export CSV
          </a>
        }
      />
      <MailTabs current="/admin/email-campaigns/contacts" />
      <ContactTools countries={countries} tags={tags.map((t) => t.tag)} />
      <section aria-label="Contacts" className="overflow-hidden rounded-2xl border border-line bg-white">
        <ListBar>
          <span className="text-[14px] font-semibold text-midnight tabular-nums">
            {list.total.toLocaleString("en")} {list.total === 1 ? "contact" : "contacts"}
            {tag ? ` tagged “${tag}”` : ""}
          </span>
          <SearchForm label="Find a contact" placeholder="Email, name or company" defaultValue={q} keep={tag ? { tag } : {}} button="Find" />
        </ListBar>
        {tags.length ? (
          <div className="border-b border-line-soft px-5 py-3 sm:px-6">
            <ChipLinks
              label="Tags"
              items={[
                { href: `/admin/email-campaigns/contacts${q ? `?${new URLSearchParams({ q })}` : ""}`, label: "All", current: !tag },
                ...tags.map((t) => ({ href: `/admin/email-campaigns/contacts?${new URLSearchParams({ ...(q ? { q } : {}), tag: t.tag })}`, label: t.tag, count: t.count, current: t.tag === tag })),
              ]}
            />
          </div>
        ) : null}
        {rows.length === 0 ? (
          <p className="m-0 px-6 py-5 text-[14px] text-muted">{q || tag ? "No contact matches." : "No contacts yet. Add one, or import a list."}</p>
        ) : (
          <ContactsTable rows={rows} tags={tags.map((t) => t.tag)} countries={countries} />
        )}
        {list.total > PAGE ? <Pager label="Pages" prev={page > 1 ? { href: link(page - 1), label: "Earlier" } : null} next={page * PAGE < list.total ? { href: link(page + 1), label: "More" } : null} text={`${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, list.total)} of ${list.total}`} /> : null}
      </section>
    </>
  );
}
