import type { Lang } from "@/i18n/config";
import { getDashT, knownTranslator, type DashKey } from "@/i18n/dashboard";
import type { PublishingStatus, PublishingStore } from "../data/types";
import { CLIENT_STATUS_LABEL, statusText } from "./steps";

/** What each status means for the client (statusText), by its catalog key. */
const STATUS_KEY: Record<PublishingStatus, DashKey> = {
  waiting_client: "publishing.status.waiting",
  accounts_ready: "publishing.status.accounts",
  submitted: "publishing.status.submitted",
  in_review: "publishing.status.review",
  live: "publishing.status.live",
  rejected: "publishing.status.rejected",
};
const REVIEWER: Record<PublishingStore, string> = { android: "Google", ios: "Apple", galaxy: "Samsung", huawei: "Huawei", xiaomi: "Xiaomi" };

/** 56 A store's publishing status and what it means, in a language: for the Publishing page and the status email. English is lib/publishing/steps.ts as it is. */
export function publishingStatusIn(lang: Lang, store: PublishingStore, status: PublishingStatus): { label: string; text: string } {
  if (lang === "en") return { label: CLIENT_STATUS_LABEL[status], text: statusText(store, status) };
  const t = getDashT(lang);
  return {
    label: knownTranslator(lang)(CLIENT_STATUS_LABEL[status]),
    text: t(STATUS_KEY[status], { store: t("publishing.storeIn", { store }), reviewer: REVIEWER[store] }),
  };
}
