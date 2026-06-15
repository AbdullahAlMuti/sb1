import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";
import { track } from "@/lib/analytics";

const FAQ = () => {
  const { faq } = siteConfig;

  return (
    <section id="faq" className="scroll-mt-24 border-b border-border bg-secondary/35 py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{faq.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">{faq.heading}</h2>
        </Reveal>

        <Reveal className="mx-auto max-w-3xl rounded-2xl border border-border bg-card px-6 shadow-sm">
          <Accordion
            type="single"
            collapsible
            onValueChange={(value) => value && track("faq_open", { question: value })}
          >
            {faq.items.map((item, index) => (
              <AccordionItem key={item.q} value={`item-${index}`} className="last:border-b-0">
                <AccordionTrigger className="text-left text-base font-semibold text-foreground">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
};

export default FAQ;
