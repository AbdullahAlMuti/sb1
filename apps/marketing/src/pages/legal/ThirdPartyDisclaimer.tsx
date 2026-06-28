import LegalPageLayout from "./LegalPageLayout";

const ThirdPartyDisclaimer = () => {
  return (
    <LegalPageLayout
      title="Third-Party Services and Affiliation Disclaimer"
      description="SellerSuit works with third-party websites and processors, but it is an independent product."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">No Official Affiliation</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit is not affiliated with, endorsed by, sponsored by, or officially connected to eBay, Amazon, Walmart, Google, Chrome, Stripe, Supabase, OpenAI, Lovable, Resend, or any other third-party service unless a verified partnership is separately stated in writing by SellerSuit.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Trademarks</h2>
        <p className="leading-relaxed text-muted-foreground">
          All third-party names, logos, brands, and trademarks belong to their respective owners. References to third-party websites and services are for compatibility, integration, or descriptive purposes only.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Third-Party Terms</h2>
        <p className="leading-relaxed text-muted-foreground">
          Third-party websites and services have their own terms, privacy policies, seller rules, API rules, payment rules, and platform policies. You are responsible for reviewing and following those rules when using SellerSuit with third-party platforms.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">User Responsibility</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit provides tools to streamline workflows, but users remain responsible for their marketplace accounts, listings, pricing, product compliance, shipping promises, order handling, and third-party platform compliance.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default ThirdPartyDisclaimer;
