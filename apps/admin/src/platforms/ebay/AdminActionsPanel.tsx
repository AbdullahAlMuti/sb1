import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/components/ui/dialog';
import { Settings2, RefreshCw, XCircle, FilePlus, Loader2 } from 'lucide-react';

interface AdminActionsPanelProps {
  userId: string;
}

export function AdminActionsPanel({ userId }: AdminActionsPanelProps) {
  const queryClient = useQueryClient();

  const handleSuccess = (msg: string) => {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: ['ebay-admin-user-audit', userId] });
    queryClient.invalidateQueries({ queryKey: ['ebay-admin-audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['ebay-user-support-timeline', userId] });
  };

  const handleError = (error: any) => {
    toast.error(error.message || "Action failed");
  };

  // Mutators
  const clearErrorMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await (supabase as any).rpc('clear_user_sync_error', { p_user_id: userId, p_reason: reason });
      if (error) throw error; return data;
    },
    onSuccess: () => handleSuccess("Sync errors cleared"),
    onError: handleError
  });

  const resetSyncMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await (supabase as any).rpc('reset_user_sync_state', { p_user_id: userId, p_reason: reason });
      if (error) throw error; return data;
    },
    onSuccess: () => handleSuccess("Sync state reset to idle"),
    onError: handleError
  });

  const requestResyncMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await (supabase as any).rpc('request_user_manual_resync', { p_user_id: userId, p_reason: reason });
      if (error) throw error; return data;
    },
    onSuccess: () => handleSuccess("Manual resync requested"),
    onError: handleError
  });

  const supportNoteMutation = useMutation({
    mutationFn: async ({ note, status }: { note: string, status: string }) => {
      const { data, error } = await (supabase as any).rpc('add_admin_support_note', { p_user_id: userId, p_note: note, p_status: status });
      if (error) throw error; return data;
    },
    onSuccess: () => handleSuccess("Support note added"),
    onError: handleError
  });

  return (
    <Card className="border-blue-200 bg-blue-50/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-blue-800">
          <Settings2 className="h-4 w-4" />
          Advanced Admin Actions
        </CardTitle>
        <CardDescription>
          Operational tools to resolve support issues. All actions require a reason and are permanently audited.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          
          <ActionDialog 
            title="Clear Sync Error" 
            desc="Mark active sync errors as resolved. This does not delete the error history, just removes the stuck state."
            btnLabel="Clear Sync Error"
            icon={<XCircle className="h-4 w-4 mr-2" />}
            variant="outline"
            onSubmit={(r) => clearErrorMutation.mutate(r)}
            isLoading={clearErrorMutation.isPending}
          />

          <ActionDialog 
            title="Reset Sync State" 
            desc="Force the sync state back to 'idle'. Does NOT delete orders. Use if extension is stuck syncing."
            btnLabel="Reset Sync State"
            icon={<RefreshCw className="h-4 w-4 mr-2" />}
            variant="outline"
            onSubmit={(r) => resetSyncMutation.mutate(r)}
            isLoading={resetSyncMutation.isPending}
          />

          <ActionDialog 
            title="Request Manual Resync" 
            desc="Signal the user's extension to trigger a full resync on their next session."
            btnLabel="Request Resync"
            icon={<RefreshCw className="h-4 w-4 mr-2" />}
            variant="outline"
            onSubmit={(r) => requestResyncMutation.mutate(r)}
            isLoading={requestResyncMutation.isPending}
          />

          <SupportNoteDialog 
            onSubmit={(note, status) => supportNoteMutation.mutate({note, status})}
            isLoading={supportNoteMutation.isPending}
          />

        </div>
      </CardContent>
    </Card>
  );
}

// Sub-components for dialogs
function ActionDialog({ title, desc, btnLabel, icon, variant, onSubmit, isLoading }: any) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return toast.error("Reason required");
    onSubmit(reason);
    setOpen(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="w-full justify-start">{icon} {btnLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label>Audit Reason (Required)</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you taking this action?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!reason.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupportNoteDialog({ onSubmit, isLoading }: any) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("open");

  const handleSubmit = () => {
    if (!note.trim()) return toast.error("Note required");
    onSubmit(note, status);
    setOpen(false);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start"><FilePlus className="h-4 w-4 mr-2" /> Add Support Note</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Support Note</DialogTitle>
          <DialogDescription>Internal note visible only to admins.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open / Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note (Required)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Details..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!note.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
