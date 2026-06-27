import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { cn } from "@repo/ui/lib/utils";

const MIN_REASON = 5;

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Human-readable impact echoed to the operator, e.g. "Grants 500 credits to alice@…". */
  impact?: string;
  confirmLabel?: string;
  destructive?: boolean;
  /** Require a typed reason (≥5 chars) before confirm is enabled. */
  reasonRequired?: boolean;
  /** Receives the typed reason (empty string when not required). */
  onConfirm: (reason: string) => Promise<void> | void;
}

/**
 * The single confirmation primitive for dangerous/override actions. When
 * `reasonRequired`, the confirm button stays disabled until a reason of at least
 * 5 characters is entered — that reason is passed to the audited RPC.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  confirmLabel = "Confirm",
  destructive = false,
  reasonRequired = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  const reasonOk = !reasonRequired || reason.trim().length >= MIN_REASON;

  const handleConfirm = async () => {
    if (!reasonOk || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {impact && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {impact}
          </div>
        )}

        {reasonRequired && (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">Reason (required, logged to audit)</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you doing this?"
              rows={2}
            />
            {!reasonOk && reason.length > 0 && (
              <p className="text-xs text-muted-foreground">At least {MIN_REASON} characters required.</p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={!reasonOk || submitting}
            className={cn(destructive && "bg-destructive hover:bg-destructive/90")}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
