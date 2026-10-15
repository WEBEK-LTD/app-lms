import { jsonLdText, type JsonLd } from "@/lib/seo";

/** 32 Structured data for search engines; the JSON is escaped so it can't end the script early. */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
