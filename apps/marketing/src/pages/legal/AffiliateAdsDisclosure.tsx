import LegalPageLayout from "./LegalPageLayout";

const AffiliateAdsDisclosure = () => {
  return (
    <LegalPageLayout
      title="No Ads or Affiliate Injection Disclosure"
      description="SellerSuit does not inject ads or affiliate codes into third-party websites."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">No Ads</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not show third-party ads inside the Chrome extension, dashboard, or supported third-party websites.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">No Affiliate Injection</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit does not inject affiliate links, affiliate codes, cashback links, coupon codes, or monetized referral links into eBay, Amazon, Walmart, or other supported websites. SellerSuit does not replace existing affiliate codes or change affiliate cookies for users.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">SellerSuit Marketing Links</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit may use normal marketing links to its own website, Chrome Web Store listing, checkout, or help pages. These are not injected into third-party marketplace pages as affiliate or advertising replacements.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default AffiliateAdsDisclosure;
