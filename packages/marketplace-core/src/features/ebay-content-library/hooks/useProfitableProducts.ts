import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { ProfitableProduct } from '../types/content-library.types';
import * as api from '../services/contentLibraryApi';

export function useProfitableProducts({
  mode,
  searchQuery,
  selectedCountry,
}: {
  mode: 'admin' | 'user';
  searchQuery?: string;
  selectedCountry?: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['profitable-products', mode, searchQuery, selectedCountry];

  const query = useQuery({
    queryKey,
    queryFn: () => api.fetchProfitableProducts(mode, searchQuery, selectedCountry),
  });

  // Real-time subscription for users
  useEffect(() => {
    if (mode === 'admin') return;

    const channel = supabase
      .channel('public:profitable_products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profitable_products',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['profitable-products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: api.createProfitableProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profitable-products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProfitableProduct> }) => api.updateProfitableProduct(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profitable-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProfitableProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profitable-products'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: api.reorderProfitableProducts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profitable-products'] }),
  });

  return {
    ...query,
    items: query.data,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    reorderItems: reorderMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      reorderMutation.isPending,
  };
}
