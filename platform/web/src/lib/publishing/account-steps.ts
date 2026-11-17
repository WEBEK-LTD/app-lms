import type { App, Build, PublishingRequest } from "../data/types";

/**
 * 138 What an app's publishing account still does by hand, once per app,
 * because the stores have no API for it (Admin › Publishing, and the email
 * the account gets when the app is given to it). Each step is ticked by
 * itself when the platform can tell it's done:
 *
 * - The app's first Google Play release, sent by hand in Play Console: done
 *   once a build went to Google Play beyond a draft.
 * - The App Privacy answers on the app's first iPhone version: done once a
 *   version went to App Review.
 * - The iPhone notifications key (APNs .p8), made once in the client's Apple
 *   team: not tracked yet (`apnsKeyState`).
 */

export const ACCOUNT_STEP_IDS = ["play_first_release", "app_privacy", "apns_key"] as const;
export type AccountStepId = (typeof ACCOUNT_STEP_IDS)[number];
/** "untracked": the platform can't tell yet; the team ticks it in its head. */
export type AccountStepState = "done" | "todo" | "untracked";

/** The steps' words; the admin and the team's email use English. Arabic as the dashboard writes it (Egyptian). */
export const ACCOUNT_STEP_TEXT: Record<"en" | "ar" | "tr", Record<AccountStepId, string> & { untracked: string; done: string; todo: string }> = {
  en: {
    play_first_release: "Send the app's first Google Play release by hand in Play Console (Google wants the first one by hand; every update after it goes out by itself).",
    app_privacy: "Answer App Privacy in App Store Connect for the app's first iPhone version (Apple's API can't).",
    apns_key: "Make the iPhone notifications key (APNs .p8) once in the client's Apple team, as admin (Apple has no API for it).",
    done: "Done",
    todo: "To do",
    untracked: "Not tracked yet",
  },
  ar: {
    play_first_release: "ابعت أول إصدار للتطبيق على Google Play بالإيد من Play Console (Google عايزة أول مرة بالإيد؛ وكل تحديث بعده بينزل لوحده).",
    app_privacy: "جاوب على App Privacy في App Store Connect لأول إصدار iPhone للتطبيق (الـ API بتاع Apple مش بيعمل ده).",
    apns_key: "اعمل مفتاح إشعارات iPhone ‏(APNs .p8) مرة واحدة في فريق Apple بتاع العميل، بصلاحية Admin (Apple مفيهاش API لده).",
    done: "خلصت",
    todo: "لسه",
    untracked: "مش متتبّعة لسه",
  },
  tr: {
    play_first_release: "Uygulamanın Google Play'deki ilk sürümünü Play Console'dan elle gönderin (Google ilkini elle ister; sonraki her güncelleme kendiliğinden yayınlanır).",
    app_privacy: "Uygulamanın ilk iPhone sürümü için App Store Connect'te App Privacy'yi yanıtlayın (Apple'ın API'si bunu yapamaz).",
    apns_key: "iPhone bildirim anahtarını (APNs .p8) müşterinin Apple ekibinde admin olarak bir kez oluşturun (Apple'ın bunun için API'si yok).",
    done: "Yapıldı",
    todo: "Yapılacak",
    untracked: "Henüz izlenmiyor",
  },
};

/**
 * The iPhone notifications key's state. The platform doesn't keep the key
 * yet: "untracked" until the work that uploads it (Phase 136 Yallapp sets up
 * push) answers from its own state here.
 */
export function apnsKeyState(app: Pick<App, "id">): AccountStepState {
  void app;
  return "untracked";
}

/** Each step and whether it's done, from the app's builds, its release state and its "Publish it for me" request. */
export function accountSteps(input: {
  app: Pick<App, "id" | "rollout">;
  builds: readonly Pick<Build, "release" | "stages">[];
  request?: Pick<PublishingRequest, "android" | "ios"> | null;
}): { id: AccountStepId; state: AccountStepState }[] {
  const { app, builds, request } = input;
  const played = builds.some((b) => b.release?.play && b.release.play.status !== "draft") || Boolean(app.rollout?.android) || request?.android.status === "live";
  const reviewed = builds.some((b) => b.release?.appReview?.state === "submitted" || b.stages.app_review === "done") || request?.ios.status === "in_review" || request?.ios.status === "live";
  return [
    { id: "play_first_release", state: played ? "done" : "todo" },
    { id: "app_privacy", state: reviewed ? "done" : "todo" },
    { id: "apns_key", state: apnsKeyState(app) },
  ];
}

/** The steps still to do (or not tracked), one per line, for the account's email. */
export function accountStepLines(steps: readonly { id: AccountStepId; state: AccountStepState }[]): string {
  const t = ACCOUNT_STEP_TEXT.en;
  return steps
    .filter((s) => s.state !== "done")
    .map((s) => `- ${t[s.id]}${s.state === "untracked" ? ` (${t.untracked.toLowerCase()})` : ""}`)
    .join("\n");
}
