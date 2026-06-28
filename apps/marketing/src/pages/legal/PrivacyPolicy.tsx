import LegalPageLayout from "./LegalPageLayout";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="This policy explains what SellerSuit collects, why we collect it, how we use it, and the choices available to users of the SellerSuit website, dashboard, and Chrome extension."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. Who We Are</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit ("SellerSuit", "we", "us", or "our") provides an eBay-focused listing workflow, dashboard, and Chrome extension at sellersuit.com. Contact: support@sellersuit.com.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Information We Collect</h2>
        <h3 className="mb-3 text-xl font-medium">Account and authentication data</h3>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Email address, user ID, workspace/account IDs, role, plan, subscription status, and login/session metadata.</li>
          <li>Extension pairing, device, access-token, and refresh-token metadata needed to connect the extension to your SellerSuit account.</li>
        </ul>

        <h3 className="mb-3 mt-6 text-xl font-medium">eBay listing workflow data</h3>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Product titles, prices, images, product identifiers, variants, item specifics, drafts, SKUs, listing status, and related listing workflow records.</li>
          <li>eBay order sync data when you choose to use order management features, such as order identifiers, status, shipping/order details, and sync logs.</li>
        </ul>

        <h3 className="mb-3 mt-6 text-xl font-medium">Supplier page data processed by the extension</h3>
        <p className="leading-relaxed text-muted-foreground">
          When you use SellerSuit on supported supplier websites, the extension reads page content needed to build eBay listing assets, such as product names, prices, images, options, and product identifiers. Supported supplier surfaces currently include Amazon and Walmart pages used for supplier-to-eBay listing workflows.
        </p>

        <h3 className="mb-3 mt-6 text-xl font-medium">AI feature inputs and outputs</h3>
        <p className="leading-relaxed text-muted-foreground">
          If you use AI features, listing-related content you provide or scrape may be sent to our AI processors to generate titles, descriptions, image edits, or related listing content. AI outputs and credit usage may be stored in your account for feature delivery, abuse prevention, support, and billing/usage records.
        </p>

        <h3 className="mb-3 mt-6 text-xl font-medium">Payment and billing data</h3>
        <p className="leading-relaxed text-muted-foreground">
          Payments are processed by Stripe. We do not store full payment card numbers. We may store Stripe customer IDs, checkout session IDs, subscription IDs, invoice/payment status, plan, credits, and billing-event records.
        </p>

        <h3 className="mb-3 mt-6 text-xl font-medium">Technical, storage, and diagnostic data</h3>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Extension settings and local workflow state stored in Chrome storage or browser local storage, such as current product data, calculator settings, generated titles, sync queues, and local diagnostics.</li>
          <li>Server logs, request metadata, IP address, browser/device information, error logs, rate-limit records, and security/audit logs.</li>
          <li>Website analytics events if an analytics provider such as Google Analytics, Google Tag Manager, or Plausible is enabled on the website.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Why We Collect and Use Data</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>To provide the Chrome extension, dashboard, listing workflow, supplier scraping, SKU, pricing, image, order sync, and account features you request.</li>
          <li>To authenticate users, pair extension devices, enforce plan limits, deduct credits, and protect against misuse.</li>
          <li>To process payments, subscriptions, invoices, cancellations, refunds, and plan changes through Stripe.</li>
          <li>To provide AI-assisted listing features and show generated results back to you.</li>
          <li>To troubleshoot bugs, respond to support requests, secure the service, and improve reliability and performance.</li>
          <li>To comply with legal, tax, accounting, security, and fraud-prevention obligations.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. Sale of Data and Advertising</h2>
        <p className="leading-relaxed text-muted-foreground">
          We do not sell user data. We do not use extension data, supplier page content, eBay listing data, payment data, or AI inputs for personalized, retargeted, or interest-based advertising. SellerSuit does not inject ads into third-party websites.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Third-Party Processors</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">We use service providers only as needed to operate SellerSuit:</p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Supabase for database, authentication, Edge Functions, storage, logs, and backend infrastructure.</li>
          <li>Stripe for payment processing, subscriptions, invoices, billing portal, and payment records.</li>
          <li>OpenAI and/or Lovable AI gateway for AI generation features when you request them.</li>
          <li>Resend or similar email infrastructure for transactional emails.</li>
          <li>Google Apps Script only if you configure Google Sheets sync or related export features.</li>
          <li>Optional website analytics providers such as Google Analytics, Google Tag Manager, or Plausible if enabled on the website.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">6. Chrome Web Store Limited Use</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit uses Chrome extension user data only to provide or improve user-facing extension features. We do not sell extension data, use it for personalized advertising, or transfer it except as necessary to provide the service, comply with law, protect security, or with user consent where required. Humans do not read user data except for support with your consent, security and abuse investigation, legal compliance, or aggregated/anonymized internal operations.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">7. Data Retention</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Account, listing, usage, and billing records are retained while your account is active and as needed to provide the service.</li>
          <li>Local extension storage remains on your device until you clear it, uninstall the extension, log out, or the extension removes it during normal workflows.</li>
          <li>Security, audit, payment, tax, and legal records may be retained as required by law or legitimate security and accounting needs.</li>
          <li>Deleted account data is removed or anonymized within a reasonable period unless retention is legally required or needed for security, fraud prevention, dispute resolution, or payment records.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">8. Security</h2>
        <p className="leading-relaxed text-muted-foreground">
          We use HTTPS, access controls, role-based administrative access, service-side authorization checks, audit logs, and reasonable technical and organizational safeguards. No method of transmission or storage is completely secure, and you are responsible for keeping your account credentials safe.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">9. Your Rights and Choices</h2>
        <p className="leading-relaxed text-muted-foreground">
          Depending on your location, you may have rights to access, correct, export, object to processing, or delete personal data. To make a request, email support@sellersuit.com from the email address associated with your account. You may also uninstall the Chrome extension or clear browser/extension storage at any time.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">10. Children and Minors</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit is intended for business users and is not directed to children under 18. We do not knowingly collect personal information from children.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">11. Policy Updates</h2>
        <p className="leading-relaxed text-muted-foreground">
          We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the effective date when changes are material.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">12. Contact</h2>
        <p className="leading-relaxed text-muted-foreground">Email: support@sellersuit.com</p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
