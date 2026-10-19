import { notFound } from "next/navigation";

/** 55 Any other address under /ar or /tr: that language's "page not found" ([lang]/not-found.tsx). */
export default function Page() {
  notFound();
}
