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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ borderRadius: 12, borderColor: sb.hairline }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>Audit Log Details</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: sb.inkMute }}>Read-only view of admin action.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: sb.primary }} /></div>
        ) : log ? (
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border" style={{ background: sb.canvasSoft, borderColor: sb.hairline }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Timestamp</span>
                <span className="font-mono text-xs" style={{ color: sb.ink }}>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Action</span>
                <Badge variant="outline" className="capitalize" style={{ borderRadius: 6 }}>{log.action.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Admin ID</span>
                <span className="font-mono text-xs block truncate" style={{ color: sb.ink }}>{log.admin_id}</span>
                {log.admin_email && <span className="block text-xs" style={{ color: sb.inkMute }}>{log.admin_email}</span>}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Target User ID</span>
                <span className="font-mono text-xs block truncate" style={{ color: sb.ink }}>{log.target_user_id || 'N/A (Global)'}</span>
                {log.target_user_email && <span className="block text-xs" style={{ color: sb.inkMute }}>{log.target_user_email}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Reason</span>
              <div className="p-3 rounded border text-sm" style={{ background: sb.canvasSoft, borderColor: sb.hairline, color: sb.ink }}>{log.reason || 'No reason provided.'}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Old Value</span>
                <div className="p-3 rounded border font-mono text-xs break-all" style={{ background: sb.canvasSoft, borderColor: sb.hairline, color: sb.inkMute }}>{log.old_value || 'None'}</div>
              </div>
              <div className="space-y-2">
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">New Value</span>
                <div className="p-3 rounded border font-mono text-xs break-all" style={{ background: sb.canvasSoft, borderColor: sb.hairline, color: sb.ink }}>{log.new_value || 'None'}</div>
              </div>
            </div>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="space-y-2 pt-2">
                <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="block uppercase tracking-wider">Metadata (JSON)</span>
                <pre className="p-3 rounded border font-mono text-xs overflow-x-auto" style={{ background: sb.canvasSoft, borderColor: sb.hairline, color: sb.ink }}>
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
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
            Audit Logs
          </h2>
          <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
            Immutable record of all admin command center actions.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user, reason, or action..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: 6, borderColor: sb.hairline }}
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px] h-9" style={{ borderRadius: 6, borderColor: sb.hairline }}>
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent style={{ borderRadius: 6 }}>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="credits">Credits Only</SelectItem>
              <SelectItem value="features">Features Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card style={{
        background: sb.canvas,
        border: `1px solid ${sb.hairline}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }}>
        <CardHeader style={{
          padding: "24px 28px 16px",
          borderBottom: `1px solid ${sb.hairlineCool}`,
        }} className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
            <FileText style={{ width: 16, height: 16, color: sb.inkMute }} />
            Action Log
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal" style={{ borderRadius: 6 }}>Showing Top 50</Badge>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: sb.primary }} /></div>
          ) : logs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center" style={{ color: sb.inkMute }}>
              <FileText className="h-8 w-8 mb-3 opacity-20" />
              <p>No audit logs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader style={{ background: sb.canvasSoft }}>
                <TableRow style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                  <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Timestamp</TableHead>
                  <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Action</TableHead>
                  <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Admin / Target User</TableHead>
                  <TableHead className="hidden md:table-cell" style={{ color: sb.ink, fontWeight: 500 }}>Entity</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[200px]" style={{ color: sb.ink, fontWeight: 500 }}>Reason</TableHead>
                  <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((l: any) => (
                  <TableRow key={l.log_id} style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                    <TableCell className="text-xs whitespace-nowrap" style={{ color: sb.inkMute }}>
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]" style={{ borderRadius: 6 }}>
                        {l.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span style={{ fontSize: 13, fontWeight: 500, color: sb.ink }} title={l.admin_id}>
                          {l.admin_email || 'Unknown Admin'}
                        </span>
                        {l.target_user_id ? (
                          <span style={{ fontSize: 11, color: sb.inkMute }} title={l.target_user_id}>
                            → {l.target_user_email || 'User'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: sb.inkMute }}>→ Global</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {l.entity_id ? (
                        <div className="flex flex-col">
                          <span style={{ fontSize: 10, color: sb.inkMute }} className="capitalize">{l.entity_type}</span>
                          <span className="font-mono text-xs" style={{ color: sb.ink }}>{l.entity_id.replace('ebay_', '')}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-xs" style={{ color: sb.inkMute }}>
                      {l.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <AuditLogDetailModal 
                        logId={l.log_id}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" style={{ borderRadius: 6 }}>
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
