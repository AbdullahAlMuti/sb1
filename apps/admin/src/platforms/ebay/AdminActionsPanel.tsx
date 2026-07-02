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

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

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
    <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
          <Settings2 style={{ width: 16, height: 16, color: sb.primary }} />
          Advanced Admin Actions
        </CardTitle>
        <CardDescription style={{ fontSize: 12, color: sb.inkMute }}>
          Operational tools to resolve support issues. All actions require a reason and are permanently audited.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          
          <ActionDialog 
            title="Clear Sync Error" 
            desc="Mark active sync errors as resolved. This does not delete the error history, just removes the stuck state."
            btnLabel="Clear Sync Error"
            icon={<XCircle className="h-4 w-4 mr-2" />}
            onSubmit={(r) => clearErrorMutation.mutate(r)}
            isLoading={clearErrorMutation.isPending}
          />

          <ActionDialog 
            title="Reset Sync State" 
            desc="Force the sync state back to 'idle'. Does NOT delete orders. Use if extension is stuck syncing."
            btnLabel="Reset Sync State"
            icon={<RefreshCw className="h-4 w-4 mr-2" />}
            onSubmit={(r) => resetSyncMutation.mutate(r)}
            isLoading={resetSyncMutation.isPending}
          />

          <ActionDialog 
            title="Request Manual Resync" 
            desc="Signal the user's extension to trigger a full resync on their next session."
            btnLabel="Request Resync"
            icon={<RefreshCw className="h-4 w-4 mr-2" />}
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
function ActionDialog({ title, desc, btnLabel, icon, onSubmit, isLoading }: any) {
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
        <Button variant="outline" className="w-full justify-start text-xs h-9" style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>
          {icon} {btnLabel}
        </Button>
      </DialogTrigger>
      <DialogContent style={{ borderRadius: 12, borderColor: sb.hairline }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>{title}</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: sb.inkMute }}>{desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Audit Reason (Required)</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you taking this action?" style={{ borderRadius: 6, borderColor: sb.hairline }} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!reason.trim() || isLoading} style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
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
        <Button variant="outline" className="w-full justify-start text-xs h-9" style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>
          <FilePlus className="h-4 w-4 mr-2" /> Add Support Note
        </Button>
      </DialogTrigger>
      <DialogContent style={{ borderRadius: 12, borderColor: sb.hairline }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>Add Support Note</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: sb.inkMute }}>Internal note visible only to admins.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger style={{ borderRadius: 6, borderColor: sb.hairline }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 6 }}>
                <SelectItem value="open">Open / Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Note (Required)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Details..." style={{ borderRadius: 6, borderColor: sb.hairline }} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!note.trim() || isLoading} style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
