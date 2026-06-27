import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';

export interface UseOrdersOptions {
  userId: string | undefined;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrdersResponse {
  orders: any[];
  total: number;
  totalRevenue: number;
  counts: {
    all: number;
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
    cancelled: number;
    refunded: number;
  };
}

export function useOrders({
  userId,
  page = 1,
  limit = 25,
  search,
  status = 'all',
  dateFrom,
  dateTo
}: UseOrdersOptions) {
  return useQuery({
    queryKey: ['orders', userId, page, limit, search, status, dateFrom, dateTo],
    queryFn: async (): Promise<OrdersResponse> => {
      if (!userId) throw new Error("No user ID");

      const { data, error } = await supabase.functions.invoke("ebay-orders", {
        method: "POST",
        body: {
          op: "list",
          page,
          limit,
          search: search || undefined,
          status,
          dateFrom,
          dateTo,
        },
      });

      if (error) {
        throw error;
      }

      return {
        orders: (data?.orders as any[]) || [],
        total: Number(data?.total || 0),
        totalRevenue: Number(data?.totalRevenue || 0),
        counts: {
          all: Number(data?.counts?.all || 0),
          pending: Number(data?.counts?.pending || 0),
          processing: Number(data?.counts?.processing || 0),
          shipped: Number(data?.counts?.shipped || 0),
          completed: Number(data?.counts?.completed || 0),
          cancelled: Number(data?.counts?.cancelled || 0),
          refunded: Number(data?.counts?.refunded || 0),
        }
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}
