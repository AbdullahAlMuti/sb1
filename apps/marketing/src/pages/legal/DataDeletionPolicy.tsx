import LegalPageLayout from "./LegalPageLayout";

const DataDeletionPolicy = () => {
  return (
    <LegalPageLayout
      title="Data Deletion Policy"
      description="This page explains how SellerSuit users can request deletion of account, extension, listing, and billing-related data."
    >
      <section>
        <h2 className="mb-4 text-2xl font-semibold">1. How to Request Deletion</h2>
        <p className="leading-relaxed text-muted-foreground">
          Email support@sellersuit.com from the email address associated with your SellerSuit account and include the subject "Data Deletion Request". We may need to verify your identity before processing the request.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">2. Data We Delete</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Account profile data where deletion is legally and technically permitted.</li>
          <li>SellerSuit listing drafts, product workflow records, extension sync records, AI generation history, usage records, and dashboard data associated with your account where no retention requirement applies.</li>
          <li>Extension device/session records stored on SellerSuit systems.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">3. Data That May Be Retained</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Some information may be retained where required or reasonably necessary for:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Payment, tax, accounting, refund, chargeback, and subscription records.</li>
          <li>Security, fraud prevention, abuse investigation, and audit logs.</li>
          <li>Legal compliance, dispute resolution, and enforcement of our terms.</li>
          <li>Backups until they expire through normal backup rotation.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">4. Local Extension Data</h2>
        <p className="leading-relaxed text-muted-foreground">
          Some workflow data may be stored locally in Chrome storage or browser local storage. You can remove local data by logging out, clearing browser/extension storage, or uninstalling the SellerSuit extension.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">5. Processing Time</h2>
        <p className="leading-relaxed text-muted-foreground">
          We aim to respond to deletion requests within 30 days, unless a shorter or longer period is required or allowed by applicable law.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default DataDeletionPolicy;
