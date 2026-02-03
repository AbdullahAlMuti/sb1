import { Search, Zap, Package, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Discover & Extract",
    description: "Browse Amazon and let SellerSuit's injector automatically scrape product data, images, and specifications.",
    color: "bg-warning/20 text-warning border-warning/30",
    accentColor: "from-warning/20 to-warning/5",
  },
  {
    step: "02",
    icon: Zap,
    title: "AI Processing",
    description: "Titles are optimized with Gemini AI, images are watermarked, and pricing is calculated with your markup rules.",
    color: "bg-primary/20 text-primary border-primary/30",
    accentColor: "from-primary/20 to-primary/5",
  },
  {
    step: "03",
    icon: Package,
    title: "Auto-List on eBay",
    description: "One click to Opti-List — all fields are filled automatically including item specifics and HTML descriptions.",
    color: "bg-info/20 text-info border-info/30",
    accentColor: "from-info/20 to-info/5",
  },
  {
    step: "04",
    icon: CheckCircle,
    title: "Fulfill Orders",
    description: "When orders come in, the auto-order engine handles checkout on Amazon with buyer address injection.",
    color: "bg-success/20 text-success border-success/30",
    accentColor: "from-success/20 to-success/5",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

const WorkflowSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 relative overflow-hidden bg-secondary/30">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            End-to-End Automation
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              In Four Simple Steps
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From product discovery to order fulfillment, every step is streamlined and automated.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div 
          ref={ref}
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div 
                key={index} 
                className="relative"
                variants={itemVariants}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-24 w-0.5 h-12 bg-gradient-to-b from-border to-transparent hidden md:block" />
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 group">
                  {/* Step number & icon */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center gap-3 sm:gap-0">
                    <motion.div 
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative border-2 ${step.color}`}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </motion.div>
                    <div className="sm:text-center sm:mt-2">
                      <span className="text-xs font-bold text-muted-foreground">{step.step}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <motion.div 
                    className={`flex-1 p-4 sm:p-6 rounded-2xl bg-card border border-border relative overflow-hidden group-hover:shadow-lg transition-shadow duration-300`}
                    whileHover={{ y: -2 }}
                  >
                    {/* Gradient accent */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default WorkflowSection;
