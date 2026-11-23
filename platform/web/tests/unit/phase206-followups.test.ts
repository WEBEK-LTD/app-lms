import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePhones } from "@/lib/courses/grading";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type CatalogSettings, type HostedSettings } from "@/lib/data/types";
import { parseCourierForm } from "@/lib/delivery/forms";
import { appCountryCode, appPhoneCode } from "@/lib/hosted/country-code";
import { parseDriverForm } from "@/lib/rides/forms";
import { parsePersonForm } from "@/lib/school/forms";
import { APP_WORDS } from "@/lib/studio/app-words";
import { TEMPLATE_CATEGORY_TICKERS, TEMPLATE_CATEGORY_WORDS } from "@/lib/studio/shop-categories";
import { parseTeacherForm } from "@/lib/teachers/forms";

/**
 * 206 Follow-ups. 206.2 (160.8's): a phone number typed without its
 * country code belongs to the code the app's sign-in shows first
 * (`appCountryCode`), not to the raw saved `defaultCountryCode` (the
 * platform's +90 every settings save wrote back), so a Moroccan shop's
 * courier, teacher, driver, school person or student typed as "0612 345 678"
 * is +212, the number they sign in with. 206.3 (157.7): the plugin's copy of
 * the template's category words is the platform's.
 */

type CodeApp = Pick<App, "hostedSettings" | "catalogSettings">;
const app = (catalog: Partial<CatalogSettings>, hosted: Partial<HostedSettings> = {}): CodeApp => ({
  catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, ...catalog },
  hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...hosted },
});

const morocco = app({ currency: "MAD" });
const MOROCCAN = "0612 345 678";

describe("206.2 phones typed without a country code", () => {
  it("are the app's sign-in code, not the settings' raw +90", () => {
    expect(morocco.hostedSettings!.defaultCountryCode).toBe("+90");
    expect(appPhoneCode(morocco)).toBe("+212");
    expect(appPhoneCode(morocco)).toBe(appCountryCode(morocco).code);
    // The owner's own choice first; the owner's country where the shop gives none.
    expect(appPhoneCode(app({ currency: "MAD" }, { defaultCountryCode: "+20", countryCodeChosen: true }))).toBe("+20");
    expect(appPhoneCode(app({}), "EG")).toBe("+20");
    expect(appPhoneCode(app({}))).toBe("+90");
  });

  it("in couriers, teachers, drivers, the school and the courses alike", () => {
    const code = appPhoneCode(morocco);
    const courier = parseCourierForm({ name: "Youssef", phone: MOROCCAN }, code, false);
    const teacher = parseTeacherForm({ name: "Salma", phone: MOROCCAN, share: "70" }, code, false);
    const driver = parseDriverForm({ name: "Omar", phone: MOROCCAN, vehicle: "Dacia", plate: "12345-A-6" }, code, false, []);
    const person = parsePersonForm({ name: "Amina", phone: MOROCCAN, role: "parent" }, code, []);
    const students = parsePhones(MOROCCAN, code);
    expect(courier.ok && courier.value.phone).toBe("+212612345678");
    expect(teacher.ok && teacher.value.phone).toBe("+212612345678");
    expect(driver.ok && driver.value.phone).toBe("+212612345678");
    expect(person.ok && person.value.phone).toBe("+212612345678");
    expect(students.ok && students.value.map((p) => p.e164)).toEqual(["+212612345678"]);
    // A number with its own code keeps it.
    const turkish = parseCourierForm({ name: "Ali", phone: "+90 532 123 45 67" }, code, false);
    expect(turkish.ok && turkish.value.phone).toBe("+905321234567");
  });

  it("no phone is parsed with the raw saved code any more", () => {
    const roots = ["src/app/actions", "src/lib"];
    const files = roots.flatMap((root) => (readdirSync(root, { recursive: true }) as string[]).filter((f) => /\.tsx?$/.test(f)).map((f) => join(root, f)));
    const raw = files.filter((f) => /parse(Any)?Phones?\([^;]*\.defaultCountryCode\b|hostedSettings\(app\)\.defaultCountryCode/.test(readFileSync(f, "utf8")));
    // The review number is saved in full (+…), and the settings form parses with the code being saved.
    expect(raw.filter((f) => !/hosted\/(service|settings-form)\.ts$/.test(f))).toEqual([]);
  });
});

describe("206.3 the plugin's template category words", () => {
  const php = readFileSync(join(__dirname, "../../../../wp-plugin/yallapp/includes/pages/class-shop-categories.php"), "utf8");
  const phpWords = (constant: string): Record<string, string[]> => {
    const block = php.slice(php.indexOf(`const ${constant} = array(`), php.indexOf(");\n", php.indexOf(`const ${constant} = array(`)));
    const out: Record<string, string[]> = {};
    for (const m of block.matchAll(/'(\w+)'\s*=>\s*array\(([^)]*)\)/g)) {
      out[m[1]!] = [...m[2]!.matchAll(/'([^']*)'|"((?:[^"\\]|\\.)*)"/g)].map((x) => (x[1] ?? x[2]!.replace(/\\n/g, "\n")));
    }
    return out;
  };
  it("are the app words in English, Arabic and Turkish", () => {
    const expected = (words: readonly string[]) => Object.fromEntries(words.map((w) => [w, [APP_WORDS.en[w as keyof typeof APP_WORDS.en], APP_WORDS.ar[w as keyof typeof APP_WORDS.ar], APP_WORDS.tr[w as keyof typeof APP_WORDS.tr]]]));
    expect(phpWords("WORDS")).toEqual(expected(TEMPLATE_CATEGORY_WORDS));
    expect(phpWords("TICKERS")).toEqual(expected(TEMPLATE_CATEGORY_TICKERS));
  });
});
