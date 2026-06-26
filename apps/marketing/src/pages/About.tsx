import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";

const SUPPORT_EMAIL = "muti.sellersuit@gmail.com";

export default function About() {
  useEffect(() => {
    document.title = "About | SellerSuit";
  }, []);

  return (
    <div className="pt-24 flex-1">
      <div className="container max-w-4xl py-12 px-4">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-2">About SellerSuit</h1>
          <p className="text-muted-foreground">
            SellerSuit is a web app + Chrome extension built to streamline e-commerce workflows—especially dropshipping automation from
            Amazon to eBay.
          </p>
        </header>

        <main className="space-y-6">
          <section>
            <Card>
              <CardHeader>
                <CardTitle>What we do</CardTitle>
                <CardDescription>Tools to help you move faster, reduce manual work, and stay on top of listings and orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-muted-foreground">
                <p>
                  SellerSuit helps streamline listing workflows and related operations. The platform focuses on practical automation and
                  integrations to make repetitive tasks easier.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Listing workflows and automation support</li>
                  <li>eBay order visibility and operational tooling</li>
                  <li>Inventory and price monitoring to reduce risk</li>
                  <li>Optional exports and syncing (for example, Google Sheets)</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Where it works</CardTitle>
                <CardDescription>SellerSuit is designed around common marketplace workflows.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  Our Chrome extension operates on supported sites (including Amazon, Walmart, and eBay) to process page information you
                  request for listing workflows.
                </p>
                <p>
                  Note: SellerSuit is not affiliated with or endorsed by third-party platforms. You are responsible for complying with each
                  platform’s terms.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Support</CardTitle>
                <CardDescription>Need help? We’re here.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p>
                  For product questions, troubleshooting, or billing support, contact us at:
                  <span className="ml-2 font-medium text-foreground">{SUPPORT_EMAIL}</span>
                </p>
                <p>We typically reply within 24 hours.</p>
                <div>
                  <Button asChild variant="outline">
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("SellerSuit Support")}`}>Email Support</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Company address</CardTitle>
                <CardDescription>Mailing address</CardDescription>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">ALMUTI LLC</span>
                  <br />
                  254 Chapman Rd
                  <br />
                  Newark, Delaware, New York, United States
                </address>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
