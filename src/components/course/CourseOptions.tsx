import { useId, useMemo, useState } from "react";
import { CheckCircle, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CourseOptionId = "starter" | "pro" | "mentor";

export type CourseOption = {
  id: CourseOptionId;
  label: string;
  description: string;
  highlights: string[];
  badge?: string;
  locked?: boolean;
};

export function CourseOptions({
  options,
  value,
  onChange,
  onPrimaryAction,
  primaryActionLabel,
  isPrimaryActionLoading,
  error,
}: {
  options: CourseOption[];
  value: CourseOptionId | null;
  onChange: (id: CourseOptionId) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  isPrimaryActionLoading?: boolean;
  error?: string | null;
}) {
  const groupId = useId();
  const [activeId, setActiveId] = useState<CourseOptionId | null>(value);

  const selected = useMemo(
    () => options.find((o) => o.id === (value ?? activeId)) ?? null,
    [activeId, options, value],
  );

  const onSelect = (id: CourseOptionId) => {
    const option = options.find((o) => o.id === id);
    if (option?.locked) return;
    setActiveId(id);
    onChange(id);
  };

  return (
    <section aria-label="Course options" className="space-y-6">
      <header className="space-y-2 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          Choose your course option
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select one option to see exactly what happens next, then enroll when you’re ready.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="grid gap-4 md:grid-cols-3"
      >
        <span id={groupId} className="sr-only">
          Course option selection
        </span>
        {options.map((o) => {
          const isSelected = (value ?? activeId) === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={o.locked || undefined}
              onClick={() => onSelect(o.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(o.id);
                }
              }}
              className={cn(
                "relative text-left rounded-3xl border bg-card p-6 shadow-sm transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                o.locked
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:shadow-lg hover:border-primary/30",
                isSelected && "border-primary/50 shadow-lg",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-foreground">{o.label}</span>
                    {o.badge && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                        {o.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{o.description}</p>
                </div>

                <div className="shrink-0">
                  {o.locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Locked
                    </span>
                  ) : isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Selected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      Select
                    </span>
                  )}
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                {o.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border bg-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Next step</p>
            <p className="text-foreground font-semibold">
              {selected
                ? `You selected “${selected.label}”. Click enroll to continue.`
                : "Select an option above to enable enrollment."}
            </p>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You can change your selection anytime—nothing is saved until you enroll.
              </p>
            )}
          </div>

          <Button
            size="lg"
            onClick={onPrimaryAction}
            disabled={!selected || isPrimaryActionLoading}
            aria-disabled={!selected || isPrimaryActionLoading}
            className="h-14 px-10 rounded-2xl"
          >
            {isPrimaryActionLoading ? "Preparing…" : primaryActionLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
