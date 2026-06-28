import LegalPageLayout from "./LegalPageLayout";

const LimitedUseDisclosure = () => {
  return (
    <LegalPageLayout
      title="Chrome Web Store Limited Use Disclosure"
      description="This disclosure explains how SellerSuit uses Chrome extension data under the Chrome Web Store User Data Policy."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Limited Use Commitment</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit's use and transfer of information received from the Chrome extension complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">How Extension Data Is Used</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Extension data is used only to provide, maintain, secure, troubleshoot, or improve user-facing SellerSuit features.</li>
          <li>Supplier page content is processed to create eBay listing assets you request, such as titles, images, prices, variants, SKUs, descriptions, and draft listing data.</li>
          <li>Authentication and device data is used to connect the extension to your SellerSuit account and prevent unauthorized access.</li>
          <li>Usage and credit data is used to enforce plan limits, measure feature use, and support billing or abuse-prevention operations.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">No Sale or Advertising Use</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not sell extension data. SellerSuit does not use extension data for personalized, retargeted, or interest-based advertising. SellerSuit does not inject ads into third-party websites.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Limited Transfers</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not transfer extension data except when necessary to provide the service, process user-requested features, comply with law, protect users or service security, prevent abuse, or with user consent where required. Examples include Supabase for backend services, Stripe for billing, AI providers for user-requested AI generation, and Google Apps Script only if the user configures export/sync features.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Human Access</h2>
        <p className="leading-relaxed text-muted-foreground">
          Humans do not read user data except when necessary for support with user consent, security or abuse investigation, legal compliance, or aggregated/anonymized internal operations.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default LimitedUseDisclosure;
