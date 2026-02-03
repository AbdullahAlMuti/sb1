import { 
  Sparkles, 
  Image, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  Cpu,
  LucideIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "AI-Enhanced Titles",
    description: "Gemini-powered title generation that optimizes for eBay search algorithms and buyer psychology.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Image,
    title: "Smart Image Processing",
    description: "Auto watermarking, background removal, and high-resolution extraction from any Amazon listing.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: FileText,
    title: "One-Click Listing",
    description: "Opti-List fills every field automatically — SKU, pricing, item specifics, and HTML descriptions.",
    color: "bg-info/10 text-info",
  },
  {
    icon: ShoppingCart,
    title: "Auto-Order Engine",
    description: "State-machine checkout flow that handles address injection and stops safely at payment review.",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description: "Profit Pulse and Growth Velocity charts give you instant business health insights.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Cpu,
    title: "Chrome Extension",
    description: "Manifest V3 powered extension with content scripts that inject directly into Amazon & eBay.",
    color: "bg-primary/10 text-primary",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      
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
            Powerful Features
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Scale Your Business
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete automation toolkit designed for serious dropshippers who want to 
            eliminate manual work and maximize efficiency.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div 
          ref={ref}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className="group relative bg-card p-4 sm:p-6 rounded-2xl border border-border hover:border-primary/30 transition-all duration-300"
                variants={cardVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <motion.div 
                    className={`inline-flex p-3 rounded-xl ${feature.color} mb-4`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  
                  {/* Content */}
                  <h3 className="font-display text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
