import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Search, Coins, AlertCircle } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { CreditAdjustmentModal } from "./CreditAdjustmentModal";

export default function AdminEbayCreditsUsage() {
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Credits & Usage</h2>
          <p className="text-sm text-muted-foreground">Monitor and manually adjust user sync credits.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email or UUID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            User Credit Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
              <p>No users found matching "{debouncedQuery}"</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Used Total</TableHead>
                  <TableHead className="hidden md:table-cell">Last Usage</TableHead>
                  <TableHead className="hidden md:table-cell">Last Adjustment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: any) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{u.email}</span>
                        <span className="text-[10px] text-muted-foreground">{u.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={u.credits_remaining <= 0 ? 'destructive' : u.credits_remaining < 50 ? 'secondary' : 'default'}>
                        {u.credits_remaining}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {u.credits_used}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.last_usage_date ? new Date(u.last_usage_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.last_adjustment_date ? new Date(u.last_adjustment_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </div>
  );
}
