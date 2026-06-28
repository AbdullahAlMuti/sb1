import LegalPageLayout from "./LegalPageLayout";

const CookieAnalyticsPolicy = () => {
  return (
    <LegalPageLayout
      title="Cookie and Analytics Policy"
      description="This policy explains how SellerSuit uses cookies, browser storage, Chrome extension storage, analytics events, and similar technologies."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. Technologies We Use</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Cookies or browser storage used by authentication, security, preferences, and dashboard sessions.</li>
          <li>Chrome extension local and session storage used for settings, extension authentication, current product workflow state, generated listing content, image workflow data, sync queues, and diagnostics.</li>
          <li>Website analytics events if an analytics provider such as Google Analytics, Google Tag Manager, or Plausible is enabled.</li>
          <li>Stripe and Supabase technologies needed for checkout, billing, authentication, database, backend, and security operations.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Why We Use Them</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>To keep users logged in and connect the dashboard with the extension.</li>
          <li>To remember user preferences, plan state, calculator settings, and in-progress listing workflows.</li>
          <li>To operate checkout, billing, fraud prevention, rate limiting, and security controls.</li>
          <li>To understand high-level website usage and improve performance, navigation, and reliability.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Advertising</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not use Chrome extension data for personalized, retargeted, or interest-based advertising. SellerSuit does not inject ads into third-party websites.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. User Controls</h2>
        <p className="leading-relaxed text-muted-foreground">
          You can control cookies and local storage through your browser settings. You can clear extension storage by removing the extension or using Chrome's extension/site data controls. Some features may not work if required storage or cookies are blocked.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default CookieAnalyticsPolicy;
