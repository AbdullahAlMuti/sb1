import { forwardRef, useRef } from "react";
import { Star, Quote } from "lucide-react";
import { motion, useInView } from "framer-motion";

const testimonials = [
  {
    name: "Michael Chen",
    role: "Full-Time Dropshipper",
    avatar: "MC",
    content: "SellerSuit cut my listing time by 90%. What used to take me hours now happens in minutes. The auto-order feature is a game changer.",
    rating: 5,
  },
  {
    name: "Sarah Williams",
    role: "eBay PowerSeller",
    avatar: "SW",
    content: "Finally, an automation tool that actually works with eBay's complex forms. The item specifics filler alone is worth the subscription.",
    rating: 5,
  },
  {
    name: "David Rodriguez",
    role: "E-commerce Agency Owner",
    avatar: "DR",
    content: "We manage 50+ client stores. SellerSuit's dashboard gives us the visibility we need, and the AI titles consistently outperform manual ones.",
    rating: 5,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

const TestimonialsSection = forwardRef<HTMLElement>((_, ref) => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-secondary/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative z-10 px-4">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Trusted by Sellers
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Who Scale Fast
            </span>
          </h2>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div 
          ref={containerRef}
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-card p-6 rounded-2xl border border-border relative group hover:shadow-lg transition-shadow duration-300"
              variants={cardVariants}
              whileHover={{ y: -5 }}
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <Star className="w-4 h-4 fill-warning text-warning" />
                  </motion.div>
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/90 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

TestimonialsSection.displayName = "TestimonialsSection";

export default TestimonialsSection;
