import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { applyMergeTags, exampleMergeValues } from "@/lib/mailing/merge";
import { renderContent } from "@/lib/mailing/render";
import { MAIL_TEMPLATES, templateContent } from "@/lib/mailing/templates";
import type { MailContent, MailLang } from "@/lib/mailing/types";

/** 114 A template as the email it makes (`ready:<id>` or `saved:<id>`), with the example person, for the gallery's preview. */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/admin/email-campaigns/templates/preview/[id]">): Promise<Response> {
  await requireAdmin();
  const { id } = await params;
  const source = decodeURIComponent(id);
  let content: MailContent | null = null;
  let lang: MailLang = "en";
  if (source.startsWith("ready:")) {
    const def = MAIL_TEMPLATES.find((t) => t.id === source.slice(6));
    if (def) content = templateContent(def, appUrl());
  } else if (source.startsWith("saved:")) {
    const template = await (await getStore()).getMailTemplate(source.slice(6));
    const first = template ? (["en", "ar", "tr"] as const).find((l) => template.contents[l]) : undefined;
    if (template && first) {
      content = template.contents[first]!;
      lang = first;
    }
  }
  if (!content) return new Response("Not found.", { status: 404 });
  const html = applyMergeTags(renderContent(content, { lang, assetBase: appUrl() }).html, exampleMergeValues(), { html: true });
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; sandbox", "x-robots-tag": "noindex" },
  });
}
