import { useState } from "react";
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
  HelpCircle,
  CheckSquare,
  Square
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { toast } from "sonner";

interface StepOption {
  id: string;
  label: string;
}

const salesChannels = [
  { id: "ebay", label: "eBay", logo: "/logos/ebay.ico", fallbackColor: "text-blue-600" },
  { id: "amazon", label: "Amazon", logo: "/logos/amazon.ico", fallbackColor: "text-orange-500" },
  { id: "shopify", label: "Shopify", logo: "/logos/shopify.ico", fallbackColor: "text-green-600" },
  { id: "other", label: "Other", fallbackColor: "text-slate-500" },
];

const accomplishments: StepOption[] = [
  { id: "niches", label: "Find profitable products and niches" },
  { id: "trends", label: "Find hot trends - before they take off" },
  { id: "competitors", label: "Gather insight on other Competitors" },
  { id: "listings", label: "List products to eBay faster" },
  { id: "suppliers", label: "Source products from Amazon or Walmart" },
  { id: "pricing", label: "Automate pricing and profit margins" },
  { id: "vero", label: "Get alerts, Identify Trademark items" },
  { id: "sellers", label: "Find Top-selling items and sellers" },
];

export function OnboardingStepper() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Questionnaire State
  const [startedSelling, setStartedSelling] = useState<boolean | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedAccomplishments, setSelectedAccomplishments] = useState<string[]>([]);

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

      toast.success("Onboarding completed successfully!");
      await refreshProfile();
      // Redirect directly to billing
      navigate("/billing", { replace: true });
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err);
      toast.error(err.message || "An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-6 md:p-8 flex flex-col items-center">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 select-none">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                  step === s
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-110"
                    : step > s
                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 transition-all duration-300 mx-1",
                    step > s ? "bg-emerald-300 dark:bg-emerald-800" : "bg-slate-200 dark:bg-slate-800"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Back Button */}
        {step > 1 && (
          <button
            onClick={handleBack}
            className="self-start flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors mb-6 -mt-2 focus:outline-none rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back</span>
          </button>
        )}

        {/* Step Content */}
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full text-center space-y-8"
              >
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white flex justify-center items-center gap-2">
                    📈
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Have you already Started Selling?
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Let us know if you have an active seller account listed on eBay or any other marketplace right now.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Button
                    onClick={() => {
                      setStartedSelling(true);
                      setStep(2);
                    }}
                    variant="outline"
                    className={cn(
                      "w-full h-14 text-base font-semibold border-2 rounded-xl transition-all duration-200",
                      startedSelling === true
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-200 hover:border-slate-400 dark:border-slate-800"
                    )}
                  >
                    Yes, I am selling
                  </Button>
                  <Button
                    onClick={() => {
                      setStartedSelling(false);
                      setStep(2);
                    }}
                    variant="outline"
                    className={cn(
                      "w-full h-14 text-base font-semibold border-2 rounded-xl transition-all duration-200",
                      startedSelling === false
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-200 hover:border-slate-400 dark:border-slate-800"
                    )}
                  >
                    No, I am new
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full text-center space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white flex justify-center items-center gap-2">
                    🧐
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    What is your sales channel?
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Select the platforms you currently sell on or intend to start selling on (select all that apply).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  {salesChannels.map((channel) => {
                    const isSelected = selectedChannels.includes(channel.id);
                    return (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className={cn(
                          "h-24 border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 relative group focus:outline-none",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"
                            : "border-slate-200 hover:border-slate-400 dark:border-slate-800"
                        )}
                      >
                        {channel.logo ? (
                          <img src={channel.logo} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <Globe className="w-8 h-8 text-slate-400" />
                        )}
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {channel.label}
                        </span>
                        
                        <div className={cn(
                          "absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition-all",
                          isSelected 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "border-slate-300 group-hover:border-slate-400 dark:border-slate-700"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 max-w-md mx-auto">
                  <Button
                    onClick={handleNext}
                    disabled={selectedChannels.length === 0}
                    className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold rounded-lg flex items-center justify-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full text-center space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white flex justify-center items-center gap-2">
                    😃
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    What would you like to accomplish with SellerSuit?
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Select your goals so we can customize your workspace experience (select all that apply).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
                  {accomplishments.map((item) => {
                    const isSelected = selectedAccomplishments.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleAccomplishment(item.id)}
                        className={cn(
                          "w-full p-4 border rounded-xl flex items-center gap-3 text-left transition-all duration-150 focus:outline-none group",
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-900 dark:text-white"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 group-hover:text-slate-500 dark:text-slate-600 shrink-0" />
                        )}
                        <span className="text-sm font-medium leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 max-w-md mx-auto">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
