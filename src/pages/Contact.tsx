import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

const SUPPORT_EMAIL = "muti.sellersuit@gmail.com";
// Normalized to digits-only for buildWhatsAppLink validator
const WHATSAPP_NUMBER = "8801798008784";

export default function Contact() {
  useEffect(() => {
    document.title = "Contact | SellerSuit";
  }, []);

  const subject = "SellerSuit Support";
  const body = "Hi SellerSuit Support,\n\nI need help with...";
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 px-4">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Contact</h1>
          <p className="text-muted-foreground">
            Need help with SellerSuit? Reach us by email or WhatsApp. We typically reply within 24 hours.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email support
              </CardTitle>
              <CardDescription>
                Send us a message and include any relevant order ID / listing ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Email:</span> {SUPPORT_EMAIL}
              </p>
              <Button asChild className="w-full" variant="outline">
                <a href={mailto}>
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>Chat with support in WhatsApp (opens in a new tab).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If WhatsApp doesn’t open, confirm you have WhatsApp installed or use WhatsApp Web.
              </p>
              <div className="flex">
                <WhatsAppButton
                  phone_number={WHATSAPP_NUMBER}
                  size="lg"
                  message="Hi SellerSuit Support, I need help with..."
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
