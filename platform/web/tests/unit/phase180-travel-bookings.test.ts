import { describe, expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedNotification, ListingInquiry } from "@/lib/data/types";
import { notifyInquiryReply, repliedTitle } from "@/lib/listings/notify";
import type { StudioNode } from "@/lib/pages/types";
import { shownWhen } from "@/lib/studio/signed-in";

/** 180 The travel and bookings templates' QA (docs/qa/2026-11-18-travel-bookings/NOTES.md). */
describe("180.4 the office's reply, in the app's language", () => {
  it("names the office in English, Arabic and Turkish", () => {
    expect(repliedTitle("en", "Nile Homes")).toBe("Nile Homes replied");
    expect(repliedTitle("ar", "Nile Homes")).toBe("ردّ Nile Homes على رسالتك");
    expect(repliedTitle("tr", "Nile Homes")).toBe("Nile Homes yanıt verdi");
  });

  it("the inbox and the push of an Arabic app say it in Arabic", async () => {
    const saved: { title: string }[] = [];
    const store = {
      getAppLayout: async () => ({ published: { languages: { default: "ar" } }, draft: null }),
      createHostedNotification: async (n: { title: string; body: string }) => {
        saved.push(n);
        return { id: 7, ...n } as unknown as HostedNotification;
      },
      listHostedPushDevices: async () => [],
    } as unknown as DataStore;
    const result = await notifyInquiryReply({
      store,
      app: { id: "app-1" } as App,
      inquiry: { id: 3, userId: 9, listingId: 2 } as ListingInquiry,
      listing: null,
      officeName: "بيوت النيل",
      text: "نعم.",
      account: null,
      now: new Date("2026-11-18T10:00:00Z"),
    });
    expect(result.notification.title).toBe("ردّ بيوت النيل على رسالتك");
    expect(saved[0]!.title).toBe("ردّ بيوت النيل على رسالتك");
  });
});

describe("180.11 Studio's canvas as a customer signed in or signed out sees the page", () => {
  const page: StudioNode = {
    id: "body",
    type: "column",
    children: [
      {
        id: "cover",
        type: "photo_hero",
        children: [
          { id: "question", type: "text", text: "Where does the next story begin?", visibility: "signed_out" },
          { id: "trip", type: "tracking", visibility: "signed_in" },
          { id: "brand", type: "text", text: "Safra" },
        ],
      },
      { id: "stays", type: "text", text: "Stays with us" },
    ],
  };
  const ids = (n: StudioNode): string[] => [n.id, ...(n.children ?? []).flatMap(ids)];

  it("signed out: the question, not the next trip", () => {
    expect(ids(shownWhen(page, false))).toEqual(["body", "cover", "question", "brand", "stays"]);
  });

  it("signed in: the next trip, not the question", () => {
    expect(ids(shownWhen(page, true))).toEqual(["body", "cover", "trip", "brand", "stays"]);
  });

  it("a page with nothing marked is left as it is", () => {
    const plain: StudioNode = { id: "body", type: "column", children: [{ id: "a", type: "text", text: "Hi" }] };
    expect(shownWhen(plain, false)).toBe(plain);
  });
});
