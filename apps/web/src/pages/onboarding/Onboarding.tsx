import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Globe, Package, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { cn } from "@repo/ui/lib/utils";
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";

const STEPS = [
  { id: "workspace", label: "Your workspace" },
  { id: "usecase", label: "Use case" },
  { id: "marketplace", label: "Marketplace" },
  { id: "supplier", label: "Supplier" },
  { id: "done", label: "All set" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const USE_CASES = [
  { value: "amazon_to_ebay", label: "Amazon → eBay", description: "Source from Amazon, sell on eBay" },
  { value: "walmart_to_ebay", label: "Walmart → eBay", description: "Source from Walmart, sell on eBay" },
  { value: "multi_supplier", label: "Multi-supplier", description: "Mix of suppliers" },
];

const MARKETPLACES = [
  { value: "ebay_us", label: "eBay US", flag: "🇺🇸" },
  { value: "ebay_uk", label: "eBay UK", flag: "🇬🇧" },
  { value: "ebay_ca", label: "eBay CA", flag: "🇨🇦" },
  { value: "ebay_au", label: "eBay AU", flag: "🇦🇺" },
];

const SUPPLIERS = [
  { value: "amazon", label: "Amazon" },
  { value: "walmart", label: "Walmart" },
  { value: "both", label: "Both" },
];

interface OnboardingData {
  workspace_name: string;
  use_case: string;
  marketplace: string;
  supplier: string;
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "border-2 border-primary bg-background text-primary"
                    : "border-2 border-border bg-background text-muted-foreground",
              )}
            >
              {i < currentStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-12 sm:w-16 transition-colors",
                  i < currentStep ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Step {Math.min(currentStep + 1, STEPS.length)} of {STEPS.length}
      </p>
    </div>
  );
}

function OptionCard({
  label,
  description,
  extra,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  extra?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card hover:border-muted-foreground/40 text-foreground",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary" : "border-border",
        )}
      >
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </div>
      <div>
        <div className="font-medium">
          {extra && <span className="mr-1.5">{extra}</span>}
          {label}
        </div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    workspace_name: profile?.full_name?.split(" ")[0] ? `${profile.full_name.split(" ")[0]}'s Store` : "",
    use_case: "",
    marketplace: "ebay_us",
    supplier: "",
  });

  const currentStep = STEPS[stepIndex].id as StepId;

  const canAdvance = (): boolean => {
    if (currentStep === "workspace") return data.workspace_name.trim().length > 0;
    if (currentStep === "usecase") return data.use_case.length > 0;
    if (currentStep === "marketplace") return data.marketplace.length > 0;
    if (currentStep === "supplier") return data.supplier.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (stepIndex < STEPS.length - 2) {
      setStepIndex(s => s + 1);
      return;
    }

    // Last real step → save and show done screen
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: data.workspace_name || profile?.full_name,
          onboarding_completed: true,
          settings: {
            ...(profile?.settings ?? {}),
            onboarding: {
              use_case: data.use_case,
              marketplace: data.marketplace,
              supplier: data.supplier,
            },
          },
        })
        .eq("id", user!.id);

      await refreshProfile();
      setStepIndex(STEPS.length - 1);
    } catch {
      // Non-fatal — still show done screen; user can complete later
      setStepIndex(STEPS.length - 1);
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => navigate("/dashboard", { replace: true });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2 justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="font-bold text-sm text-primary-foreground">S</span>
          </div>
          <span className="font-display font-semibold text-foreground">SellerSuit</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <ProgressBar currentStep={stepIndex} />

          {/* Step: workspace */}
          {currentStep === "workspace" && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h1 className="font-display text-xl font-bold text-foreground">Name your workspace</h1>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                This is how your store appears inside SellerSuit.
              </p>
              <Input
                value={data.workspace_name}
                onChange={e => setData(d => ({ ...d, workspace_name: e.target.value }))}
                placeholder="e.g. My eBay Store"
                className="h-11"
                autoFocus
              />
            </div>
          )}

          {/* Step: use case */}
          {currentStep === "usecase" && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <h1 className="font-display text-xl font-bold text-foreground">What's your main workflow?</h1>
              </div>
              <div className="space-y-3">
                {USE_CASES.map(uc => (
                  <OptionCard
                    key={uc.value}
                    label={uc.label}
                    description={uc.description}
                    selected={data.use_case === uc.value}
                    onClick={() => setData(d => ({ ...d, use_case: uc.value }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step: marketplace */}
          {currentStep === "marketplace" && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Globe className="h-6 w-6 text-primary" />
                <h1 className="font-display text-xl font-bold text-foreground">Primary eBay marketplace?</h1>
              </div>
              <div className="space-y-3">
                {MARKETPLACES.map(m => (
                  <OptionCard
                    key={m.value}
                    label={m.label}
                    extra={m.flag}
                    selected={data.marketplace === m.value}
                    onClick={() => setData(d => ({ ...d, marketplace: m.value }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step: supplier */}
          {currentStep === "supplier" && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <h1 className="font-display text-xl font-bold text-foreground">Which supplier will you use?</h1>
              </div>
              <div className="space-y-3">
                {SUPPLIERS.map(s => (
                  <OptionCard
                    key={s.value}
                    label={s.label}
                    selected={data.supplier === s.value}
                    onClick={() => setData(d => ({ ...d, supplier: s.value }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step: done */}
          {currentStep === "done" && (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">You're all set!</h1>
              <p className="text-muted-foreground mb-8">
                {data.workspace_name
                  ? `${data.workspace_name} is ready to go.`
                  : "Your workspace is ready."}
                {" "}Head to your dashboard to start listing.
              </p>
              <Button className="h-11 w-full" onClick={goToDashboard}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          {currentStep !== "done" && (
            <div className="mt-8 flex items-center justify-between">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex(s => s - 1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              <Button
                className="h-10 min-w-[120px]"
                disabled={!canAdvance() || saving}
                onClick={handleNext}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : stepIndex === STEPS.length - 2 ? (
                  <>Finish <ArrowRight className="ml-1.5 h-4 w-4" /></>
                ) : (
                  <>Next <ArrowRight className="ml-1.5 h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <button
            type="button"
            onClick={goToDashboard}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
