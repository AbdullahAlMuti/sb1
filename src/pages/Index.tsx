import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import illustration from "@/assets/card-illustration.png";
import { CheckCircle2, Sparkles } from "lucide-react";

const features = ["Clean tokens-first styling", "Single-page layout", "Ready for your content"]; 

const Index = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-accent/70 blur-3xl" />
        <div className="absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-secondary/70 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full overflow-hidden shadow-elevated">
          <div className="relative">
            <img
              src={illustration}
              alt="Abstract geometric illustration"
              loading="lazy"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-hero opacity-30" aria-hidden="true" />
          </div>

          <CardHeader className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-soft">
              <Sparkles className="size-4 text-primary" />
              One-page card
            </div>
            <CardTitle className="text-balance">A simple, polished card layout</CardTitle>
            <CardDescription className="text-pretty">
              Swap in your content, links, and actions—this is a clean starting point that already looks finished.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <ul className="grid gap-3 sm:grid-cols-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 rounded-md border bg-card px-3 py-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  <span className="text-sm text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border bg-accent/40 p-4 shadow-soft">
              <p className="text-sm text-muted-foreground">
                Tip: if you want this card to be a profile, product, or signup—tell me which, and I’ll tailor the
                content + components.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="hero" className="w-full sm:w-auto">
              Get started
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Learn more
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
};

export default Index;
