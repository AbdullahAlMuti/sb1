import { forwardRef } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section ref={ref} className="bg-background py-20 sm:py-24">
      <div className="container px-4">
        <div className="grid gap-8 rounded-lg border border-border bg-card p-6 shadow-soft-lg sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Ready for a SaaS-grade workflow
            </p>
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Give every listing and order a clear next step.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Use SellerSuit as the operating layer across sourcing, listing creation,
              channel sync, order review, and plan-based usage.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button className="h-12 rounded-lg px-6" onClick={() => navigate(user ? "/dashboard" : "/register")}>
              {user ? "Open dashboard" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-12 rounded-lg px-6" onClick={() => navigate("/documentation")}>
              Read docs
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
