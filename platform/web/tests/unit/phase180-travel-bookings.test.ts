import { describe, expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedNotification, ListingInquiry } from "@/lib/data/types";
import { notifyInquiryReply, repliedTitle } from "@/lib/listings/notify";

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
