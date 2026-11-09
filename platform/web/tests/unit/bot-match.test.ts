import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { ALL_INTENTS, ARABIC_TAGS, PHRASE_LANGS, STEP_INTENTS, kindOfIntent, type PhraseLang } from "@/lib/bot/intents";
import { compileDictionary, detectDialect, matchAll, matchOne, rankIntents } from "@/lib/bot/match";
import { normalizeText } from "@/lib/bot/normalize";
import { SEED_PHRASES } from "@/lib/bot/seed";

const dictionary = compileDictionary(SEED_PHRASES);

/** The intent a text is sure to mean on a question, or what the matcher said instead. */
function sure(step: keyof typeof STEP_INTENTS, text: string): string {
  const found = matchOne(dictionary, text, STEP_INTENTS[step]);
  return found.kind === "sure" ? found.intent : found.kind === "choices" ? `choices:${found.intents.join(",")}` : "none";
}

function all(step: keyof typeof STEP_INTENTS, text: string): string[] {
  return matchAll(dictionary, text, STEP_INTENTS[step]).map((m) => (m.negated ? `-${m.intent}` : m.intent));
}

const phrasesOf = (intent: string, lang: PhraseLang) => SEED_PHRASES.filter((p) => p.intent === intent && p.lang === lang).map((p) => normalizeText(p.text));

describe("the bot's dictionary: the owner's decisions on \"I want\"", () => {
  it("Egyptian is عايز / عاوز / محتاج, never أبغى", () => {
    expect(phrasesOf("want", "ar-eg")).toEqual(expect.arrayContaining(["عايز", "عاوز", "محتاج"].map(normalizeText)));
    expect(phrasesOf("want", "ar-eg")).not.toContain(normalizeText("أبغى"));
    expect(phrasesOf("want", "ar-eg")).not.toContain(normalizeText("أبي"));
  });

  it.each([
    ["ar-gulf", ["أبغى", "أبي", "ودي"]],
    ["ar-lev", ["بدّي", "بدي"]],
    ["ar-iq", ["أريد", "أريد أسوي"]],
    ["ar-maghreb", ["بغيت", "نبغي", "حاب"]],
    ["ar-sd", ["داير", "عايز"]],
    ["ar", ["أريد", "أود", "أرغب"]],
  ] as const)("%s has %j", (lang, words) => {
    expect(phrasesOf("want", lang)).toEqual(expect.arrayContaining(words.map(normalizeText)));
  });

  it("أبغى is only Gulf", () => {
    expect(SEED_PHRASES.filter((p) => normalizeText(p.text) === normalizeText("أبغى")).map((p) => p.lang)).toEqual(["ar-gulf"]);
  });
});

describe("the bot's dictionary: coverage", () => {
  it("has an intent for every kind of app, and a university", () => {
    for (const kind of KINDS) expect(STEP_INTENTS.kind).toContain(`kind.${kind.id}`);
    expect(kindOfIntent("kind.university")).toEqual({ kind: "school", template: "university" });
    for (const intent of STEP_INTENTS.kind) expect(kindOfIntent(intent), intent).not.toBeNull();
  });

  it("gives every business, feature, colour and answer words in English, Turkish, MSA and every dialect", () => {
    const seeded = ALL_INTENTS.filter((i) => !i.startsWith("lang."));
    for (const intent of seeded) {
      for (const lang of PHRASE_LANGS.filter((l) => l !== "other")) expect(phrasesOf(intent, lang).length, `${intent} ${lang}`).toBeGreaterThan(0);
    }
  });

  it("names every app language in English, and the main ones in Arabic and Turkish", () => {
    for (const intent of STEP_INTENTS.languages.filter((i) => i.startsWith("lang."))) expect(phrasesOf(intent, "en").length, intent).toBeGreaterThan(0);
    for (const code of ["en", "ar", "tr", "fr", "de"]) {
      expect(phrasesOf(`lang.${code}`, "ar").length).toBeGreaterThan(0);
      expect(phrasesOf(`lang.${code}`, "tr").length).toBeGreaterThan(0);
    }
  });

  it("only uses known intents and languages", () => {
    for (const p of SEED_PHRASES) {
      expect(ALL_INTENTS, p.intent).toContain(p.intent);
      expect(PHRASE_LANGS).toContain(p.lang);
      expect(normalizeText(p.text), `${p.intent} ${p.text}`).not.toBe("");
    }
  });
});

describe("the bot's matcher: the kind of business in English", () => {
  it.each([
    ["restaurant", "kind.restaurant"],
    ["I want an app for my restaurant", "kind.restaurant"],
    ["We are a small Café", "kind.restaurant"],
    ["coffee shop", "kind.restaurant"],
    ["online store", "kind.store"],
    ["I sell clothes online", "kind.store"],
    ["supermarket", "kind.store"],
    ["a grocery store", "kind.store"],
    ["food delivery", "kind.food"],
    ["a courier company", "kind.delivery"],
    ["parcel delivery", "kind.delivery"],
    ["marketplace with many vendors", "kind.marketplace"],
    ["multi vendor", "kind.marketplace"],
    ["school", "kind.school"],
    ["a kindergarten", "kind.school"],
    ["university", "kind.university"],
    ["our college", "kind.university"],
    ["online courses", "kind.academy"],
    ["academy", "kind.academy"],
    ["an academy with many teachers", "kind.instructors"],
    ["gym", "kind.fitness"],
    ["yoga studio", "kind.fitness"],
    ["dental clinic", "kind.clinic"],
    ["doctors", "kind.clinic"],
    ["hair salon", "kind.bookings"],
    ["barbershop", "kind.bookings"],
    ["appointments", "kind.bookings"],
    ["cleaning company", "kind.services"],
    ["real estate", "kind.real_estate"],
    ["apartments for rent", "kind.real_estate"],
    ["event tickets", "kind.events"],
    ["concerts", "kind.events"],
    ["news", "kind.news"],
    ["a blog", "kind.news"],
    ["donations", "kind.charity"],
    ["charity", "kind.charity"],
    ["taxi", "kind.taxi"],
    ["ride hailing", "kind.rides"],
    ["RESTAURANTS", "kind.restaurant"],
  ])("%j → %s", (text, intent) => {
    expect(sure("kind", text)).toBe(intent);
  });
});

describe("the bot's matcher: the kind of business in Turkish", () => {
  it.each([
    ["restoran", "kind.restaurant"],
    ["Restoranım için uygulama istiyorum", "kind.restaurant"],
    ["kafe", "kind.restaurant"],
    ["kafeler", "kind.restaurant"],
    ["pastane", "kind.restaurant"],
    ["mağaza", "kind.store"],
    ["magaza", "kind.store"],
    ["online mağazam var", "kind.store"],
    ["süpermarket", "kind.store"],
    ["yemek siparişi", "kind.food"],
    ["kurye", "kind.delivery"],
    ["kargo şirketi", "kind.delivery"],
    ["pazaryeri", "kind.marketplace"],
    ["okul", "kind.school"],
    ["anaokulu", "kind.school"],
    ["üniversite", "kind.university"],
    ["universite", "kind.university"],
    ["online kurs", "kind.academy"],
    ["akademi", "kind.academy"],
    ["spor salonu", "kind.fitness"],
    ["diş kliniği", "kind.clinic"],
    ["doktor", "kind.clinic"],
    ["kuaför", "kind.bookings"],
    ["berber", "kind.bookings"],
    ["randevu", "kind.bookings"],
    ["emlak", "kind.real_estate"],
    ["etkinlik", "kind.events"],
    ["haber sitesi", "kind.news"],
    ["bağış", "kind.charity"],
    ["taksi", "kind.taxi"],
  ])("%j → %s", (text, intent) => {
    expect(sure("kind", text)).toBe(intent);
  });
});

describe("the bot's matcher: the kind of business in MSA", () => {
  it.each([
    ["مطعم", "kind.restaurant"],
    ["أريد تطبيقا لمطعمي", "kind.restaurant"],
    ["المطعم", "kind.restaurant"],
    ["مقهى", "kind.restaurant"],
    ["متجر إلكتروني", "kind.store"],
    ["سوبر ماركت", "kind.store"],
    ["توصيل طعام", "kind.food"],
    ["شركة شحن", "kind.delivery"],
    ["سوق إلكتروني متعدد البائعين", "kind.marketplace"],
    ["مدرسة", "kind.school"],
    ["مدرستنا", "kind.school"],
    ["جامعة", "kind.university"],
    ["دورات تدريبية", "kind.academy"],
    ["أكاديمية", "kind.academy"],
    ["نادي رياضي", "kind.fitness"],
    ["عيادة أسنان", "kind.clinic"],
    ["صالون تجميل", "kind.bookings"],
    ["حجز مواعيد", "kind.bookings"],
    ["شركة خدمات تنظيف", "kind.services"],
    ["عقارات", "kind.real_estate"],
    ["فعاليات وتذاكر", "kind.events"],
    ["صحيفة", "kind.news"],
    ["جمعية خيرية", "kind.charity"],
    ["سيارة أجرة", "kind.taxi"],
    ["نقل ركاب", "kind.rides"],
  ])("%j → %s", (text, intent) => {
    expect(sure("kind", text)).toBe(intent);
  });
});

describe("the bot's matcher: the kind of business in the dialects", () => {
  it.each([
    // Egyptian
    ["عايز تطبيق لمطعمي", "kind.restaurant"],
    ["عاوز ابلكيشن للكافيه بتاعي", "kind.restaurant"],
    ["محتاج تطبيق لمحل هدوم", "kind.store"],
    ["عندي جيم", "kind.fitness"],
    ["عيادة سنان", "kind.clinic"],
    ["كوافير", "kind.bookings"],
    ["سنتر دروس خصوصية", "kind.academy"],
    ["عايز تطبيق تاكسي", "kind.taxi"],
    // Gulf / Saudi
    ["أبغى تطبيق لمطعمي", "kind.restaurant"],
    ["أبي تطبيق مشغل نسائي", "kind.bookings"],
    ["ودي أسوي تطبيق للبقالة", "kind.store"],
    ["مستوصف", "kind.clinic"],
    // Levantine
    ["بدي تطبيق للمطعم", "kind.restaurant"],
    ["بدّي تطبيق لدكان", "kind.store"],
    ["عيادة حكيم أسنان", "kind.clinic"],
    // Iraqi
    ["أريد أسوي تطبيق للمطعم", "kind.restaurant"],
    ["أريد تطبيق جايخانة", "kind.restaurant"],
    ["تكسي", "kind.taxi"],
    // Maghrebi
    ["بغيت تطبيق للحانوت ديالي", "kind.store"],
    ["نبغي تطبيق طاكسي", "kind.taxi"],
    ["حاب نعمل تطبيق للكلينيك", "kind.clinic"],
    ["كوافور", "kind.bookings"],
    // Sudanese
    ["داير تطبيق لدكان", "kind.store"],
    ["عايز تطبيق شفخانة", "kind.clinic"],
    ["داير تطبيق ترحيل", "kind.rides"],
  ])("%j → %s", (text, intent) => {
    expect(sure("kind", text)).toBe(intent);
  });
});

describe("the bot's matcher: typos and doubt", () => {
  it.each([
    ["resturant", "kind.restaurant"],
    ["restaurnt", "kind.restaurant"],
    ["clinik", "kind.clinic"],
    ["restoarn", "kind.restaurant"],
    ["مطعن", "kind.restaurant"],
    ["صيدليه", "kind.store"],
  ])("a typo (%j) is asked about, the right kind first", (text, intent) => {
    const found = matchOne(dictionary, text, STEP_INTENTS.kind);
    if (found.kind === "sure") expect(found.intent).toBe(intent);
    else {
      expect(found.kind).toBe("choices");
      if (found.kind === "choices") expect(found.intents[0]).toBe(intent);
    }
    expect(rankIntents(dictionary, text, STEP_INTENTS.kind)[0]?.intent).toBe(intent);
  });

  it("asks when a typo is all it has", () => {
    expect(matchOne(dictionary, "resturant", STEP_INTENTS.kind).kind).toBe("choices");
  });

  it("asks when two kinds are as likely", () => {
    const found = matchOne(dictionary, "restaurant and gym", STEP_INTENTS.kind);
    expect(found.kind).toBe("choices");
    if (found.kind === "choices") expect(found.intents).toEqual(expect.arrayContaining(["kind.restaurant", "kind.fitness"]));
  });

  it("shows at most four choices", () => {
    const found = matchOne(dictionary, "shop restaurant gym clinic school taxi", STEP_INTENTS.kind);
    expect(found.kind === "choices" && found.intents.length).toBe(4);
  });

  it.each(["", "   ", "asdfgh", "qwerty uiop", "؟؟؟", "123", "xyz"])("finds nothing in %j", (text) => {
    expect(matchOne(dictionary, text, STEP_INTENTS.kind)).toEqual({ kind: "none" });
  });

  it("never takes a typo in a short word", () => {
    expect(sure("kind", "gim")).toBe("none");
    expect(sure("kind", "سبح")).toBe("none");
  });

  it("listens only for the question's intents", () => {
    expect(sure("website", "restaurant")).toBe("none");
    expect(sure("colour", "مطعم")).toBe("none");
    expect(rankIntents(dictionary, "عايز", STEP_INTENTS.kind)).toEqual([]);
  });

  it("never answers with \"I want\" unless asked for it", () => {
    expect(rankIntents(dictionary, "عايز أبغى بدي").map((m) => m.intent)).not.toContain("want");
    expect(rankIntents(dictionary, "عايز", ["want"]).map((m) => m.intent)).toEqual(["want"]);
  });

  it("prefers the longer phrase", () => {
    expect(sure("kind", "food delivery app")).toBe("kind.food");
    expect(sure("kind", "delivery")).toBe("kind.delivery");
    expect(sure("kind", "توصيل أكل")).toBe("kind.food");
  });
});

describe("the bot's matcher: yes and no", () => {
  it.each([
    ["yes", "answer.yes"],
    ["Yeah sure", "answer.yes"],
    ["no", "answer.no"],
    ["nope, not yet", "answer.no"],
    ["I don't have one", "answer.no"],
    ["we dont have a website", "answer.no"],
    ["evet", "answer.yes"],
    ["evet var", "answer.yes"],
    ["hayır", "answer.no"],
    ["yok", "answer.no"],
    ["sitemiz yok", "answer.no"],
    ["نعم", "answer.yes"],
    ["لا يوجد", "answer.no"],
    ["ليس لدينا موقع", "answer.no"],
    ["أيوه", "answer.yes"],
    ["ايوة عندي", "answer.yes"],
    ["لأ مفيش", "answer.no"],
    ["معنديش", "answer.no"],
    ["مش عندي", "answer.no"],
    ["إيه عندنا", "answer.yes"],
    ["ما عندي", "answer.no"],
    ["مافي", "answer.no"],
    ["إي عنا", "answer.yes"],
    ["ما في", "answer.no"],
    ["بلي", "answer.yes"],
    ["ماكو", "answer.no"],
    ["واه", "answer.yes"],
    ["ماعنديش", "answer.no"],
    ["والو", "answer.no"],
    ["أيوه عندي", "answer.yes"],
    ["مافيش", "answer.no"],
  ])("%j → %s", (text, intent) => {
    expect(sure("website", text)).toBe(intent);
  });
});

describe("the bot's matcher: colours", () => {
  it.each([
    ["red", "color.red"],
    ["dark blue", "color.navy"],
    ["navy", "color.navy"],
    ["light blue", "color.blue"],
    ["something green please", "color.green"],
    ["kırmızı", "color.red"],
    ["kirmizi", "color.red"],
    ["lacivert", "color.navy"],
    ["yeşil", "color.green"],
    ["mor", "color.purple"],
    ["أحمر", "color.red"],
    ["الأزرق", "color.blue"],
    ["أزرق غامق", "color.navy"],
    ["ذهبي", "color.gold"],
    ["بمبي", "color.pink"],
    ["لبني", "color.blue"],
    ["موف", "color.purple"],
    ["رصاصي", "color.gray"],
    ["كحلي", "color.navy"],
    ["زهري", "color.pink"],
    ["شذري", "color.teal"],
    ["خضر", "color.green"],
    ["skip", "answer.skip"],
    ["like the demo", "answer.skip"],
    ["بعدين", "answer.skip"],
    ["sonra", "answer.skip"],
  ])("%j → %s", (text, intent) => {
    expect(sure("colour", text)).toBe(intent);
  });
});

describe("the bot's matcher: several languages", () => {
  it.each([
    ["English and Arabic", ["lang.en", "lang.ar"]],
    ["arabic, english", ["lang.ar", "lang.en"]],
    ["Arabic English Turkish", ["lang.ar", "lang.en", "lang.tr"]],
    ["Türkçe ve İngilizce", ["lang.tr", "lang.en"]],
    ["Arapça, Türkçe", ["lang.ar", "lang.tr"]],
    ["عربي وإنجليزي", ["lang.ar", "lang.en"]],
    ["العربية والإنجليزية والتركية", ["lang.ar", "lang.en", "lang.tr"]],
    ["مصري وإنجلش", ["lang.ar", "lang.en"]],
    ["عربي وفرنساوي", ["lang.ar", "lang.fr"]],
    ["الدارجة والفرنسية", ["lang.ar", "lang.fr"]],
    ["French and German", ["lang.fr", "lang.de"]],
    ["Français", ["lang.fr"]],
    ["Deutsch", ["lang.de"]],
    ["español", ["lang.es"]],
    ["فارسی", ["lang.fa"]],
    ["русский", ["lang.ru"]],
    ["that's all", ["answer.done"]],
    ["bu kadar", ["answer.done"]],
    ["خلاص", ["answer.done"]],
  ])("%j → %j", (text, intents) => {
    expect(all("languages", text)).toEqual(intents);
  });
});

describe("the bot's matcher: features", () => {
  it.each([
    ["chat and loyalty points", ["feature.chat", "feature.loyalty"]],
    ["push notifications, card payments", ["feature.notifications", "feature.payments"]],
    ["an iPhone app too", ["feature.ios"]],
    ["chat but no loyalty", ["feature.chat", "-feature.loyalty"]],
    ["no chat", ["-feature.chat"]],
    ["without notifications", ["-feature.notifications"]],
    ["sohbet ve bildirim", ["feature.chat", "feature.notifications"]],
    ["sohbet istemiyorum", ["-feature.chat"]],
    ["sohbetsiz", ["-feature.chat"]],
    ["puanlar ve kartla ödeme", ["feature.loyalty", "feature.payments"]],
    ["محادثة وإشعارات", ["feature.chat", "feature.notifications"]],
    ["شات ونقاط", ["feature.chat", "feature.loyalty"]],
    ["بدون نقاط", ["-feature.loyalty"]],
    ["شات بس من غير نقاط", ["feature.chat", "-feature.loyalty"]],
    ["مش عايز شات", ["-feature.chat"]],
    ["تقييمات", ["feature.ratings"]],
    ["الدفع بالكارت وآيفون", ["feature.payments", "feature.ios"]],
    ["none", ["answer.no"]],
    ["nothing", ["answer.no"]],
    ["ولا حاجة", ["answer.no"]],
    ["hiçbiri", ["answer.no"]],
  ])("%j → %j", (text, intents) => {
    expect(all("features", text)).toEqual(intents);
  });
});

describe("the bot's matcher: which Arabic", () => {
  it.each([
    ["عايز تطبيق لمطعمي", "ar-eg"],
    ["عاوز ابلكيشن", "ar-eg"],
    ["محتاج تطبيق", "ar-eg"],
    ["أبغى تطبيق", "ar-gulf"],
    ["ابغى", "ar-gulf"],
    ["ودي تطبيق", "ar-gulf"],
    ["بدي تطبيق", "ar-lev"],
    ["أريد أسوي تطبيق", "ar-iq"],
    ["بغيت تطبيق", "ar-maghreb"],
    ["نبغي", "ar-maghreb"],
    ["داير تطبيق", "ar-sd"],
    ["أريد تطبيقا", "ar"],
    ["أود إنشاء تطبيق", "ar"],
    ["أرغب في تطبيق", "ar"],
  ])("%j is %s", (text, dialect) => {
    expect(detectDialect(dictionary, text)).toBe(dialect);
  });

  it("calls عايز Egyptian, though Sudanese say it too", () => {
    expect(detectDialect(dictionary, "عايز")).toBe("ar-eg");
    expect(detectDialect(dictionary, "عايز داير")).toBe("ar-sd");
  });

  it("knows nothing from English, Turkish or words every dialect uses", () => {
    expect(detectDialect(dictionary, "I want a restaurant app")).toBeNull();
    expect(detectDialect(dictionary, "restoran istiyorum")).toBeNull();
    expect(detectDialect(dictionary, "مطعم")).toBeNull();
  });

  it("uses only Arabic tags", () => {
    for (const p of SEED_PHRASES.filter((x) => x.intent === "want" && x.lang.startsWith("ar"))) expect(ARABIC_TAGS).toContain(p.lang);
  });
});

describe("the bot's dictionary: every built-in phrase", () => {
  const steps = Object.entries(STEP_INTENTS) as [keyof typeof STEP_INTENTS, readonly string[]][];
  it("finds its own intent first, without a typo, on each question that listens for it", () => {
    const wrong: string[] = [];
    for (const phrase of SEED_PHRASES) {
      for (const [step, intents] of steps) {
        if (!intents.includes(phrase.intent)) continue;
        const ranked = rankIntents(dictionary, phrase.text, intents);
        const top = ranked[0];
        // The same words in another intent of the question tie: either may come first.
        const tied = ranked.filter((m) => top && m.score === top.score && !m.fuzzy).map((m) => m.intent);
        if (!top || top.fuzzy || !tied.includes(phrase.intent)) wrong.push(`${step}: ${phrase.text} (${phrase.intent}, ${phrase.lang}) → ${top?.intent ?? "nothing"}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("is never in two intents of one question", () => {
    const twice: string[] = [];
    for (const [step, intents] of steps) {
      const owner = new Map<string, string>();
      for (const phrase of SEED_PHRASES.filter((p) => intents.includes(p.intent))) {
        const text = normalizeText(phrase.text);
        const before = owner.get(text);
        if (before && before !== phrase.intent) twice.push(`${step}: ${phrase.text} in ${before} and ${phrase.intent}`);
        owner.set(text, phrase.intent);
      }
    }
    expect(twice).toEqual([]);
  });
});

describe("the bot's matcher: whole sentences in each dialect", () => {
  it.each([
    // Egyptian
    ["features", "عايز شات ونقط للعملاء", ["feature.chat", "feature.loyalty"]],
    ["features", "محتاج نوتيفيكيشن والدفع بالكارت", ["feature.notifications", "feature.payments"]],
    ["languages", "عايزه بالعربي والإنجليزي", ["lang.ar", "lang.en"]],
    // Gulf / Saudi
    ["features", "أبغى شات وتقييمات", ["feature.chat", "feature.ratings"]],
    ["languages", "أبي عربي وانقليزي", ["lang.ar", "lang.en"]],
    // Levantine
    ["features", "بدي حكي مع الزباين وإشعارات", ["feature.chat", "feature.notifications"]],
    ["languages", "بدي عربي وإنكليزي وفرنساوي", ["lang.ar", "lang.en", "lang.fr"]],
    // Iraqi
    ["features", "أريد أسوي شات ونقاط", ["feature.chat", "feature.loyalty"]],
    ["languages", "أريد عراقي وانكليزي", ["lang.ar", "lang.en"]],
    // Maghrebi
    ["features", "بغيت ميساجات ونوتيفيكاسيون", ["feature.chat", "feature.notifications"]],
    ["languages", "بغيت الدارجة والفرنسية", ["lang.ar", "lang.fr"]],
    // Sudanese
    ["features", "داير ونسة مع الزبائن وحوافز", ["feature.chat", "feature.loyalty"]],
    ["languages", "داير عربي وإنجليزي", ["lang.ar", "lang.en"]],
    // MSA
    ["features", "أرغب في محادثة مع العملاء ونقاط ولاء", ["feature.chat", "feature.loyalty"]],
    ["languages", "أود العربية الفصحى والتركية", ["lang.ar", "lang.tr"]],
    // Turkish and English
    ["features", "canlı sohbet ve sadakat programı istiyoruz", ["feature.chat", "feature.loyalty"]],
    ["features", "I'd like live chat and an iPhone app", ["feature.chat", "feature.ios"]],
  ] as const)("%s: %j → %j", (step, text, intents) => {
    expect(all(step, text)).toEqual(intents);
  });

  it.each([
    ["colour", "عايزه بمبي", "color.pink"],
    ["colour", "أبغى عنابي", "color.red"],
    ["colour", "بدي زهري", "color.pink"],
    ["colour", "أريد شذري", "color.teal"],
    ["colour", "بغيت كحل", "color.black"],
    ["colour", "داير أخضر", "color.green"],
    ["colour", "koyu mavi olsun", "color.navy"],
    ["logo", "مفيش لوجو", "answer.skip"],
    ["logo", "بعدين", "answer.skip"],
    ["logo", "logo yok", "answer.skip"],
    ["logo", "no logo yet", "answer.skip"],
    ["website", "أيوه عندنا موقع", "answer.yes"],
    ["website", "ماعندناش موقع", "answer.no"],
  ] as const)("%s: %j → %s", (step, text, intent) => {
    expect(sure(step, text)).toBe(intent);
  });
});
