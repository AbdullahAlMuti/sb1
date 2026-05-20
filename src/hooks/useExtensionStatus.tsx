import { useState, useEffect, useCallback } from "react";

interface ExtensionStatus {
  isInstalled: boolean;
  isChecking: boolean;
  version: string | null;
}

declare global {
  interface Window {
    __SELLERSUIT_EXTENSION_INSTALLED__?: boolean;
    __SELLERSUIT_EXTENSION_VERSION__?: string;
  }
}

export function useExtensionStatus() {
  const [status, setStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isChecking: true,
    version: null,
  });

  const checkExtension = useCallback(() => {
    // Method 1: Check global marker set by content script
    if (window.__SELLERSUIT_EXTENSION_INSTALLED__) {
      setStatus({
        isInstalled: true,
        isChecking: false,
        version: window.__SELLERSUIT_EXTENSION_VERSION__ || null,
      });
      return;
    }

    // Method 2: Send ping and wait for pong
    const handlePong = (event: MessageEvent) => {
      if (event.data?.type === 'SELLERSUIT_EXTENSION_PONG') {
        setStatus({
          isInstalled: true,
          isChecking: false,
          version: event.data.version || null,
        });
        window.removeEventListener('message', handlePong);
      }
    };

    window.addEventListener('message', handlePong);
    window.postMessage({ type: 'SELLERSUIT_EXTENSION_PING' }, window.location.origin);

    // Timeout - if no response after 2 seconds, extension not installed
    setTimeout(() => {
      window.removeEventListener('message', handlePong);
      setStatus((prev) => {
        if (prev.isChecking) {
          return {
            isInstalled: false,
            isChecking: false,
            version: null,
          };
        }
        return prev;
      });
    }, 2000);
  }, []);

  useEffect(() => {
    // Listen for extension ready event (if extension loads after this hook)
    const handleExtensionReady = (event: CustomEvent) => {
      setStatus({
        isInstalled: true,
        isChecking: false,
        version: event.detail?.version || null,
      });
    };

    window.addEventListener(
      'sellersuit-extension-ready',
      handleExtensionReady as EventListener
    );

    // Initial check
    checkExtension();

    return () => {
      window.removeEventListener(
        'sellersuit-extension-ready',
        handleExtensionReady as EventListener
      );
    };
  }, [checkExtension]);

  return {
    ...status,
    recheck: checkExtension,
  };
}
