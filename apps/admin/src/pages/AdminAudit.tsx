import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  User,
  Settings,
  Shield,
  Package,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Badge } from '@repo/ui/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  metadata: unknown;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminAudit() {
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // TanStack useQuery for server-side search, filtering, pagination
  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs', { currentPage, actionFilter, entityFilter, dateFilter, searchQuery }],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Date filter
      if (dateFilter !== 'all') {
        const daysAgo = subDays(new Date(), parseInt(dateFilter));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      // Action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      // Entity filter
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      // Apply search query server-side
      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%,entity_type.ilike.%${searchQuery}%,entity_id.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch user profiles for the logs
      const userIds = [...new Set((data as AuditLog[])?.map(log => log.user_id).filter(Boolean) as string[])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => { profileMap[p.id] = p; });
          setUserProfiles(profileMap);
        }
      }

      return {
        logs: (data as AuditLog[]) || [],
        totalCount: count || 0,
      };
    },
  });

  const logs = queryData?.logs || [];
  const totalCount = queryData?.totalCount || 0;

  const fetchLogs = () => {
    refetch();
  };

  const exportLogs = () => {
    const headers = ['Date', 'Time', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd'),
        format(new Date(log.created_at), 'HH:mm:ss'),
        userProfiles[log.user_id || '']?.full_name || log.user_id || 'System',
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.ip_address || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Audit logs exported successfully');
  };

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <User className="h-4 w-4" />;
    if (action.includes('PLAN')) return <Package className="h-4 w-4" />;
    if (action.includes('ROLE')) return <Shield className="h-4 w-4" />;
    if (action.includes('SETTING')) return <Settings className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('DELETE')) {
      return <Badge className="bg-destructive/20 text-destructive">{action}</Badge>;
    }
    if (action.includes('CREATE')) {
      return <Badge className="bg-emerald-500/20 text-emerald-400">{action}</Badge>;
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return <Badge className="bg-amber-500/20 text-amber-400">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  const filteredLogs = logs;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Get unique actions and entity types for filters
  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all admin and user activity ({totalCount} total logs)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User Actions</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'user').length}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan Changes</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'plan').length}</p>
              </div>
              <Package className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Role Changes</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.action.includes('ROLE')).length}</p>
              </div>
              <Shield className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {uniqueEntities.map(entity => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Timestamp</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">User</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Action</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Entity</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">IP Address</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Loading logs...</p>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">No audit logs found</p>
                        <p className="text-sm text-muted-foreground/70">Logs will appear here as actions are performed</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{format(new Date(log.created_at), 'MMM dd, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {log.user_id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary-foreground">
                                  {userProfiles[log.user_id]?.full_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {userProfiles[log.user_id]?.full_name || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {log.user_id?.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            {getActionBadge(log.action)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="text-sm font-medium capitalize">{log.entity_type}</p>
                            {log.entity_id && (
                              <p className="text-xs text-muted-foreground font-mono">{log.entity_id.slice(0, 8)}...</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground text-sm">
                          {log.ip_address || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Action</p>
                  {getActionBadge(selectedLog.action)}
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Entity Type</p>
                  <p className="font-medium capitalize">{selectedLog.entity_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-sm">{selectedLog.entity_id || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-medium">
                    {selectedLog.user_id 
                      ? userProfiles[selectedLog.user_id]?.full_name || selectedLog.user_id
                      : 'System'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium mb-2">Previous Values</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-medium mb-2">New Values</p>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">User Agent</p>
                  <p className="text-xs font-mono break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
