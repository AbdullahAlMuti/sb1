import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SyncResult {
  success: boolean;
  added: number;
  skipped: number;
  message: string;
}

type SyncAction = 'append' | 'upsert' | 'delete';

type SyncOptions = {
  /** When true, suppresses success/failure toasts (used for background auto-sync). */
  silent?: boolean;
};

interface GoogleSheetsSettings {
  google_sheets_url?: string;
  auto_sync_listings?: boolean;
  auto_sync_orders?: boolean;
}

export function useGoogleSheetsSync() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const getSettings = useCallback((): GoogleSheetsSettings | null => {
    if (!profile?.settings) return null;
    return profile.settings as GoogleSheetsSettings;
  }, [profile]);

  const syncToSheets = useCallback(async (
    sheetName: string,
    rows: Record<string, unknown>[],
    uniqueColumn: string,
    action: SyncAction = 'append',
    options: SyncOptions = {}
  ): Promise<SyncResult | null> => {
    const settings = getSettings();

    if (!settings?.google_sheets_url) {
      return null;
    }

    setIsSyncing(true);
    try {
      console.log('🔄 Syncing to Google Sheets:', { sheetName, rowCount: rows.length, action });

      // Use Edge Function proxy to avoid CORS issues
      // Use underscore alias to avoid Functions gateway JWT issues with hyphenated names.
      const { data, error } = await supabase.functions.invoke('google_sheets_sync', {
        body: {
          scriptUrl: settings.google_sheets_url,
          action,
          sheetName,
          rows,
          uniqueColumn,
        },
      });

      console.log('📥 Google Sheets sync response:', { data, error });

      if (error) {
        // Check if it's a function deployment issue
        if (error.message?.includes('FunctionsRelayError') ||
          error.message?.includes('not found') ||
          error.message?.includes('404')) {
          throw new Error('Edge Function not deployed. Please deploy google_sheets_sync function to Supabase.');
        }
        throw new Error(error.message || 'Sync failed');
      }

      if (data?.success === false) {
        // Provide more context from the debug info if available
        const debugInfo = data?.debug;
        let errorMsg = data.error || 'Sync failed';

        if (debugInfo?.upstream_status) {
          errorMsg += ` (Upstream status: ${debugInfo.upstream_status})`;
        }
        if (debugInfo?.upstream_response_text) {
          errorMsg += ` - ${debugInfo.upstream_response_text}`;
        }

        throw new Error(errorMsg);
      }

      return {
        success: true,
        added: data?.added || rows.length,
        skipped: data?.skipped || 0,
        message: data?.message || `Synced ${rows.length} rows to ${sheetName}`,
      };
    } catch (error) {
      console.error('❌ Google Sheets sync error:', error);

      // Show failure toast unless silent
      if (!options.silent) {
        toast({
          title: "Sync Failed",
          description: error instanceof Error ? error.message : 'Failed to sync data to Google Sheets',
          variant: "destructive",
        });
      }

      return {
        success: false,
        added: 0,
        skipped: 0,
        message: error instanceof Error ? error.message : 'Sync failed',
      };
    } finally {
      setIsSyncing(false);
    }
  }, [getSettings, toast]);

  const syncListings = useCallback(async (listings: Record<string, unknown>[]) => {
    const settings = getSettings();

    if (!settings?.google_sheets_url) {
      return null;
    }

    const formattedRows = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      asin: listing.amazon_asin || listing.asin || '',
      ebay_item_id: listing.ebay_item_id || '',
      source_price: listing.amazon_price || listing.source_price || 0,
      sell_price: listing.ebay_price || listing.sell_price || 0,
      profit: ((listing.ebay_price as number) || (listing.sell_price as number) || 0) - ((listing.amazon_price as number) || (listing.source_price as number) || 0),
      quantity: listing.amazon_stock_quantity || listing.quantity || 1,
      status: listing.status || 'active',
      created_at: listing.created_at,
    }));

    const result = await syncToSheets('AMZ_Listings', formattedRows, 'id');

    if (result?.success) {
      toast({
        title: "Synced to Google Sheets",
        description: result.message,
      });
    }

    return result;
  }, [getSettings, syncToSheets, toast]);

  const syncListingsUpsert = useCallback(async (
    listings: Record<string, unknown>[],
    options: SyncOptions = {}
  ) => {
    const settings = getSettings();
    if (!settings?.google_sheets_url) return null;

    const formattedRows = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      asin: listing.amazon_asin || listing.asin || '',
      ebay_item_id: listing.ebay_item_id || '',
      source_price: listing.amazon_price || listing.source_price || 0,
      sell_price: listing.ebay_price || listing.sell_price || 0,
      profit: ((listing.ebay_price as number) || (listing.sell_price as number) || 0) - ((listing.amazon_price as number) || (listing.source_price as number) || 0),
      quantity: listing.amazon_stock_quantity || listing.quantity || 1,
      status: listing.status || 'active',
      created_at: listing.created_at,
      updated_at: (listing as any).updated_at,
    }));

    // Prefer true upsert for correct UPDATE/DELETE behavior.
    const upsertResult = await syncToSheets('AMZ_Listings', formattedRows, 'id', 'upsert', options);
    const unknownAction = (upsertResult && !upsertResult.success && /unknown action/i.test(upsertResult.message));

    // Backward-compatible fallback: legacy Apps Script supports only `append`.
    if (unknownAction) {
      return syncToSheets('AMZ_Listings', formattedRows, 'id', 'append', options);
    }

    return upsertResult;
  }, [getSettings, syncToSheets]);

  const syncListingsDelete = useCallback(async (
    listings: Record<string, unknown>[],
    options: SyncOptions = {}
  ) => {
    const settings = getSettings();
    if (!settings?.google_sheets_url) return null;

    // We'll pass the listing id (and optional metadata) so the Apps Script can remove or mark deleted.
    const deleteRows = listings.map((listing) => ({
      id: listing.id,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    }));

    const deleteResult = await syncToSheets('AMZ_Listings', deleteRows, 'id', 'delete', options);
    const unknownAction = (deleteResult && !deleteResult.success && /unknown action/i.test(deleteResult.message));

    // If the script doesn't support delete, try to mark as deleted via upsert.
    if (unknownAction) {
      return syncToSheets('AMZ_Listings', deleteRows, 'id', 'upsert', options);
    }

    return deleteResult;
  }, [getSettings, syncToSheets]);

  const syncOrders = useCallback(async (orders: Record<string, unknown>[]) => {
    const settings = getSettings();

    if (!settings?.google_sheets_url) {
      return null;
    }

    const formattedRows = orders.map(order => ({
      id: order.id,
      order_id: order.order_id || order.ebay_order_id || '',
      buyer_name: order.buyer_name || order.buyer_username || '',
      item_title: order.item_title || '',
      sale_price: order.sale_price || order.total_amount || 0,
      source_cost: order.source_cost || 0,
      profit: ((order.sale_price as number) || (order.total_amount as number) || 0) - ((order.source_cost as number) || 0),
      status: order.status || 'pending',
      order_date: order.order_date || order.created_at,
    }));

    const result = await syncToSheets('AMZ_Orders', formattedRows, 'id');

    if (result?.success) {
      toast({
        title: "Synced to Google Sheets",
        description: result.message,
      });
    }

    return result;
  }, [getSettings, syncToSheets, toast]);

  const autoSyncListing = useCallback(async (listing: Record<string, unknown>) => {
    const settings = getSettings();

    if (!settings?.auto_sync_listings || !settings?.google_sheets_url) {
      return null;
    }

    return syncListings([listing]);
  }, [getSettings, syncListings]);

  const autoSyncOrder = useCallback(async (order: Record<string, unknown>) => {
    const settings = getSettings();

    if (!settings?.auto_sync_orders || !settings?.google_sheets_url) {
      return null;
    }

    return syncOrders([order]);
  }, [getSettings, syncOrders]);

  return {
    isSyncing,
    syncListings,
    syncListingsUpsert,
    syncListingsDelete,
    syncOrders,
    autoSyncListing,
    autoSyncOrder,
    getSettings,
  };
}
