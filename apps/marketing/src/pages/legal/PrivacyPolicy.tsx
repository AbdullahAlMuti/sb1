import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 px-4">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              SellerSuit ("SellerSuit", "we", "us") provides a web application at https://sellersuit.com and a Chrome extension that helps streamline listing workflows. This Privacy Policy explains what we collect, how we use it, and your choices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-3">2.1 Account Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address and account identifiers used for authentication and account management</li>
              <li>Plan/subscription and usage information (for example, credits usage)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Payment Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              Payments are processed by Stripe. We do not store full card numbers. Stripe may provide us billing and subscription metadata (for example, customer ID and subscription status).
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Extension &amp; Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you use the Chrome extension on supported sites (such as Amazon, Walmart, and eBay), the extension may process page information to provide features you request.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Product page information needed for listing workflows (such as titles, images, prices, and product identifiers)</li>
              <li>Extension settings and feature usage events (for example, sync interval preferences)</li>
              <li>Data you choose to export (for example, downloads or Google Sheets sync)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.4 Local Storage &amp; Extension Storage</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The website uses browser storage for session management via Supabase</li>
              <li>The extension uses Chrome storage to store settings and authentication tokens required to communicate with SellerSuit services</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.5 Automatically Collected Technical Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device and browser information</li>
              <li>IP address and diagnostic logs used for reliability and fraud/abuse prevention</li>
              <li>Cookies and similar technologies (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and operate the web app and Chrome extension features</li>
              <li>Authenticate users and maintain sessions</li>
              <li>Process subscriptions and billing status</li>
              <li>Sync data you request (for example, Google Sheets integrations)</li>
              <li>Improve performance, troubleshoot issues, and prevent abuse</li>
              <li>Respond to support requests and communicate service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We may share information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>With service providers</strong> that help us operate the Service (for example, Supabase and Stripe)</li>
              <li><strong>For legal reasons</strong> when required by law or to protect rights, safety, and security</li>
              <li><strong>Business transfers</strong> in connection with a merger, acquisition, or asset sale</li>
              <li><strong>With your consent</strong> for any other purpose you authorize</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain information as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use reasonable administrative, technical, and organizational safeguards. However, no method of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have rights to access, correct, delete, or export your data, and to object to certain processing.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              To make a request, contact us at support@sellersuit.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              SellerSuit is not intended for individuals under 18 and we do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">Email: support@sellersuit.com</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
