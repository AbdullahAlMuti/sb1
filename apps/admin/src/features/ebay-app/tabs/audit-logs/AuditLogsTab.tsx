import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Search, FileText, Filter, Eye } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";

function AuditLogDetailModal({ logId, trigger }: { logId: string, trigger: React.ReactNode }) {
  const { data: log, isLoading } = useQuery({
    queryKey: ['ebay-admin-audit-log-detail', logId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_admin_audit_log_detail', { p_log_id: logId });
      if (error) throw error;
      return data;
    },
    enabled: !!logId
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>Read-only view of admin action.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : log ? (
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
              <div>
                <span className="text-muted-foreground block text-xs">Timestamp</span>
                <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Action</span>
                <Badge variant="outline" className="capitalize">{log.action.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Admin ID</span>
                <span className="font-mono text-xs">{log.admin_id}</span>
                {log.admin_email && <span className="block text-xs text-muted-foreground">{log.admin_email}</span>}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Target User ID</span>
                <span className="font-mono text-xs">{log.target_user_id || 'N/A (Global)'}</span>
                {log.target_user_email && <span className="block text-xs text-muted-foreground">{log.target_user_email}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-muted-foreground block text-xs">Reason</span>
              <div className="bg-muted/10 p-3 rounded border text-sm">{log.reason || 'No reason provided.'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-muted-foreground block text-xs">Old Value</span>
                <div className="bg-muted/10 p-3 rounded border font-mono text-xs break-all">{log.old_value || 'None'}</div>
              </div>
              <div className="space-y-2">
                <span className="text-muted-foreground block text-xs">New Value</span>
                <div className="bg-muted/10 p-3 rounded border font-mono text-xs break-all">{log.new_value || 'None'}</div>
              </div>
            </div>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-muted-foreground block text-xs">Metadata (JSON)</span>
                <pre className="bg-muted/10 p-3 rounded border font-mono text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">Log not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AuditLogsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ebay-admin-audit-logs', debouncedQuery, actionFilter],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('search_admin_audit_logs', {
        search_query: debouncedQuery,
        action_filter: actionFilter,
        limit_val: 50
      });
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-border/30">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground/90">
            Audit Logs
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Read-only chronological ledger of all actions performed within this admin control panel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search user, reason, or action..."
              className="pl-9.5 h-10 bg-card/50 border-border/80 text-sm focus-visible:ring-blue-600 transition-all duration-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[145px] h-10 bg-card/50 border-border/80 text-xs font-semibold text-muted-foreground">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground/85" />
              <SelectValue placeholder="Filter Logs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📁 All Actions</SelectItem>
              <SelectItem value="credits">🪙 Credits Only</SelectItem>
              <SelectItem value="features">⚡ Features Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground/80" />
            <div>
              <h3 className="text-sm font-bold text-foreground/90">Action Audit Ledger</h3>
              <p className="text-[10px] text-muted-foreground">Immutable history tracks.</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-muted/60">Showing Top 50</Badge>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-card/25">
              <FileText className="h-10 w-10 mb-2 opacity-35 text-muted-foreground" />
              <p className="text-xs font-semibold">No entries logged</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">No administrative operations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/15">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Timestamp</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Action</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Admin / Target Store</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold text-muted-foreground py-3">Target Entity</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[200px] text-xs font-bold text-muted-foreground py-3">Logged Reason</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground py-3">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((l: any) => (
                  <TableRow key={l.log_id} className="hover:bg-muted/10 transition-colors duration-200">
                    <TableCell className="text-[10px] font-mono text-muted-foreground/80 whitespace-nowrap py-3.5">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className="capitalize text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-card border-border/80">
                        {l.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground/80" title={l.admin_id}>
                          {l.admin_email || 'Unknown Agent'}
                        </span>
                        {l.target_user_id ? (
                          <span className="text-[9px] text-muted-foreground/70" title={l.target_user_id}>
                            → {l.target_user_email || 'Target Store'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/50">→ Global Configuration</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[10px] py-3.5">
                      {l.entity_id ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground/75 capitalize text-[9px] font-bold">{l.entity_type}</span>
                          <span className="font-mono text-foreground/80 bg-muted px-1 py-0.2 rounded border border-border/50">{l.entity_id.replace('ebay_', '')}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-[11px] text-muted-foreground/80 py-3.5">
                      {l.reason}
                    </TableCell>
                    <TableCell className="text-right py-3.5">
                      <AuditLogDetailModal 
                        logId={l.log_id}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted">
                            <Eye className="h-4 w-4 text-muted-foreground/80" />
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
