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

export default function AdminEbayAuditLogs() {
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Immutable record of all admin command center actions.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, reason, or action..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="credits">Credits Only</SelectItem>
              <SelectItem value="features">Features Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Action Log
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">Showing Top 50</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mb-3 opacity-20" />
              <p>No audit logs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin / Target User</TableHead>
                  <TableHead className="hidden md:table-cell">Entity</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[200px]">Reason</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((l: any) => (
                  <TableRow key={l.log_id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {l.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium" title={l.admin_id}>
                          {l.admin_email || 'Unknown Admin'}
                        </span>
                        {l.target_user_id ? (
                          <span className="text-[10px] text-muted-foreground" title={l.target_user_id}>
                            → {l.target_user_email || 'User'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">→ Global</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {l.entity_id ? (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground capitalize text-[10px]">{l.entity_type}</span>
                          <span className="font-mono">{l.entity_id.replace('ebay_', '')}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                      {l.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <AuditLogDetailModal 
                        logId={l.log_id}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
