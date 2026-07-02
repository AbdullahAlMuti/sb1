import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Search, Coins, AlertCircle } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { CreditAdjustmentModal } from "./CreditAdjustmentModal";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  inkFaint: "#b2b2b2",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

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
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
            Credits & Usage
          </h2>
          <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
            Monitor and manually adjust user sync credits.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search email or UUID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: 6, borderColor: sb.hairline }}
          />
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
        }}>
          <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
            <Coins style={{ width: 16, height: 16, color: "#ffdb13" }} />
            User Credit Balances
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: sb.primary }} />
            </div>
          ) : users?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center" style={{ color: sb.inkMute }}>
              <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
              <p>No users found matching "{debouncedQuery}"</p>
            </div>
          ) : (
            <Table>
              <TableHeader style={{ background: sb.canvasSoft }}>
                <TableRow style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                  <TableHead style={{ color: sb.ink, fontWeight: 500 }}>User</TableHead>
                  <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Balance</TableHead>
                  <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Used Total</TableHead>
                  <TableHead className="hidden md:table-cell" style={{ color: sb.ink, fontWeight: 500 }}>Last Usage</TableHead>
                  <TableHead className="hidden md:table-cell" style={{ color: sb.ink, fontWeight: 500 }}>Last Adjustment</TableHead>
                  <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: any) => (
                  <TableRow key={u.user_id} style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 500, fontSize: 14, color: sb.ink }}>{u.email}</span>
                        <span style={{ fontSize: 11, color: sb.inkMute }} className="font-mono">{u.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.credits_remaining <= 0 ? (
                        <Badge variant="destructive" style={{ borderRadius: 6 }}>
                          {u.credits_remaining}
                        </Badge>
                      ) : u.credits_remaining < 50 ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50" style={{ borderRadius: 6 }}>
                          {u.credits_remaining}
                        </Badge>
                      ) : (
                        <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
                          {u.credits_remaining}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right" style={{ color: sb.inkMute, fontSize: 13 }}>
                      {u.credits_used}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" style={{ color: sb.inkMute, fontSize: 12 }}>
                      {u.last_usage_date ? new Date(u.last_usage_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" style={{ color: sb.inkMute, fontSize: 12 }}>
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
