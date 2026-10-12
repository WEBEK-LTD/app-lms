import type { Metadata } from "next";
import Link from "next/link";
import { DocLayout, DocTitle, LEGAL_NAV, LastUpdated } from "@/components/doc-layout";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <DocLayout groups={LEGAL_NAV} current="/terms">
      <DocTitle>Terms of service</DocTitle>
      <LastUpdated />

      <h2>1. About these terms</h2>
      <p>
        These terms cover your use of Yallapp: the website at yallapp.com.tr, the client dashboard, the Yallapp WordPress plugin and the mobile apps we build for you. Yallapp is a trading name of WEBEK LTD, a company registered in England and Wales under company number 16326894, with its registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. In these terms, “we” and “us” mean WEBEK LTD. By creating an account, you agree to these terms.
      </p>

      <h2>2. Who Yallapp is for</h2>
      <p>
        Yallapp is a business service for academies, trainers and other organisations that run a WordPress website. By creating an account, you confirm that you are using Yallapp for your business, trade or profession, and not as a consumer.
      </p>

      <h2>3. What Yallapp provides</h2>
      <p>
        Yallapp builds branded Android and iOS apps that connect to your WordPress website and supported LMS plugin. Depending on your plan, we provide the WordPress plugin, your app build files, publishing guides, and publishing to the app stores on your behalf.
      </p>

      <h2>4. Your account</h2>
      <p>
        You must give accurate details when you sign up. Your account becomes active after we confirm your plan. Keep your password private. You are responsible for activity on your account.
      </p>

      <h2>5. Plans, payment and renewal</h2>
      <p>
        Plans and prices are shown on our pricing page or agreed with our team before you pay. Payment is arranged directly with us. Your plan runs for the period you paid for and renews only when you pay for the next period. If your plan is not renewed, your license becomes inactive and your apps stop loading content through the plugin.
      </p>

      <h2>6. Cancellation and refunds</h2>
      <p>
        You can cancel within 3 days of your account being activated and receive a full refund. After that, the fee for the current period is non-refundable. Full details are in our <Link href="/refund">Refund policy</Link>.
      </p>

      <h2>7. Your website, content and licenses</h2>
      <p>
        You keep ownership of your website, courses and brand. You are responsible for holding valid licenses for the WordPress plugins and services your website uses, such as your LMS plugin, Digits, WooCommerce and your SMS or WhatsApp gateway. You allow us to use your name, logo and content only to build, publish and support your apps.
      </p>

      <h2>8. App store accounts and publishing</h2>
      <p>
        Your apps are published under your own Apple and Google developer accounts. You are the publisher and are responsible for meeting each store’s policies, including your store listing and privacy disclosures. If you give us store API keys, we use them only to upload builds you request. You can revoke them at any time.
      </p>

      <h2>9. Signing keys</h2>
      <p>
        We create your Android signing key, give you a copy and keep an encrypted copy so we can build your updates. Keep your copy safe. A lost key can prevent future updates to your app.
      </p>

      <h2>10. Acceptable use</h2>
      <p>
        You may not use Yallapp for unlawful content, content you don’t have the rights to, or malware, or resell the service without our written agreement.
      </p>

      <h2>11. Availability and support</h2>
      <p>
        We work to keep Yallapp available but can’t promise uninterrupted service. We announce planned maintenance in advance where possible. Support is available on WhatsApp at <a href="https://wa.me/905446731942">+90 544 673 19 42</a> and by email at <a href="mailto:info@yallapp.com.tr">info@yallapp.com.tr</a>.
      </p>

      <h2>12. Ending your account</h2>
      <p>
        You can stop using Yallapp at any time. We may suspend or close an account for non-payment or a breach of these terms. When an account ends, you keep the files and signing keys already delivered, but the plugin connection and new builds stop.
      </p>

      <h2>13. Liability</h2>
      <p>
        Nothing in these terms limits liability that the law does not allow us to limit, including liability for death or personal injury caused by negligence, or for fraud. Subject to that, we are not responsible for app store review decisions, changes made by third-party plugins or services, or indirect or consequential losses, such as lost profits. Our total liability is limited to the fees you paid in the 12 months before the claim.
      </p>

      <h2>14. Personal data</h2>
      <p>
        We handle personal data as described in our <Link href="/privacy">Privacy policy</Link>.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>We may update these terms. We will email you about important changes at least 14 days before they take effect.</p>

      <h2>16. Governing law</h2>
      <p>
        These terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction. This does not remove any mandatory rights you have under the law of the country where you are based.
      </p>

      <h2>17. Contact</h2>
      <p>
        WEBEK LTD, 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. Email: <a href="mailto:info@yallapp.com.tr">info@yallapp.com.tr</a> · WhatsApp: <a href="https://wa.me/905446731942">+90 544 673 19 42</a>
      </p>
    </DocLayout>
  );
}
