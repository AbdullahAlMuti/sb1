import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { MustSellItem } from '../types/content-library.types';
import * as api from '../services/contentLibraryApi';

export function useMustSellItems({
  mode,
  searchQuery,
  selectedCountry,
}: {
  mode: 'admin' | 'user';
  searchQuery?: string;
  selectedCountry?: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['must-sell-items', mode, searchQuery, selectedCountry];

  const query = useQuery({
    queryKey,
    queryFn: () => api.fetchMustSellItems(mode, searchQuery, selectedCountry),
  });

  // Real-time subscription for users
  useEffect(() => {
    if (mode === 'admin') return; // Admin updates optimistic/manually

    const channel = supabase
      .channel('public:must_sell_items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'must_sell_items',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['must-sell-items'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, queryClient]);

  // Mutations (typically only used by Admin)
  const createMutation = useMutation({
    mutationFn: api.createMustSellItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['must-sell-items'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MustSellItem> }) => api.updateMustSellItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['must-sell-items'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteMustSellItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['must-sell-items'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: api.reorderMustSellItems,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['must-sell-items'] }),
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
