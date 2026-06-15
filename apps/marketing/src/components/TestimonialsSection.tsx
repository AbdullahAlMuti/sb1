import { Quote, Star } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

const TestimonialsSection = () => {
  const { testimonials } = siteConfig;

  return (
    <section id="testimonials" className="scroll-mt-24 border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{testimonials.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {testimonials.heading}
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.items.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              as="article"
              delay={index * 0.08}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <Quote className="h-6 w-6 text-primary" />
                {testimonial.stat && (
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    {testimonial.stat}
                  </span>
                )}
              </div>
              <p className="flex-1 text-sm leading-6 text-foreground">"{testimonial.quote}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                  {testimonial.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
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
