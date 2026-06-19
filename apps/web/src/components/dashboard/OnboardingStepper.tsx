import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  TrendingUp, 
  Zap, 
  Target, 
  Activity, 
  Globe, 
  ShieldAlert, 
  Search, 
  Layers, 
  Cpu, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { toast } from "sonner";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

interface StepOption {
  id: string;
  label: string;
  description: string;
  icon: any;
}

const salesChannels = [
  { id: "ebay", label: "eBay Store", description: "Primary integration", logo: "/logos/ebay.ico", active: true },
  { id: "amazon", label: "Amazon Sourcing", description: "Sourcing integration", logo: "/logos/amazon.ico", active: true },
  { id: "walmart", label: "Walmart Supplier", description: "Supplier integration", logo: "/logos/walmart.ico", active: true },
  { id: "aliexpress", label: "AliExpress Dropship", description: "Wholesale integration", logo: "/logos/aliexpress.ico", active: true },
  { id: "shopify", label: "Shopify Store", description: "Shopify store sync", logo: "/logos/shopify.ico", active: SHOPIFY_ENABLED },
].filter(c => c.active);

const accomplishments: StepOption[] = [
  { id: "niches", label: "Find the most profitable products", description: "", icon: TrendingUp },
  { id: "trends", label: "Find hot trends - before they take off", description: "", icon: Zap },
  { id: "competitors", label: "Gather insight on other Competitors", description: "", icon: Target },
  { id: "listings", label: "Optimize eBay & Amazon listings", description: "", icon: Activity },
  { id: "suppliers", label: "Automate sourcing & supplier stocks", description: "", icon: Globe },
  { id: "vero", label: "Identify trademark & VERO items", description: "", icon: ShieldAlert },
];

export function OnboardingStepper() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Questionnaire State
  const [startedSelling, setStartedSelling] = useState<boolean | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["ebay"]);
  const [selectedAccomplishments, setSelectedAccomplishments] = useState<string[]>(["niches", "listings", "vero"]);

  // Simulated setup step states
  const [initStepIdx, setInitStepIdx] = useState(0);
  const initSteps = [
    "Establishing secure SSL connection to eBay API...",
    "Creating custom dropshipping database tables...",
    "Caching VERO compliance catalog...",
    "Configuring pricing mapping layers...",
    "Finalizing dashboard settings..."
  ];

  useEffect(() => {
    if (step !== 4) return;

    const interval = setInterval(() => {
      setInitStepIdx((prev) => {
        if (prev >= initSteps.length) {
          clearInterval(interval);
          handleSubmit();
          return prev;
        }
        return prev + 1;
      });
    }, 850);

    return () => clearInterval(interval);
  }, [step]);

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAccomplishment = (id: string) => {
    setSelectedAccomplishments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1 && startedSelling !== null) {
      setStep(2);
    } else if (step === 2 && selectedChannels.length > 0) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const startInitialization = () => {
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_status: "completed",
          settings: {
            onboarding_answers: {
              started_selling: startedSelling,
              sales_channels: selectedChannels,
              accomplish_goals: selectedAccomplishments,
            },
          },
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Workspace initialized successfully!");
      await refreshProfile();
      navigate("/choose-plan", { replace: true });
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err);
      toast.error(err.message || "An error occurred during onboarding.");
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-8 md:p-10 flex flex-col justify-between min-h-[490px]">
        
        {/* ─── TOP STATUS & PROGRESS BAR INDICATOR ─── */}
        <div className="w-full space-y-4 mb-6">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 select-none">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Layers className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-display font-bold text-slate-950 dark:text-white text-base">SellerSuit Setup</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-semibold font-sans text-xs">
              Step {step} of 4: {
                step === 1 ? "Experience" :
                step === 2 ? "Integrations" :
                step === 3 ? "Goal Mapping" : "Environment Deploy"
              }
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* ─── MAIN CONTENT CONTAINER ─── */}
        <div className="flex-1 flex flex-col justify-center relative">
          
          {/* Back button (Only visible in middle steps) */}
          {step > 1 && step < 4 && (
            <button
              onClick={handleBack}
              className="absolute -top-6 left-0 flex items-center gap-2 text-slate-400 hover:text-slate-850 dark:hover:text-white transition-colors duration-200 focus:outline-none text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <div className="w-full flex-1 flex flex-col justify-center py-2">
            <AnimatePresence mode="wait">
              
              {/* Step 1: Experience */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-center">
                    <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                      What is your e-commerce status?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      We optimize your workspace environment based on your current setup.
                    </p>
                  </div>

                  <div className="space-y-3.5 max-w-md mx-auto w-full">
                    {[
                      { 
                        id: "pro", 
                        val: true,
                        title: "Active Professional Seller", 
                        desc: "I have stores and want repricing, order sync & VERO tools.",
                        icon: Cpu
                      },
                      { 
                        id: "new", 
                        val: false,
                        title: "Starting a New Store", 
                        desc: "I am new and want product sourcing & competitor research.",
                        icon: Sparkles
                      },
                      { 
                        id: "explore", 
                        val: false,
                        title: "Explore Features First", 
                        desc: "I want to explore metrics and settings before connecting.",
                        icon: Search
                      }
                    ].map((option) => {
                      const isSelected = startedSelling === option.val;
                      return (
                        <button
                          key={option.id}
                          onClick={() => {
                            setStartedSelling(option.val);
                            setStep(2);
                          }}
                          className={cn(
                            "w-full text-left p-4.5 border rounded-2xl transition-all duration-200 relative flex gap-4 items-start focus:outline-none",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5 shadow-sm text-emerald-950 dark:text-emerald-400"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isSelected 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          )}>
                            <option.icon className="w-5 h-5 stroke-[2]" />
                          </div>
                          <div className="space-y-1 pr-8">
                            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                              {option.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                              {option.desc}
                            </p>
                          </div>
                          <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                            isSelected 
                              ? "border-emerald-500 bg-emerald-500 text-white" 
                              : "border-slate-300 dark:border-slate-700"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Sales Channels */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-center">
                    <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                      Select channels & suppliers
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Select platforms you currently operate or want to source from.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-md mx-auto w-full">
                    {salesChannels.map((channel) => {
                      const isSelected = selectedChannels.includes(channel.id);
                      return (
                        <button
                          key={channel.id}
                          onClick={() => toggleChannel(channel.id)}
                          className={cn(
                            "p-3.5 border rounded-2xl text-left flex items-center justify-between gap-3 h-[64px] transition-all duration-200 relative focus:outline-none",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5 shadow-sm text-emerald-950 dark:text-emerald-400"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-750 dark:text-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-850 p-1.5 shrink-0">
                              {channel.logo ? (
                                <img src={channel.logo} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Globe className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <span className="text-xs font-bold tracking-tight leading-tight block">
                              {channel.label}
                            </span>
                          </div>

                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0",
                            isSelected 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button
                      onClick={handleNext}
                      disabled={selectedChannels.length === 0}
                      className="w-56 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold rounded-full flex items-center justify-center gap-2 group text-sm font-sans shadow-md"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Goals */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-center">
                    <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                      What would you like to accomplish with SellerSuit?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Help us configure your starting modules.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                    {accomplishments.map((item) => {
                      const isSelected = selectedAccomplishments.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleAccomplishment(item.id)}
                          className={cn(
                            "w-full px-5 py-4 border rounded-2xl flex items-center justify-between text-left transition-all duration-200 focus:outline-none relative group",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5 text-emerald-950 dark:text-emerald-400"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-355 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-750 dark:text-slate-300"
                          )}
                        >
                          <span className="text-xs font-bold leading-snug block">
                            {item.label}
                          </span>

                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ml-3.5",
                            isSelected 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button
                      onClick={startInitialization}
                      disabled={selectedAccomplishments.length === 0}
                      className="w-56 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold rounded-full flex items-center justify-center gap-2 group text-sm font-sans shadow-md"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Simulated Secure Workspace Initialization */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 w-full"
                >
                  <div className="space-y-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(16,185,129,0.1)] animate-pulse">
                      <Cpu className="w-7 h-7 text-emerald-400 stroke-[2]" />
                    </div>
                    <div className="space-y-0.5">
                      <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                        Deploying Secure Vault
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Setting up security tokens and VERO compliance catalog.
                      </p>
                    </div>
                  </div>

                  {/* Progress Logs */}
                  <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800/80 font-mono text-xs space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-2 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Status</span>
                      <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 border border-slate-850 font-bold">SECURE SSL</span>
                    </div>

                    <div className="space-y-2.5">
                      {initSteps.map((log, index) => {
                        const isDone = initStepIdx > index;
                        const isLoading = initStepIdx === index;
                        return (
                          <div key={index} className="flex gap-2.5 items-center justify-between leading-none">
                            <div className="flex gap-2.5 items-center overflow-hidden">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : isLoading ? (
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-900 shrink-0" />
                              )}
                              <span className={cn(
                                "truncate",
                                isDone ? "text-slate-450" : isLoading ? "text-emerald-400 font-medium" : "text-slate-700"
                              )}>
                                {log}
                              </span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded shrink-0",
                              isDone ? "text-emerald-400 bg-emerald-500/10" : isLoading ? "text-amber-400 bg-amber-500/10" : "text-slate-900"
                            )}>
                              {isDone ? "OK" : isLoading ? "LOAD" : "WAIT"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
