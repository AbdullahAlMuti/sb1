import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";
import { useSeo } from "@/lib/useSeo";

const SUPPORT_EMAIL = "contact@sellersuit.com";
// Bangladesh WhatsApp & direct number
const BD_PHONE_DISPLAY = "+880 1338-356197";
const BD_PHONE_LOCAL = "01338356197";
const BD_WHATSAPP_DIGITS = "8801338356197";

// USA phone number
const USA_PHONE_DISPLAY = "+1 (516) 951-7773";
const USA_PHONE_DIGITS = "+15169517773";

const FAQS = [
  {
    q: "How fast does SellerSuit support respond?",
    a: "For WhatsApp inquiries, our team typically responds within 15–30 minutes during active operating hours. For emails sent to contact@sellersuit.com, we reply within 24 hours (frequently under 2 hours).",
  },
  {
    q: "What should I include in my support message?",
    a: "To help us resolve your query swiftly, please provide your registered account email, relevant eBay listing or order IDs, screenshots of any issue, and your Chrome browser version.",
  },
  {
    q: "How do I resolve a billing or subscription inquiry?",
    a: "Email contact@sellersuit.com or message us directly on WhatsApp with your account email and billing invoice/receipt. Our finance team will inspect and adjust your account immediately.",
  },
  {
    q: "The Chrome extension isn't syncing—what are the recommended steps?",
    a: "Ensure you are logged into your SellerSuit dashboard on the same browser profile. Try toggling the extension off and on from chrome://extensions. If the problem persists, message us on WhatsApp with a screenshot of the developer console.",
  },
  {
    q: "Can I schedule a live onboarding or enterprise demo?",
    a: "Yes! Reach out via WhatsApp or call our USA line at +1 (516) 951-7773 to book a 1-on-1 walkthrough with a member of our product team.",
  },
] as const;

export default function Contact() {
  useSeo({
    title: "Contact Support & Inquiries | SellerSuit",
    description:
      "Get in touch with SellerSuit support via WhatsApp (+880 1338-356197), USA phone (+1 516-951-7773), or email (contact@sellersuit.com). Fast response guaranteed.",
    canonical: "https://www.sellersuit.com/contact",
  });

  const emailSubject = "SellerSuit Support Inquiry";
  const emailBody = "Hi SellerSuit Support,\n\nI need help with:\n";
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const whatsappMessage = "Hi SellerSuit Support, I need help with...";
  const whatsappUrl = `https://wa.me/${BD_WHATSAPP_DIGITS}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-6xl px-4 py-8">
          {/* Back Navigation */}
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 -ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>

          {/* Hero Header */}
          <header className="mb-12 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Support Channels Active Daily</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              We&apos;re here to help you scale
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Have questions about our eBay automation tools, billing, custom
              features, or Chrome extension setup? Reach our team directly
              through WhatsApp, email, or telephone.
            </p>
          </header>

          {/* Primary Contact Channels Grid */}
          <section className="grid gap-6 md:grid-cols-3 mb-16">
            {/* WhatsApp Card (Bangladesh & Global) */}
            <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.03] to-transparent shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Fastest
                  </span>
                </div>
                <CardTitle className="text-lg">WhatsApp Support</CardTitle>
                <CardDescription>
                  Real-time chat with our engineering & support team in
                  Bangladesh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <span>🇧🇩</span>
                    <a
                      href={`tel:${BD_PHONE_LOCAL}`}
                      className="hover:text-emerald-600 transition-colors"
                    >
                      {BD_PHONE_DISPLAY}
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Local BD dial: <span className="font-mono font-medium">{BD_PHONE_LOCAL}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    asChild
                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white shadow-sm font-medium gap-2"
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-auto" />
                    </a>
                  </Button>

                  <Button asChild variant="outline" size="sm" className="w-full text-xs">
                    <a href={`tel:${BD_PHONE_DISPLAY.replace(/[\s\-()]/g, "")}`}>
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      <span>Call {BD_PHONE_LOCAL}</span>
                    </a>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Typically replies in &lt; 30 minutes</span>
                </div>
              </CardContent>
            </Card>

            {/* Email Support Card */}
            <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-b from-orange-500/[0.03] to-transparent shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-11 w-11 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    Official
                  </span>
                </div>
                <CardTitle className="text-lg">Email Inquiries</CardTitle>
                <CardDescription>
                  For billing reviews, account inquiries, partnerships, and bug reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    <a
                      href={mailtoUrl}
                      className="hover:text-orange-600 transition-colors break-all"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Direct ticketing desk
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full font-medium gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-600"
                  >
                    <a href={mailtoUrl}>
                      <Mail className="h-4 w-4" />
                      <span>Send an Email</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-auto" />
                    </a>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>Replies within 24 hours guaranteed</span>
                </div>
              </CardContent>
            </Card>

            {/* USA Phone Card */}
            <Card className="relative overflow-hidden border-sky-500/20 bg-gradient-to-b from-sky-500/[0.03] to-transparent shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-11 w-11 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    USA Line
                  </span>
                </div>
                <CardTitle className="text-lg">USA Direct Line</CardTitle>
                <CardDescription>
                  Direct phone access for US sellers, enterprise clients, and partnerships.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <span>🇺🇸</span>
                    <a
                      href={`tel:${USA_PHONE_DIGITS}`}
                      className="hover:text-sky-600 transition-colors"
                    >
                      {USA_PHONE_DISPLAY}
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Direct voice line: Florida, USA
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full font-medium gap-2 border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-600"
                  >
                    <a href={`tel:${USA_PHONE_DIGITS}`}>
                      <Phone className="h-4 w-4" />
                      <span>Call {USA_PHONE_DISPLAY}</span>
                    </a>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Mon – Fri, 9:00 AM – 6:00 PM EST</span>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Corporate Offices / Physical Addresses */}
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Corporate Office Locations
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Our engineering, design, and operations are distributed across the
              United States and Bangladesh.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Bangladesh Office */}
              <Card className="border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50">
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇧🇩</span>
                      <div>
                        <CardTitle className="text-base font-bold">
                          Bangladesh Office
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          Operations & Engineering Hub
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Dhaka
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <span>
                      195, Fakirapool (2nd Floor), Motijheel, Dhaka-1000,
                      Bangladesh
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-foreground">
                      WhatsApp / Tel:
                    </span>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      {BD_PHONE_DISPLAY} ({BD_PHONE_LOCAL})
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="font-medium text-foreground">Email:</span>
                    <a
                      href={mailtoUrl}
                      className="hover:text-foreground transition-colors"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* USA Office */}
              <Card className="border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50">
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🇺🇸</span>
                      <div>
                        <CardTitle className="text-base font-bold">
                          USA Office
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          Global Headquarters & Client Services
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Deltona, Florida
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <span>
                      491 Fort Smith Blvd, Deltona, FL 32738, United States
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="font-medium text-foreground">Phone:</span>
                    <a
                      href={`tel:${USA_PHONE_DIGITS}`}
                      className="hover:text-foreground transition-colors font-medium text-foreground"
                    >
                      {USA_PHONE_DISPLAY}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="font-medium text-foreground">Email:</span>
                    <a
                      href={mailtoUrl}
                      className="hover:text-foreground transition-colors"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left font-medium text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
