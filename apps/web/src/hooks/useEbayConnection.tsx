import { useState, useEffect, useCallback } from 'react';
import { useExtensionStatus } from './useExtensionStatus';
import { toast } from 'sonner';

export function useEbayConnection() {
  const { isInstalled, isChecking } = useExtensionStatus();
  const [ebayConnected, setEbayConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  const checkConnection = useCallback(() => {
    if (!isInstalled) {
      setEbayConnected(false);
      setCheckingConnection(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type === 'SELLERSUIT_EBAY_STATUS') {
        setEbayConnected(event.data.connected || false);
        setLastSyncTime(event.data.lastSyncTime || null);
        setCheckingConnection(false);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'CHECK_EBAY_CONNECTION' }, window.location.origin);

    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setCheckingConnection(false);
    }, 2000);
  }, [isInstalled]);

  useEffect(() => {
    if (!isChecking) {
      checkConnection();
    }
  }, [isChecking, checkConnection]);

  // Listen for background-triggered changes / sync completions
  useEffect(() => {
    const handleSyncResult = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type === 'SELLERSUIT_EBAY_SYNC_RESULT') {
        setIsSyncing(false);
        if (event.data.success) {
          toast.success('eBay order sync completed successfully!');
          setEbayConnected(true);
          // Re-check connection and last sync time
          checkConnection();
        } else {
          toast.error(event.data.error || 'Failed to sync with eBay.');
        }
      }
    };

    window.addEventListener('message', handleSyncResult);
    return () => {
      window.removeEventListener('message', handleSyncResult);
    };
  }, [checkConnection]);

  const syncNow = useCallback(async () => {
    if (!isInstalled) {
      toast.error('SellerSuit extension is not installed.');
      return;
    }
    setIsSyncing(true);
    toast.info('Starting eBay sync...');
    window.postMessage({ type: 'TRIGGER_EBAY_SYNC' }, window.location.origin);
  }, [isInstalled]);

  return {
    isInstalled,
    isChecking: isChecking || checkingConnection,
    ebayConnected,
    lastSyncTime,
    isSyncing,
    syncNow,
    recheck: checkConnection
  };
}
