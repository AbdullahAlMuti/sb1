// eBay Order Detail Scraper - Robust V3
// Automatically scrapes detailed order information and sends to dashboard

(function () {
    'use strict';

    const DEBUG = true;

    function log(msg, data = null) {
        if (!DEBUG) return;
        console.log(`[eBay Scraper V3] ${msg}`, data || '');
    }

    // --- UI Notifications ---
    let progressNotification = null;

    function showProgressNotification(message) {
        if (!progressNotification) {
            progressNotification = document.createElement('div');
            progressNotification.style.cssText = `
                position: fixed; top: 20px; right: 20px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white; padding: 16px 20px; border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); z-index: 999999;
                font-family: sans-serif; font-size: 14px; font-weight: 500;
                display: flex; align-items: center; gap: 10px;
            `;
            document.body.appendChild(progressNotification);
        }
        progressNotification.innerHTML = `
            <svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            <span>${message}</span>
            <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
        `;
    }

    function hideProgressNotification() {
        if (progressNotification) {
            progressNotification.remove();
            progressNotification = null;
        }
    }

    function showSuccessNotification(message) {
        hideProgressNotification();
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; padding: 16px 20px; border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); z-index: 999999;
            font-family: sans-serif; font-size: 14px; font-weight: 500;
        `;
        notification.innerHTML = `✅ ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    function showErrorNotification(message) {
        hideProgressNotification();
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white; padding: 16px 20px; border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); z-index: 999999;
            font-family: sans-serif; font-size: 14px; font-weight: 500;
        `;
        notification.innerHTML = `❌ ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // --- Data Extraction ---
    function safeParseFloat(text) {
        if (!text) return null;
        const clean = text.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return isNaN(val) ? null : val;
    }

    async function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) return resolve(document.querySelector(selector));
            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
        });
    }

    function extractOrderDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const data = {
            orderId: urlParams.get('orderid'),
            datePaid: null,
            image: null,
            quantity: 1,
            sku: null,
            shipping: 0,
            transaction: null,
            transactionId: null,
            salesRecordNumber: null,
            addFee: null,
            currency: 'USD',
            buyer_name: null, // New field
            buyer_zip: null  // New field
        };

        try {
            // Basic Info
            const datePaidEl = document.querySelector('.order-summary-row .value, .sh-order-details__summary-table .value');
            if (datePaidEl) data.datePaid = datePaidEl.textContent.trim();

            const imageEl = document.querySelector('.orders-image-control__ctrl img, .item-image img, .sh-order-details__image img');
            if (imageEl) data.image = imageEl.src;

            const skuEl = document.querySelector('.item-sku, .custom-label-value, .sh-order-details__sku');
            if (skuEl) data.sku = skuEl.textContent.trim();

            const qtyEl = document.querySelector('.item-quantity, [class*="quantity"], .sh-order-details__quantity');
            if (qtyEl) {
                const qtyMatch = qtyEl.textContent.match(/\d+/);
                if (qtyMatch) data.quantity = parseInt(qtyMatch[0]);
            }

            // Financial Table
            document.querySelectorAll('.order-summary-row, .financial-row, .sh-order-details__row, dl.total').forEach(row => {
                const label = (row.querySelector('.label, dt')?.textContent || '').toLowerCase();
                const value = row.querySelector('.value, dd')?.textContent || '';

                if (label.includes('order total') || label.includes('buyer paid')) {
                    data.transaction = safeParseFloat(value);
                    if (value.includes('£')) data.currency = 'GBP';
                    if (value.includes('€')) data.currency = 'EUR';
                }
                if (label.includes('shipping')) data.shipping = safeParseFloat(value) || 0;
            });

            // "Order earnings" extraction
            const earningsVal = document.querySelector('.earnings dl.total dd.amount .value, #earnings-details .amount, .sh-order-details__earnings-value, .total-row .amount');
            if (earningsVal) {
                data.addFee = safeParseFloat(earningsVal.textContent);
                log('✅ Earnings Scraped:', data.addFee);
            }

            // IDs
            const srnEl = document.querySelector('.sales-record-number, .sh-order-details__srn');
            if (srnEl) data.salesRecordNumber = srnEl.textContent.trim().replace(/[^0-9]/g, '');

            const txnEl = document.querySelector('.transaction-id, .sh-order-details__txn');
            if (txnEl) data.transactionId = txnEl.textContent.trim();

            return data;
        } catch (error) {
            log('Error extracting details:', error);
            return null;
        }
    }

    async function sendToDashboard(orderData) {
        if (!orderData || !orderData.orderId) return;

        showProgressNotification(`Syncing ${orderData.orderId} to dashboard...`);

        const payload = {
            orders: [{
                ebay_order_id: orderData.orderId,
                sales_record_number: orderData.salesRecordNumber,
                order_date: orderData.datePaid ? new Date(orderData.datePaid).toISOString() : new Date().toISOString(),
                date_paid: orderData.datePaid ? new Date(orderData.datePaid).toISOString() : null,
                item_image_url: orderData.image,
                quantity: orderData.quantity,
                custom_label: orderData.sku,
                total_amount: orderData.transaction,
                shipping_cost: orderData.shipping,
                transaction_id: orderData.transactionId,
                add_fee: orderData.addFee,
                order_status: 'paid',
                platform: 'eBay',
                currency: orderData.currency,
                buyer_name: orderData.buyer_name,
                buyer_zip: orderData.buyer_zip
            }]
        };

        chrome.runtime.sendMessage({ action: 'sync_ebay_orders', payload }, (response) => {
            if (response?.ok) {
                const amount = orderData.addFee !== null ? `$${orderData.addFee.toFixed(2)}` : 'data';
                showSuccessNotification(`${orderData.orderId} (${amount}) sent precisely!`);

                // Auto-close tab after 2 seconds
                setTimeout(() => {
                    log('Closing tab after successful sync');
                    window.close();
                }, 2000);
            } else {
                showErrorNotification(`Sync failed: ${response?.error || 'Server Error'}`);
            }
        });
    }

    let isRunning = false;
    async function init() {
        if (isRunning) return;
        isRunning = true;

        const isOrderPage = (location.pathname.includes('/ord') || location.pathname.includes('/sh/ord')) && location.search.includes('orderid=');
        if (!isOrderPage) { isRunning = false; return; }

        log('Initializing Scraper for Order Details...');

        // Random human-like delay (2-5 seconds)
        const delay = Math.floor(Math.random() * 3000) + 2000;
        log(`Waiting ${delay}ms to simulate human behavior...`);
        showProgressNotification("Waiting for page data...");
        await new Promise(r => setTimeout(r, delay));

        // Try extraction with retries to handle slow-loading sections
        for (let attempt = 1; attempt <= 3; attempt++) {
            await waitForElement('.order-summary-row, .earnings, dl.total', 3000);
            const data = extractOrderDetails();

            if (data && data.addFee !== null) {
                await sendToDashboard(data);
                isRunning = false;
                return;
            }
            log(`Attempt ${attempt} - Waiting for earnings...`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
        }

        showErrorNotification("Could not find earnings detail. Please refresh the page.");
        isRunning = false;
    }

    // Run on load
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

    // Watch for internal eBay navigation
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            log('URL change detected (SPA)');
            init();
        }
    }, 1500);

    log('eBay Scraper V3 Ready');
})();
