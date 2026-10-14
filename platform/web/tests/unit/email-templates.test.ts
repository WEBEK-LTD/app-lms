import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { renderEmail, sendTemplate } from "@/lib/email/send";
import { EMAIL_TEMPLATES, emailTemplate, placeholderErrors, readTemplateForm, renderTemplate, sampleValues } from "@/lib/email/templates";
import { getStore } from "@/lib/data";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW } from "./helpers";

const t = (key: string) => emailTemplate(key)!;
const SIGNATURE =
  "\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp +90 544 673 19 42\nYallapp is a trading name of WEBEK LTD, registered in England and Wales, company no. 16326894.";
const WHATSAPP = { yallapp_whatsapp: "+90 544 673 19 42" };

describe("email templates", () => {
  it("send today's emails until the team edits them", () => {
    // The texts the platform sent before the templates (lib/mail.ts and the build status route).
    expect(renderTemplate(t("password_reset"), { name: "Ada", link: "https://x.test/r", ...WHATSAPP })).toMatchObject({
      subject: "Reset your Yallapp password",
      text:
        "Hello Ada,\n\nWe received a request to reset your Yallapp password. Use this link to choose a new one:\n\nhttps://x.test/r\n\n" +
        "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email." +
        SIGNATURE,
    });
    expect(renderTemplate(t("password_set"), { name: "Ada", link: "https://x.test/r", ...WHATSAPP }).text).toBe(
      "Hello Ada,\n\nUse this link to set the password for your Yallapp account:\n\nhttps://x.test/r\n\n" +
        "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email." +
        SIGNATURE,
    );
    expect(
      renderTemplate(t("account_activated"), { name: "Ada", app_name: "Ada Academy", plan: "Pro", active_until: "1 Jan 2027", license_key: "YALL-1", dashboard_url: "https://x.test/dashboard", ...WHATSAPP }),
    ).toMatchObject({
      subject: "Your Yallapp account is active",
      text:
        "Hello Ada,\n\nYour Yallapp account is active.\n\nApp: Ada Academy\nPlan: Pro\nActive until: 1 Jan 2027\nLicense key: YALL-1\n\n" +
        "Next steps:\n1. Install the Yallapp plugin on your WordPress site and paste your license key.\n" +
        "2. Set up your app in your dashboard: https://x.test/dashboard\n\nYou can always find your license key on the License & plugin page." +
        SIGNATURE,
    });
    expect(renderTemplate(t("plan_renewed"), { name: "Ada", app_name: "Ada Academy", plan: "Pro", active_until: "1 Jan 2027", dashboard_url: "https://x.test/dashboard", ...WHATSAPP })).toMatchObject({
      subject: "Your Yallapp plan has been renewed",
      text: "Hello Ada,\n\nThe Pro plan of Ada Academy is now active until 1 Jan 2027.\n\nDashboard: https://x.test/dashboard" + SIGNATURE,
    });
    const build = { name: "Ada", app_name: "Ada Academy", build_number: "7", version: "1.0.6", builds_url: "https://x.test/dashboard/open/a1?to=builds", ...WHATSAPP };
    expect(renderTemplate(t("build_ready"), { ...build, note_line: "" })).toEqual({
      subject: "Ada Academy: build #7 is ready",
      text: "Hello Ada,\n\nBuild #7 of Ada Academy (version 1.0.6) is ready.\n\nDownload your files on the Builds & downloads page:\nhttps://x.test/dashboard/open/a1?to=builds" + SIGNATURE,
      html: expect.any(String),
    });
    expect(renderTemplate(t("build_failed"), { ...build, reason: "The Android app couldn't be built." })).toMatchObject({
      subject: "Ada Academy: build #7 didn't finish",
      text:
        "Hello Ada,\n\nBuild #7 of Ada Academy (version 1.0.6) didn't finish, so nothing was published.\n\nThe Android app couldn't be built.\n\n" +
        "Our team has been told and will look into it. You can also start it again with Try again on the Builds & downloads page:\nhttps://x.test/dashboard/open/a1?to=builds" +
        SIGNATURE,
    });
    expect(
      renderTemplate(t("build_failed_team"), {
        client_name: "Ada Lovelace",
        app_name: "Ada Academy",
        build_number: "7",
        version: "1.0.6",
        status: "Didn't finish",
        reason: "Gradle failed",
        log_line: "Build log: https://github.com/x/y/actions/runs/1\n",
        admin_url: "https://x.test/admin/clients/c1",
      }).text,
    ).toBe(
      "Build #7 of Ada Academy (Ada Lovelace, version 1.0.6) had a problem.\n\nStatus: Didn't finish\nWhat happened: Gradle failed\nBuild log: https://github.com/x/y/actions/runs/1\n\nThe client was emailed too. Their page: https://x.test/admin/clients/c1",
    );
    const setup = { client_name: "Ada", website: "https://a.test", whatsapp: "+905321234567", email: "ada@a.test", app_type: "Academy" };
    expect(renderTemplate(t("setup_request"), { ...setup, note_line: "" }).text).toBe(
      "Ada asked us to set up WordPress for their app.\nWebsite: https://a.test\nWhatsApp: +905321234567\nEmail: ada@a.test\nApp type: Academy\n\nRequests are listed on the super admin Clients page.",
    );
    expect(renderTemplate(t("setup_request"), { ...setup, note_line: "Note: Tutor LMS\n" }).text).toContain("App type: Academy\nNote: Tutor LMS\n\nRequests");
  });

  it("documents a sample for every placeholder its default uses, and nothing else", () => {
    for (const template of EMAIL_TEMPLATES) {
      expect(placeholderErrors(template.subject, template), template.key).toEqual([]);
      expect(placeholderErrors(template.body, template), template.key).toEqual([]);
      const rendered = renderTemplate(template, sampleValues(template));
      expect(rendered.text, template.key).not.toMatch(/\{\{|\}\}/);
    }
  });

  it("refuses unknown placeholders and stray braces on save", () => {
    const reset = t("password_reset");
    expect(placeholderErrors("Hi {{name}} {{ name }} {{license_key}} {{yallapp_email}}", reset)).toEqual([
      "{{ name }} isn't a placeholder of this email.",
      "{{license_key}} isn't a placeholder of this email.",
    ]);
    expect(placeholderErrors("Hi {{name}", reset)).toEqual(["Every {{ needs a closing }}, around a placeholder name."]);
    expect(readTemplateForm(reset, { subject: "Reset {{link_url}}", body: "Hello {{name}},\r\n\r\n{{link}}\n\n" })).toEqual({
      ok: false,
      errors: { subject: "{{link_url}} isn't a placeholder of this email." },
    });
    expect(readTemplateForm(reset, { subject: "  Reset   it ", body: "Hello {{name}},\r\n\r\n{{link}}\n\n" })).toEqual({
      ok: true,
      text: { subject: "Reset it", body: "Hello {{name}},\n\n{{link}}" },
    });
    expect(readTemplateForm(reset, { subject: "", body: " " })).toEqual({ ok: false, errors: { subject: "Enter the subject.", body: "Enter the email's text." } });
  });

  it("escapes every value in the HTML part, and keeps the text part as it is", () => {
    const rendered = renderTemplate(
      { subject: "Hi {{name}}\n", body: "<b>{{name}}</b>\n{{message}}" },
      { name: '<img src=x onerror="alert(1)">', message: { text: "**Bold**", html: "<p><strong>Bold</strong></p>" } },
    );
    expect(rendered.subject).toBe('Hi <img src=x onerror="alert(1)">');
    expect(rendered.text).toBe('<b><img src=x onerror="alert(1)"></b>\n**Bold**');
    expect(rendered.html).toContain("&lt;b&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&lt;/b&gt;<br>\n<p><strong>Bold</strong></p>");
    expect(rendered.html).not.toContain("<img");
  });

  it("sends the template the team saved, with Yallapp's contact details", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    await store.setPlatformSetting("contact", { whatsapp: "+90 500 000 00 00", email: "hello@yallapp.test" }, "admin@yallapp.test", NOW);
    expect((await renderEmail(store, "build_ready", { name: "Ada", app_name: "Ada Academy", build_number: "3", builds_url: "u" })).subject).toBe("Ada Academy: build #3 is ready");
    await store.setEmailTemplate("build_ready", { subject: "Your build {{build_number}} is here", body: "Hi {{name}}, ask {{yallapp_email}}." }, "admin@yallapp.test", NOW);
    expect(await renderEmail(store, "build_ready", { name: "Ada", build_number: "3", builds_url: "u" })).toMatchObject({
      subject: "Your build 3 is here",
      text: "Hi Ada, ask hello@yallapp.test.",
    });
    await store.setEmailTemplate("build_ready", null, "admin@yallapp.test", NOW);
    expect((await renderEmail(store, "build_ready", { name: "Ada", app_name: "Ada Academy", build_number: "3", builds_url: "u" })).subject).toBe("Ada Academy: build #3 is ready");
    clearPlatformSettingsCache();
  });

  it("captures sent emails in memory mode for the end-to-end tests", async () => {
    const dir = path.join(tmpdir(), `yallapp-mail-${Date.now()}`);
    process.env.YALLAPP_MAIL_DIR = dir;
    try {
      clearPlatformSettingsCache();
      await (await getStore()).setEmailTemplate("plan_renewed", { subject: "Renewed: {{plan}}", body: "Hello {{name}} & co" }, "admin@yallapp.test", NOW);
      await sendTemplate("plan_renewed", "ada@academy.test", { name: "Ada", plan: "Pro", active_until: "x", dashboard_url: "y" });
      const [file] = await readdir(dir);
      const mail = JSON.parse(await readFile(path.join(dir, file!), "utf8")) as Record<string, string>;
      expect(mail).toMatchObject({ to: "ada@academy.test", subject: "Renewed: Pro", text: "Hello Ada & co" });
      expect(mail.html).toContain("Hello Ada &amp; co");
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      await (await getStore()).setEmailTemplate("plan_renewed", null, "admin@yallapp.test", NOW);
      await rm(dir, { recursive: true, force: true });
    }
  });
});
