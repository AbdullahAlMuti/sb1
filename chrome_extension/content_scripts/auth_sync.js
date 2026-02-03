// auth_sync.js
// ─────────────────────────────────────────────────────────────────────────────
// 🔐 AUTH SYNC DOCUMENTATION
// ─────────────────────────────────────────────────────────────────────────────
// This script acts as the "Bridge" between the Web App (Dashboard) and the Chrome Extension.
//
// HOW IT WORKS:
// 1. 🔍 DETECT: It runs ONLY on the web app domain (sellersuit.com/localhost).
// 2. 📖 READ: It watches the browser's `localStorage` for the Supabase Auth Token.
//    - Key Name: `sb-<PROJECT_ID>-auth-token` (Must match Supabase Client config)
// 3. 📡 SEND: When a token is found or changes (login/refresh), it sends it to the Extension.
//    - Message: `chrome.runtime.sendMessage({ action: 'SYNC_TOKEN', ... })`
// 4. 👂 LISTEN: The Extension's Background Script receives this message and saves the token.
//
// This ensures that when a user logs into the Website, the Extension automatically logs in too.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const DEBUG = true;
    // IMPORTANT: Must match the web app's project id (used in localStorage key: sb-<projectId>-auth-token)
    const PROJECT_ID = 'ojxzssooylmydystjvdo';
    const TOKEN_KEY = `sb-${PROJECT_ID}-auth-token`;

    function log(level, message, data = null) {
        if (!DEBUG && level === 'debug') return;
        const prefix = { debug: '🔍', info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }[level] || '📝';
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        if (data) {
            console.log(`[${timestamp}] ${prefix} [AuthSync] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${prefix} [AuthSync] ${message}`);
        }
    }

    log('info', 'Auth Sync Script Loaded on ' + window.location.hostname);

    /**
     * 📖 STEP 1: READ TOKEN
     * Reads the JWT Session from the website's LocalStorage.
     * This is where Supabase (gotrue-js) stores the user's login session.
     */
    function extractTokenData() {
        try {
            // "sb-<id>-auth-token" is the standard Supabase key
            const storedData = localStorage.getItem(TOKEN_KEY);
            if (!storedData) {
                log('debug', 'No token found in localStorage (User not logged in?)');
                return null;
            }

            const parsed = JSON.parse(storedData);

            // Check if token is expired (Safety Check)
            const expiresAt = parsed.expires_at;
            if (expiresAt && Date.now() / 1000 > expiresAt) {
                log('warn', 'Token is expired', { expiresAt: new Date(expiresAt * 1000).toISOString() });
                // Don't sync expired tokens -- we wait for the web app to refresh it
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
     * 📖 STEP 2: SEND TO EXTENSION
     * Sends the retrieved token to the Chrome Extension via `chrome.runtime.sendMessage`.
     * The Background Script listens for `action: 'SYNC_TOKEN'`.
     */
    function syncTokenToExtension(tokenData, retryCount = 0) {
        if (!tokenData || !tokenData.accessToken) {
            log('debug', 'No valid token to sync');
            return;
        }

        // Check if extension context is available
        // (This ensures we don't crash if the extension was improperly loaded)
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
            // 📡 SEND MESSAGE: The core "Handshake"
            chrome.runtime.sendMessage(
                {
                    action: 'SYNC_TOKEN',
                    token: tokenData.accessToken,
                    user: tokenData.user,
                    expiresAt: tokenData.expiresAt
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;

                        // Handle specific errors
                        if (errorMsg.includes('Extension context invalidated') ||
                            errorMsg.includes('Could not establish connection')) {
                            log('warn', 'Extension not ready, will retry...', { error: errorMsg });

                            // Retry with exponential backoff (max 3 retries)
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
     * 📖 STEP 0: INITIAL CHECK
     * Runs immediately when the script loads (on page load/refresh) to check if we are already logged in.
     */
    function initialSync() {
        const tokenData = extractTokenData();
        if (tokenData) {
            // Small delay to ensure extension is fully initialized before receiving message
            setTimeout(() => syncTokenToExtension(tokenData), 500);
        }
    }

    /**
     * 📖 STEP 3: LISTEN FOR UPDATES
     * Watches for changes to `localStorage` in other tabs or by the Supabase client.
     * This handles:
     * - User logging in on a different tab.
     * - Token refresh by Supabase client (every hour).
     * - User clicking "Logout".
     */
    function watchStorageChanges() {
        window.addEventListener('storage', (e) => {
            // Only react to auth token changes
            if (!e.key || !e.key.includes('auth-token')) return;

            log('debug', 'Storage change detected', { key: e.key });

            if (e.newValue) {
                // Token added or updated
                const tokenData = extractTokenData();
                if (tokenData) {
                    syncTokenToExtension(tokenData);
                }
            } else if (!e.newValue && e.oldValue) {
                // Token removed (logout)
                log('info', 'Token removed, notifying extension');
                notifyLogout();
            }
        });
    }

    /**
     * Bridge: Forward Dashboard Triggers to Extension
     * Handles: Token refresh, eBay order sync triggers, extension detection
     */
    function setupMessageBridge() {
        window.addEventListener('message', (event) => {
            // Only accept messages from ourselves
            if (event.source !== window) return;

            // Respond to extension detection pings from web app
            if (event.data.type === 'SELLERSUIT_EXTENSION_PING') {
                log('debug', 'Extension ping received');
                window.postMessage({
                    type: 'SELLERSUIT_EXTENSION_PONG',
                    version: chrome.runtime?.getManifest?.()?.version || 'unknown',
                    installed: true
                }, '*');
            }

            // Forward token refresh requests from web app
            if (event.data.type === 'REFRESH_EXTENSION_TOKEN') {
                const tokenData = extractTokenData();
                if (tokenData) {
                    syncTokenToExtension(tokenData);
                }
            }

            // Forward eBay order sync requests from dashboard
            if (event.data.type === 'TRIGGER_EBAY_ORDER_SYNC') {
                log('info', 'eBay order sync requested from dashboard');

                if (!chrome?.runtime?.sendMessage) {
                    window.postMessage({
                        type: 'EBAY_ORDER_SYNC_RESULT',
                        success: false,
                        error: 'Extension not installed or not enabled. Please install the SellerSuit extension.'
                    }, '*');
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
                                }, '*');
                            } else if (response) {
                                if (response.ok) {
                                    log('success', 'eBay order sync completed', { count: response.cache?.count });
                                    window.postMessage({
                                        type: 'EBAY_ORDER_SYNC_RESULT',
                                        success: true,
                                        count: response.cache?.count || 0
                                    }, '*');
                                } else {
                                    let errorMsg = response.error || 'Sync failed';

                                    // Provide user-friendly messages
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
                                    }, '*');
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
                    }, '*');
                }
            }


            // Forward background tab requests to background script
            if (event.data.type === 'OPEN_BACKGROUND_TAB') {
                log('info', 'Background tab requested', { url: event.data.url });
                if (chrome?.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'OPEN_BACKGROUND_TAB', url: event.data.url });
                }
            }

            // Forward Amazon Fulfillment Request
            if (event.data.type === 'TRIGGER_AMAZON_FULFILLMENT') {
                log('info', 'Amazon fulfillment requested', { orderId: event.data.order?.id });
                if (chrome?.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({
                        action: 'START_FULFILLMENT',
                        order: event.data.order
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            log('error', 'Failed to start fulfillment', chrome.runtime.lastError);
                        } else {
                            log('success', 'Fulfillment task sent to extension');
                        }
                    });
                }
            }
        });
    }

    /**
     * Announce extension presence on page load
     */
    function announcePresence() {
        // Set a global marker that web app can detect
        window.__SELLERSUIT_EXTENSION_INSTALLED__ = true;
        window.__SELLERSUIT_EXTENSION_VERSION__ = chrome.runtime?.getManifest?.()?.version || 'unknown';

        // Also dispatch custom event for immediate detection
        window.dispatchEvent(new CustomEvent('sellersuit-extension-ready', {
            detail: {
                installed: true,
                version: window.__SELLERSUIT_EXTENSION_VERSION__
            }
        }));

        log('info', 'Extension presence announced', { version: window.__SELLERSUIT_EXTENSION_VERSION__ });
    }

    /**
     * Periodic token check - resync if token was refreshed
     */
    function startPeriodicSync() {
        let lastToken = null;

        setInterval(() => {
            const tokenData = extractTokenData();
            const currentToken = tokenData?.accessToken;

            // If token changed (refreshed), sync to extension
            if (currentToken && currentToken !== lastToken) {
                log('info', 'Token changed, re-syncing to extension');
                syncTokenToExtension(tokenData);
                lastToken = currentToken;
            }
        }, 60000); // Check every minute
    }

    // Initialize
    announcePresence();
    initialSync();
    watchStorageChanges();
    setupMessageBridge();
    /**
     * Listen for messages from the Extension Backend (Background Script)
     * Forwards 'ORDER_COMPLETED_BROADCAST' to the Web App.
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'ORDER_COMPLETED_BROADCAST') {
            log('success', 'Received ORDER_COMPLETED broadcast', request.payload);
            window.postMessage({
                type: 'ORDER_COMPLETED_EVENT',
                payload: request.payload
            }, '*');
        }
    });

    startPeriodicSync();

})();
