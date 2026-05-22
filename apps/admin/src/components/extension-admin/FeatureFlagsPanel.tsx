import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Switch } from "@repo/ui/components/ui/switch";
import { Input } from "@repo/ui/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@repo/api-client/supabase/client";

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    flagKey: string;
    targetValue: boolean;
    requireTyping: string;
    typedWord: string;
  } | null>(null);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("extension-admin-feature-flags");
      if (error) throw error;
      if (data.success) {
        setFlags(data.data);
        setWarning(data.warning);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const requestToggle = (key: string, currentValue: boolean) => {
    const targetValue = !currentValue;
    let requireTyping = "";

    if (key === "extension_new_auth_enabled" && targetValue === true) {
      requireTyping = "ENABLE NEW AUTH";
    } else if (key === "extension_legacy_fallback_enabled" && targetValue === false) {
      requireTyping = "DISABLE LEGACY FALLBACK";
    }

    setConfirmDialog({
      open: true,
      flagKey: key,
      targetValue,
      requireTyping,
      typedWord: "",
    });
  };

  const handleUpdate = async () => {
    if (!confirmDialog) return;
    
    // Optimistic UI
    const previousFlags = [...flags];
    setFlags(flags.map(f => f.key === confirmDialog.flagKey ? { ...f, enabled: confirmDialog.targetValue } : f));
    setConfirmDialog(null);

    try {
      const { data, error } = await supabase.functions.invoke("extension-admin-update-feature-flag", {
        body: {
          key: confirmDialog.flagKey,
          enabled: confirmDialog.targetValue,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      toast.success(`Feature flag ${confirmDialog.flagKey} updated`);
      fetchFlags();
    } catch (err: any) {
      toast.error(err.message || "Failed to update feature flag");
      // Rollback optimistic update
      setFlags(previousFlags);
    }
  };

  if (loading && flags.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {warning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              {warning}
              <div className="mt-2 font-mono text-xs bg-red-950/20 p-2 rounded">
                SAFE ROLLBACK STATE:<br/>
                extension_new_auth_enabled = false<br/>
                extension_legacy_fallback_enabled = true
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {flags.map((flag) => (
            <Card key={flag.key} className={flag.key === "extension_new_auth_enabled" ? "border-purple-500/50 shadow-sm" : ""}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-mono break-all">{flag.key}</CardTitle>
                  <CardDescription className="mt-1">{flag.description || "No description provided"}</CardDescription>
                </div>
                <Switch 
                  checked={flag.enabled} 
                  onCheckedChange={() => requestToggle(flag.key, flag.enabled)} 
                  className={flag.key === "extension_new_auth_enabled" && flag.enabled ? "data-[state=checked]:bg-purple-500" : ""}
                />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>Rollout: <Badge variant="outline" className="ml-1">{flag.rolloutPercentage}%</Badge></div>
                  <div>Updated: {flag.updatedAt ? format(new Date(flag.updatedAt), "MMM d, HH:mm") : "Never"}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirm Feature Flag Change
            </DialogTitle>
            <DialogDescription className="pt-2">
              You are about to change <span className="font-mono text-foreground font-medium">{confirmDialog?.flagKey}</span> from{" "}
              <Badge variant="outline">{confirmDialog?.targetValue ? "false" : "true"}</Badge> to{" "}
              <Badge variant={confirmDialog?.targetValue ? "default" : "destructive"}>{confirmDialog?.targetValue ? "true" : "false"}</Badge>.
              <br/><br/>
              This can affect extension authentication for users. All changes are written to the secure audit log.
            </DialogDescription>
          </DialogHeader>

          {confirmDialog?.requireTyping && (
            <div className="space-y-3 py-4">
              <p className="text-sm font-medium">
                Please type <span className="font-mono text-destructive select-all">{confirmDialog.requireTyping}</span> to confirm.
              </p>
              <Input
                value={confirmDialog.typedWord}
                onChange={(e) => setConfirmDialog({ ...confirmDialog, typedWord: e.target.value })}
                placeholder={confirmDialog.requireTyping}
                className="font-mono"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant={confirmDialog?.targetValue ? "default" : "destructive"}
              onClick={handleUpdate}
              disabled={!!confirmDialog?.requireTyping && confirmDialog.typedWord !== confirmDialog.requireTyping}
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
