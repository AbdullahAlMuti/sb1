import { useState, useEffect } from "react";
import { ArrowRight, Chrome, Star, Package, ShoppingCart, TrendingUp, Zap, Shield, BarChart3, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const featureTabs = [
  { id: 'listings', label: 'Smart Listings', icon: Package, description: 'AI-powered product listings that convert' },
  { id: 'orders', label: 'Auto Orders', icon: ShoppingCart, description: 'Automated order fulfillment from Amazon' },
  { id: 'analytics', label: 'Profit Tracker', icon: BarChart3, description: 'Real-time analytics and profit insights' },
];

const workflowSteps = [
  { label: "Find Product", sublabel: "Amazon" },
  { label: "AI Optimize", sublabel: "SellerSuit" },
  { label: "List & Sell", sublabel: "eBay" },
];

// Amazon Logo SVG
const AmazonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <path d="M29.2 35.3c-5.8 4.3-14.2 6.6-21.5 6.6-10.2 0-19.3-3.8-26.3-10.1-.5-.5-.1-1.2.6-.8 7.5 4.4 16.8 7 26.4 7 6.5 0 13.6-1.3 20.1-4.1 1-.4 1.8.7.7 1.4z" transform="translate(8, 5)" fill="#FF9900"/>
    <path d="M31.5 32.7c-.7-.9-4.9-.4-6.8-.2-.6.1-.7-.4-.1-.8 3.3-2.3 8.7-1.7 9.4-.9.6.8-.2 6.3-3.3 8.9-.5.4-1 .2-.8-.3.7-1.8 2.3-5.8 1.6-6.7z" transform="translate(8, 5)" fill="#FF9900"/>
    <path d="M24.8 5.6V3.3c0-.4.3-.6.6-.6h10.8c.4 0 .6.2.6.6v2c0 .3-.3.7-.8 1.4l-5.6 8c2.1 0 4.3.3 6.2 1.4.4.2.5.6.5 1v2.5c0 .4-.4.8-.8.6-3.5-1.8-8.1-2-12-.1-.4.2-.8-.2-.8-.6v-2.3c0-.4 0-1.1.4-1.8l6.5-9.3h-5.6c-.4 0-.6-.2-.6-.6z" transform="translate(8, 5)" fill="currentColor"/>
    <path d="M8.6 21.5h-3.3c-.3 0-.5-.2-.6-.5V3.4c0-.3.3-.6.6-.6h3.1c.3 0 .5.2.6.5v2.3h.1c.8-2.1 2.3-3.1 4.3-3.1 2.1 0 3.4 1 4.3 3.1.8-2.1 2.6-3.1 4.6-3.1 1.4 0 2.9.6 3.8 1.9 1 1.5.8 3.6.8 5.5v11.1c0 .3-.3.6-.6.6h-3.3c-.3 0-.6-.3-.6-.6V10.5c0-.7.1-2.5-.1-3.2-.3-1.2-1-1.5-2-1.5-.8 0-1.7.5-2 1.4-.3.9-.3 2.4-.3 3.3v10.4c0 .3-.3.6-.6.6h-3.3c-.3 0-.6-.3-.6-.6V10.5c0-1.9.3-4.7-2.1-4.7s-2.4 2.7-2.4 4.7v10.4c0 .3-.3.6-.6.6z" transform="translate(8, 5)" fill="currentColor"/>
  </svg>
);

// eBay Logo SVG
const EbayLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" className="font-bold" style={{ fontSize: '22px' }}>
      <tspan fill="#E53238">e</tspan>
      <tspan fill="#0064D2">b</tspan>
      <tspan fill="#F5AF02">a</tspan>
      <tspan fill="#86B817">y</tspan>
    </text>
  </svg>
);

// SellerSuit Logo
import SellerSuitLogo from "@/components/SellerSuitLogo";

const SellerSuitIcon = ({ className, active }: { className?: string; active?: boolean }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <Zap className={cn("w-8 h-8 md:w-10 md:h-10", active ? "text-primary-foreground" : "text-primary")} />
  </div>
);

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');
  const [activeStep, setActiveStep] = useState(0);

  // Animate through workflow steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleStartAutomating = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleGetExtension = () => {
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-5xl mx-auto">
          {/* Trust Badge */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">#1 eBay Dropshipping Extension</span>
              <div className="flex items-center gap-0.5 ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                ))}
              </div>
              <span className="text-muted-foreground text-sm ml-1">4.9/5</span>
            </div>
          </motion.div>

          {/* Main headline */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 text-foreground">
              Scale Your eBay Store
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                With One Click
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p 
            className="text-center text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            SellerSuit is the all-in-one Chrome extension that automates product sourcing, 
            intelligent listings, and order fulfillment — so you can focus on growing.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-16 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button 
              onClick={handleStartAutomating}
              className="h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Start Now for Free
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
            </Button>
            <Button 
              onClick={handleGetExtension}
              variant="outline"
              className="h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto bg-background hover:bg-secondary border-border text-foreground font-semibold text-sm sm:text-base rounded-xl"
            >
              <Chrome className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              Get Free Extension
            </Button>
          </motion.div>

          {/* Animated Workflow Demo - No Card */}
          <motion.div 
            className="relative max-w-3xl mx-auto mb-8 sm:mb-16 py-6 sm:py-12"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Decorative gradient background */}
            <div className="absolute inset-0 -inset-x-8 md:-inset-x-16 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/8 to-primary/5" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
              {/* Subtle dot pattern */}
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.15) 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }}
              />
              {/* Glowing orbs */}
              <motion.div 
                className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-accent/10 blur-2xl"
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.1, 0.9, 1.1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            {/* Workflow Steps */}
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-0">
              {workflowSteps.map((step, index) => (
                <div key={index} className="flex items-center">
                  {/* Step Box */}
                  <div className="flex flex-col items-center">
                    <motion.div 
                      className={cn(
                        "relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-500",
                        activeStep === index 
                          ? "bg-primary shadow-lg shadow-primary/30"
                          : activeStep > index 
                            ? "bg-success/10 border-2 border-success"
                            : "bg-background border-2 border-border"
                      )}
                      animate={activeStep === index ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.8, repeat: activeStep === index ? Infinity : 0, repeatDelay: 0.5 }}
                    >
                      {activeStep > index ? (
                        <Check className="w-8 h-8 md:w-10 md:h-10 text-success" strokeWidth={2.5} />
                      ) : index === 0 ? (
                        // Amazon Logo
                        <svg viewBox="0 0 64 64" className="w-12 h-12 md:w-14 md:h-14">
                          <path 
                            d="M52 42c-4 3-10 5-18 5s-14-2-18-5c-.5-.4-.3-1 .3-.7 4 2.5 10 4 17.7 4 6 0 12.5-1.2 17.3-3.8.8-.4 1.2.5.7 1.5z" 
                            className={cn(activeStep === index ? "fill-primary-foreground" : "fill-warning")}
                          />
                          <path 
                            d="M54 40c-.5-.6-3-.3-4.2-.1-.3 0-.4-.3-.1-.5 2-1.4 5.3-1 5.7-.5.4.5-.1 4-2 5.6-.3.2-.6.1-.4-.2.4-1.1 1.5-3.7 1-4.3z" 
                            className={cn(activeStep === index ? "fill-primary-foreground" : "fill-warning")}
                          />
                          <text x="32" y="30" textAnchor="middle" dominantBaseline="middle" className={cn("font-bold", activeStep === index ? "fill-primary-foreground" : "fill-foreground")} style={{ fontSize: '14px' }}>
                            amazon
                          </text>
                        </svg>
                      ) : index === 1 ? (
                        // SellerSuit Logo
                        <Zap className={cn(
                          "w-8 h-8 md:w-10 md:h-10",
                          activeStep === index ? "text-primary-foreground" : "text-primary"
                        )} />
                      ) : (
                        // eBay Logo
                        <svg viewBox="0 0 64 64" className="w-12 h-12 md:w-14 md:h-14">
                          <text x="32" y="34" textAnchor="middle" dominantBaseline="middle" className="font-bold" style={{ fontSize: '18px' }}>
                            <tspan fill={activeStep === index ? "#fff" : "#E53238"}>e</tspan>
                            <tspan fill={activeStep === index ? "#fff" : "#0064D2"}>B</tspan>
                            <tspan fill={activeStep === index ? "#fff" : "#F5AF02"}>a</tspan>
                            <tspan fill={activeStep === index ? "#fff" : "#86B817"}>y</tspan>
                          </text>
                        </svg>
                      )}
                      
                      {/* Small arrow indicator on completed steps */}
                      {activeStep > index && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      className="mt-3 text-center"
                      animate={{ opacity: activeStep >= index ? 1 : 0.6 }}
                    >
                      <p className={cn(
                        "font-semibold text-sm md:text-base",
                        activeStep === index ? "text-primary" : "text-foreground"
                      )}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.sublabel}</p>
                    </motion.div>
                  </div>

                  {/* Connecting Line with Arrow */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden sm:flex items-center mx-2 sm:mx-4 md:mx-8 -mt-10">
                      <motion.div 
                        className={cn(
                          "w-16 md:w-24 h-0.5 rounded-full transition-colors duration-500",
                          activeStep > index ? "bg-success" : "bg-border"
                        )}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 + index * 0.2 }}
                        style={{ transformOrigin: "left" }}
                      />
                      <motion.div 
                        className={cn(
                          "w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent transition-colors duration-500",
                          activeStep > index ? "border-l-success" : "border-l-border"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.8 + index * 0.2 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Status message */}
            <div className="mt-10 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border shadow-sm"
                >
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-success"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {activeStep === 0 && "Extracting product data from Amazon..."}
                    {activeStep === 1 && "AI optimizing title & calculating price..."}
                    {activeStep === 2 && "Publishing listing to eBay!"}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Feature Tabs */}
          <motion.div 
            className="max-w-xl mx-auto text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-secondary border border-border">
              {featureTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all",
                      isActive 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.p 
                key={activeTab}
                className="mt-4 text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {featureTabs.find(t => t.id === activeTab)?.description}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Trust indicators */}
          <motion.div 
            className="mt-8 sm:mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-muted-foreground px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              <span className="text-sm">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="text-sm">10x Faster Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-success" />
              <span className="text-sm">AI-Powered</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
