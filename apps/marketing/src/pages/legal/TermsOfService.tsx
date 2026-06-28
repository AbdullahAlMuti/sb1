import { Link } from "react-router-dom";
import LegalPageLayout from "./LegalPageLayout";

const TermsOfService = () => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="These terms govern use of the SellerSuit website, dashboard, Chrome extension, and related eBay listing workflow services."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. Agreement</h2>
        <p className="leading-relaxed text-muted-foreground">
          By accessing or using SellerSuit, including the website, dashboard, Chrome extension, APIs, listing workflow tools, AI features, or billing features, you agree to these Terms. If you use SellerSuit for a business, you represent that you are authorized to bind that business.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Service Description</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit provides tools for eBay-focused marketplace operators, including supplier page extraction, listing drafts, SKU and pricing tools, image workflows, AI-assisted listing content, eBay upload workflows, order sync where enabled, account dashboard features, and usage-based credits.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Account Responsibility</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>You must provide accurate account and billing information.</li>
          <li>You are responsible for maintaining the confidentiality of your login credentials and extension connection.</li>
          <li>You are responsible for all actions taken through your account, dashboard, extension, and connected marketplace accounts.</li>
          <li>You must promptly notify us at support@sellersuit.com if you suspect unauthorized access.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. Acceptable Use</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">You agree not to:</p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Use SellerSuit for unlawful, deceptive, infringing, or abusive activity.</li>
          <li>Bypass plan limits, credit metering, authentication, rate limits, or security controls.</li>
          <li>Use SellerSuit to publish listings that violate eBay policies, intellectual property rights, consumer protection laws, or product safety rules.</li>
          <li>Interfere with the service, reverse engineer non-public systems, scrape SellerSuit itself, or attempt unauthorized access.</li>
          <li>Upload malware, harmful code, deceptive content, or data you do not have the right to use.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Third-Party Platforms</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit works with third-party websites and services such as eBay, Amazon, Walmart, Google, Stripe, Supabase, and AI providers. SellerSuit is not affiliated with, endorsed by, sponsored by, or officially connected to those companies unless we separately state a verified partnership. You are responsible for following each third-party platform's terms, seller policies, and applicable laws.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">6. Marketplace Results Disclaimer</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not guarantee sales, profit, search ranking, marketplace acceptance, supplier availability, pricing accuracy, shipping performance, or account standing. You are responsible for reviewing every listing, price, image, title, description, item specific, and order action before publishing or relying on it.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">7. AI Features</h2>
        <p className="leading-relaxed text-muted-foreground">
          AI-generated titles, descriptions, image edits, and related output may be inaccurate, incomplete, duplicative, or unsuitable for your listing. You must review and edit AI output before publishing. AI features may consume credits according to your plan or account settings.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">8. Subscriptions, Credits, and Payments</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Paid plans, trials, subscriptions, and credit systems are billed through Stripe unless otherwise stated.</li>
          <li>Subscriptions renew automatically unless canceled before the next billing date.</li>
          <li>Credits, plan limits, and feature access may vary by plan and billing status.</li>
          <li>You can manage or cancel billing through the available billing portal or by contacting support.</li>
          <li>Refunds and cancellations are governed by our <Link className="underline" to="/refund">Refund and Cancellation Policy</Link>.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">9. Service Availability</h2>
        <p className="leading-relaxed text-muted-foreground">
          We aim to keep SellerSuit reliable, but the service may be interrupted by maintenance, incidents, third-party platform changes, browser changes, API limits, supplier page changes, or network issues. We may modify, suspend, or discontinue features when needed.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">10. Intellectual Property</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit and its software, designs, logos, content, and workflows are owned by SellerSuit or its licensors. You retain responsibility for the data and content you provide, scrape, generate, or publish through the service.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">11. Termination</h2>
        <p className="leading-relaxed text-muted-foreground">
          We may suspend or terminate access if you violate these Terms, fail to pay, misuse the service, create security risk, or expose us or others to legal or operational risk. You may stop using the service at any time.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">12. Limitation of Liability</h2>
        <p className="leading-relaxed text-muted-foreground">
          To the maximum extent permitted by law, SellerSuit will not be liable for indirect, incidental, special, consequential, punitive, or lost-profit damages, or for marketplace account actions, third-party platform issues, supplier issues, listing outcomes, or AI output decisions.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">13. Changes to These Terms</h2>
        <p className="leading-relaxed text-muted-foreground">
          We may update these Terms. Material changes will be posted on this page. Continued use after changes means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">14. Contact</h2>
        <p className="leading-relaxed text-muted-foreground">Email: support@sellersuit.com</p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfService;
