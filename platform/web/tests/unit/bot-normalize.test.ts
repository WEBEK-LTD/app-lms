import { describe, expect, it } from "vitest";
import { editDistance, normalizeText, tokenVariants, typosAllowed } from "@/lib/bot/normalize";

describe("the bot's normalisation: Arabic", () => {
  it.each([
    ["مدرسة", "مدرسه"],
    ["مَدْرَسَةٌ", "مدرسه"],
    ["مطعـــــم", "مطعم"],
    ["أبغى", "ابغي"],
    ["إنجليزي", "انجليزي"],
    ["آيفون", "ايفون"],
    ["ٱلعربية", "العربيه"],
    ["مستشفى", "مستشفي"],
    ["مسؤول", "مسوول"],
    ["مسئول", "مسيول"],
    ["شيء", "شي"],
    ["گهوة", "كهوه"],
    ["چاي", "جاي"],
    ["ڤيديو", "فيديو"],
    ["ی", "ي"],
    ["٠١٢٣٤٥٦٧٨٩", "0123456789"],
    ["۱۲۳", "123"],
    ["بدّي", "بدي"],
    ["تماااام", "تمام"],
    ["مطعم، كافيه؟", "مطعم كافيه"],
  ])("%s → %s", (input, output) => {
    expect(normalizeText(input)).toBe(output);
  });

  it("writes every form of alef as one", () => {
    expect(new Set(["أحمد", "إحمد", "آحمد", "احمد", "ٱحمد"].map(normalizeText))).toEqual(new Set(["احمد"]));
  });
});

describe("the bot's normalisation: Turkish", () => {
  it.each([
    ["Kırmızı", "kirmizi"],
    ["İSTANBUL", "istanbul"],
    ["ISPARTA", "isparta"],
    ["Şirket", "sirket"],
    ["Yeşil", "yesil"],
    ["Dağ", "dag"],
    ["çiçekçi", "cicekci"],
    ["Ödeme", "odeme"],
    ["Ürün", "urun"],
    ["Türkçe", "turkce"],
    ["Mağaza'mız", "magaza miz"],
  ])("%s → %s", (input, output) => {
    expect(normalizeText(input)).toBe(output);
  });
});

describe("the bot's normalisation: English and the rest", () => {
  it.each([
    ["RESTAURANT", "restaurant"],
    ["Café", "cafe"],
    ["  Food   Delivery!! ", "food delivery"],
    ["Yesss", "yes"],
    ["e-commerce", "e commerce"],
    ["don't", "don t"],
    ["Straße", "strasse"],
    ["", ""],
    ["?!…", ""],
  ])("%j → %j", (input, output) => {
    expect(normalizeText(input)).toBe(output);
  });
});

describe("the bot's word variants", () => {
  it("drop Arabic clitics and endings", () => {
    expect(tokenVariants(normalizeText("المطعم"))).toContain("مطعم");
    expect(tokenVariants(normalizeText("والمطعم"))).toContain("مطعم");
    expect(tokenVariants(normalizeText("بالعربي"))).toContain("عربي");
    expect(tokenVariants(normalizeText("للمدرسة"))).toContain("مدرسه");
    expect(tokenVariants(normalizeText("ومطعم"))).toContain("مطعم");
    expect(tokenVariants(normalizeText("مطعمي"))).toContain("مطعم");
    expect(tokenVariants(normalizeText("محلات"))).toContain("محل");
    expect(tokenVariants(normalizeText("مدرسين"))).toContain("مدرس");
  });

  it("keep short Arabic words whole", () => {
    expect(tokenVariants("بس")).toEqual(["بس"]);
    expect(tokenVariants("لا")).toEqual(["لا"]);
    expect(tokenVariants("بيت")).not.toContain("يت");
  });

  it("drop English and Turkish plurals", () => {
    expect(tokenVariants("restaurants")).toContain("restaurant");
    expect(tokenVariants("classes")).toContain("class");
    expect(tokenVariants("kafeler")).toContain("kafe");
    expect(tokenVariants("kurslar")).toContain("kurs");
    expect(tokenVariants("gym")).toEqual(["gym"]);
  });

  it("start with the word itself", () => {
    expect(tokenVariants("المطعم")[0]).toBe("المطعم");
  });
});

describe("the bot's typo distance", () => {
  it("counts a letter added, left out, changed or two swapped as one", () => {
    expect(editDistance("restaurant", "restaurant")).toBe(0);
    expect(editDistance("restaurant", "restaurnt")).toBe(1);
    expect(editDistance("restaurant", "restuarant")).toBe(1);
    expect(editDistance("clinic", "clinik")).toBe(1);
    expect(editDistance("مطعم", "مطعن")).toBe(1);
    expect(editDistance("مدرسه", "مدسره")).toBe(1);
    expect(editDistance("restaurant", "resturnt")).toBe(2);
  });

  it("stops early past its limit", () => {
    expect(editDistance("restaurant", "pharmacy", 2)).toBe(3);
  });

  it("allows no typo in short words, one up to six letters, two from seven", () => {
    expect([1, 2, 3, 4, 6, 7, 12].map(typosAllowed)).toEqual([0, 0, 0, 1, 1, 2, 2]);
  });
});
