// amazon_fulfiller.js
// 📦 AMAZON FULFILLMENT AUTOMATION
// Handles the "Fulfill" workflow by auto-filling shipping details.

(async () => {
    const AMAZON_AUTO_ORDER_ENABLED = false;

    let IS_RUNNING = false;
    let POLLING_INTERVAL = null;

    // ---------------------------------------------------------
    // 🛠️ UTITLITY FUNCTIONS
    // ---------------------------------------------------------

    // 📢 VISUAL LOGGER: Displays status on the Amazon page for the user
    const logToOverlay = (msg, type = 'info') => {
        let overlay = document.getElementById('sellersuit-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sellersuit-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', bottom: '20px', right: '20px',
                backgroundColor: 'rgba(0,0,0,0.85)', color: '#fff',
                padding: '15px', borderRadius: '8px', zIndex: '9999999',
                maxWidth: '300px', fontFamily: 'monospace', fontSize: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            });
            document.body.appendChild(overlay);
        }
        // Deduplicate recent messages
        const lastChild = overlay.lastElementChild;
        if (lastChild && lastChild.textContent.includes(msg) && type !== 'info') return;

        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        line.style.color = type === 'error' ? '#ff6b6b' : (type === 'success' ? '#51cf66' : '#fff');
        line.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        line.style.padding = '2px 0';
        overlay.appendChild(line);
        overlay.scrollTop = overlay.scrollHeight;
    };

    // 🕵️ HELPER: Human-like random delay
    const randomDelay = (min = 500, max = 1500) => {
        const ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    // 💾 HELPER: Update task status in Chrome Storage
    const updateTask = async (updates) => {
        const { fulfillmentTask } = await chrome.storage.local.get('fulfillmentTask');
        if (fulfillmentTask) {
            const newTask = { ...fulfillmentTask, ...updates };
            await chrome.storage.local.set({ fulfillmentTask: newTask });
            logToOverlay(`State -> ${updates.status}`, 'success');
            return newTask;
        }
    };

    // 🖱️ HELPER: Safe Click with scroll, highlight, and human delay
    const safeClick = async (el) => {
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.border = '2px solid #FF9900'; // Amazon Orange highlight

        await randomDelay(600, 1200); // Wait a bit before clicking (natural pause)

        try {
            el.click();
        } catch (e) {
            console.warn('Standard click failed, trying native dispatch', e);
            el.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
        }

        setTimeout(() => { el.style.border = ''; }, 1000);
    };

    // ✏️ HELPER: Set Input Value with event dispatching and delay
    const setInputValue = async (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) {
            await randomDelay(200, 500); // Simulate "thinking" time between fields
            el.focus();
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    };

    // ---------------------------------------------------------
    // 🤖 MAIN AUTOMATION LOOP
    // ---------------------------------------------------------
    const runAutomationLoop = async () => {
        if (IS_RUNNING) return;
        IS_RUNNING = true;

        try {
            const { fulfillmentTask } = await chrome.storage.local.get('fulfillmentTask');

            if (!fulfillmentTask || !fulfillmentTask.order || fulfillmentTask.status === 'DONE') {
                IS_RUNNING = false;
                return;
            }

            const { status, order } = fulfillmentTask;
            const orderData = order;

            // ===========================================================================
            // 🛒 PHASE 1: PRODUCT PAGE (INIT)
            // Goal: Set quantity and click "Buy Now"
            // ===========================================================================
            if (status === 'INIT') {
                const buyNowBtn = document.querySelector('#buy-now-button') ||
                    document.querySelector('#buyNow') ||
                    document.querySelector('input[name="submit.buy-now"]');

                // STEP 1: Set Quantity
                const quantitySelect = document.querySelector('#quantity');
                if (quantitySelect && orderData.quantity > 1 && quantitySelect.value != orderData.quantity) {
                    logToOverlay(`Setting Quantity to ${orderData.quantity}...`);
                    quantitySelect.value = orderData.quantity;
                    quantitySelect.dispatchEvent(new Event('change', { bubbles: true }));
                    await randomDelay(800, 1200); // Wait for price update
                }

                // STEP 2: Click Buy Now
                if (buyNowBtn) {
                    logToOverlay('Found Buy Now button. Clicking...', 'info');
                    await updateTask({ status: 'CHECKOUT_START' });
                    await safeClick(buyNowBtn);
                }
            }

            // ===========================================================================
            // 💳 PHASE 2: CHECKOUT / ADDRESS SELECTION
            // Goal: Navigate to "Add New Address" form
            // ===========================================================================
            if (status === 'CHECKOUT_START' || status === 'ADDRESS_CHANGE') {

                // STEP 1: Is the Form ALREADY visible?
                const addressForm = document.querySelector('#address-ui-widgets-enterAddressFullName');
                if (addressForm) {
                    logToOverlay('Address Form detected! Proceeding to fill...');
                    await updateTask({ status: 'FILLING_FORM' });
                    IS_RUNNING = false; return;
                }

                // STEP 2: Look for "Add a new address" Link (in main page or sidebar)
                const addAddressBtn = document.querySelector('a.a-link-normal.celwidget#add-new-address-desktop-sasp-tango-link') || // User Specified
                    document.querySelector('#add-new-address-popover-link') ||
                    document.querySelector('a[href*="add-new-address"]') ||
                    document.querySelector('.add-new-address-button');

                if (addAddressBtn) {
                    if (addAddressBtn.offsetParent !== null) { // Check visibility
                        logToOverlay('Found "Add New Address" link. Clicking...');
                        await updateTask({ status: 'FILLING_FORM' }); // Anticipate form next
                        await safeClick(addAddressBtn);
                        IS_RUNNING = false; return;
                    }
                }

                // STEP 3: Click "Change" if we are on the Review page with a default address
                if (status === 'CHECKOUT_START') {
                    const changeAddressBtn = document.querySelector('a.a-link-normal.expand-panel-button.celwidget') ||
                        document.querySelector('.expand-panel-button') ||
                        document.querySelector('#addressChangeLinkId') ||
                        document.querySelector('a[href*="address/handlers/display.html"]') ||
                        document.querySelector('a[data-testid="address-change-link"]');

                    if (changeAddressBtn) {
                        logToOverlay('Default address found. Clicking "Change"...');
                        await updateTask({ status: 'ADDRESS_CHANGE' });
                        await safeClick(changeAddressBtn);
                        IS_RUNNING = false; return;
                    }
                }
            }

            // ===========================================================================
            // 📝 PHASE 3: FILL ADDRESS FORM
            // Goal: Fill all shipping inputs and submit
            // ===========================================================================
            if (status === 'FILLING_FORM') {
                const nameInput = document.querySelector('#address-ui-widgets-enterAddressFullName');

                // STEP 1: Fill inputs if not already filled
                if (nameInput && nameInput.value !== orderData.shipping_address.name) {
                    logToOverlay('Filling Shipping Details (Human-like)...');
                    const shipping = orderData.shipping_address;

                    await setInputValue('#address-ui-widgets-enterAddressFullName', shipping.name);
                    await setInputValue('#address-ui-widgets-enterAddressPhoneNumber', shipping.phone);
                    await setInputValue('#address-ui-widgets-enterAddressLine1', shipping.address1);
                    await setInputValue('#address-ui-widgets-enterAddressLine2', shipping.address2);
                    await setInputValue('#address-ui-widgets-enterAddressCity', shipping.city);
                    await setInputValue('#address-ui-widgets-enterAddressPostalCode', shipping.postal_code);

                    // Handle State Dropdown
                    const stateSelect = document.querySelector('select[name="address-ui-widgets-enterAddressStateOrRegion"]') ||
                        document.querySelector('#address-ui-widgets-enterAddressStateOrRegion-dropdown-nativeId');
                    if (stateSelect && shipping.state) {
                        for (let i = 0; i < stateSelect.options.length; i++) {
                            const opt = stateSelect.options[i];
                            if (opt.value.toLowerCase() === shipping.state.toLowerCase() ||
                                opt.text.toLowerCase().includes(shipping.state.toLowerCase())) {
                                stateSelect.selectedIndex = i;
                                stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                break;
                            }
                        }
                    }

                    logToOverlay('Address filled. Verifying...');
                    await randomDelay(1000, 2000); // Pause before submitting

                    // STEP 2: Use this Address
                } else if (nameInput && nameInput.value === orderData.shipping_address.name) {
                    const submitBtn = document.querySelector('input.a-button-input') ||
                        document.querySelector('#address-ui-widgets-form-submit-button input') ||
                        document.querySelector('#address-ui-widgets-form-submit-button');

                    if (submitBtn) {
                        logToOverlay('Submitting Address...');
                        await updateTask({ status: 'REVIEW' });
                        await safeClick(submitBtn);
                    }
                }
            }

            // ===========================================================================
            // ✅ PHASE 4: REVIEW & EXTRACT DATA
            // Goal: Scrape total, date, click purchase
            // ===========================================================================
            if (status === 'REVIEW') {
                const placeOrderBtn = document.querySelector('input.a-button-input.place-your-order-button#placeOrder') ||
                    document.querySelector('#placeYourOrder') ||
                    document.querySelector('#submitOrderButtonId input') ||
                    document.querySelector('.place-your-order-button');

                if (placeOrderBtn) {
                    // 🛑 SAFETY: Wait for Amazon to finish calculations
                    if (placeOrderBtn.disabled || document.querySelector('.a-spinner-loading')) {
                        logToOverlay('Waiting for price recalculation...', 'info');
                        IS_RUNNING = false; return;
                    }

                    logToOverlay('Review Page Ready. Capturing final amounts...', 'info');
                    await randomDelay(2000, 4000); // Deliberate pause for totals to settle after address change


                    // 1. Extract Order Total (Robust Strategy)
                    let totalCost = '0.00';

                    // Attempt A: Standard Selectors
                    const grandTotalEl = document.querySelector('.grand-total-price') ||
                        document.querySelector('#subtotals-marketplace-table .grand-total-price') ||
                        document.querySelector('.order-total-line-value') ||
                        document.querySelector('#orderTotalValue');

                    if (grandTotalEl) {
                        totalCost = grandTotalEl.innerText.trim();
                    }

                    // Attempt B: Text-based search (Very reliable fallback)
                    if (!totalCost || totalCost === '0.00' || totalCost === '$0.00') {
                        const allRows = Array.from(document.querySelectorAll('tr, .a-row, div'));
                        const totalRow = allRows.find(el => {
                            const text = el.innerText.toLowerCase();
                            return text.includes('order total:') && text.length < 100; // Look for small rows containing label
                        });

                        if (totalRow) {
                            // The price is usually in the last cell or an element with price class
                            const priceMatch = totalRow.innerText.match(/\$[0-9,.]+/);
                            if (priceMatch) {
                                totalCost = priceMatch[0];
                            }
                        }
                    }

                    if (totalCost === '0.00') {
                        logToOverlay('Warning: Could not detect Order Total. Check dashboard logs.', 'error');
                    }

                    // 2. Extract Delivery Date (Robust Strategy)
                    let deliveryDate = 'Unknown';
                    const deliveryEl = document.querySelector('[id*="widget-deliveryPromise"] .delivery-promise-header') ||
                        document.querySelector('[id*="widget-deliveryPromise"]') ||
                        document.querySelector('.a-color-success.a-text-bold'); // Often shows "Arriving Wednesday..."

                    if (deliveryEl) {
                        deliveryDate = deliveryEl.innerText.trim().replace(/\n/g, ' ');
                    }

                    // Fallback: Look for "Arriving" or "Delivery" text
                    if (deliveryDate === 'Unknown') {
                        const arrivingEl = Array.from(document.querySelectorAll('span, div, b'))
                            .find(el => {
                                const t = el.innerText;
                                return (t.includes('Arriving') || t.includes('Estimated delivery:')) && t.length < 100;
                            });
                        if (arrivingEl) deliveryDate = arrivingEl.innerText.trim();
                    }

                    logToOverlay(`💰 Total: ${totalCost} | 📅 Date: ${deliveryDate}`);

                    // Save extraction relative to order
                    await updateTask({
                        status: 'ORDER_SUBMITTED',
                        extracted: { totalCost, deliveryDate }
                    });

                    // Extra safety delay before final purchase
                    await randomDelay(1500, 2500);

                    logToOverlay('🚀 PLACING ORDER NOW...', 'success');
                    await safeClick(placeOrderBtn);
                    return; // Wait for reload
                }
            }

            // ===========================================================================
            // 🎉 PHASE 5: ORDER SUBMITTED (CONFIRMATION)
            // Goal: Get Purchase ID from URL, Save Everything
            // ===========================================================================
            if (status === 'ORDER_SUBMITTED') {
                // Check if we are on confirmation page
                const url = window.location.href;
                const isThankYou = url.includes('thankyou') || url.includes('thank-you');

                // Regex for Purchase ID (xxx-xxxxxxx-xxxxxxx)
                const purchaseIdMatch = url.match(/purchaseId=([0-9-]{15,})/);
                if (purchaseIdMatch || isThankYou) {
                    let purchaseId = purchaseIdMatch ? purchaseIdMatch[1] : null;

                    // Fallback: Scrape from page body if not in URL
                    if (!purchaseId) {
                        const bodyText = document.body.innerText;
                        const pageMatch = bodyText.match(/[0-9]{3}-[0-9]{7}-[0-9]{7}/);
                        if (pageMatch) purchaseId = pageMatch[0];
                    }

                    purchaseId = purchaseId || 'Found-In-Account-History';

                    logToOverlay(`🎉 Order Placed! ID: ${purchaseId}`, 'success');

                    // Final Data Payload
                    const finalData = {
                        orderId: orderData.id, // Internal ID
                        amazonOrderId: purchaseId,
                        cost: fulfillmentTask.extracted?.totalCost || '0.00',
                        deliveryDate: fulfillmentTask.extracted?.deliveryDate || 'N/A',
                        status: 'COMPLETED'
                    };

                    // Save to local storage for "Success" persistence
                    await chrome.storage.local.set({
                        lastCompletedOrder: finalData,
                        fulfillmentTask: { ...fulfillmentTask, status: 'DONE', result: finalData }
                    });

                    logToOverlay(`📡 Sending to Dashboard: Cost=${finalData.cost}, Date=${finalData.deliveryDate}`, 'info');

                    // Send Message to Background -> Dashboard to update DB
                    chrome.runtime.sendMessage({
                        action: 'ORDER_COMPLETED',
                        payload: finalData
                    });

                    IS_RUNNING = false;
                    clearInterval(POLLING_INTERVAL);
                }
            }

        } catch (e) {
            console.error(e);
            logToOverlay(`Error: ${e.message}`, 'error');
        } finally {
            IS_RUNNING = false;
        }
    };

    // 🏁 START ENGINE
    if (AMAZON_AUTO_ORDER_ENABLED) {
        logToOverlay('Amazon Automation Ready. Waiting for Trigger...', 'success');
        POLLING_INTERVAL = setInterval(runAutomationLoop, 1500);
    } else {
        console.info("Amazon auto-ordering is disabled in this build.");
    }

})();
