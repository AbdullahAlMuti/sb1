/**
 * SellerSuit Dashboard Bridge
 * Injected into the sellersuit.com (and localhost) dashboard web application.
 * Connects the React App's window.postMessage with the Extension's chrome.runtime.sendMessage.
 */

console.log('[SellerSuit] Dashboard Bridge Initialized');

// Flag to let the web app know the extension is installed and ready
window.postMessage({ type: 'SELLERSUIT_EXTENSION_READY' }, '*');

// 1. Listen for messages from the Web Dashboard (React App)
window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const data = event.data;

    // React app pinging to check connection
    if (data && data.type === 'PING_EXTENSION') {
        window.postMessage({ type: 'SELLERSUIT_EXTENSION_READY' }, '*');
        return;
    }

    // Check if it's a message meant for the extension bulk engine
    if (data && data.type === 'START_BULK_JOB') {
        alert('[DIAGNOSTIC] Bridge received START_BULK_JOB. Forwarding to background.');
        console.log('[Dashboard Bridge] Forwarding START_BULK_JOB to background script');
        
        // Forward to background.js
        chrome.runtime.sendMessage({
            action: 'START_BULK_JOB',
            payload: data.payload
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Dashboard Bridge] Error starting bulk job:', chrome.runtime.lastError);
                window.postMessage({ 
                    type: 'BULK_JOB_ERROR', 
                    error: chrome.runtime.lastError.message 
                }, '*');
            } else if (response && response.success === false) {
                console.error('[Dashboard Bridge] Background rejected job:', response);
                window.postMessage({ 
                    type: 'BULK_JOB_ERROR', 
                    error: response.error || response.message || 'Unknown error'
                }, '*');
            } else {
                console.log('[Dashboard Bridge] Background accepted job:', response);
            }
        });
    }

    if (data && data.type === 'PAUSE_BULK_JOB') {
        chrome.runtime.sendMessage({ action: 'PAUSE_BULK_JOB' });
    }

    if (data && data.type === 'RESUME_BULK_JOB') {
        chrome.runtime.sendMessage({ action: 'RESUME_BULK_JOB' });
    }

    if (data && data.type === 'STOP_BULK_JOB') {
        chrome.runtime.sendMessage({ action: 'STOP_BULK_JOB' });
    }
});

// 2. Listen for messages from the Background Script and forward to Web Dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'BULK_JOB_PROGRESS_UPDATE') {
        alert('[DIAGNOSTIC] Bridge received PROGRESS_UPDATE: ' + JSON.stringify(request.payload));
        // Forward the progress back to the React UI
        window.postMessage({
            type: 'BULK_JOB_PROGRESS_UPDATE',
            payload: request.payload
        }, '*');
    }
    
    if (request.type === 'BULK_JOB_PROGRESS_UPDATE' || request.type === 'BULK_JOB_FINISHED' || request.type === 'BULK_JOB_DEBUG') {
        window.postMessage(request, '*');
    }
    
    if (request.type === 'BULK_JOB_FINISHED') {
        window.postMessage({
            type: 'BULK_JOB_FINISHED'
        }, '*');
    }
    
    return true;
});
