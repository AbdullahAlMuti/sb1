import LegalPageLayout from "./LegalPageLayout";

const PermissionsDisclosure = () => {
  return (
    <LegalPageLayout
      title="Chrome Extension Permissions"
      description="This page explains the permissions requested by the SellerSuit Chrome extension and why they are needed."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Summary</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit requests permissions needed to read supported supplier product pages, help prepare eBay listings, sync selected account data with the SellerSuit dashboard, and store local workflow state. The extension should be used only for the eBay listing workflow described in the Chrome Web Store listing.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Chrome Permissions</h2>
        <div className="space-y-6 text-muted-foreground">
          <div>
            <h3 className="text-xl font-medium text-foreground">storage</h3>
            <p>Required. Lets SellerSuit save extension settings, authentication state, current product workflow data, generated title selections, sync queues, and local diagnostics. SellerSuit uses this to keep the side panel and content scripts working across pages and browser restarts. A narrower Chrome permission is not available for this storage need.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">scripting</h3>
            <p>Required. Lets SellerSuit run extension scripts on supported pages so the user can capture product data, open panels, paste listing content, and automate eBay listing steps. This is limited by host permissions and content-script matches.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">tabs</h3>
            <p>Required. Lets SellerSuit identify the active tab and coordinate side-panel, background, and content-script workflows. It may read tab URL/title for supported workflows but is not used to sell browsing history or create advertising profiles. A future review may determine whether activeTab can replace some uses.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">alarms</h3>
            <p>Required. Lets SellerSuit schedule extension-side background tasks such as periodic checks, sync retries, or queued workflow maintenance.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">sidePanel</h3>
            <p>Required. Lets SellerSuit show the Chrome side panel used for listing, pricing, image, and workflow controls.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">unlimitedStorage</h3>
            <p>Required for larger local workflow data such as product images, generated/edited image data, cached listing drafts, queues, and diagnostics. SellerSuit stores this data locally to support the listing workflow. Users can clear extension storage or uninstall the extension to remove local data.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Host Permissions</h2>
        <div className="space-y-6 text-muted-foreground">
          <div>
            <h3 className="text-xl font-medium text-foreground">eBay domains</h3>
            <p>Required for listing creation, eBay listing-page assistance, bulk edit workflows, listing success detection, and optional order sync. SellerSuit reads and acts only on supported eBay seller/listing/order pages needed for the eBay workflow.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">Amazon domains and Amazon image domains</h3>
            <p>Required for supplier product extraction and image processing on supported Amazon product pages. SellerSuit reads product titles, prices, images, variants, and identifiers needed to build eBay listing assets.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">Walmart domains and Walmart image domains</h3>
            <p>Required for supplier product extraction and image processing on supported Walmart product pages. SellerSuit reads product information needed to build eBay listing assets.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">sellersuit.com and SellerSuit subdomains</h3>
            <p>Required to connect the extension with the SellerSuit dashboard, transfer authenticated extension state, and allow dashboard-to-extension workflows.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">Supabase project domain</h3>
            <p>Required for the extension to call SellerSuit backend Edge Functions for authentication, configuration, listing, sync, and account features. The extension uses the public Supabase anon/publishable key and authenticated user tokens where required.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-foreground">script.google.com</h3>
            <p>Required only for Google Apps Script based sync/export features when configured by the user. If you do not use those features, SellerSuit does not need to send your data to Google Apps Script.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Remote Code and Narrowing Notes</h2>
        <p className="leading-relaxed text-muted-foreground">
          SellerSuit should not load or execute remote hosted JavaScript in the extension. The extension may call remote APIs to provide user-facing features. We periodically review host permissions and will narrow them when Chrome APIs and supported workflows allow.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PermissionsDisclosure;
