import { forwardRef } from "react";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Michael Chen",
    role: "Marketplace seller",
    avatar: "MC",
    content: "The dashboard finally makes listing work measurable. I can see what is synced, what needs action, and where margin is moving.",
  },
  {
    name: "Sarah Williams",
    role: "eBay operator",
    avatar: "SW",
    content: "SellerSuit reduced the repetitive listing prep that used to slow us down. The cleaner workflow matters more than another spreadsheet.",
  },
  {
    name: "David Rodriguez",
    role: "E-commerce agency",
    avatar: "DR",
    content: "The value is having extension data, orders, usage, and client operations in the same SaaS surface.",
  },
];

const TestimonialsSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} id="testimonials" className="border-b border-border bg-secondary/35 py-20 sm:py-24">
      <div className="container px-4">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Customers</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Built for sellers who run repeatable operations.
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <Quote className="mb-5 h-6 w-6 text-primary" />
              <p className="min-h-[120px] text-sm leading-6 text-foreground">"{testimonial.content}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-sm font-semibold text-foreground">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});

TestimonialsSection.displayName = "TestimonialsSection";

export default TestimonialsSection;
