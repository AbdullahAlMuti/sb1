document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const views = {
        login: document.getElementById('loginView'),
        settings: document.getElementById('settingsView')
    };
    const els = {
        authStatus: document.getElementById('authStatus'),
        usernameDisplay: document.getElementById('usernameDisplay'),
        toggleHelp: document.getElementById('toggleHelp'),
        helpSection: document.getElementById('helpSection'),
        btnLogin: document.getElementById('btnLogin'),
        btnLegacyLogin: document.getElementById('btnLegacyLogin'),
        btnPairingLogin: document.getElementById('btnPairingLogin'),
        btnDashboard: document.getElementById('btnDashboard'),
        btnSync: document.getElementById('btnSyncNow'),
        autoSync: document.getElementById('autoSync'),
        syncInterval: document.getElementById('syncInterval'),
        syncDays: document.getElementById('syncDays'),
        customDaysInput: document.getElementById('customDays'),
        lastSyncLabel: document.getElementById('lastSyncTime'),
        btnDisconnect: document.getElementById('btnDisconnect'),
        btnSwitchConnection: document.getElementById('btnSwitchConnection'),
        
        pairingCodeDisplay: document.getElementById('pairingCodeDisplay'),
        pairingStatusText: document.getElementById('pairingStatusText'),
        btnCancelPairing: document.getElementById('btnCancelPairing'),
        syncErrorMessage: document.getElementById('syncErrorMessage'),
        syncErrorContainer: document.getElementById('syncErrorContainer'),
        btnCloseSyncError: document.getElementById('btnCloseSyncError'),
        ebaySessionRequiredBanner: document.getElementById('ebaySessionRequiredBanner'),
        btnBannerOpenEbay: document.getElementById('btnBannerOpenEbay'),
        btnBannerSyncNow: document.getElementById('btnBannerSyncNow'),
        btnBannerDismiss: document.getElementById('btnBannerDismiss')
    };

    let pairingPollInterval = null;

    // Helper to get base URL
    const getBaseUrl = () => {
        return (typeof ExtensionConfig !== 'undefined' && ExtensionConfig.URLS?.WEB_APP_BASE)
            ? ExtensionConfig.URLS.WEB_APP_BASE
            : "http://localhost:3001";
    };

    const baseUrl = getBaseUrl();

    // 1. Check Auth Status
    const checkAuth = () => {
        // State: Connecting
        els.authStatus.textContent = 'Connecting...';
        els.authStatus.className = 'status connecting';
        els.usernameDisplay.classList.add('hidden');

        chrome.runtime.sendMessage({ action: 'GET_EXTENSION_AUTH_STATE' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                showView('login');
                setupLoginButtons({
                    extension_new_auth_enabled: false,
                    extension_legacy_fallback_enabled: true
                });
                els.authStatus.textContent = 'Error';
                els.authStatus.className = 'status inactive';
                return;
            }

            const { config, isValid, type, user } = response;

            if (isValid) {
                // State: Connected
                showView('settings');
                els.authStatus.textContent = type === 'new' ? 'Connected (New)' : 'Connected';
                els.authStatus.className = 'status active';

                if (user && user.email) {
                    const name = user.email.split('@')[0];
                    els.usernameDisplay.textContent = `Connected as: ${name}`;
                    els.usernameDisplay.classList.remove('hidden');
                }

                chrome.storage.local.get(['lastSyncTime', 'ebaySessionRequired'], (data) => {
                    if (data.lastSyncTime) {
                        els.lastSyncLabel.textContent = `Last Sync: ${new Date(data.lastSyncTime).toLocaleTimeString()}`;
                    }
                    if (data.ebaySessionRequired) {
                        els.ebaySessionRequiredBanner.classList.remove('hidden');
                    } else {
                        els.ebaySessionRequiredBanner.classList.add('hidden');
                    }
                });

                if (config && config.extension_new_auth_enabled && type !== 'new') {
                    if (els.btnSwitchConnection) els.btnSwitchConnection.classList.remove('hidden');
                } else {
                    if (els.btnSwitchConnection) els.btnSwitchConnection.classList.add('hidden');
                }

                loadSettings();
            } else {
                // State: Not Connected
                showView('login');
                setupLoginButtons(config);
                els.authStatus.textContent = 'Not Connected';
                els.authStatus.className = 'status inactive';
            }
        });
    };

    const setupLoginButtons = (config) => {
        els.btnLogin.classList.add('hidden');
        els.btnLegacyLogin.classList.add('hidden');
        els.btnPairingLogin.classList.add('hidden');

        if (config && config.extension_new_auth_enabled) {
            els.btnLogin.classList.remove('hidden');
            if (config.extension_pairing_fallback_enabled) {
                els.btnPairingLogin.classList.remove('hidden');
            }
        } else {
            els.btnLegacyLogin.classList.remove('hidden');
        }
    };

    const showView = (viewName) => {
        Object.values(views).forEach(el => {
            if (el) el.classList.add('hidden');
        });
        const pairings = document.getElementById('pairingView');
        if (pairings) pairings.classList.add('hidden');
        
        if (viewName === 'pairing') {
            pairings.classList.remove('hidden');
        } else if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }
    };

    // Pairing Logic
    const startPairing = () => {
        showView('pairing');
        els.pairingCodeDisplay.textContent = '------';
        els.pairingStatusText.textContent = 'Starting pairing...';
        
        chrome.runtime.sendMessage({ action: 'START_PAIRING' }, (res) => {
            if (res && res.success) {
                els.pairingCodeDisplay.textContent = res.pairingCode.match(/.{1,3}/g).join('-');
                els.pairingStatusText.textContent = 'Waiting for approval...';
                
                // Start polling
                if (pairingPollInterval) clearInterval(pairingPollInterval);
                pairingPollInterval = setInterval(pollPairingStatus, 2000);
            } else {
                els.pairingStatusText.textContent = 'Error starting pairing.';
            }
        });
    };

    const pollPairingStatus = () => {
        chrome.runtime.sendMessage({ action: 'POLL_PAIRING_STATUS' }, (res) => {
            if (res && res.success) {
                if (res.status === 'approved') {
                    clearInterval(pairingPollInterval);
                    els.pairingStatusText.textContent = 'Approved! Connecting...';
                    redeemPairing();
                } else if (res.status === 'rejected') {
                    clearInterval(pairingPollInterval);
                    els.pairingStatusText.textContent = 'Pairing rejected.';
                    setTimeout(() => showView('login'), 2000);
                } else if (res.status === 'expired') {
                    clearInterval(pairingPollInterval);
                    els.pairingStatusText.textContent = 'Code expired.';
                    setTimeout(() => showView('login'), 2000);
                }
            }
        });
    };

    const redeemPairing = () => {
        chrome.runtime.sendMessage({ action: 'REDEEM_PAIRING' }, (res) => {
            if (res && res.success) {
                checkAuth();
            } else {
                els.pairingStatusText.textContent = 'Error connecting: ' + (res?.error || 'Unknown');
                setTimeout(() => showView('login'), 2000);
            }
        });
    };

    const cancelPairing = () => {
        if (pairingPollInterval) clearInterval(pairingPollInterval);
        chrome.storage.local.remove(['tempConnectToken', 'tempClientSecret', 'tempPairingExpires']);
        showView('login');
    };

    // 2. Load Settings from Storage
    const loadSettings = async () => {
        const data = await chrome.storage.local.get(['ebaySyncEnabled', 'ebaySyncInterval', 'ebaySyncDays']);

        // Defaults
        els.autoSync.checked = data.ebaySyncEnabled !== false; // Default true

        // Interval (ms to minutes)
        const intervalMins = (data.ebaySyncInterval || 3600000) / 60000;
        setSelectValue(els.syncInterval, intervalMins);

        // Days
        const days = data.ebaySyncDays || 90;
        setSelectValue(els.syncDays, days);

        // Handle Custom
        if (els.syncDays.value === 'custom' || !Array.from(els.syncDays.options).some(o => o.value == days)) {
            els.syncDays.value = 'custom';
            els.customDaysInput.value = days;
            els.customDaysInput.classList.remove('hidden');
        } else {
            els.customDaysInput.classList.add('hidden');
        }
    };

    const setSelectValue = (select, value) => {
        const option = Array.from(select.options).find(o => o.value == value);
        if (option) {
            select.value = value;
        } else {
            // Not in list -> likely custom
        }
    };

    // 3. Save Settings
    const saveSettings = async () => {
        const enabled = els.autoSync.checked;
        const interval = parseInt(els.syncInterval.value) * 60 * 1000;
        let days = parseInt(els.syncDays.value);

        if (els.syncDays.value === 'custom') {
            days = parseInt(els.customDaysInput.value) || 90;
        }

        await chrome.storage.local.set({
            ebaySyncEnabled: enabled,
            ebaySyncInterval: interval,
            ebaySyncDays: days
        });

        // Notify Background to restart interval
    };

    // Event Listeners
    els.btnLogin.onclick = () => chrome.tabs.create({ url: `${baseUrl}/dashboard/settings/extension` });
    els.btnLegacyLogin.onclick = () => chrome.tabs.create({ url: `${baseUrl}/auth` });
    els.btnPairingLogin.onclick = startPairing;
    if (els.btnSwitchConnection) els.btnSwitchConnection.onclick = startPairing;
    els.btnCancelPairing.onclick = cancelPairing;
    els.btnDashboard.onclick = () => chrome.tabs.create({ url: `${baseUrl}/dashboard` });
    if (els.btnCloseSyncError) {
        els.btnCloseSyncError.onclick = () => {
            els.syncErrorContainer.classList.add('hidden');
        };
    }

    if (els.btnBannerOpenEbay) els.btnBannerOpenEbay.onclick = () => chrome.tabs.create({ url: 'https://www.ebay.com/sh/ord' });
    if (els.btnBannerSyncNow) els.btnBannerSyncNow.onclick = () => {
        els.btnSync.click();
    };
    if (els.btnBannerDismiss) els.btnBannerDismiss.onclick = () => {
        els.ebaySessionRequiredBanner.classList.add('hidden');
    };

    // Disconnect / Logout
    if (els.btnDisconnect) {
        els.btnDisconnect.onclick = () => {
            chrome.runtime.sendMessage({ action: 'LOGOUT_EXTENSION_SESSION' }, () => {
                showView('login');
                els.authStatus.textContent = 'Not Connected';
                els.authStatus.className = 'status inactive';
                els.usernameDisplay.classList.add('hidden');
                checkAuth();
            });
        };
    }

    // Help Toggle
    els.toggleHelp.onclick = () => {
        els.helpSection.classList.toggle('hidden');
    };

    // Auto-save on change
    els.autoSync.onchange = saveSettings;
    els.syncInterval.onchange = saveSettings;

    els.syncDays.onchange = () => {
        if (els.syncDays.value === 'custom') {
            els.customDaysInput.classList.remove('hidden');
            els.customDaysInput.focus();
        } else {
            els.customDaysInput.classList.add('hidden');
            saveSettings();
        }
    };

    els.customDaysInput.oninput = saveSettings;

    els.btnSync.onclick = () => {
        els.btnSync.textContent = '⏳ Starting...';
        els.btnSync.disabled = true;
        if (els.syncErrorContainer) els.syncErrorContainer.classList.add('hidden');

        const progressListener = (request) => {
            if (request.action === 'SYNC_PROGRESS' && els.btnSync.disabled) {
                els.btnSync.textContent = '⏳ ' + request.status;
            }
        };
        chrome.runtime.onMessage.addListener(progressListener);

        chrome.runtime.sendMessage({ action: 'trigger_ebay_sync' }, (response) => {
            chrome.runtime.onMessage.removeListener(progressListener);
            if (response && response.ok) {
                els.btnSync.textContent = '✅ Started';
                setTimeout(() => {
                    els.btnSync.textContent = '🔄 Sync Now';
                    els.btnSync.disabled = false;
                }, 2000);
            } else {
                els.btnSync.textContent = '❌ Failed';
                if (els.syncErrorMessage && els.syncErrorContainer) {
                    els.syncErrorMessage.textContent = response?.error || 'Unknown error occurred.';
                    els.syncErrorContainer.classList.remove('hidden');
                }
                console.error(response?.error);
                setTimeout(() => {
                    els.btnSync.textContent = '🔄 Sync Now';
                    els.btnSync.disabled = false;
                }, 2000);
            }
        });
    };

    // Initialize
    checkAuth();
});