import LegalPageLayout from "./LegalPageLayout";

const RefundPolicy = () => {
  return (
    <LegalPageLayout
      title="Refund and Cancellation Policy"
      description="This policy applies to SellerSuit paid plans, trials, subscriptions, credits, and other paid features."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. Subscription Billing</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit subscriptions and paid trials are processed by Stripe. Unless stated otherwise at checkout, subscriptions renew automatically at the selected billing interval until canceled. Prices are shown before purchase and may vary by plan, promotion, billing interval, or region.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Cancellation</h2>
        <p className="leading-relaxed text-muted-foreground">
          You may cancel your subscription through the billing portal in your account or by contacting support@sellersuit.com. Cancellation stops future renewal charges. You will generally keep access until the end of the current paid billing period unless your account is terminated for misuse or policy violations.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Refund Eligibility</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>New subscribers may request a refund within 14 days of the first paid subscription charge.</li>
          <li>Refund requests must be sent to support@sellersuit.com from the account email and include the reason for the request.</li>
          <li>Approved refunds are returned to the original payment method through Stripe.</li>
          <li>Refund eligibility may be denied for accounts terminated for abuse, fraud, policy violations, excessive use, or chargeback misuse.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. Non-Refundable Items</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Subscription renewals after the initial refund window.</li>
          <li>One-time credits, add-ons, or consumed usage credits unless required by law.</li>
          <li>Partial billing periods after cancellation.</li>
          <li>Marketplace fees, third-party charges, payment processor fees, or costs paid outside SellerSuit.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Failed Payments</h2>
        <p className="leading-relaxed text-muted-foreground">
          If a payment fails, Stripe or SellerSuit may retry the charge, request an updated payment method, limit paid features, pause credit-consuming actions, or cancel the subscription after a grace period.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">6. Plan Changes</h2>
        <p className="leading-relaxed text-muted-foreground">
          Upgrades, downgrades, and plan changes may affect billing, credits, usage limits, and feature access. Any proration, credit, or immediate charge will be shown through Stripe or the billing flow when applicable.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">7. Processing Time</h2>
        <p className="leading-relaxed text-muted-foreground">
          We review refund requests within a reasonable period, typically 2 to 3 business days. If approved, bank or card processing may take additional time depending on the payment method and financial institution.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">8. Contact</h2>
        <p className="leading-relaxed text-muted-foreground">Email: support@sellersuit.com</p>
      </section>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
