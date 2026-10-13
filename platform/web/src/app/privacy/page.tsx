import type { Metadata } from "next";
import { DocLayout, DocTitle, LEGAL_NAV, LastUpdated } from "@/components/doc-layout";
import { getContact } from "@/lib/contact";

export const metadata: Metadata = { title: "Privacy policy" };

export default async function PrivacyPage() {
  const contact = await getContact();
  return (
    <DocLayout groups={LEGAL_NAV} current="/privacy">
      <DocTitle>Privacy policy</DocTitle>
      <LastUpdated />

      <h2>1. Who we are</h2>
      <p>
        Yallapp is a trading name of WEBEK LTD, a company registered in England and Wales under company number 16326894, with its registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. WEBEK LTD is the data controller for the personal data described here. We follow the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. When we process data of people in Türkiye or the European Union, we also follow the Turkish Personal Data Protection Law No. 6698 (KVKK) and the EU General Data Protection Regulation (GDPR). Contact: <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>

      <h2>2. Data we collect from our clients</h2>
      <ul>
        <li>
          <b>Account details:</b> name, email, WhatsApp number and a securely hashed password.
        </li>
        <li>
          <b>Website and app details:</b> your website address, app name, logo, icons, colors and store listing text.
        </li>
        <li>
          <b>Publishing credentials:</b> Google Play and App Store Connect keys, if you choose to add them. These are stored encrypted.
        </li>
        <li>
          <b>Billing records:</b> your plan, dates and payment notes.
        </li>
        <li>
          <b>Messages</b> you send us, and <b>technical logs</b> such as IP address, browser and sign-in times.
        </li>
      </ul>

      <h2>3. Data about your students</h2>
      <p>
        The Yallapp plugin runs on your WordPress website. Your students’ accounts, phone numbers, progress and orders stay in your website’s database, and Yallapp’s servers do not receive them. License checks send only your website address, plugin version and license key. You are the data controller for your students and should give them your own privacy notice. Push notifications are sent through your own Firebase project. If you ask us for help with a problem involving a student, we use only the data you share with us, and only on your instructions.
      </p>

      <h2>4. Why we use your data, and our legal basis</h2>
      <ul>
        <li>To provide your account, build your apps and publish them when you ask us to (performance of a contract).</li>
        <li>To support you and keep the service secure (legitimate interests).</li>
        <li>To keep accounting and tax records (legal obligation).</li>
        <li>To send service emails about your account and builds (performance of a contract).</li>
      </ul>

      <h2>5. Who we share it with</h2>
      <p>
        We share data only with providers that help us run Yallapp: website hosting (Netlify), our own servers for the database and build files, the build service that compiles your apps, and Apple or Google when we publish for you. We may also share data with professional advisers or authorities when the law requires it. We never sell personal data.
      </p>

      <h2>6. International transfers</h2>
      <p>
        We are based in the United Kingdom. Some of our providers are in other countries, such as the United States. When data leaves the UK, Türkiye or the European Union, we use the safeguards the law requires, such as the UK International Data Transfer Agreement or Addendum, standard contractual clauses, and the transfer rules in Article 9 of KVKK.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        We keep account data while your account is active and for up to 12 months after it closes. Billing records are kept for 6 years, as UK tax law requires. Signing keys are kept until you ask us to delete them after your account ends. Technical logs are kept for up to 12 months.
      </p>

      <h2>8. Security</h2>
      <p>All connections use HTTPS. Publishing credentials and signing keys are encrypted at rest, and only the people who need access have it.</p>

      <h2>9. Your rights</h2>
      <p>
        Under the UK GDPR, you can ask to access, correct or delete your data, restrict or object to how we use it, and receive a copy in a portable format. KVKK (Article 11) and the EU GDPR give you similar rights, including the right to know who your data was shared with. We reply within one month. Email <a href={`mailto:${contact.email}`}>{contact.email}</a>. You can also complain to the UK Information Commissioner’s Office (ico.org.uk), the Turkish Personal Data Protection Authority (kvkk.gov.tr), or the data protection authority in your EU country.
      </p>

      <h2>10. Cookies</h2>
      <p>We use only the cookies needed to keep you signed in. We don’t use advertising or tracking cookies.</p>

      <h2>11. Changes and contact</h2>
      <p>
        We will post changes here and email you about important ones. Questions: <a href={`mailto:${contact.email}`}>{contact.email}</a> or WhatsApp <a href={contact.whatsappUrl}>{contact.whatsappDisplay}</a>.
      </p>
    </DocLayout>
  );
}
