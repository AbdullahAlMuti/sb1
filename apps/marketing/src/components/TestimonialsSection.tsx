import { Quote, Star, CheckCircle } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

const TestimonialsSection = () => {
  const { testimonials } = siteConfig;

  return (
    <section id="testimonials" className="scroll-mt-24 border-b border-border bg-hero-gradient py-20 sm:py-24 relative overflow-hidden">
      {/* Background radial highlight */}
      <div aria-hidden className="pointer-events-none absolute -right-48 bottom-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="container relative px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{testimonials.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl text-balance">
            {testimonials.heading}
          </h2>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.items.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              as="article"
              delay={index * 0.08}
              className="flex flex-col rounded-2xl border border-border bg-card/65 backdrop-blur-md p-6 shadow-soft-sm hover:shadow-soft-xl hover:scale-[1.01] hover:border-primary/20 transition-all duration-300"
            >
              <div className="mb-4 flex items-center justify-between">
                <Quote className="h-5 w-5 text-primary opacity-60" />
                {testimonial.stat && (
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-success shadow-sm">
                    {testimonial.stat}
                  </span>
                )}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-foreground italic">"{testimonial.quote}"</p>
              
              <div className="mt-6 flex items-center gap-3 border-t border-border/40 pt-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold shadow-sm">
                  {testimonial.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                    {testimonial.name}
                    <span className="inline-flex items-center gap-0.5 rounded bg-success/15 px-1 py-0.2 text-[8px] font-extrabold text-success select-none shrink-0">
                      <CheckCircle className="h-2 w-2" />
                      Verified
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{testimonial.role}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
