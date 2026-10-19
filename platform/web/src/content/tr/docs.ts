import type { DocTranslation } from "../translation-types";
import { TR_DOCS_1 } from "./docs-1";
import { TR_DOCS_2 } from "./docs-2";
import { TR_DOCS_3 } from "./docs-3";
import { TR_DOCS_4 } from "./docs-4";
import { TR_DOCS_5 } from "./docs-5";
import { TR_DOCS_6 } from "./docs-6";

/** 55 The documentation (src/content/docs.ts) in this language, by article slug. */
export const TR_DOCS: Record<string, DocTranslation> = { ...TR_DOCS_1, ...TR_DOCS_2, ...TR_DOCS_3, ...TR_DOCS_4, ...TR_DOCS_5, ...TR_DOCS_6 };
