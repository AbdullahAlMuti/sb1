/**
 * SellerSuit Dashboard and Auth Bridge
 * Injected into the sellersuit.com (and local dev) dashboard web application.
 * Connects the React App's window.postMessage with the Extension's chrome.runtime.sendMessage,
 * and handles token syncing and handshake logic.
 */

(function () {
    'use strict';

    const DEBUG = false;
    const PROJECT_ID = 'ojxzssooylmydystjvdo';
    const TOKEN_KEY = `sb-${PROJECT_ID}-auth-token`;

    function log(level, message, data = null) {
        if (!DEBUG && level === 'debug') return;
        const prefix = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[level] || '📝';
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        if (data) {
            console.log(`[${timestamp}] ${prefix} [Bridge] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${prefix} [Bridge] ${message}`);
        }
    }

    log('info', 'SellerSuit Bridge Initialized on ' + window.location.hostname);

    // Flag to let the web app know the extension is installed and ready
    window.__SELLERSUIT_EXTENSION_INSTALLED__ = true;
    window.__SELLERSUIT_EXTENSION_VERSION__ = chrome.runtime?.getManifest?.()?.version || 'unknown';

    // Dispatch custom event for immediate detection
    window.dispatchEvent(new CustomEvent('sellersuit-extension-ready', {
        detail: {
            installed: true,
            version: window.__SELLERSUIT_EXTENSION_VERSION__
        }
    }));

    window.postMessage({ type: 'SELLERSUIT_EXTENSION_READY' }, window.location.origin);

    /**
     * Reads the JWT Session from the website's LocalStorage.
     */
    function extractTokenData() {
        try {
            const storedData = localStorage.getItem(TOKEN_KEY);
            if (!storedData) {
                log('debug', 'No token found in localStorage (User not logged in?)');
                return null;
            }

            const parsed = JSON.parse(storedData);
            const expiresAt = parsed.expires_at;
            if (expiresAt && Date.now() / 1000 > expiresAt) {
                log('warn', 'Token is expired', { expiresAt: new Date(expiresAt * 1000).toISOString() });
                return null;
            }

            return {
                accessToken: parsed.access_token,
                refreshToken: parsed.refresh_token,
                expiresAt: parsed.expires_at,
                user: parsed.user
            };
        } catch (e) {
            log('error', 'Failed to parse token data', e);
            return null;
        }
    }

    /**
     * Sends the retrieved token to the Chrome Extension.
     */
    function syncTokenToExtension(tokenData, retryCount = 0) {
        if (!tokenData || !tokenData.accessToken) {
            log('debug', 'No valid token to sync');
            return;
        }

        if (!chrome?.runtime?.sendMessage) {
            log('warn', 'Chrome extension API not available');
            return;
        }

        log('info', 'Syncing token to extension...', {
            userId: tokenData.user?.id,
            email: tokenData.user?.email,
            expiresIn: tokenData.expiresAt ? Math.round(tokenData.expiresAt - Date.now() / 1000) + 's' : 'unknown'
        });

        try {
            chrome.runtime.sendMessage(
                {
                    action: 'SYNC_TOKEN',
                    token: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    user: tokenData.user,
                    expiresAt: tokenData.expiresAt
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;

                        if (errorMsg.includes('Extension context invalidated') ||
                            errorMsg.includes('Could not establish connection')) {
                            log('warn', 'Extension not ready, will retry...', { error: errorMsg });

                            if (retryCount < 3) {
                                const delay = Math.pow(2, retryCount) * 1000;
                                setTimeout(() => syncTokenToExtension(tokenData, retryCount + 1), delay);
                            }
                        } else {
                            log('error', 'Extension sync failed', { error: errorMsg });
                        }
                    } else if (response) {
                        if (response.success) {
                            log('success', 'Token synced to extension', { verified: response.verified });
                        } else {
                            log('warn', 'Extension reported sync issue', response);
                        }
                    }
                }
            );
        } catch (e) {
            log('error', 'Failed to send message to extension', e);
        }
    }

    /**
     * Handle logout - clear extension auth
     */
    function notifyLogout() {
        if (!chrome?.runtime?.sendMessage) return;

        try {
            chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response) => {
                if (chrome.runtime.lastError) {
                    log('debug', 'Could not notify extension of logout');
                } else {
                    log('info', 'Extension notified of logout');
                }
            });
        } catch (e) {
            log('debug', 'Logout notification failed', e);
        }
    }

    /**
     * Initial sync check.
     */
    function initialSync() {
        const tokenData = extractTokenData();
        if (tokenData) {
            setTimeout(() => syncTokenToExtension(tokenData), 500);
        }
        try {
            const templateId = localStorage.getItem('selected_listing_template_id');
            if (templateId && chrome?.storage?.local) {
                chrome.storage.local.set({ selectedListingTemplateId: templateId });
                log('info', 'Initial template synced to extension', { templateId });
            }
        } catch (e) {
            log('debug', 'Failed to perform initial template sync', e);
        }
    }

    /**
     * Watches for changes to `localStorage` in other tabs.
     */
    function watchStorageChanges() {
        window.addEventListener('storage', (e) => {
            if (!e.key || !e.key.includes('auth-token')) return;

            log('debug', 'Storage change detected', { key: e.key });

            if (e.newValue) {
                const tokenData = extractTokenData();
                if (tokenData) {
                    syncTokenToExtension(tokenData);
                }
            } else if (!e.newValue && e.oldValue) {
                log('info', 'Token removed, notifying extension');
                notifyLogout();
            }
        });
    }

    /**
     * Listen for messages from the Web Dashboard (React App)
     */
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const data = event.data;
        if (!data) return;

        // react app pinging to check connection
        if (data.type === 'PING_EXTENSION') {
            window.postMessage({ type: 'SELLERSUIT_EXTENSION_READY' }, window.location.origin);
            return;
        }

        // Respond to extension detection pings
        if (data.type === 'SELLERSUIT_EXTENSION_PING') {
            log('debug', 'Extension ping received');
            window.postMessage({
                type: 'SELLERSUIT_EXTENSION_PONG',
                version: window.__SELLERSUIT_EXTENSION_VERSION__,
                installed: true
            }, window.location.origin);
        }

        // Forward token refresh requests
        if (data.type === 'REFRESH_EXTENSION_TOKEN') {
            const tokenData = extractTokenData();
            if (tokenData) {
                syncTokenToExtension(tokenData);
            }
        }

        // Sync active listing template
        if (data.type === 'SYNC_LISTING_TEMPLATE') {
            log('info', 'Syncing listing template to extension:', data.templateId);
            if (chrome?.storage?.local) {
                chrome.storage.local.set({ selectedListingTemplateId: data.templateId });
            }
        }

        // Forward background tab requests
        if (data.type === 'OPEN_BACKGROUND_TAB') {
            log('info', 'Background tab requested', { url: data.url });
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: 'OPEN_BACKGROUND_TAB', url: data.url });
            }
        }

        // Forward Amazon Fulfillment Request
        if (data.type === 'TRIGGER_AMAZON_FULFILLMENT') {
            const AMAZON_AUTO_ORDER_ENABLED = false;
            if (!AMAZON_AUTO_ORDER_ENABLED) {
                log('info', 'Amazon fulfillment requested, but feature is disabled in this build');
                return;
            }

            log('info', 'Amazon fulfillment requested', { orderId: data.order?.id });
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'START_FULFILLMENT',
                    order: data.order
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        log('error', 'Failed to start fulfillment', chrome.runtime.lastError);
                    } else {
                        log('success', 'Fulfillment task sent to extension');
                    }
                });
            }
        }

        // Forward eBay order sync requests
        if (data.type === 'TRIGGER_EBAY_ORDER_SYNC') {
            log('info', 'eBay order sync requested from dashboard');

            if (!chrome?.runtime?.sendMessage) {
                window.postMessage({
                    type: 'EBAY_ORDER_SYNC_RESULT',
                    success: false,
                    error: 'Extension not installed or not enabled. Please install the SellerSuit extension.'
                }, window.location.origin);
                return;
            }

            try {
                chrome.runtime.sendMessage(
                    { action: 'sync_ebay_orders' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            const errorMsg = chrome.runtime.lastError.message;
                            log('error', 'eBay sync request failed', { error: errorMsg });

                            let userMessage = 'Failed to communicate with extension. Please refresh the page.';
                            if (errorMsg.includes('Extension context invalidated')) {
                                userMessage = 'Extension was updated. Please refresh the page and try again.';
                            }

                            window.postMessage({
                                type: 'EBAY_ORDER_SYNC_RESULT',
                                success: false,
                                error: userMessage
                            }, window.location.origin);
                        } else if (response) {
                            if (response.ok) {
                                log('success', 'eBay order sync completed', { count: response.cache?.count });
                                window.postMessage({
                                    type: 'EBAY_ORDER_SYNC_RESULT',
                                    success: true,
                                    count: response.cache?.count || 0
                                }, window.location.origin);
                            } else {
                                let errorMsg = response.error || 'Sync failed';

                                if (errorMsg.includes('not logged in') || errorMsg.includes('Seller Hub')) {
                                    errorMsg = 'Please log in to eBay in your browser first, then try again.';
                                } else if (errorMsg.includes('CSRF') || errorMsg.includes('token')) {
                                    errorMsg = 'eBay session expired. Please visit eBay.com and log in, then try again.';
                                }

                                log('warn', 'eBay sync returned error', { error: errorMsg });
                                window.postMessage({
                                    type: 'EBAY_ORDER_SYNC_RESULT',
                                    success: false,
                                    error: errorMsg
                                }, window.location.origin);
                            }
                        }
                    }
                );
            } catch (e) {
                log('error', 'Failed to send sync message to extension', e);
                window.postMessage({
                    type: 'EBAY_ORDER_SYNC_RESULT',
                    success: false,
                    error: 'Failed to communicate with extension.'
                }, window.location.origin);
            }
        }

        // Forward extension bulk job commands
        if (data.type === 'START_BULK_JOB') {
            console.debug('[Dashboard Bridge] Forwarding START_BULK_JOB to background script');
            
            chrome.runtime.sendMessage({
                action: 'START_BULK_JOB',
                payload: data.payload
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Dashboard Bridge] Error starting bulk job:', chrome.runtime.lastError);
                    window.postMessage({ 
                        type: 'BULK_JOB_ERROR', 
                        error: chrome.runtime.lastError.message 
                    }, window.location.origin);
                } else if (response && response.success === false) {
                    console.error('[Dashboard Bridge] Background rejected job:', response);
                    window.postMessage({ 
                        type: 'BULK_JOB_ERROR', 
                        error: response.error || response.message || 'Unknown error'
                    }, window.location.origin);
                } else {
                    console.debug('[Dashboard Bridge] Background accepted job:', response);
                }
            });
        }

        if (data.type === 'PAUSE_BULK_JOB') {
            chrome.runtime.sendMessage({ action: 'PAUSE_BULK_JOB' });
        }

        if (data.type === 'RESUME_BULK_JOB') {
            chrome.runtime.sendMessage({ action: 'RESUME_BULK_JOB', payload: data.payload });
        }

        if (data.type === 'STOP_BULK_JOB') {
            chrome.runtime.sendMessage({ action: 'STOP_BULK_JOB' });
        }

        // Dashboard asks the worker for its persisted job state (page reload resync)
        if (data.type === 'GET_BULK_STATE') {
            chrome.runtime.sendMessage({ action: 'GET_BULK_STATE' }, (response) => {
                if (chrome.runtime.lastError) {
                    window.postMessage({ type: 'BULK_JOB_STATE', payload: { active: false, error: chrome.runtime.lastError.message } }, window.location.origin);
                    return;
                }
                window.postMessage({ type: 'BULK_JOB_STATE', payload: response || { active: false } }, window.location.origin);
            });
        }

        // "Add to Bulk List" inbox — items queued from the extension side panel.
        // The bridge content script reads chrome.storage directly.
        if (data.type === 'GET_BULK_INBOX') {
            chrome.storage.local.get('bulkInbox', (d) => {
                window.postMessage({ type: 'BULK_INBOX', items: Array.isArray(d.bulkInbox) ? d.bulkInbox : [] }, window.location.origin);
            });
        }

        if (data.type === 'CLEAR_BULK_INBOX') {
            const ids = Array.isArray(data.ids) ? data.ids : null;
            chrome.storage.local.get('bulkInbox', (d) => {
                const items = Array.isArray(d.bulkInbox) ? d.bulkInbox : [];
                const remaining = ids ? items.filter(it => !ids.includes(it.id)) : [];
                chrome.storage.local.set({ bulkInbox: remaining });
            });
        }
    });

    // Push side-panel "Add to Bulk List" items to the dashboard live
    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.bulkInbox) {
                const items = Array.isArray(changes.bulkInbox.newValue) ? changes.bulkInbox.newValue : [];
                if (items.length > 0) {
                    window.postMessage({ type: 'BULK_INBOX', items }, window.location.origin);
                }
            }
        });
    } catch (e) {
        log('debug', 'bulkInbox storage watcher unavailable', e);
    }

    /**
     * Listen for messages from the Extension Background Script and forward to Web Dashboard
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'BULK_JOB_PROGRESS_UPDATE') {
            console.debug('[Dashboard Bridge] Bridge received PROGRESS_UPDATE: ' + JSON.stringify(request.payload));
            window.postMessage({
                type: 'BULK_JOB_PROGRESS_UPDATE',
                payload: request.payload
            }, window.location.origin);
        }
        
        if (request.type === 'BULK_JOB_PROGRESS_UPDATE' || request.type === 'BULK_JOB_FINISHED' || request.type === 'BULK_JOB_DEBUG' || request.type === 'BULK_JOB_PAUSED') {
            window.postMessage(request, window.location.origin);
        }
        
        if (request.type === 'BULK_JOB_FINISHED') {
            window.postMessage({
                type: 'BULK_JOB_FINISHED'
            }, window.location.origin);
        }

        if (request.action === 'ORDER_COMPLETED_BROADCAST') {
            log('success', 'Received ORDER_COMPLETED broadcast', request.payload);
            window.postMessage({
                type: 'ORDER_COMPLETED_EVENT',
                payload: request.payload
            }, window.location.origin);
        }
        
        return true;
    });

    /**
     * Periodic token check
     */
    function startPeriodicSync() {
        let lastToken = null;

        setInterval(() => {
            const tokenData = extractTokenData();
            const currentToken = tokenData?.accessToken;

            if (currentToken && currentToken !== lastToken) {
                log('info', 'Token changed, re-syncing to extension');
                syncTokenToExtension(tokenData);
                lastToken = currentToken;
            }
        }, 60000);
    }

    // Initialize
    initialSync();
    watchStorageChanges();
    startPeriodicSync();

})();
