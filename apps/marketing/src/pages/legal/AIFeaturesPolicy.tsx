import LegalPageLayout from "./LegalPageLayout";

const AIFeaturesPolicy = () => {
  return (
    <LegalPageLayout
      title="AI Features Policy"
      description="This policy explains how SellerSuit AI-assisted listing features work and what users should review before publishing."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. AI Feature Scope</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit may provide AI-assisted eBay listing features such as title generation, description generation, image editing, background removal, and related listing-content suggestions.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Content Sent to AI Providers</h2>
        <p className="leading-relaxed text-muted-foreground">
          When you request AI features, SellerSuit may send listing-related content to AI providers, such as product titles, descriptions, item specifics, images or image URLs, product attributes, supplier page context, user instructions, and selected settings. Do not submit sensitive information that is not needed for the listing workflow.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Third-Party AI Providers</h2>
        <p className="leading-relaxed text-muted-foreground">
          AI features may use OpenAI and/or the Lovable AI gateway. These providers process submitted content to return the AI output requested by the user. AI processing may be subject to the provider's own terms and policies.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. User Review Required</h2>
        <p className="leading-relaxed text-muted-foreground">
          AI output is not guaranteed to be accurate, complete, compliant, non-infringing, or optimized. You must review and edit AI-generated titles, descriptions, item specifics, prices, images, and listing content before publishing or relying on them.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Storage and Retention</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit may store AI requests, outputs, usage metadata, and credit records as needed to provide features, enforce plan limits, troubleshoot issues, prevent abuse, and maintain billing/usage records. See the Privacy Policy and Data Deletion Policy for more information.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default AIFeaturesPolicy;
