import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Switch } from "@repo/ui/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { type FieldDef, type FormValues } from "./types";

interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initialValues: FormValues;
  submitting?: boolean;
  onSubmit: (values: FormValues) => Promise<void> | void;
}

/** Generic, schema-driven create/edit form rendered from `FieldDef[]`. */
export function EntityFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues,
  submitting,
  onSubmit,
}: EntityFormDialogProps) {
  const [values, setValues] = useState<FormValues>(initialValues);

  useEffect(() => {
    if (open) setValues(initialValues);
  }, [open, initialValues]);

  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              {field.type !== "switch" && <Label htmlFor={field.name}>{field.label}</Label>}

              {(field.type === "text" || field.type === "number" || field.type === "datetime") && (
                <Input
                  id={field.name}
                  type={field.type === "datetime" ? "datetime-local" : field.type}
                  required={field.required}
                  placeholder={"placeholder" in field ? field.placeholder : undefined}
                  value={(values[field.name] as string | number | undefined) ?? ""}
                  onChange={(e) =>
                    set(field.name, field.type === "number" ? Number(e.target.value) || 0 : e.target.value)
                  }
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  id={field.name}
                  required={field.required}
                  rows={field.rows ?? 3}
                  placeholder={field.placeholder}
                  value={(values[field.name] as string | undefined) ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}

              {field.type === "select" && (
                <Select
                  value={(values[field.name] as string | undefined) ?? ""}
                  onValueChange={(v) => set(field.name, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "switch" && (
                <div className="flex items-center gap-2">
                  <Switch
                    id={field.name}
                    checked={Boolean(values[field.name])}
                    onCheckedChange={(c) => set(field.name, c)}
                  />
                  <Label htmlFor={field.name}>{field.label}</Label>
                </div>
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
