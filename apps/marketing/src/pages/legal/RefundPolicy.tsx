import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

const RefundPolicy = () => {
  return (
    <div className="pt-24 flex-1">
      <div className="container max-w-4xl py-12 px-4">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              At SellerSuit, we strive to provide the best dropshipping automation tools. We understand that sometimes a service may not meet your expectations, which is why we offer a clear and fair refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Money-Back Guarantee</h2>
            <p className="text-muted-foreground leading-relaxed">
              We offer a <strong>14-day money-back guarantee</strong> for new subscribers. If you are not satisfied with our service within the first 14 days of your initial subscription, you may request a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Eligibility for Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To be eligible for a refund, you must meet the following criteria:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Request must be made within 14 days of your initial subscription date</li>
              <li>This is your first subscription to SellerSuit</li>
              <li>You have not previously received a refund from us</li>
              <li>Your account has not been terminated for Terms of Service violations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The following are not eligible for refunds:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscription renewals after the initial 14-day period</li>
              <li>Additional credits or add-on purchases</li>
              <li>Accounts terminated for policy violations</li>
              <li>Partial month usage after the guarantee period</li>
              <li>Annual subscriptions after 14 days (pro-rata refunds may be considered on a case-by-case basis)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To request a refund, please follow these steps:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Email us at <strong>support@sellersuit.com</strong> with the subject line "Refund Request"</li>
              <li>Include your account email address and the reason for your refund request</li>
              <li>Our team will review your request within 2-3 business days</li>
              <li>If approved, the refund will be processed to your original payment method</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Refund Processing Time</h2>
            <p className="text-muted-foreground leading-relaxed">
              Once approved, refunds are typically processed within 5-10 business days. The time it takes for the refund to appear in your account depends on your payment provider and financial institution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Subscription Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. You will retain access to the service until the end of your paid period, but no refund will be issued for the remaining time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Chargebacks</h2>
            <p className="text-muted-foreground leading-relaxed">
              We encourage you to contact us directly before initiating a chargeback with your bank or credit card company. Chargebacks incur significant fees and may result in immediate account termination. We're always willing to work with you to resolve any issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Special Circumstances</h2>
            <p className="text-muted-foreground leading-relaxed">
              We understand that exceptional circumstances may arise. If you have a unique situation not covered by this policy, please contact our support team. We will review your case individually and work to find a fair resolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated revision date. Your continued use of the service after changes constitutes acceptance of the new policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Refund Policy or need to request a refund, please contact us:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: support@sellersuit.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
