import LegalPageLayout from "./LegalPageLayout";

const SecurityPolicy = () => {
  return (
    <LegalPageLayout
      title="Security Policy"
      description="This page summarizes SellerSuit security practices and how to report vulnerabilities."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. Secure Transmission</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit uses HTTPS for the website, dashboard, backend APIs, and extension-to-backend communication. Users should not share passwords, authentication tokens, or billing information through insecure channels.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Access Control</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit uses account authentication, extension session controls, server-side authorization checks, role-based admin access, and audit logging for sensitive operations. Employee or contractor access is limited to personnel who need access for support, security, legal compliance, or service operations.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Payments</h2>
        <p className="leading-relaxed text-muted-foreground">
          Payment processing is handled by Stripe. SellerSuit does not store full card numbers. Billing records such as customer IDs, subscription IDs, invoices, and payment status may be stored for account management and compliance.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. Vulnerability Reporting</h2>
        <p className="leading-relaxed text-muted-foreground">
          To report a vulnerability, email support@sellersuit.com with enough detail for us to reproduce and investigate the issue. Do not publicly disclose vulnerabilities, access data that is not yours, disrupt service, exfiltrate data, or test payment/authentication systems in a way that harms users or third parties.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Responsible Handling</h2>
        <p className="leading-relaxed text-muted-foreground">
          Do not send public screenshots, logs, or reports containing authentication tokens, payment data, personal data, or marketplace account data. We may request additional information through a secure support process.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default SecurityPolicy;
