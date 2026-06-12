import { ArrowRight, CheckCircle2, Database, FilePlus2, RefreshCcw, Truck } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: FilePlus2,
    title: "Capture",
    description: "Save product, image, supplier, and marketplace context into one listing record.",
  },
  {
    step: "02",
    icon: Database,
    title: "Normalize",
    description: "Store structured data in Supabase so the dashboard, extension, and sync jobs agree.",
  },
  {
    step: "03",
    icon: RefreshCcw,
    title: "Sync",
    description: "Push listing and order changes through backend functions instead of fragile UI scraping.",
  },
  {
    step: "04",
    icon: Truck,
    title: "Operate",
    description: "Review orders, supplier costs, tracking, alerts, and exports from a unified workspace.",
  },
];

const WorkflowSection = () => {
  return (
    <section id="workflow" className="border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <div className="mb-12 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Workflow</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              From browser action to managed operation.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            This structure keeps your eBay and extension flows fast and reliable, with room to add
            new sales channels later without a rewrite.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="relative rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {step.step}
                  </span>
                  {index < steps.length - 1 ? (
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </div>
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
