import { forwardRef } from "react";
import { ArrowRight, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div className="container px-4">
        <motion.div 
          className="relative max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl" />
          
          {/* Animated particles */}
          <motion.div
            className="absolute top-10 left-10 w-4 h-4 rounded-full bg-primary/30"
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-3 h-3 rounded-full bg-accent/40"
            animate={{ 
              y: [0, 15, 0],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
          
          {/* Content card */}
          <div className="relative bg-card p-8 sm:p-12 md:p-16 rounded-3xl border border-border shadow-xl">
            <motion.div 
              className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6"
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Zap className="w-8 h-8 text-primary" />
            </motion.div>
            
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
              Ready to Automate Your
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Dropshipping Empire?
              </span>
            </h2>
            
            <p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-10">
              Join thousands of sellers who have eliminated manual work and scaled 
              their businesses with SellerSuit.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleGetStarted}
                  className="h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base rounded-xl shadow-lg shadow-primary/25"
                >
                  <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  Start Your Free Trial
                  <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  className="h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto bg-background hover:bg-secondary border-border text-foreground font-semibold text-sm sm:text-base rounded-xl"
                >
                  Schedule Demo
                </Button>
              </motion.div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
