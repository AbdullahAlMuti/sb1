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
        btnDashboard: document.getElementById('btnDashboard'),
        btnSync: document.getElementById('btnSyncNow'),
        autoSync: document.getElementById('autoSync'),
        syncInterval: document.getElementById('syncInterval'),
        syncDays: document.getElementById('syncDays'),
        customDaysInput: document.getElementById('customDays'),
        lastSyncLabel: document.getElementById('lastSyncTime'),
        btnDisconnect: document.getElementById('btnDisconnect')
    };

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

        chrome.runtime.sendMessage({ action: 'CHECK_AUTH' }, (response) => {
            if (chrome.runtime.lastError) {
                // Extension context invalidated or other error
                showView('login');
                els.authStatus.textContent = 'Error';
                els.authStatus.className = 'status inactive';
                return;
            }

            if (response && response.success) {
                // State: Connected
                showView('settings');
                els.authStatus.textContent = 'Connected';
                els.authStatus.className = 'status active';

                if (response.user && response.user.email) {
                    const name = response.user.email.split('@')[0];
                    els.usernameDisplay.textContent = `Connected as: ${name}`;
                    els.usernameDisplay.classList.remove('hidden');
                }

                chrome.storage.local.get(['lastSyncTime'], (data) => {
                    if (data.lastSyncTime) {
                        els.lastSyncLabel.textContent = `Last Sync: ${new Date(data.lastSyncTime).toLocaleTimeString()}`;
                    }
                });

                loadSettings();
            } else {
                // State: Not Connected
                showView('login');
                els.authStatus.textContent = 'Not Connected';
                els.authStatus.className = 'status inactive';
            }
        });
    };

    const showView = (viewName) => {
        Object.values(views).forEach(el => el.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
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
    els.btnLogin.onclick = () => chrome.tabs.create({ url: `${baseUrl}/auth` });
    els.btnDashboard.onclick = () => chrome.tabs.create({ url: `${baseUrl}/dashboard` });

    // Disconnect / Logout
    if (els.btnDisconnect) {
        els.btnDisconnect.onclick = () => {
            chrome.runtime.sendMessage({ action: 'LOGOUT' }, () => {
                chrome.storage.local.remove(['saasToken', 'saasUser', 'userId', 'userEmail', 'userPlan', 'authTimestamp'], () => {
                    showView('login');
                    els.authStatus.textContent = 'Not Connected';
                    els.authStatus.className = 'status inactive';
                    els.usernameDisplay.classList.add('hidden');
                });
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

        chrome.runtime.sendMessage({ action: 'trigger_ebay_sync' }, (response) => {
            if (response && response.ok) {
                els.btnSync.textContent = '✅ Started';
                setTimeout(() => {
                    els.btnSync.textContent = '🔄 Sync Now';
                    els.btnSync.disabled = false;
                }, 2000);
            } else {
                els.btnSync.textContent = '❌ Failed';
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