import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Chrome, CreditCard, LifeBuoy, Settings2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SUPPORT_EMAIL = "muti.sellersuit@gmail.com";
const SUPPORT_WHATSAPP = "+8801798008784";

export default function Documentation() {
  useEffect(() => {
    document.title = "Documentation | SellerSuit";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24">
        <div className="container max-w-5xl px-4 py-10">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">User Guide</p>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">SellerSuit Documentation</h1>
            <p className="text-muted-foreground max-w-2xl">
              Everything you need to install the extension, connect your account, and use SellerSuit day-to-day.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5 text-primary" />
                  Extension setup
                </CardTitle>
                <CardDescription>Install, connect, and confirm it’s working.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Download the extension ZIP from your dashboard (Extension page).</li>
                  <li>Extract the ZIP to a folder.</li>
                  <li>
                    In Chrome, open <span className="font-medium text-foreground">chrome://extensions</span> and enable Developer mode.
                  </li>
                  <li>Click <span className="font-medium text-foreground">Load unpacked</span> and select the extracted folder.</li>
                  <li>Pin the extension to your toolbar.</li>
                </ol>
                <p>
                  Tip: If the extension shows “Not Connected”, log in on <Link className="underline" to="/auth">/auth</Link> in the same
                  Chrome profile.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Dashboard basics
                </CardTitle>
                <CardDescription>Where to find your key tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-medium text-foreground">Listings</span>: manage your saved listings and sync status.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Orders</span> / <span className="font-medium text-foreground">eBay Orders</span>:
                    view order details and operational fields.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Alerts</span>: inventory/price alerts (when enabled).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Extension</span>: connection status + install help.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Billing & Usage</span>: credits, renewals, and plan status.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Billing, plans & policies
                </CardTitle>
                <CardDescription>How access, trials, and renewals work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  SellerSuit is a subscription-based service. To use platform features, you need an active Trial or paid plan.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-medium text-foreground">Trial</span>: a one-time $1 plan for 7 days (includes limited listings and credits).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Renewals/changes</span>: managed through the Stripe Customer Portal.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Expired plan</span>: access is locked until you renew or purchase a plan.
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/privacy-policy">Privacy Policy</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/terms-of-service">Terms of Service</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/refund">Refund Policy</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <section id="troubleshooting" className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-primary" />
                    Troubleshooting
                  </CardTitle>
                  <CardDescription>Quick fixes for the most common issues.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="not-working">
                      <AccordionTrigger>The extension menu/buttons aren’t working</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                          If you’re on a page that opens in a new route, make sure you’re not on an old cached build. Refresh the page.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Try closing and reopening the extension popup.</li>
                          <li>Log out and back in on the website, then refresh the popup.</li>
                          <li>Confirm you installed the latest ZIP (remove the old unpacked folder if needed).</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="not-connected">
                      <AccordionTrigger>Extension says “Not Connected”</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground space-y-2">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Make sure you’re logged in at <Link className="underline" to="/auth">/auth</Link>.</li>
                          <li>Use the same Chrome profile for the website and the extension.</li>
                          <li>Disable and re-enable the extension from chrome://extensions.</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="locked">
                      <AccordionTrigger>I’m seeing a payment/lockout screen</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground space-y-2">
                        <p>
                          This typically means your Trial ended or your subscription is inactive. Renew your plan to restore access.
                        </p>
                        <p>
                          If you believe this is a mistake, contact support:
                          <span className="ml-2 font-medium text-foreground">{SUPPORT_EMAIL}</span>
                          <span className="mx-2">•</span>
                          <span className="font-medium text-foreground">WhatsApp {SUPPORT_WHATSAPP}</span>
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          </div>

          <section className="mt-10">
            <Card>
              <CardHeader>
                <CardTitle>Need help?</CardTitle>
                <CardDescription>We typically reply within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("SellerSuit Support")}`}>Email support</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
