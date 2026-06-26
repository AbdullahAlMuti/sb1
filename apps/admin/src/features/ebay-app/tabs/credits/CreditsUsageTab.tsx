import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Search, Coins, AlertCircle } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { CreditAdjustmentModal } from "../../components/CreditAdjustmentModal";

export default function CreditsUsageTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['ebay-admin-credits', debouncedQuery],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('search_user_credits_admin', {
        search_query: debouncedQuery,
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
            Credits & Usage
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Monitor system-wide credits, audit transaction histories, and adjust user sync credit balances manually.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search email or User UUID..."
            className="pl-9.5 h-10 bg-card/50 border-border/80 text-sm focus-visible:ring-blue-600 transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 p-5 border-b border-border/40 bg-muted/10">
          <Coins className="h-5 w-5 text-amber-500 animate-float" />
          <div>
            <h3 className="text-sm font-bold text-foreground/90">User Credit Balances</h3>
            <p className="text-[10px] text-muted-foreground">Adjust syncing limits for connected stores.</p>
          </div>
        </div>
        
        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
          ) : users?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-card/25">
              <AlertCircle className="h-10 w-10 mb-2 opacity-35 text-muted-foreground" />
              <p className="text-xs font-semibold">No balances match</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">No users found matching "{debouncedQuery}"</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/15">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">User Identifier</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground py-3">Remaining Balance</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground py-3">Used Cumulative</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold text-muted-foreground py-3">Last Active Sync</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-bold text-muted-foreground py-3">Last Admin Update</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: any) => (
                  <TableRow key={u.user_id} className="hover:bg-muted/10 transition-colors duration-200">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground/90">{u.email}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{u.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Badge 
                        variant={u.credits_remaining <= 0 ? 'destructive' : u.credits_remaining < 50 ? 'secondary' : 'default'}
                        className={`text-[10px] px-2 py-0.5 font-bold ${
                          u.credits_remaining <= 0 
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                            : u.credits_remaining < 50 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}
                      >
                        {u.credits_remaining}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-semibold text-xs py-3">
                      {u.credits_used?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[10px] text-muted-foreground font-medium py-3">
                      {u.last_usage_date ? new Date(u.last_usage_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[10px] text-muted-foreground font-medium py-3">
                      {u.last_adjustment_date ? new Date(u.last_adjustment_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <CreditAdjustmentModal 
                        userId={u.user_id} 
                        currentBalance={u.credits_remaining} 
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
