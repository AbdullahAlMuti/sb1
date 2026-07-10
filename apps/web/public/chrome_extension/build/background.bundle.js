(function() {
	//#region \0rolldown/runtime.js
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	//#endregion
	//#region background/setup.js
	if (typeof window === "undefined") self.window = self;
	//#endregion
	//#region common/config.js
	var require_config = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var ExtensionConfig = (() => {
			const WEB_APP_DOMAIN = "https://sellersuit.com";
			const URLS = Object.freeze({
				SUPABASE_URL: "https://ojxzssooylmydystjvdo.supabase.co",
				SUPABASE_FUNCTIONS: "https://ojxzssooylmydystjvdo.supabase.co/functions/v1",
				WEB_APP_BASE: WEB_APP_DOMAIN,
				WEB_APP_AUTH: `${WEB_APP_DOMAIN}/auth`,
				WEB_APP_DASHBOARD: `${WEB_APP_DOMAIN}/dashboard`,
				DEFAULT_GOOGLE_SHEET: "",
				LOCAL_BACKEND: WEB_APP_DOMAIN,
				AI_REMOVE_BG: `${WEB_APP_DOMAIN}/v1/ai/remove-bg`
			});
			const API_KEYS = Object.freeze({ SUPABASE_ANON: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc" });
			const TIMING = Object.freeze({
				AUTH_CHECK_INTERVAL: 300 * 1e3,
				AUTH_GRACE_PERIOD: 1800 * 1e3,
				SETTINGS_SYNC_INTERVAL: 1800 * 1e3,
				AUTO_ORDER_POLL_INTERVAL: 300 * 1e3,
				REQUEST_TIMEOUT: 3e4,
				AUTH_REQUEST_TIMEOUT: 15e3,
				BASE_RETRY_DELAY: 1e3,
				MAX_RETRIES: 3,
				TOAST_DURATION: 3e3,
				DEBOUNCE_DELAY: 300,
				UI_ANIMATION_DURATION: 300
			});
			const constants = typeof ExtensionConstants !== "undefined" ? ExtensionConstants : {};
			const STORAGE_KEYS = constants.STORAGE_KEYS || {};
			const ACTIONS = constants.ACTIONS || {};
			const AMAZON_SELECTORS = constants.AMAZON_SELECTORS || {};
			const IMAGE_CONFIG = constants.IMAGE_CONFIG || {};
			const LOG_PREFIXES = constants.LOG_PREFIXES || {};
			const FEATURES = Object.freeze({
				DEBUG_MODE: false,
				ENABLE_CACHING: true,
				ENABLE_AUTO_ORDERS: false,
				ENABLE_ANALYTICS: true,
				ENABLE_SYNC_QUEUE: true,
				EXTENSION_NEW_AUTH_ENABLED: true,
				EXTENSION_LEGACY_FALLBACK_ENABLED: false,
				EXTENSION_PAIRING_FALLBACK_ENABLED: true,
				EXTENSION_AUTO_CONNECT_ENABLED: false
			});
			/**
			* Get full Supabase function URL
			* @param {string} functionName - Edge function name
			* @returns {string} Full URL
			*/
			function getSupabaseFunctionUrl(functionName) {
				return `${URLS.SUPABASE_FUNCTIONS}/${functionName}`;
			}
			/**
			* Get Supabase REST URL for a table
			* @param {string} table - Table name
			* @param {string} query - Optional query string
			* @returns {string} Full URL
			*/
			function getSupabaseRestUrl(table, query = "") {
				return `${URLS.SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`;
			}
			/**
			* Check if a feature is enabled
			* @param {string} featureName - Feature name
			* @returns {boolean}
			*/
			function isFeatureEnabled(featureName) {
				return FEATURES[featureName] === true;
			}
			/**
			* Get timing value with optional multiplier
			* @param {string} key - Timing key
			* @param {number} multiplier - Optional multiplier
			* @returns {number}
			*/
			function getTiming(key, multiplier = 1) {
				return (TIMING[key] || 1e3) * multiplier;
			}
			return Object.freeze({
				URLS,
				API_KEYS,
				TIMING,
				STORAGE_KEYS,
				ACTIONS,
				AMAZON_SELECTORS,
				IMAGE_CONFIG,
				FEATURES,
				LOG_PREFIXES,
				getSupabaseFunctionUrl,
				getSupabaseRestUrl,
				isFeatureEnabled,
				getTiming
			});
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = ExtensionConfig;
		if (typeof self !== "undefined") self.ExtensionConfig = ExtensionConfig;
		if (typeof window !== "undefined") window.ExtensionConfig = ExtensionConfig;
	}));
	//#endregion
	//#region common/constants.js
	var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var ExtensionConstants = (() => {
			const STORAGE_KEYS = Object.freeze({
				SAAS_TOKEN: "saasToken",
				SAAS_USER: "saasUser",
				USER_ID: "userId",
				USER_EMAIL: "userEmail",
				USER_PLAN: "userPlan",
				USER_CREDITS: "userCredits",
				AUTH_TIMESTAMP: "authTimestamp",
				EXTENSION_DEVICE_ID: "extensionDeviceId",
				EXTENSION_ACCESS_TOKEN: "extensionAccessToken",
				EXTENSION_REFRESH_TOKEN: "extensionRefreshToken",
				EXTENSION_TOKEN_EXPIRES_AT: "extensionTokenExpiresAt",
				EXTENSION_BOOTSTRAP_CACHE: "extensionBootstrapCache",
				EXTENSION_INSTALL_ID: "extensionInstallId",
				LEGACY_BACKUP_V1: "legacyExtensionStorageBackup_v1",
				GOOGLE_SHEET_URL: "googleSheetUrl",
				GOOGLE_APPS_SCRIPT_URL: "googleAppsScriptUrl",
				GEMINI_API_KEY: "geminiApiKey",
				REPLICATE_API_KEY: "replicateApiKey",
				THEME: "snipeEditorTheme",
				AUTO_WATERMARK: "autoWatermarkEnabled",
				FIRST_INSTALL: "firstInstall",
				LISTED_COUNT: "listedCount",
				PENDING_SYNC_QUEUE: "pendingSyncQueue",
				IMAGE_CACHE: "imageCache",
				SCRAPE_CACHE: "scrapeCache"
			});
			const ACTIONS = Object.freeze({
				LOGIN_SUCCESS: "LOGIN_SUCCESS",
				LOGOUT: "LOGOUT",
				SYNC_TOKEN: "SYNC_TOKEN",
				CHECK_AUTH: "CHECK_AUTH",
				START_PAIRING: "START_PAIRING",
				POLL_PAIRING_STATUS: "POLL_PAIRING_STATUS",
				REDEEM_PAIRING: "REDEEM_PAIRING",
				GET_EXTENSION_AUTH_STATE: "GET_EXTENSION_AUTH_STATE",
				LOGOUT_EXTENSION_SESSION: "LOGOUT_EXTENSION_SESSION",
				AI_REMOVE_BG: "AI_REMOVE_BG",
				GENERATE_TITLE: "GENERATE_TITLE",
				BG_REMOVED_SUCCESS: "BG_REMOVED_SUCCESS",
				BG_REMOVED_ERROR: "BG_REMOVED_ERROR",
				START_OPTILIST: "START_OPTILIST",
				CREATE_AUTO_ORDER: "createAutoOrder",
				SCRAPE_PRODUCT: "SCRAPE_PRODUCT",
				GET_IMAGES: "GET_IMAGES",
				SHOW_TOAST: "SHOW_TOAST",
				UPDATE_BADGE: "UPDATE_BADGE"
			});
			const AMAZON_SELECTORS = Object.freeze({
				TITLE: "#productTitle",
				PRICE: [
					"#corePriceDisplay_desktop_feature_div .a-price-whole",
					"#corePrice_desktop .a-price .a-offscreen",
					"#price_inside_buybox",
					"#priceblock_ourprice",
					"#priceblock_dealprice",
					".a-price .a-offscreen",
					"[data-a-color=\"price\"] .a-offscreen"
				],
				IMAGES: [
					"#landingImage",
					"#imgTagWrapperId img",
					"#main-image-container img",
					".a-dynamic-image",
					"#imgBlkFront",
					"#imageBlock img",
					"#altImages img",
					"#altImages li img"
				],
				DETAIL_BULLETS: "#detailBullets_feature_div ul, #detail-bullets_feature_div ul",
				TECH_SPECS: "table[id*=\"productDetails\"], #productDetails_techSpec_section_1, #productDetails_techSpec_section_2",
				DESCRIPTION: "#productDescription",
				ASIN: "#ASIN, input[name=\"ASIN\"]"
			});
			const IMAGE_CONFIG = Object.freeze({
				MIN_WIDTH: 200,
				MIN_HEIGHT: 200,
				PREFERRED_MIN_WIDTH: 500,
				HIGH_RES_SIZE: "_SL1500_",
				FALLBACK_SIZES: [
					"_SL1200_",
					"_SL1000_",
					"_SL800_"
				],
				BLOCKED_PATTERNS: [
					"sprite",
					"transparent",
					"pixel",
					"spacer",
					"blank",
					"loading",
					"placeholder",
					"icon",
					"badge",
					"logo"
				],
				MAX_IMAGES: 12
			});
			const LOG_PREFIXES = Object.freeze({
				debug: "🔍",
				info: "ℹ️",
				success: "✅",
				warn: "⚠️",
				error: "❌",
				auth: "🔒",
				sync: "🔄",
				api: "🌐"
			});
			return Object.freeze({
				WEB_BASE_URL: "https://sellersuit.com",
				STORAGE_KEYS,
				ACTIONS,
				AMAZON_SELECTORS,
				IMAGE_CONFIG,
				LOG_PREFIXES
			});
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = ExtensionConstants;
		if (typeof self !== "undefined") self.ExtensionConstants = ExtensionConstants;
		if (typeof window !== "undefined") window.ExtensionConstants = ExtensionConstants;
	}));
	//#endregion
	//#region common/auth-helper.js
	var require_auth_helper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var AuthHelper = (() => {
			"use strict";
			const SUPABASE_URL = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : "https://ojxzssooylmydystjvdo.supabase.co";
			const SUPABASE_ANON_KEY = typeof ExtensionConfig !== "undefined" && ExtensionConfig.API_KEYS?.SUPABASE_ANON ? ExtensionConfig.API_KEYS.SUPABASE_ANON : void 0;
			let remoteConfigCache = null;
			let remoteConfigTimestamp = 0;
			let remoteConfigPromise = null;
			function log(level, message, data = null) {
				if (level === "debug") return;
				const logMessage = `[AuthHelper] ${{
					debug: "🔍",
					info: "ℹ️",
					success: "✅",
					warn: "⚠️",
					error: "❌"
				}[level] || "📝"} ${message}`;
				data ? console.log(logMessage, data) : console.log(logMessage);
			}
			/**
			* Safe fetching of feature flags
			*/
			async function getRemoteConfig() {
				if (remoteConfigCache && Date.now() - remoteConfigTimestamp < 300 * 1e3) return remoteConfigCache;
				if (remoteConfigPromise) return remoteConfigPromise;
				remoteConfigPromise = (async () => {
					const defaults = {
						extension_new_auth_enabled: false,
						extension_legacy_fallback_enabled: true,
						extension_pairing_fallback_enabled: true,
						extension_auto_connect_enabled: false
					};
					try {
						const url = `${SUPABASE_URL}/functions/v1/extension-config`;
						const controller = new AbortController();
						const timeoutId = setTimeout(() => controller.abort(), 3e3);
						const res = await fetch(url, {
							method: "GET",
							headers: {
								"Content-Type": "application/json",
								...SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}
							},
							signal: controller.signal
						});
						clearTimeout(timeoutId);
						if (res.ok) {
							const data = await res.json();
							remoteConfigCache = {
								...defaults,
								...data
							};
							remoteConfigTimestamp = Date.now();
							return remoteConfigCache;
						}
					} catch (e) {
						log("debug", "Remote config fetch failed, using safe defaults");
					}
					remoteConfigCache = typeof ExtensionConfig !== "undefined" && ExtensionConfig.FEATURES ? {
						extension_new_auth_enabled: ExtensionConfig.FEATURES.EXTENSION_NEW_AUTH_ENABLED,
						extension_legacy_fallback_enabled: ExtensionConfig.FEATURES.EXTENSION_LEGACY_FALLBACK_ENABLED,
						extension_pairing_fallback_enabled: ExtensionConfig.FEATURES.EXTENSION_PAIRING_FALLBACK_ENABLED,
						extension_auto_connect_enabled: ExtensionConfig.FEATURES.EXTENSION_AUTO_CONNECT_ENABLED
					} : defaults;
					remoteConfigTimestamp = Date.now();
					return remoteConfigCache;
				})();
				const result = await remoteConfigPromise;
				remoteConfigPromise = null;
				return result;
			}
			/**
			* Create local storage backup if it doesn't exist
			*/
			async function createLegacyBackupIfNeeded() {
				return new Promise((resolve) => {
					chrome.storage.local.get(null, (items) => {
						const backupKey = "legacyExtensionStorageBackup_v1";
						if (!items[backupKey]) {
							log("info", "Creating legacy storage backup V1");
							chrome.storage.local.set({ [backupKey]: items }, () => resolve());
						} else resolve();
					});
				});
			}
			/**
			* Save new auth session
			*/
			async function setNewAuthSession(sessionData) {
				await createLegacyBackupIfNeeded();
				return new Promise((resolve) => {
					const updates = {
						extensionAccessToken: sessionData.access_token,
						extensionRefreshToken: sessionData.refresh_token,
						extensionTokenExpiresAt: sessionData.expires_at,
						extensionDeviceId: sessionData.device_id
					};
					if (sessionData.user) {
						updates.saasUser = sessionData.user;
						updates.userId = sessionData.user.id;
						updates.userEmail = sessionData.user.email;
						updates.authTimestamp = Date.now();
					}
					chrome.storage.local.set(updates, resolve);
				});
			}
			/**
			* Clear new auth session (if invalid)
			*/
			async function clearNewAuthSession() {
				return new Promise((resolve) => {
					chrome.storage.local.remove([
						"extensionAccessToken",
						"extensionRefreshToken",
						"extensionTokenExpiresAt",
						"extensionBootstrapCache"
					], resolve);
				});
			}
			/**
			* Get the current auth token from extension storage
			* @returns {Promise<{token: string|null, user: object|null, isValid: boolean}>}
			*/
			async function getAuthToken() {
				const config = await getRemoteConfig();
				const isJwtExpired = (jwt) => {
					try {
						const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
						const payload = JSON.parse(atob(part));
						return typeof payload.exp === "number" && Date.now() / 1e3 >= payload.exp;
					} catch (_e) {
						return false;
					}
				};
				return new Promise((resolve) => {
					chrome.storage.local.get([
						"saasToken",
						"saasUser",
						"authTimestamp",
						"extensionAccessToken",
						"extensionTokenExpiresAt"
					], (result) => {
						if (config.extension_new_auth_enabled && result.extensionAccessToken) {
							if (!(result.extensionTokenExpiresAt && Date.now() / 1e3 > result.extensionTokenExpiresAt)) {
								log("debug", "Using new extension session token");
								return resolve({
									token: result.extensionAccessToken,
									user: result.saasUser,
									isValid: true,
									type: "new"
								});
							}
						}
						const token = result.saasToken;
						const user = result.saasUser;
						const timestamp = result.authTimestamp || 0;
						if (config.extension_legacy_fallback_enabled && token) {
							if (isJwtExpired(token)) {
								log("warn", "Legacy token is expired (JWT exp); treating as invalid");
								return resolve({
									token: null,
									user: null,
									isValid: false,
									type: "none"
								});
							}
							if (!(Date.now() - timestamp < 3600 * 1e3)) log("warn", "Legacy token past freshness window; server revalidation required");
							log("debug", "Token retrieved from storage (legacy)", { hasUser: !!user });
							return resolve({
								token,
								user,
								isValid: true,
								type: "legacy"
							});
						}
						log("debug", "No valid auth token found");
						resolve({
							token: null,
							user: null,
							isValid: false,
							type: "none"
						});
					});
				});
			}
			/**
			* Check if user is authenticated
			* @returns {Promise<boolean>}
			*/
			async function isAuthenticated() {
				const { token, isValid } = await getAuthToken();
				return !!token && isValid;
			}
			/**
			* Get auth headers for API calls
			* @returns {Promise<{Authorization?: string}>}
			*/
			async function getAuthHeaders() {
				const { token } = await getAuthToken();
				if (token) return { "Authorization": `Bearer ${token}` };
				return {};
			}
			/**
			* Make an authenticated API call to Supabase edge function
			* @param {string} functionName - Edge function name
			* @param {object} body - Request body
			* @param {object} options - Additional fetch options
			* @returns {Promise<{data: any, error: string|null}>}
			*/
			async function callEdgeFunction(functionName, body = {}, options = {}) {
				return performEdgeFunctionCall(functionName, body, options, false);
			}
			async function performEdgeFunctionCall(functionName, body, options, isRetry) {
				const { token, type } = await getAuthToken();
				if (!token) {
					log("warn", `Cannot call ${functionName}: No auth token`);
					return {
						data: null,
						error: "Not authenticated. Please log in to your SellerSuit account.",
						status: 401
					};
				}
				const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
				log("info", `Calling edge function: ${functionName}`, { hasToken: true });
				try {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), options.timeout || 3e4);
					const response = await fetch(url, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {},
							"Authorization": `Bearer ${token}`,
							...options.headers
						},
						body: JSON.stringify(body),
						signal: controller.signal
					});
					clearTimeout(timeoutId);
					if (!response.ok) {
						const errorText = await response.text();
						let serverMessage = "";
						try {
							const parsed = JSON.parse(errorText);
							serverMessage = parsed?.error?.message || parsed?.error || parsed?.message || parsed?.detail || "";
						} catch {}
						const message = (serverMessage || errorText || "").toString().trim();
						const clipped = message.length > 400 ? message.slice(0, 400) + "…" : message;
						log("error", `API error: ${response.status}`, clipped);
						if (response.status === 401) {
							if (type === "new" && !isRetry) {
								log("info", "Token expired, attempting refresh...");
								if (await refreshExtensionToken()) {
									log("success", "Refresh succeeded, retrying original request");
									return performEdgeFunctionCall(functionName, body, options, true);
								} else {
									log("error", "Refresh failed, session marked expired");
									await clearNewAuthSession();
								}
							}
							if (type === "legacy" && !isRetry) {
								log("info", "Legacy token expired, attempting refresh...");
								if (await refreshLegacyToken()) {
									log("success", "Legacy refresh succeeded, retrying original request");
									return performEdgeFunctionCall(functionName, body, options, true);
								} else log("error", "Legacy refresh failed");
							}
							return {
								data: null,
								error: clipped || "Session expired. Please log in again.",
								status: response.status
							};
						}
						if (response.status === 429) return {
							data: null,
							error: clipped || "Rate limit exceeded. Please try again in a moment.",
							status: response.status
						};
						if (response.status === 402) return {
							data: null,
							error: clipped || "AI credits exhausted. Please add funds to your account.",
							status: response.status
						};
						return {
							data: null,
							error: clipped || `API error: ${response.status}`,
							status: response.status
						};
					}
					const data = await response.json();
					log("success", `${functionName} completed`, { success: data.success });
					return {
						data,
						error: null,
						status: response.status
					};
				} catch (error) {
					log("error", `Network error calling ${functionName}`, error.message);
					return {
						data: null,
						error: "Network error. Please check your connection.",
						status: 0
					};
				}
			}
			/**
			* Refresh legacy Supabase session token
			*/
			async function refreshLegacyToken() {
				return new Promise((resolve) => {
					chrome.storage.local.get(["saasRefreshToken"], async (result) => {
						if (!result.saasRefreshToken) {
							log("warn", "No legacy refresh token available in storage");
							return resolve(false);
						}
						try {
							const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
							const response = await fetch(url, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}
								},
								body: JSON.stringify({ refresh_token: result.saasRefreshToken })
							});
							if (response.ok) {
								const data = await response.json();
								if (data.access_token) {
									log("success", "Legacy Supabase token refreshed successfully");
									await chrome.storage.local.set({
										saasToken: data.access_token,
										saasRefreshToken: data.refresh_token,
										authTimestamp: Date.now()
									});
									return resolve(true);
								}
							} else log("error", `Legacy refresh failed with status: ${response.status}`);
						} catch (e) {
							log("error", "Legacy token refresh exception", e);
						}
						resolve(false);
					});
				});
			}
			/**
			* Refresh extension token
			*/
			async function refreshExtensionToken() {
				return new Promise((resolve) => {
					chrome.storage.local.get(["extensionRefreshToken"], async (result) => {
						if (!result.extensionRefreshToken) return resolve(false);
						try {
							const url = `${SUPABASE_URL}/functions/v1/extension-token-refresh`;
							const response = await fetch(url, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}
								},
								body: JSON.stringify({ refreshToken: result.extensionRefreshToken })
							});
							if (response.ok) {
								const data = await response.json();
								if (data.success && data.session) {
									await setNewAuthSession(data.session);
									return resolve(true);
								}
							}
						} catch (e) {
							log("error", "Token refresh exception", e);
						}
						resolve(false);
					});
				});
			}
			/**
			* Get current user info
			*/
			async function getCurrentUser() {
				return new Promise((resolve) => {
					chrome.storage.local.get([
						"saasUser",
						"userId",
						"userEmail",
						"userPlan"
					], (result) => {
						if (result.saasUser) resolve(result.saasUser);
						else if (result.userId) resolve({
							id: result.userId,
							email: result.userEmail || "",
							plan: result.userPlan || "free"
						});
						else resolve(null);
					});
				});
			}
			/**
			* Show login prompt to user
			*/
			function promptLogin() {
				if (typeof UIHelper !== "undefined") UIHelper.showToast("Please log in to your SellerSuit account to use this feature.", "warning");
				else alert("Please log in to your SellerSuit account to use this feature.");
			}
			let isExtensionUnlocked = false;
			let lastAuthCheck = 0;
			const AUTH_CHECK_INTERVAL = 300 * 1e3;
			/**
			* Verify Auth with Backend (Enhanced)
			* Centralized from background.js
			*/
			async function verifyAuthStatus(forceRefresh = false, allowGrace = true) {
				if (allowGrace && !forceRefresh && Date.now() - lastAuthCheck < AUTH_CHECK_INTERVAL && isExtensionUnlocked) {
					log("debug", "Skipping auth check (recently verified)");
					return true;
				}
				try {
					const { token, type, isValid } = await getAuthToken();
					if (!token || !isValid) {
						log("warn", "LOCKDOWN: No valid auth token found");
						isExtensionUnlocked = false;
						return false;
					}
					const response = await callEdgeFunction("auth-status");
					const result = response.data || {};
					if (!response.error && result.success && result.user) {
						log("success", "Session verified");
						await chrome.storage.local.set({
							userId: result.user.id,
							userPlan: result.user.plan,
							userCredits: result.user.credits,
							userEmail: result.user.email,
							selectedListingTemplateId: result.user.selectedListingTemplateId || "default-professional",
							authTimestamp: Date.now()
						});
						isExtensionUnlocked = true;
						lastAuthCheck = Date.now();
						return true;
					}
					log("warn", "LOCKDOWN: Invalid session", {
						status: response.status,
						error: result.error || response.error
					});
					if (allowGrace) {
						const storage = await chrome.storage.local.get("authTimestamp");
						const justSynced = storage.authTimestamp && Date.now() - storage.authTimestamp < 60 * 1e3;
						if (response.error && justSynced) {
							isExtensionUnlocked = true;
							lastAuthCheck = Date.now();
							return true;
						}
					}
					isExtensionUnlocked = false;
					return false;
				} catch (e) {
					log("error", "Auth Check Error", { message: e.message });
					if (allowGrace) {
						const storage = await chrome.storage.local.get("authTimestamp");
						const justSynced = storage.authTimestamp && Date.now() - storage.authTimestamp < 60 * 1e3;
						if (isExtensionUnlocked && Date.now() - lastAuthCheck < 1800 * 1e3 || justSynced) {
							log("info", "Network error but using cached/synced auth status");
							isExtensionUnlocked = true;
							lastAuthCheck = Date.now();
							return true;
						}
					}
					isExtensionUnlocked = false;
					return false;
				}
			}
			return {
				getRemoteConfig,
				createLegacyBackupIfNeeded,
				setNewAuthSession,
				clearNewAuthSession,
				refreshExtensionToken,
				refreshLegacyToken,
				getAuthToken,
				isAuthenticated,
				getAuthHeaders,
				callEdgeFunction,
				getCurrentUser,
				promptLogin,
				SUPABASE_URL,
				verifyAuthStatus,
				isUnlocked: () => isExtensionUnlocked,
				setUnlocked: (val) => {
					isExtensionUnlocked = val;
				},
				getLastCheck: () => lastAuthCheck,
				setLastCheck: (val) => {
					lastAuthCheck = val;
				}
			};
		})();
		try {
			const _ssGlobal = typeof globalThis !== "undefined" && globalThis || typeof self !== "undefined" && self || typeof window !== "undefined" && window || null;
			if (_ssGlobal) _ssGlobal.AuthHelper = AuthHelper;
		} catch (_) {}
		if (typeof module !== "undefined" && module.exports) module.exports = AuthHelper;
	}));
	//#endregion
	//#region common/performance.js
	var require_performance = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var PerformanceUtils = (() => {
			const memoryCache = /* @__PURE__ */ new Map();
			const cacheTimestamps = /* @__PURE__ */ new Map();
			const DEFAULT_TTL = 300 * 1e3;
			/**
			* Get item from cache with TTL check
			* @param {string} key - Cache key
			* @param {number} ttl - Time to live in ms (default: 5 min)
			* @returns {any|null} Cached value or null if expired/missing
			*/
			function getCached(key, ttl = DEFAULT_TTL) {
				if (!memoryCache.has(key)) return null;
				const timestamp = cacheTimestamps.get(key) || 0;
				if (Date.now() - timestamp > ttl) {
					memoryCache.delete(key);
					cacheTimestamps.delete(key);
					return null;
				}
				return memoryCache.get(key);
			}
			/**
			* Set item in cache
			* @param {string} key - Cache key
			* @param {any} value - Value to cache
			*/
			function setCache(key, value) {
				memoryCache.set(key, value);
				cacheTimestamps.set(key, Date.now());
			}
			/**
			* Clear specific cache entry or all cache
			* @param {string} [key] - Optional key to clear (clears all if omitted)
			*/
			function clearCache(key = null) {
				if (key) {
					memoryCache.delete(key);
					cacheTimestamps.delete(key);
				} else {
					memoryCache.clear();
					cacheTimestamps.clear();
				}
			}
			/**
			* Cache wrapper for async functions
			* @param {string} key - Cache key
			* @param {Function} fn - Async function to execute if not cached
			* @param {number} ttl - Time to live
			* @returns {Promise<any>}
			*/
			async function withCache(key, fn, ttl = DEFAULT_TTL) {
				const cached = getCached(key, ttl);
				if (cached !== null) return cached;
				const result = await fn();
				setCache(key, result);
				return result;
			}
			const debounceTimers = /* @__PURE__ */ new Map();
			const throttleTimestamps = /* @__PURE__ */ new Map();
			/**
			* Debounce function calls
			* @param {string} key - Unique identifier for this debounce
			* @param {Function} fn - Function to debounce
			* @param {number} delay - Delay in ms
			*/
			function debounce(key, fn, delay = 300) {
				if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
				debounceTimers.set(key, setTimeout(() => {
					debounceTimers.delete(key);
					fn();
				}, delay));
			}
			/**
			* Throttle function calls
			* @param {string} key - Unique identifier for this throttle
			* @param {Function} fn - Function to throttle
			* @param {number} limit - Minimum time between calls
			* @returns {boolean} True if function was executed
			*/
			function throttle(key, fn, limit = 1e3) {
				const lastCall = throttleTimestamps.get(key) || 0;
				const now = Date.now();
				if (now - lastCall >= limit) {
					throttleTimestamps.set(key, now);
					fn();
					return true;
				}
				return false;
			}
			/**
			* Create a debounced function
			* @param {Function} fn - Function to debounce
			* @param {number} delay - Delay in ms
			* @returns {Function}
			*/
			function createDebouncedFn(fn, delay = 300) {
				let timer = null;
				return function(...args) {
					if (timer) clearTimeout(timer);
					timer = setTimeout(() => {
						timer = null;
						fn.apply(this, args);
					}, delay);
				};
			}
			/**
			* Create a throttled function
			* @param {Function} fn - Function to throttle
			* @param {number} limit - Minimum time between calls
			* @returns {Function}
			*/
			function createThrottledFn(fn, limit = 1e3) {
				let lastCall = 0;
				return function(...args) {
					const now = Date.now();
					if (now - lastCall >= limit) {
						lastCall = now;
						return fn.apply(this, args);
					}
				};
			}
			/**
			* Fetch with timeout, retry, and exponential backoff
			* @param {string} url - URL to fetch
			* @param {RequestInit} options - Fetch options
			* @param {Object} config - Retry configuration
			* @returns {Promise<Response>}
			*/
			async function fetchWithRetry(url, options = {}, config = {}) {
				const { maxRetries = 3, baseDelay = 1e3, timeout = 3e4, retryOn5xx = true } = config;
				let lastError;
				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						const controller = new AbortController();
						const timeoutId = setTimeout(() => controller.abort(), timeout);
						const response = await fetch(url, {
							...options,
							signal: controller.signal
						});
						clearTimeout(timeoutId);
						if (response.ok || response.status >= 400 && response.status < 500) return response;
						if (!retryOn5xx) return response;
						lastError = /* @__PURE__ */ new Error(`HTTP ${response.status}: ${response.statusText}`);
					} catch (err) {
						lastError = err;
						if (err.name === "AbortError") console.warn(`[PerformanceUtils] Request timeout (attempt ${attempt + 1}/${maxRetries + 1})`);
					}
					if (attempt < maxRetries) await sleep(baseDelay * Math.pow(2, attempt));
				}
				throw lastError;
			}
			/**
			* Sleep for a given duration
			* @param {number} ms - Milliseconds to sleep
			* @returns {Promise<void>}
			*/
			function sleep(ms) {
				return new Promise((resolve) => setTimeout(resolve, ms));
			}
			/**
			* Wait for a condition to be true
			* @param {Function} condition - Function that returns boolean
			* @param {Object} options - Options
			* @returns {Promise<void>}
			*/
			async function waitFor(condition, options = {}) {
				const { timeout = 1e4, interval = 100 } = options;
				const start = Date.now();
				while (Date.now() - start < timeout) {
					if (condition()) return;
					await sleep(interval);
				}
				throw new Error("Condition not met within timeout");
			}
			/**
			* Run multiple promises with concurrency limit
			* @param {Array<Function>} tasks - Array of functions returning promises
			* @param {number} concurrency - Max concurrent tasks
			* @returns {Promise<Array>}
			*/
			async function parallelLimit(tasks, concurrency = 3) {
				const results = [];
				const running = [];
				for (const task of tasks) {
					const promise = task().then((result) => {
						running.splice(running.indexOf(promise), 1);
						return result;
					});
					running.push(promise);
					results.push(promise);
					if (running.length >= concurrency) await Promise.race(running);
				}
				return Promise.all(results);
			}
			/**
			* Retry a function with exponential backoff
			* @param {Function} fn - Async function to retry
			* @param {Object} options - Retry options
			* @returns {Promise<any>}
			*/
			async function retry(fn, options = {}) {
				const { maxRetries = 3, baseDelay = 1e3, shouldRetry = () => true } = options;
				let lastError;
				for (let attempt = 0; attempt <= maxRetries; attempt++) try {
					return await fn(attempt);
				} catch (err) {
					lastError = err;
					if (!shouldRetry(err, attempt) || attempt >= maxRetries) throw err;
					await sleep(baseDelay * Math.pow(2, attempt));
				}
				throw lastError;
			}
			/**
			* Wait for an element to appear in the DOM
			* @param {string} selector - CSS selector
			* @param {Object} options - Options
			* @returns {Promise<Element>}
			*/
			function waitForElement(selector, options = {}) {
				const { timeout = 5e3, parent = document.body } = options;
				return new Promise((resolve, reject) => {
					const existing = document.querySelector(selector);
					if (existing) return resolve(existing);
					const observer = new MutationObserver(() => {
						const element = document.querySelector(selector);
						if (element) {
							observer.disconnect();
							resolve(element);
						}
					});
					observer.observe(parent, {
						childList: true,
						subtree: true
					});
					setTimeout(() => {
						observer.disconnect();
						reject(/* @__PURE__ */ new Error(`Element ${selector} not found within ${timeout}ms`));
					}, timeout);
				});
			}
			/**
			* Batch DOM reads to avoid layout thrashing
			* @param {Function} fn - Function with DOM reads
			* @returns {Promise<any>}
			*/
			function batchRead(fn) {
				return new Promise((resolve) => {
					requestAnimationFrame(() => {
						resolve(fn());
					});
				});
			}
			/**
			* Batch DOM writes to avoid layout thrashing
			* @param {Function} fn - Function with DOM writes
			* @returns {Promise<void>}
			*/
			function batchWrite(fn) {
				return new Promise((resolve) => {
					requestAnimationFrame(() => {
						fn();
						resolve();
					});
				});
			}
			const performanceMarks = /* @__PURE__ */ new Map();
			/**
			* Start performance measurement
			* @param {string} label - Measurement label
			*/
			function perfStart(label) {
				performanceMarks.set(label, performance.now());
			}
			/**
			* End performance measurement and log
			* @param {string} label - Measurement label
			* @returns {number} Duration in ms
			*/
			function perfEnd(label) {
				const start = performanceMarks.get(label);
				if (!start) return 0;
				const duration = performance.now() - start;
				performanceMarks.delete(label);
				console.log(`⏱️ [PERF] ${label}: ${duration.toFixed(2)}ms`);
				return duration;
			}
			/**
			* Measure async function execution time
			* @param {string} label - Measurement label
			* @param {Function} fn - Async function to measure
			* @returns {Promise<any>}
			*/
			async function measure(label, fn) {
				perfStart(label);
				try {
					return await fn();
				} finally {
					perfEnd(label);
				}
			}
			return Object.freeze({
				getCached,
				setCache,
				clearCache,
				withCache,
				debounce,
				throttle,
				createDebouncedFn,
				createThrottledFn,
				fetchWithRetry,
				sleep,
				waitFor,
				parallelLimit,
				retry,
				waitForElement,
				batchRead,
				batchWrite,
				perfStart,
				perfEnd,
				measure
			});
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = PerformanceUtils;
		if (typeof self !== "undefined") self.PerformanceUtils = PerformanceUtils;
		if (typeof window !== "undefined") window.PerformanceUtils = PerformanceUtils;
	}));
	//#endregion
	//#region common/message-handler.js
	var require_message_handler = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var MessageHandler = (() => {
			const handlers = /* @__PURE__ */ new Map();
			const middlewares = [];
			/**
			* Register a message handler
			* @param {string} action - Action name
			* @param {Function} handler - Handler function (request, sender) => response
			* @param {Object} options - Handler options
			*/
			function register(action, handler, options = {}) {
				const config = {
					requiresAuth: true,
					async: true,
					...options
				};
				handlers.set(action, {
					handler,
					config
				});
				console.log(`📨 Handler registered: ${action}`);
			}
			/**
			* Register multiple handlers at once
			* @param {Object} handlerMap - { action: handler } or { action: { handler, options } }
			*/
			function registerAll(handlerMap) {
				for (const [action, value] of Object.entries(handlerMap)) if (typeof value === "function") register(action, value);
				else register(action, value.handler, value.options);
			}
			/**
			* Add middleware that runs before handlers
			* @param {Function} middleware - (request, sender, next) => response
			*/
			function use(middleware) {
				middlewares.push(middleware);
			}
			/**
			* Process an incoming message
			* @param {Object} request - Message request
			* @param {Object} sender - Message sender
			* @param {Function} sendResponse - Response callback
			* @returns {boolean} True if async response expected
			*/
			function process(request, sender, sendResponse) {
				const action = request.action;
				const handlerInfo = handlers.get(action);
				if (!handlerInfo) {
					console.warn(`📨 No handler for action: ${action}`);
					return false;
				}
				const { handler, config } = handlerInfo;
				(async () => {
					try {
						let shouldContinue = true;
						for (const middleware of middlewares) {
							const result = await middleware(request, sender, config);
							if (result === false) {
								shouldContinue = false;
								break;
							}
							if (result && typeof result === "object" && result.handled) {
								safeSendResponse(sendResponse, result.response);
								return;
							}
						}
						if (!shouldContinue) return;
						safeSendResponse(sendResponse, await handler(request, sender));
					} catch (error) {
						console.error(`❌ Handler error for ${action}:`, error);
						safeSendResponse(sendResponse, {
							success: false,
							error: error.message
						});
					}
				})();
				return config.async;
			}
			/**
			* Safe send response that handles closed ports
			* @param {Function} sendResponse - Response callback
			* @param {any} data - Response data
			*/
			function safeSendResponse(sendResponse, data) {
				try {
					if (sendResponse && typeof sendResponse === "function") sendResponse(data);
				} catch (e) {
					console.warn("Could not send response (port closed):", e.message);
				}
			}
			/**
			* Create the main message listener
			* @returns {Function} Listener function for chrome.runtime.onMessage
			*/
			function createListener() {
				return (request, sender, sendResponse) => {
					return process(request, sender, sendResponse);
				};
			}
			return Object.freeze({
				register,
				registerAll,
				use,
				process,
				createListener,
				safeSendResponse
			});
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = MessageHandler;
		if (typeof self !== "undefined") self.MessageHandler = MessageHandler;
		if (typeof window !== "undefined") window.MessageHandler = MessageHandler;
	}));
	//#endregion
	//#region common/retry-helper.js
	var require_retry_helper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var RetryHelper = (() => {
			"use strict";
			/**
			* Fetch with retry and exponential backoff
			* @param {string} url - The URL to fetch
			* @param {RequestInit} options - Fetch options
			* @param {number} maxRetries - Maximum number of retries (default: 3)
			* @param {number} baseDelay - Base delay in ms (default: 1000)
			* @returns {Promise<Response>}
			*/
			async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1e3) {
				let lastError;
				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 3e4);
					let abortListener;
					if (options.signal) if (options.signal.aborted) controller.abort();
					else {
						abortListener = () => controller.abort();
						options.signal.addEventListener("abort", abortListener);
					}
					try {
						const response = await fetch(url, {
							...options,
							signal: controller.signal
						});
						if (response.ok || response.status >= 400 && response.status < 500) return response;
						lastError = /* @__PURE__ */ new Error(`HTTP ${response.status}: ${response.statusText}`);
					} catch (err) {
						lastError = err;
						if (options.signal && options.signal.aborted) throw err;
					} finally {
						clearTimeout(timeoutId);
						if (options.signal && abortListener) options.signal.removeEventListener("abort", abortListener);
					}
					if (attempt < maxRetries) {
						const delay = baseDelay * Math.pow(2, attempt);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
				throw lastError;
			}
			return { fetchWithRetry };
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = RetryHelper;
		if (typeof self !== "undefined") self.RetryHelper = RetryHelper;
		if (typeof window !== "undefined") window.RetryHelper = RetryHelper;
	}));
	//#endregion
	//#region common/api-client.js
	var require_api_client = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var ApiClient = (() => {
			"use strict";
			/**
			* Centralized request wrapper
			* @param {string} url - Request URL
			* @param {RequestInit} options - Fetch options
			* @returns {Promise<Response>}
			*/
			async function request(url, options = {}) {
				const headers = {
					"Content-Type": "application/json",
					...options.headers
				};
				const fetchOptions = {
					...options,
					headers
				};
				return fetch(url, fetchOptions);
			}
			/**
			* Helper to call Supabase Edge Functions
			* @param {string} functionName - Name of the edge function
			* @param {object} body - Request body
			* @param {object} options - Fetch options override
			* @returns {Promise<Response>}
			*/
			async function callEdgeFunction(functionName, body = {}, options = {}) {
				const supabaseUrl = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : "https://ojxzssooylmydystjvdo.supabase.co";
				const supabaseAnonKey = typeof ExtensionConfig !== "undefined" && ExtensionConfig.API_KEYS?.SUPABASE_ANON ? ExtensionConfig.API_KEYS.SUPABASE_ANON : void 0;
				return request(`${supabaseUrl}/functions/v1/${functionName}`, {
					method: "POST",
					headers: {
						...supabaseAnonKey ? { apikey: supabaseAnonKey } : {},
						...options.headers
					},
					body: JSON.stringify(body),
					...options
				});
			}
			return {
				request,
				callEdgeFunction
			};
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = ApiClient;
		if (typeof self !== "undefined") self.ApiClient = ApiClient;
		if (typeof window !== "undefined") window.ApiClient = ApiClient;
	}));
	//#endregion
	//#region common/sync-utils.js
	var require_sync_utils = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var SyncUtils = (() => {
			"use strict";
			const SUPABASE_URL = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : "https://ojxzssooylmydystjvdo.supabase.co";
			const SUPABASE_ANON_KEY = typeof ExtensionConfig !== "undefined" && ExtensionConfig.API_KEYS?.SUPABASE_ANON ? ExtensionConfig.API_KEYS.SUPABASE_ANON : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHpzc29veWxteWR5c3RqdmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY3NTgsImV4cCI6MjA4MTkxMjc1OH0.lQcFC2HryZamOEbGYONHpY37K0kTK4OOAa9MlluV7Dc";
			function _sessionStore() {
				try {
					if (chrome.storage && chrome.storage.session) return chrome.storage.session;
				} catch (_) {}
				return chrome.storage.local;
			}
			function syncLog(level, message, data = null) {
				const prefix = {
					debug: "🔍",
					info: "ℹ️",
					success: "✅",
					warn: "⚠️",
					error: "❌"
				}[level] || "📝";
				const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
				if (data) console.log(`[${timestamp}] ${prefix} [SYNC] ${message}`, data);
				else console.log(`[${timestamp}] ${prefix} [SYNC] ${message}`);
				try {
					chrome.tabs.query({}, (tabs) => {
						for (const tab of tabs) chrome.tabs.sendMessage(tab.id, {
							action: "SYNC_LOG",
							level,
							message: `[${timestamp}] ${prefix} [Sync] ${message}`,
							data
						}).catch(() => {});
					});
				} catch (e) {}
			}
			function getSafeListingIdentity(listingData = {}) {
				return {
					sku: listingData.sku || listingData.ebaySku || null,
					asin: listingData.amazon_asin || listingData.amazonAsin || null
				};
			}
			async function recordListingSyncError({ source = "sync_utils", status = null, error = "Unknown sync error", details = null, listingData = {} } = {}) {
				try {
					const entry = {
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						status,
						source,
						error: String(error || "Unknown sync error").slice(0, 500),
						...getSafeListingIdentity(listingData)
					};
					if (details && typeof details === "object") entry.details = {
						action: details.action || void 0,
						code: details.code || void 0,
						message: details.message ? String(details.message).slice(0, 300) : void 0
					};
					const data = await chrome.storage.local.get(["listingSyncErrors"]);
					const nextErrors = [entry, ...Array.isArray(data.listingSyncErrors) ? data.listingSyncErrors : []].slice(0, 10);
					await chrome.storage.local.set({
						listingSyncLastError: entry,
						listingSyncErrors: nextErrors
					});
				} catch (err) {
					syncLog("warn", "Failed to record listing sync error", err?.message || err);
				}
			}
			/**
			* Sync a listing to the backend with retry (uses create-listing function)
			* @param {object} listingData - The listing data to sync
			* @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
			*/
			async function syncListing(listingData) {
				if (typeof AuthHelper === "undefined") {
					const error = "AuthHelper is not available.";
					await recordListingSyncError({
						source: "sync_utils",
						error,
						listingData
					});
					return {
						success: false,
						source: "sync_utils",
						status: 500,
						error
					};
				}
				try {
					const enrichedListingData = {
						...listingData,
						amazon_data: listingData?.amazon_data ?? {
							...listingData?.amazon_url ? { amazonUrl: listingData.amazon_url } : {},
							...listingData?.amazon_asin ? { asin: listingData.amazon_asin } : {},
							...listingData?.title ? { title: listingData.title } : {},
							...listingData?.amazon_price != null ? { price: listingData.amazon_price } : {},
							source: "extension"
						},
						ebay_data: listingData?.ebay_data ?? {
							...listingData?.title ? { title: listingData.title } : {},
							...listingData?.sku ? { sku: listingData.sku } : {},
							...listingData?.ebay_price != null ? { price: listingData.ebay_price } : {},
							...listingData?.ebay_item_id ? { ebayItemId: listingData.ebay_item_id } : {},
							source: "extension"
						}
					};
					syncLog("info", "Syncing listing via create-listing...", {
						title: listingData.title,
						sku: listingData.sku
					});
					const response = await AuthHelper.callEdgeFunction("create-listing", enrichedListingData);
					const result = response.data;
					const status = response.status || 0;
					if (response.error) {
						const error = response.error || `create-listing failed with HTTP ${status}`;
						syncLog("error", "Sync listing failed", {
							status,
							error
						});
						await recordListingSyncError({
							source: "sync_utils",
							status,
							error,
							details: result,
							listingData
						});
						return {
							success: false,
							source: "sync_utils",
							status,
							error,
							details: result
						};
					}
					syncLog("success", "Listing synced", {
						action: result.action,
						id: result.listing?.id
					});
					return {
						success: true,
						source: "sync_utils",
						listingId: result?.listing?.id,
						status,
						details: result
					};
				} catch (err) {
					syncLog("error", "Sync listing error", err);
					const error = err?.message || "Listing sync failed";
					await recordListingSyncError({
						source: "sync_utils",
						error,
						listingData
					});
					return {
						success: false,
						source: "sync_utils",
						error
					};
				}
			}
			async function injectedFetchEbayCsv(syncDays) {
				try {
					let srt = null;
					try {
						if (window.raptor && window.raptor.require) srt = window.raptor.require("ebay.raptor.engine.Context").get("csrftoken");
					} catch (e) {
						console.log("SellerSuit: raptor context not found");
					}
					if (!srt) {
						const patterns = [
							/downloadCsrfToken['"]\s*:\s*['"]([A-Za-z0-9_-]+)['"]/,
							/downloadCsrfToken\s*=\s*['"]([A-Za-z0-9_-]+)['"]/,
							/['"]srt['"]\s*[:=]\s*['"]([A-Za-z0-9_-]+)['"]/,
							/name=['"]srt['"][^>]*value=['"]([A-Za-z0-9_-]+)['"]/i,
							/\"csrftoken\"[\s\:]+[\'\"]([A-Za-z0-9_-]+)[\'\"]/i,
							/\"srt\"[\s\:]+[\'\"]([A-Za-z0-9_-]+)[\'\"]/i
						];
						const html = document.documentElement.innerHTML;
						for (const re of patterns) {
							const m = html.match(re);
							if (m && m[1]) {
								srt = m[1];
								break;
							}
						}
					}
					if (!srt) throw new Error("Please log in to eBay first.");
					const endDate = /* @__PURE__ */ new Date();
					endDate.setHours(23, 59, 59, 999);
					const startDate = /* @__PURE__ */ new Date();
					startDate.setDate(endDate.getDate() - syncDays);
					startDate.setHours(0, 0, 0, 0);
					const dateParam = `CUSTOM&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
					const body = new URLSearchParams();
					body.append("feedType", "sh-orders-summary");
					body.append("domainServiceQueryParameters", `filter=status:ALL_ORDERS,timerange:${dateParam}`);
					body.append("srt", srt);
					let taskRes;
					try {
						taskRes = await fetch("https://www.ebay.com/sh/fpp/createreporttask", {
							method: "POST",
							credentials: "include",
							headers: {
								"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
								"x-ebay-client-name": "sh-orders",
								"x-requested-with": "XMLHttpRequest"
							},
							body
						});
					} catch (netErr) {
						throw new Error(`Report Task Network Error: ${netErr.message}`);
					}
					if (!taskRes.ok) throw new Error(`Create Task Failed: ${taskRes.status} ${taskRes.statusText}`);
					const taskJson = await taskRes.json().catch(() => null);
					if (!taskJson || taskJson.status === "ERROR" || !taskJson.taskId) throw new Error("Failed to create eBay orders report task: " + (taskJson?.errorMessage || "Unknown error"));
					const taskIdRaw = String(taskJson.taskId);
					const taskIdParts = taskIdRaw.split("-");
					const taskId = taskIdParts.length >= 2 ? taskIdParts[1] : taskIdRaw;
					const pollStarted = Date.now();
					const POLL_TIMEOUT = 9e4;
					const POLL_INTERVAL = 2e3;
					while (Date.now() - pollStarted < POLL_TIMEOUT) {
						const pollJson = await (await fetch(`https://www.ebay.com/sh/fpp/gettask?client=sh-orders&taskId=task-${taskId}`, {
							credentials: "include",
							headers: { "x-requested-with": "XMLHttpRequest" }
						})).json().catch(() => null);
						if (pollJson?.status === "COMPLETED") break;
						if (pollJson?.status === "ERROR") throw new Error("Report Task Failed during processing");
						await new Promise((r) => setTimeout(r, POLL_INTERVAL));
					}
					const csvRes = await fetch(`https://www.ebay.com/sh/fpp/getfiledetails?client=sh-orders&requestId=${taskId}&filetype=output`, { credentials: "include" });
					if (!csvRes.ok) throw new Error(`CSV Download Failed: ${csvRes.status}`);
					const csvText = await csvRes.text();
					if (!csvText || csvText.length < 10) throw new Error("CSV file was empty or invalid");
					return {
						success: true,
						csvText
					};
				} catch (err) {
					return {
						success: false,
						error: err.message
					};
				}
			}
			async function fetchEbayCsv(syncDays = 90, source = "manual") {
				const tabs = await chrome.tabs.query({ url: "*://*.ebay.com/*" });
				let tabId;
				let createdTab = false;
				if (tabs.length > 0) {
					tabId = tabs[0].id;
					syncLog("info", `Using existing eBay tab: ${tabId}`);
					await logEbaySyncEvent("info", null, "existing_ebay_tab_reused", null, {
						source,
						tabId
					});
				} else {
					if (source !== "manual") {
						syncLog("warn", `Tab open blocked for auto source: ${source}`);
						await logEbaySyncEvent("warn", "ebay_session", "tab_open_blocked_auto_source", null, { source });
						throw new Error("ebay_session_required");
					}
					syncLog("info", `Creating temporary inactive eBay tab...`);
					await logEbaySyncEvent("info", null, "tab_open_requested", null, { source });
					chrome.runtime.sendMessage({
						action: "SYNC_PROGRESS",
						status: "Opening eBay..."
					}).catch(() => {});
					tabId = (await chrome.tabs.create({
						url: "https://www.ebay.com/sh/ord",
						active: false
					})).id;
					createdTab = true;
					await logEbaySyncEvent("info", null, "manual_sync_opened_ebay_tab", null, { tabId });
					await new Promise((resolve, reject) => {
						const timeout = setTimeout(() => {
							chrome.tabs.onUpdated.removeListener(listener);
							reject(/* @__PURE__ */ new Error("Timeout waiting for eBay tab to load"));
						}, 3e4);
						function listener(tId, info) {
							if (tId === tabId && info.status === "complete") {
								clearTimeout(timeout);
								chrome.tabs.onUpdated.removeListener(listener);
								resolve();
							}
						}
						chrome.tabs.onUpdated.addListener(listener);
					});
				}
				syncLog("info", `Tab loaded, injecting fetch script into tab ${tabId}`);
				chrome.runtime.sendMessage({
					action: "SYNC_PROGRESS",
					status: "Syncing orders..."
				}).catch(() => {});
				let result;
				try {
					const executePromise = chrome.scripting.executeScript({
						target: { tabId },
						world: "MAIN",
						func: injectedFetchEbayCsv,
						args: [syncDays]
					});
					const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(/* @__PURE__ */ new Error("Timeout waiting for eBay sync (60s)")), 6e4));
					const results = await Promise.race([executePromise, timeoutPromise]);
					if (results && results[0] && results[0].result) result = results[0].result;
					else throw new Error("No result returned from tab injection");
				} finally {
					if (createdTab) if (result && !result.success && result.error && result.error.includes("Please log in")) try {
						await chrome.tabs.update(tabId, { active: true });
						syncLog("info", `Made sign-in tab active: ${tabId}`);
					} catch (e) {}
					else try {
						await chrome.tabs.remove(tabId);
						syncLog("info", `Temporary tab closed: ${tabId}`);
					} catch (e) {
						syncLog("warn", `Failed to close temporary tab ${tabId}: ${e.message}`);
					}
				}
				if (!result.success) throw new Error(result.error || "Unknown error inside eBay tab");
				const csvText = result.csvText;
				syncLog("success", `CSV downloaded: ${csvText.length} bytes`);
				return csvText;
			}
			function parseEbayCsv(text) {
				const firstLine = text.substring(0, 1e3).split("\n")[0];
				let delimiter = ",";
				const commas = (firstLine.match(/,/g) || []).length;
				if ((firstLine.match(/;/g) || []).length > commas) delimiter = ";";
				syncLog("debug", `CSV Parser detected delimiter: "${delimiter}"`);
				const rows = [];
				let row = [];
				let cur = "";
				let inQuotes = false;
				for (let i = 0; i < text.length; i++) {
					const ch = text[i];
					const next = text[i + 1];
					if (inQuotes) {
						if (ch === "\"" && next === "\"") {
							cur += "\"";
							i++;
							continue;
						}
						if (ch === "\"") {
							inQuotes = false;
							continue;
						}
						cur += ch;
						continue;
					}
					if (ch === "\"") {
						inQuotes = true;
						continue;
					}
					if (ch === delimiter) {
						row.push(cur);
						cur = "";
						continue;
					}
					if (ch === "\n") {
						row.push(cur);
						cur = "";
						if (row.length > 1 || row[0] !== "") rows.push(row);
						row = [];
						continue;
					}
					if (ch === "\r") continue;
					cur += ch;
				}
				if (cur.length || row.length) {
					row.push(cur);
					rows.push(row);
				}
				if (!rows.length) return [];
				let headerRowIndex = 0;
				for (let i = 0; i < Math.min(rows.length, 5); i++) {
					const lineStr = rows[i].join(" ").toLowerCase();
					if (lineStr.includes("order number") || lineStr.includes("sales record") || lineStr.includes("buyer name")) {
						headerRowIndex = i;
						break;
					}
				}
				const headers = rows[headerRowIndex].map((h) => (h || "").trim());
				const rawOrders = rows.slice(headerRowIndex + 1).map((r) => {
					const obj = {};
					for (let i = 0; i < headers.length; i++) {
						const key = headers[i] || `col_${i}`;
						obj[key] = r[i] ?? "";
					}
					return obj;
				});
				const pick = (obj, patterns) => {
					const keys = Object.keys(obj);
					for (const pattern of patterns) {
						const patternLower = pattern.toLowerCase();
						for (const k of keys) if (k.toLowerCase() === patternLower) {
							const val = obj[k];
							if (typeof val !== "undefined" && String(val).trim() !== "") return val;
						}
						for (const k of keys) if (k.toLowerCase().includes(patternLower) || patternLower.includes(k.toLowerCase())) {
							const val = obj[k];
							if (typeof val !== "undefined" && String(val).trim() !== "") return val;
						}
					}
					return "";
				};
				const aggregatedOrdersMap = /* @__PURE__ */ new Map();
				rawOrders.forEach((o) => {
					const orderId = pick(o, [
						"Order Number",
						"Order number",
						"Order",
						"Order ID",
						"OrderNumber",
						"Order #",
						"Order no.",
						"Order No"
					]);
					if (!orderId) return;
					const transactionId = pick(o, [
						"Transaction ID",
						"PayPal Transaction ID",
						"Paypal Transaction ID"
					]);
					const salesRecordNumber = pick(o, [
						"Sales Record Number",
						"Sales record number",
						"Sales Record",
						"Sales Record #"
					]);
					const itemTitle = pick(o, [
						"Item Title",
						"Item title",
						"Title"
					]);
					const itemNumber = pick(o, [
						"Item Number",
						"Item number",
						"Item ID"
					]);
					const customLabel = pick(o, [
						"Custom Label",
						"Custom label",
						"SKU"
					]);
					const qtyRaw = pick(o, ["Quantity", "Qty"]);
					const parsedQty = parseInt(String(qtyRaw).replace(/[^0-9]/g, ""), 10) || 1;
					const subtotalRaw = pick(o, [
						"Sold For",
						"Subtotal",
						"Item price"
					]);
					const totalRaw = pick(o, [
						"Total Price",
						"Total price",
						"Total"
					]);
					const parsePrice = (v) => v ? parseFloat(String(v).replace(/[^0-9.-]/g, "")) : 0;
					const lineItem = {
						title: itemTitle,
						sku: customLabel,
						item_number: itemNumber,
						quantity: parsedQty,
						transaction_id: transactionId
					};
					if (!aggregatedOrdersMap.has(orderId)) aggregatedOrdersMap.set(orderId, {
						ebay_order_id: orderId,
						sales_record_number: salesRecordNumber,
						buyer_name: pick(o, [
							"Buyer Name",
							"Buyer name",
							"Ship to name"
						]),
						buyer_username: pick(o, [
							"Buyer Username",
							"Buyer username",
							"Buyer user ID"
						]),
						buyer_email: null,
						order_date: pick(o, [
							"Sale Date",
							"Date sold",
							"Sold date"
						]),
						date_paid: pick(o, [
							"Paid On Date",
							"Date paid",
							"Paid on date"
						]),
						ship_by_date: pick(o, ["Ship By Date", "Ship by date"]),
						order_status: pick(o, ["Order status", "Status"]) || "paid",
						total_amount: parsePrice(totalRaw),
						subtotal: parsePrice(subtotalRaw),
						currency: pick(o, ["Currency"]) || "USD",
						shipping_address: {
							name: pick(o, ["Ship To Name", "Ship to name"]),
							address1: pick(o, [
								"Ship To Address 1",
								"Ship to address 1",
								"Address"
							]),
							address2: pick(o, ["Ship To Address 2", "Ship to address 2"]),
							city: pick(o, [
								"Ship To City",
								"Ship to city",
								"City"
							]),
							state: pick(o, [
								"Ship To State",
								"Ship to state",
								"State"
							]),
							postal_code: pick(o, [
								"Ship To Zip",
								"Ship to zip",
								"ZIP"
							]),
							country: pick(o, ["Ship To Country", "Ship to country"]),
							phone: pick(o, ["Ship To Phone", "Ship to phone"])
						},
						line_items: [lineItem],
						item_title: itemTitle,
						quantity: parsedQty,
						custom_label: customLabel
					});
					else {
						const existing = aggregatedOrdersMap.get(orderId);
						existing.line_items.push(lineItem);
						existing.quantity += parsedQty;
					}
				});
				return Array.from(aggregatedOrdersMap.values());
			}
			async function getEbayOrdersCache() {
				const result = await chrome.storage.local.get(["ebay_orders_cache_v1", "lastSyncTime"]);
				if (result.lastSyncTime && Date.now() - result.lastSyncTime > 36e5) {
					await chrome.storage.local.remove(["ebay_orders_cache_v1", "lastSyncTime"]);
					return null;
				}
				return result["ebay_orders_cache_v1"] || null;
			}
			async function triggerEbayOrderSync(source = "manual") {
				const sessionData = await _sessionStore().get(["isEbayOrderSyncInProgress", "lastEbayOrderSync"]);
				if (sessionData.isEbayOrderSyncInProgress) {
					syncLog("warn", "Sync already in progress, skipping");
					return;
				}
				const { saasToken, userId, userEbaySettings } = await chrome.storage.local.get([
					"saasToken",
					"userId",
					"userEbaySettings"
				]);
				let bypassDebounce = false;
				if (userEbaySettings) {
					if (userEbaySettings.is_sync_enabled === false) {
						syncLog("info", "eBay auto-sync is DISABLED by admin/user settings.");
						if (source === "manual") syncLog("warn", "Sync disabled by settings.");
						return;
					}
					if (userEbaySettings.sync_state === "reset_requested") {
						bypassDebounce = true;
						syncLog("info", "Admin requested manual resync. Bypassing debounce.");
						await logEbaySyncEvent("info", null, "reset_requested_consumed", null, { source });
						if (saasToken && userId) {
							const supabaseUrl = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
							await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
								method: "PATCH",
								headers: {
									"Authorization": `Bearer ${saasToken}`,
									"apikey": SUPABASE_ANON_KEY,
									"Content-Type": "application/json"
								},
								body: JSON.stringify({ sync_state: "syncing" })
							});
						}
					}
				}
				const lastSyncTime = sessionData.lastEbayOrderSync || 0;
				if (source === "auto" && !bypassDebounce && Date.now() - lastSyncTime < 300 * 1e3) return;
				await _sessionStore().set({ isEbayOrderSyncInProgress: true });
				syncLog("info", `Starting eBay Order Sync (${source})`);
				await logEbaySyncEvent("info", null, "extension_sync_started", null, {
					source,
					bypassDebounce
				});
				try {
					let isAuth = false;
					if (typeof AuthHelper !== "undefined") isAuth = await AuthHelper.verifyAuthStatus();
					else isAuth = !!saasToken;
					if (!isAuth) {
						await logEbaySyncEvent("error", "extension_dependency", "extension_sync_failed", null, { reason: "User not authenticated" });
						throw new Error("User not authenticated");
					}
					if (!saasToken) {
						await logEbaySyncEvent("error", "extension_dependency", "extension_sync_failed", null, { reason: "No auth token found" });
						throw new Error("No auth token found");
					}
					const days = (await chrome.storage.local.get(["ebaySyncDays"])).ebaySyncDays || 90;
					syncLog("info", `Fetching CSV report (Last ${days} days)...`);
					await logEbaySyncEvent("info", null, "csv_download_started", null, { days });
					let csvText;
					try {
						csvText = await fetchEbayCsv(days, source);
						if (!csvText) throw new Error("Failed to fetch CSV - no data returned");
						await logEbaySyncEvent("info", null, "csv_download_completed", null, { bytes: csvText.length });
						await chrome.storage.local.set({ ebaySessionRequired: false });
						await logEbaySyncEvent("info", null, "ebay_session_required_flag_cleared", null, {});
					} catch (e) {
						if (e.message === "ebay_session_required") {
							syncLog("warn", "eBay Session Required - auto-sync paused until user opens eBay");
							await logEbaySyncEvent("warn", "ebay_session", "sync_waiting_for_user_session", null, { source });
							await chrome.storage.local.set({ ebaySessionRequired: true });
							await logEbaySyncEvent("info", null, "ebay_session_required_flag_set", null, {});
							if (bypassDebounce && saasToken && userId) {
								const supabaseUrl = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
								await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
									method: "PATCH",
									headers: {
										"Authorization": `Bearer ${saasToken}`,
										"apikey": SUPABASE_ANON_KEY,
										"Content-Type": "application/json"
									},
									body: JSON.stringify({ sync_state: "waiting_for_user_session" })
								}).catch(console.error);
							}
						} else await logEbaySyncEvent("error", "csv_download", "csv_download_failed", null, { error: e.message });
						throw e;
					}
					await logEbaySyncEvent("info", null, "csv_parse_started");
					let orders;
					try {
						orders = parseEbayCsv(csvText);
						syncLog("success", `Parsed ${orders.length} orders from CSV`);
						await logEbaySyncEvent("info", null, "csv_parse_completed", null, { count: orders.length });
					} catch (e) {
						await logEbaySyncEvent("error", "csv_parser", "csv_parse_failed", null, { error: e.message });
						throw e;
					}
					if (orders.length === 0) {
						syncLog("info", "No orders found in CSV");
						await logEbaySyncEvent("info", null, "extension_sync_completed", null, { message: "No orders found in CSV" });
						await _sessionStore().set({ isEbayOrderSyncInProgress: false });
						return;
					}
					const BATCH_SIZE = 50;
					const totalBatches = Math.ceil(orders.length / BATCH_SIZE);
					let totalSynced = 0;
					let totalUpdated = 0;
					let totalSkipped = 0;
					let errorCount = 0;
					syncLog("info", `Syncing ${orders.length} orders in ${totalBatches} batches...`);
					for (let i = 0; i < orders.length; i += BATCH_SIZE) {
						const batch = orders.slice(i, i + BATCH_SIZE);
						const batchNum = Math.floor(i / BATCH_SIZE) + 1;
						try {
							syncLog("debug", `Sending batch ${batchNum}/${totalBatches} (${batch.length} orders)...`);
							const supabaseFunctions = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_FUNCTIONS ? ExtensionConfig.URLS.SUPABASE_FUNCTIONS : `${SUPABASE_URL}/functions/v1`;
							const response = await fetch(`${supabaseFunctions}/sync-ebay-orders`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									"Authorization": `Bearer ${saasToken}`,
									"apikey": SUPABASE_ANON_KEY
								},
								body: JSON.stringify({ orders: batch })
							});
							if (!response.ok) {
								const errText = await response.text();
								throw new Error(`Batch ${batchNum} failed (${response.status}): ${errText}`);
							}
							const result = await response.json();
							syncLog("debug", `Batch ${batchNum} Result: ${JSON.stringify(result)}`);
							if (result.success) {
								totalSynced += result.synced || 0;
								totalUpdated += result.updated || 0;
								totalSkipped += result.skipped || 0;
							} else throw new Error(result.error || "Unknown batch error");
						} catch (batchErr) {
							console.error(`❌ Batch ${batchNum} failed:`, batchErr);
							syncLog("error", `Batch ${batchNum} Error`, { message: batchErr.message });
							await logEbaySyncEvent("error", "backend_sync", "backend_sync_failed", null, {
								batchNum,
								error: batchErr.message
							});
							errorCount++;
						}
						await new Promise((r) => setTimeout(r, 500));
					}
					const summary = `Sync Complete. Synced: ${totalSynced}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${errorCount} batches.`;
					syncLog(errorCount > 0 ? "warn" : "success", summary);
					if (errorCount === 0) await logEbaySyncEvent("success", null, "extension_sync_completed", null, {
						totalSynced,
						totalUpdated
					});
					else await logEbaySyncEvent("warning", null, "extension_sync_completed", null, {
						totalSynced,
						totalUpdated,
						errorCount
					});
					if (saasToken && userId) {
						const supabaseUrl = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
						await fetch(`${supabaseUrl}/rest/v1/user_ebay_settings?user_id=eq.${userId}`, {
							method: "PATCH",
							headers: {
								"Authorization": `Bearer ${saasToken}`,
								"apikey": SUPABASE_ANON_KEY,
								"Content-Type": "application/json"
							},
							body: JSON.stringify({ sync_state: "idle" })
						}).catch(console.error);
					}
					const now = Date.now();
					await _sessionStore().set({ lastEbayOrderSync: now });
					chrome.storage.local.set({ lastSyncTime: now });
					chrome.runtime.sendMessage({
						action: "EBAY_SYNC_COMPLETE",
						stats: {
							synced: totalSynced,
							updated: totalUpdated,
							total: orders.length
						}
					}).catch(() => {});
				} catch (err) {
					syncLog("error", `Sync Failed: ${err.message}`, { stack: err.stack });
					console.error("Full Sync Error:", err);
					await logEbaySyncEvent("error", "unknown", "extension_sync_failed", null, { error: err.message });
					throw err;
				} finally {
					await _sessionStore().set({ isEbayOrderSyncInProgress: false });
				}
			}
			async function logEbaySyncEvent(status, error_category, message, payload_preview = null, metadata = null) {
				try {
					const data = await chrome.storage.local.get(["saasToken", "userId"]);
					const token = data.saasToken;
					const userId = data.userId;
					if (!token || !userId) return;
					let sanitized = null;
					if (payload_preview) {
						let p = JSON.parse(JSON.stringify(payload_preview));
						if (typeof p === "string") sanitized = p.substring(0, 500);
						else {
							const maskPII = (obj) => {
								if (!obj || typeof obj !== "object") return;
								const sensitiveKeys = [
									"buyer_name",
									"buyer_username",
									"buyer_email",
									"shipping_address",
									"buyer_zip",
									"phone",
									"csrf",
									"token",
									"cookie",
									"authorization",
									"secret",
									"password",
									"jwt"
								];
								for (const key of Object.keys(obj)) if (sensitiveKeys.includes(key.toLowerCase()) || key.toLowerCase().includes("token")) obj[key] = "***MASKED***";
								else if (typeof obj[key] === "object") maskPII(obj[key]);
							};
							if (Array.isArray(p)) {
								p = p.slice(0, 2);
								p.forEach(maskPII);
							} else maskPII(p);
							sanitized = p;
						}
					}
					const supabaseUrl = typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.SUPABASE_URL ? ExtensionConfig.URLS.SUPABASE_URL : SUPABASE_URL;
					await fetch(`${supabaseUrl}/rest/v1/ebay_sync_logs`, {
						method: "POST",
						headers: {
							"Authorization": `Bearer ${token}`,
							"apikey": SUPABASE_ANON_KEY,
							"Content-Type": "application/json"
						},
						body: JSON.stringify({
							user_id: userId,
							status,
							error_category,
							payload_preview: sanitized,
							metadata: metadata ? {
								message,
								...metadata
							} : { message }
						})
					});
				} catch (err) {
					console.error("Failed to write sync log:", err);
				}
			}
			function isValidGoogleScriptUrl(url) {
				return typeof url === "string" && (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(url) || /^https:\/\/hyperagent\.com\/api\/webhooks\/[A-Za-z0-9_-]+\/receive(?:\?.*)?$/.test(url));
			}
			async function getGoogleSheetUrl() {
				const read = async () => {
					const result = await chrome.storage.local.get(["googleAppsScriptUrl", "googleSheetUrl"]);
					const url = result["googleAppsScriptUrl"] || result["googleSheetUrl"] || null;
					if (!isValidGoogleScriptUrl(url)) {
						syncLog("info", "Sheet export skipped: user must configure an export endpoint in Settings");
						return null;
					}
					return url;
				};
				if (typeof PerformanceUtils !== "undefined") return PerformanceUtils.withCache("googleSheetUrl", read, 300 * 1e3);
				return read();
			}
			function todayISO() {
				const d = /* @__PURE__ */ new Date();
				const pad = (n) => String(n).padStart(2, "0");
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
			}
			async function logToSheetMinimal({ title, sku, ebayPrice, supplierPrice, supplierUrl }) {
				try {
					const payload = {
						date: todayISO(),
						title,
						sku,
						ebay_price: ebayPrice !== void 0 && ebayPrice !== null ? String(ebayPrice) : "",
						supplier_price: supplierPrice !== void 0 && supplierPrice !== null ? String(supplierPrice) : "",
						supplier: supplierUrl !== void 0 && supplierUrl !== null ? String(supplierUrl) : ""
					};
					const endpoint = await getGoogleSheetUrl();
					if (!endpoint) return;
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 3e4);
					try {
						const res = await fetch(endpoint, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
							signal: controller.signal
						});
						clearTimeout(timeoutId);
						if (!res.ok) {
							const errorText = await res.text();
							throw new Error(`Google Sheets request failed: ${res.status} ${res.statusText} - ${errorText}`);
						}
					} catch (fetchError) {
						clearTimeout(timeoutId);
						throw fetchError;
					}
				} catch (err) {
					console.error("❌ ERROR IN logToSheetMinimal()", err);
					throw err;
				}
			}
			async function logToSheet(data) {
				try {
					const endpoint = await getGoogleSheetUrl();
					if (!endpoint) return;
					await fetch(endpoint, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data)
					});
					if (typeof ExtensionConfig !== "undefined" && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("✅ Logged to sheet (data hidden in prod)", data);
				} catch (err) {
					console.error("❌ Sheet logging failed:", err);
				}
			}
			async function logProductToSheet({ sku, title, amazon_price, ebay_price, amazon_url }) {
				try {
					const endpoint = await getGoogleSheetUrl();
					if (!endpoint) return;
					await fetch(endpoint, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							sku,
							title,
							amazon_price,
							ebay_price,
							amazon_url
						})
					});
				} catch (err) {
					console.error("Sheet Logging Failed:", err);
				}
			}
			return {
				syncListing,
				syncQueue: {
					QUEUE_KEY: "pendingSyncQueue",
					async add(item) {
						try {
							const queue = (await chrome.storage.local.get(this.QUEUE_KEY))[this.QUEUE_KEY] || [];
							queue.push({
								...item,
								queuedAt: Date.now(),
								attempts: 0
							});
							await chrome.storage.local.set({ [this.QUEUE_KEY]: queue });
							syncLog("info", "Item added to sync queue", {
								type: item.type,
								queueSize: queue.length
							});
						} catch (err) {
							syncLog("error", "Failed to add to sync queue", err);
						}
					},
					async processQueue() {
						try {
							const queue = (await chrome.storage.local.get(this.QUEUE_KEY))[this.QUEUE_KEY] || [];
							if (queue.length === 0) return;
							syncLog("info", `Processing sync queue (${queue.length} items)`);
							const remaining = [];
							for (const item of queue) if (item.type === "listing") {
								if (!(await syncListing(item.data)).success && item.attempts < 5) remaining.push({
									...item,
									attempts: item.attempts + 1
								});
							}
							await chrome.storage.local.set({ [this.QUEUE_KEY]: remaining });
							syncLog("info", `Queue processed, ${remaining.length} items remaining`);
						} catch (err) {
							syncLog("error", "Failed to process sync queue", err);
						}
					},
					async clear() {
						await chrome.storage.local.remove(this.QUEUE_KEY);
					}
				},
				recordListingSyncError,
				syncLog,
				triggerEbayOrderSync,
				fetchEbayCsv,
				parseEbayCsv,
				getEbayOrdersCache,
				logEbaySyncEvent,
				getGoogleSheetUrl,
				logToSheetMinimal,
				logToSheet,
				logProductToSheet,
				getAuthToken: () => {
					if (typeof AuthHelper !== "undefined") return AuthHelper.getAuthToken();
					return getAuthToken();
				},
				verifyToken: (token) => {
					if (typeof AuthHelper !== "undefined") return AuthHelper.verifyAuthStatus();
					return { valid: true };
				},
				saveAuthData: (token, user) => {
					if (typeof AuthHelper !== "undefined") return AuthHelper.setNewAuthSession({
						access_token: token,
						user
					});
					return Promise.resolve();
				},
				clearAuthData: () => {
					if (typeof AuthHelper !== "undefined") return AuthHelper.clearNewAuthSession();
					return Promise.resolve();
				},
				SUPABASE_URL,
				SUPABASE_ANON_KEY
			};
		})();
		if (typeof window !== "undefined") window.SyncUtils = SyncUtils;
		if (typeof self !== "undefined") self.SyncUtils = SyncUtils;
		if (typeof module !== "undefined" && module.exports) module.exports = SyncUtils;
	}));
	require_config();
	require_constants();
	require_auth_helper();
	require_performance();
	require_message_handler();
	require_retry_helper();
	require_api_client();
	require_sync_utils();
	window.SSPricingRuleSync = (() => {
		"use strict";
		const CACHE_KEY = "pricingRulesCache";
		const CACHE_TTL_MS = 300 * 1e3;
		/**
		* Sync pricing rules from the backend.
		*
		* @param {boolean} [forceRefresh=false]  Skip TTL and always fetch.
		* @returns {Promise<object|null>}         Cached rules or null on total failure.
		*/
		async function sync(forceRefresh = false) {
			try {
				const cache = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] || null;
				if (!forceRefresh && cache && typeof cache.fetchedAt === "number" && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
				const { token, isValid } = await AuthHelper.getAuthToken();
				if (!token || !isValid) return cache;
				const urls = getUrls();
				const apiKeys = getApiKeys();
				if (!urls || !apiKeys) return cache;
				const headers = {
					"Authorization": `Bearer ${token}`,
					"apikey": apiKeys.SUPABASE_ANON || "",
					"Content-Type": "application/json"
				};
				if (cache && cache.etag) headers["If-None-Match"] = cache.etag;
				let response;
				try {
					response = await fetch(`${urls.SUPABASE_FUNCTIONS}/pricing-rules-sync`, {
						method: "GET",
						headers
					});
				} catch (networkErr) {
					console.warn("[SSPricingRuleSync] network error:", networkErr?.message || networkErr);
					return cache;
				}
				if (response.status === 304) {
					const refreshed = {
						...cache,
						fetchedAt: Date.now()
					};
					await chrome.storage.local.set({ [CACHE_KEY]: refreshed });
					return refreshed;
				}
				if (!response.ok) {
					console.warn("[SSPricingRuleSync] server error:", response.status);
					return cache;
				}
				const data = await response.json();
				const etag = response.headers.get("ETag") || "";
				const newCache = {
					...data,
					etag,
					fetchedAt: Date.now()
				};
				await chrome.storage.local.set({ [CACHE_KEY]: newCache });
				return newCache;
			} catch (err) {
				console.warn("[SSPricingRuleSync] sync error:", err?.message || err);
				try {
					return (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY] || null;
				} catch (_) {
					return null;
				}
			}
		}
		/**
		* Read the cached rule for a specific supplier (local only, no network).
		*
		* @param {string} supplierKey  e.g. 'amazon', 'walmart', 'aliexpress'
		* @returns {Promise<object|null>}
		*/
		async function getRuleForSupplier(supplierKey) {
			try {
				const cache = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
				if (!cache || !Array.isArray(cache.suppliers)) return null;
				return cache.suppliers.find((s) => s.supplierKey === supplierKey) || null;
			} catch (_) {
				return null;
			}
		}
		return {
			sync,
			getRuleForSupplier
		};
	})();
	//#endregion
	//#region common/sku-engine.js
	window.SSSkuEngine = (() => {
		const MAX_LEN = 50;
		function _clean(s, maxChars) {
			return String(s || "").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, maxChars || 8);
		}
		function _hash32(str) {
			let h = 2166136261;
			for (let i = 0; i < str.length; i++) {
				h ^= str.charCodeAt(i);
				h = h * 16777619 >>> 0;
			}
			return (h % 2176782336).toString(36).toUpperCase().padStart(6, "0");
		}
		/**
		* Build human-readable SKU.
		* Single:    buildReadable('B08XYZ', {})           → 'AMZ-B08XYZ'
		* Variation: buildReadable('B08XYZ', {Color:{productName:'Red'}, Size:{productName:'L'}})
		*                                                  → 'AMZ-B08XYZ-COLO-RED-SIZE-L'
		* @param {string} parentAsin
		* @param {object} attrs  — { "Color": { productName: "Red" }, ... } or flat { "Color": "Red" }
		* @param {string} [supplier] — default 'AZS'
		*/
		function buildReadable(parentAsin, attrs, supplier) {
			supplier = (supplier || "AZS").toUpperCase().slice(0, 4);
			const root = supplier + "-" + String(parentAsin || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
			const parts = Object.keys(attrs || {}).sort().map((k) => {
				const rawVal = attrs[k];
				const val = rawVal && typeof rawVal === "object" ? rawVal.productName || "" : String(rawVal || "");
				return _clean(k, 4) + "-" + _clean(val, 16);
			});
			const readable = parts.length ? root + "-" + parts.join("-") : root;
			if (readable.length <= MAX_LEN) return readable;
			const hashParts = Object.keys(attrs || {}).sort().map((k) => {
				const rawVal = attrs[k];
				const val = rawVal && typeof rawVal === "object" ? rawVal.productName || "" : String(rawVal || "");
				return k + ":" + val;
			});
			const suffix = "-" + _hash32(root + "|" + hashParts.join("|"));
			return root.slice(0, MAX_LEN - suffix.length) + suffix;
		}
		/**
		* Supplier key → SKU prefix. Pure lookup, no algorithm change:
		* 'amazon' (and unknown/missing — back-compat) → 'AZS', 'walmart' → 'WMS',
		* future suppliers → first 3 alphanumeric chars uppercased.
		* @param {string} [supplier] — normalized product.supplier
		*/
		function prefixFor(supplier) {
			const s = String(supplier || "").toLowerCase();
			if (!s || s === "amazon") return "AZS";
			if (s === "walmart") return "WMS";
			return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AZS";
		}
		/**
		* Return the readable SKU directly for eBay Custom Label.
		* Do not base64 encode as it makes Custom Labels unreadable.
		*/
		function encodeForEbay(readableSku) {
			return String(readableSku || "").trim();
		}
		/**
		* Fallback SKU root for products with no supplier ID: deterministic hash of
		* the cleaned title ("T" + 6-char base36). Without this, every ID-less
		* product produced the same "<PREFIX>-" root, colliding in the DB upsert
		* (ON CONFLICT (user_id, sku)). Deterministic on purpose — re-scanning the
		* same product yields the same SKU, so duplicate detection still works.
		* @param {string} title
		* @returns {string} e.g. 'T1A2B3C', or '' when the title is empty too
		*/
		function fallbackRootFromTitle(title) {
			const cleaned = String(title || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
			if (!cleaned) return "";
			return "T" + _hash32(cleaned);
		}
		return {
			buildReadable,
			encodeForEbay,
			prefixFor,
			fallbackRootFromTitle,
			MAX_LEN
		};
	})();
	//#endregion
	//#region common/ebay-image-helper.js
	/**
	* Unified gateway to prepare any image format for eBay upload.
	* Ensures all images reach eBay as binary Files/Blobs.
	*
	* @param {File|Blob|string|object} imageItem - Input image
	* @param {number} index - Index of the image (0-based)
	* @returns {Promise<File>} Resolved File object ready for eBay upload
	*/
	async function prepareImageForEbayUpload(imageItem, index = 0) {
		if (!imageItem) throw new Error("prepareImageForEbayUpload: imageItem is empty or null");
		const baseFilename = `product-image-${index + 1}`;
		let sourceDetected = "";
		let conversionPath = "";
		let finalMime = "image/jpeg";
		let finalBlob = null;
		try {
			if (imageItem instanceof File) {
				sourceDetected = "File";
				conversionPath = "passthrough";
				finalBlob = imageItem;
				finalMime = imageItem.type || "image/jpeg";
			} else if (imageItem instanceof Blob) {
				sourceDetected = "Blob";
				conversionPath = "wrap-in-file";
				finalBlob = imageItem;
				finalMime = imageItem.type || "image/jpeg";
			} else if (typeof imageItem === "object") {
				if (imageItem.file instanceof File || imageItem.file instanceof Blob) return prepareImageForEbayUpload(imageItem.file, index);
				if (typeof imageItem.url === "string") return prepareImageForEbayUpload(imageItem.url, index);
				if (typeof imageItem.dataUrl === "string") return prepareImageForEbayUpload(imageItem.dataUrl, index);
				throw new Error("prepareImageForEbayUpload: unrecognized object structure");
			} else if (typeof imageItem === "string") if (imageItem.startsWith("data:image/")) {
				sourceDetected = "Data URL (Base64)";
				conversionPath = "fetch-blob-decode";
				finalBlob = await (await fetch(imageItem)).blob();
				finalMime = finalBlob.type || "image/jpeg";
			} else if (imageItem.startsWith("http") || imageItem.startsWith("//")) {
				let fetchUrl = imageItem.startsWith("//") ? "https:" + imageItem : imageItem;
				sourceDetected = `Supplier URL (${fetchUrl})`;
				conversionPath = "service-worker-fetch";
				const origin = new URL(fetchUrl).origin;
				const response = await new Promise((resolve, reject) => {
					chrome.runtime.sendMessage({
						action: "FETCH_IMAGE_AS_BASE64",
						url: fetchUrl
					}, (res) => {
						if (chrome.runtime.lastError) reject(/* @__PURE__ */ new Error(`Service worker communication error: ${chrome.runtime.lastError.message}`));
						else resolve(res);
					});
				});
				if (response && response.success && response.base64) {
					finalBlob = await (await fetch(response.base64)).blob();
					finalMime = finalBlob.type || "image/jpeg";
				} else {
					const errMsg = response?.error || "Unknown SW fetch error";
					if (errMsg.includes("Host permission missing") || errMsg.includes("opaque") || errMsg.includes("Failed to fetch")) {
						console.error(`[SS IMG] host permission missing for ${origin}`);
						throw new Error(`host permission missing for ${origin}`);
					}
					throw new Error(`SW fetch failed: ${errMsg}`);
				}
			} else throw new Error("prepareImageForEbayUpload: unrecognized string format");
			else throw new Error(`prepareImageForEbayUpload: unsupported format type: ${typeof imageItem}`);
			if (![
				"image/jpeg",
				"image/jpg",
				"image/png"
			].includes(finalMime.toLowerCase())) {
				console.log(`[SS IMG] Format safety re-encoding: ${finalMime} is not in eBay's accepted set. Re-encoding to image/jpeg...`);
				finalBlob = await new Promise((resolve, reject) => {
					const img = new Image();
					img.crossOrigin = "Anonymous";
					img.onload = () => {
						const canvas = document.createElement("canvas");
						canvas.width = img.naturalWidth;
						canvas.height = img.naturalHeight;
						const ctx = canvas.getContext("2d");
						ctx.fillStyle = "#ffffff";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						ctx.drawImage(img, 0, 0);
						canvas.toBlob((b) => {
							if (b) resolve(b);
							else reject(/* @__PURE__ */ new Error("Format safety re-encoding failed: canvas toBlob empty"));
						}, "image/jpeg", .95);
					};
					img.onerror = () => reject(/* @__PURE__ */ new Error("Format safety re-encoding failed: image load error"));
					img.src = URL.createObjectURL(finalBlob);
				});
				finalMime = "image/jpeg";
				conversionPath += " + canvas-re-encode";
			}
			const ext = finalMime.toLowerCase().includes("png") ? "png" : "jpg";
			const finalFile = new File([finalBlob], `${baseFilename}.${ext}`, { type: finalMime });
			console.info(`[SS IMG] Image conversion complete:\n  - Source detected: ${sourceDetected}\n  - Conversion path: ${conversionPath}\n  - Final MIME: ${finalMime}\n  - Final Size: ${finalFile.size} bytes\n  - Target: File/Blob`);
			return finalFile;
		} catch (error) {
			console.error(`[SS IMG] prepareImageForEbayUpload failed at index ${index}:`, error.message);
			throw error;
		}
	}
	if (typeof window !== "undefined") window.prepareImageForEbayUpload = prepareImageForEbayUpload;
	//#endregion
	//#region common/ebay-listing-api.js
	function _cleanFloat(val) {
		if (val === null || val === void 0) return 0;
		if (typeof val === "number") return val;
		const cleaned = String(val).replace(/[^\d.-]/g, "");
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	}
	function _extractAllMatches(regex, str) {
		const results = [];
		let match;
		regex.lastIndex = 0;
		while ((match = regex.exec(str)) !== null) {
			if (match.index === regex.lastIndex) regex.lastIndex++;
			match.forEach((cap) => results.push(cap));
		}
		return results;
	}
	function _getEbaySuffix() {
		return window.location.host.split("ebay").pop()?.replace(".", "") || "com";
	}
	function _sanitizeSupplierText(text) {
		return text.replace(/\b(sold|fulfilled|dispatched|shipped|sponsored)\s+by\b[^.<\n]*/gi, "").replace(/\bships?\s+from\s+(amazon|walmart|target|bestbuy|wayfair|homedepot|costco)[^.<\n]*/gi, "").replace(/\bvisit\s+the\b[^.<\n]*\bstore\b[^.<\n]*/gi, "").replace(/\b(amazon\s*basics|amazon\s*brand|amazon\s*essentials|amazon\s*elements|amazon\s*commercial|amazoncommercial|amazonbasics)\b/gi, "").replace(/\bamazon'?s?\s+choice(?:\s+for\b[^.<\n]*)?/gi, "").replace(/#\s*\d+\s+best\s+seller(?:\s+in\b[^.<\n]*)?/gi, "").replace(/\bbest\s*seller\b/gi, "").replace(/\b(amazon|walmart|target|bestbuy|wayfair|homedepot|costco)\.com\b/gi, "").replace(/\b(ASIN|UPC|ISBN|Sales?\s*Rank|Seller\s*Rank|Available\s*at|Fulfilled\s*by|Sold\s*by)\b/gi, "").replace(/https?:\/\/[^\s<"]+/gi, "");
	}
	function _sanitizeDescriptionHtml(html) {
		return _sanitizeSupplierText(html).replace(/<img[^>]*>/gi, "");
	}
	function _enforceEbayTitle(title) {
		let t = _sanitizeSupplierText(String(title || "")).replace(/\((?:pack of \d+|set of \d+)\)/gi, " ").replace(/[|]/g, " ").replace(/\s{2,}/g, " ").trim();
		if (t.length <= 80) return t;
		const cut = t.slice(0, 80);
		const lastSpace = cut.lastIndexOf(" ");
		return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
	}
	function _deepFind(obj, predicate, depth = 12) {
		if (!obj || depth < 0) return void 0;
		if (predicate(obj)) return obj;
		if (Array.isArray(obj)) {
			for (const item of obj) {
				const found = _deepFind(item, predicate, depth - 1);
				if (found) return found;
			}
			return;
		}
		if (typeof obj === "object") for (const key in obj) {
			const found = _deepFind(obj[key], predicate, depth - 1);
			if (found) return found;
		}
	}
	function _deepFindCsrfMap(obj, keyPredicate, depth = 16) {
		if (!obj || depth < 0) return void 0;
		if (typeof obj === "object" && !Array.isArray(obj)) {
			const keys = Object.keys(obj);
			if (keys.find((k) => keyPredicate(k) && typeof obj[k] === "string")) return obj;
			for (const key of keys) {
				const found = _deepFindCsrfMap(obj[key], keyPredicate, depth - 1);
				if (found) return found;
			}
			return;
		}
		if (Array.isArray(obj)) for (const item of obj) {
			const found = _deepFindCsrfMap(item, keyPredicate, depth - 1);
			if (found) return found;
		}
	}
	function _deepFindEpsData(obj, depth = 14) {
		if (!obj || depth < 0) return void 0;
		if (typeof obj === "object" && !Array.isArray(obj)) {
			if (obj.epsData) return obj.epsData;
			for (const key in obj) {
				const found = _deepFindEpsData(obj[key], depth - 1);
				if (found) return found;
			}
			return;
		}
		if (Array.isArray(obj)) for (const item of obj) {
			const found = _deepFindEpsData(item, depth - 1);
			if (found) return found;
		}
	}
	window.EbayListingApiHelper = (() => {
		let _lastRaw = null;
		async function _retry(fn, maxAttempts = 3, baseDelayMs = 800) {
			let lastErr;
			for (let i = 0; i < maxAttempts; i++) try {
				return await fn();
			} catch (e) {
				lastErr = e;
				if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
			}
			throw lastErr;
		}
		async function getCategoryRecommendations(keyword) {
			const kw = String(keyword || "").slice(0, 80).trim() || "product";
			const params = new URLSearchParams({ keyword: kw });
			const url = `https://www.ebay.${_getEbaySuffix()}/sl/prelist/api/category/search?` + params;
			return _retry(async () => {
				const resp = await fetch(url, {
					method: "GET",
					credentials: "include"
				});
				const ct = resp.headers.get("content-type") || "";
				if (!resp.ok || !ct.includes("application/json")) throw new Error(`eBay category API failed (HTTP ${resp.status}) — please log in to eBay and try again.`);
				return resp.json();
			}, 3, 1e3);
		}
		async function createListing(productTitle, categoryId) {
			const params = new URLSearchParams({
				mode: "AddItem",
				categoryId: String(categoryId),
				title: productTitle,
				condition: "1000",
				sr: "pl",
				isUid: "false",
				aspects: "eJyLrlbKS8xNVbJSCqksSFXSUSpLzCkFcqOV",
				view: "sellnode-condition",
				sssr: "shListingsCTA",
				radixTrackingId: crypto.randomUUID()
			});
			const html = await (await fetch(`https://www.ebay.${_getEbaySuffix()}/sl/list?` + params, {
				method: "GET",
				credentials: "include",
				redirect: "follow"
			})).text();
			const chunks = _extractAllMatches(/(?<=\.concat\()[\s\S]*?(?=<\/script>)/gi, html);
			if (!chunks.length) throw new Error("Could not extract JSON chunks from eBay listing page");
			_lastRaw = {
				text: html,
				chunks
			};
			const parseChunk = (raw) => {
				try {
					return JSON.parse(raw.replace(/\)(?=[^)]*$)/, ""));
				} catch {
					return;
				}
			};
			const parsed = chunks.map((raw, idx) => ({
				idx,
				raw,
				data: parseChunk(raw)
			})).filter((e) => e.data);
			const has = (raw, kws) => kws.some((kw) => raw.includes(kw));
			const appChunk = parsed.find((e) => has(e.raw, ["isMuaa"]) && has(e.raw, ["model"])) ?? parsed.find((e) => has(e.raw, ["listing_draft"]) && has(e.raw, ["csrf"])) ?? parsed.find((e) => has(e.raw, ["listing_draft"])) ?? parsed.find((e) => has(e.raw, ["APPSTATUS"]) && has(e.raw, ["widgetConfig"])) ?? parsed.find((e) => has(e.raw, ["widgetConfig"])) ?? parsed.find((e) => has(e.raw, ["APPSTATUS"])) ?? parsed.find((e) => has(e.raw, ["csrf", "epsData"]));
			if (!appChunk) throw new Error("Could not locate eBay app data chunk");
			const listingChunk = parsed.find((e) => e.idx !== appChunk.idx && has(e.raw, ["ATTRIBUTES"]) && has(e.raw, ["\"meta\""]) && has(e.raw, ["draftId"])) ?? parsed.find((e) => e.idx !== appChunk.idx && has(e.raw, ["draftId"]) && has(e.raw, ["attributeList"])) ?? parsed.find((e) => e.idx !== appChunk.idx && has(e.raw, ["draftId"])) ?? (has(appChunk.raw, ["draftId"]) ? appChunk : void 0);
			if (!listingChunk) throw new Error("Could not locate eBay listing data chunk");
			let parsedCsrf;
			const csrfMatch = html.match(/id=csrf-data\s+data-value='([^']+)'/);
			if (csrfMatch) try {
				parsedCsrf = JSON.parse(csrfMatch[1]);
			} catch {}
			return [
				listingChunk.data,
				appChunk.data,
				parsedCsrf
			];
		}
		async function saveListing(csrfToken, draftId, payload) {
			const suffix = _getEbaySuffix();
			return _retry(async () => {
				const resp = await fetch(`https://www.ebay.${suffix}/lstng/api/listing_draft/${draftId}?mode=AddItem`, {
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json;charset=UTF-8",
						"srt": csrfToken
					},
					referrer: `https://www.ebay.${suffix}/lstng?draftId=${draftId}&mode=AddItem`,
					body: JSON.stringify({
						...payload,
						requestId: crypto.randomUUID(),
						requestMeta: { lastDeltaTimestamp: Date.now() }
					})
				});
				if (!resp.ok) throw new Error(`saveListing HTTP ${resp.status}`);
				const body = await resp.json().catch(() => ({}));
				const errs = body.errors || body.errorMessage || body.messages;
				if (Array.isArray(errs) && errs.length) {
					const msg = errs.map((e) => e.message || e.longMessage || e.text || JSON.stringify(e)).join("; ");
					throw new Error(`eBay rejected listing draft: ${msg}`);
				}
				return body;
			}, 3, 1e3);
		}
		async function updateListing(draftId, csrfToken, epsData, listingModel, product) {
			window._ssLastSkuConfirmation = null;
			const attributeList = listingModel?.ATTRIBUTES?.attributeList || [];
			const attributes = {};
			const aspectNames = attributeList.map((a) => a.attributeName);
			for (const specKey in product.prod_specs || {}) {
				const matchedName = matchAspectName(specKey, aspectNames);
				const attr = attributeList.find((a) => a.attributeName === matchedName);
				if (attr) if (attr.multiSelectEnabled) attributes[matchedName] = String(product.prod_specs[specKey]).split(",").map((s) => s.trim());
				else attributes[matchedName] = [product.prod_specs[specKey]];
				else attributes[matchedName] = [product.prod_specs[specKey]];
			}
			attributeList.filter((attr) => {
				const isRequired = attr.required === true || attr.isRequired === true || attr.usage === "REQUIRED" || attr.usageConstraint === "REQUIRED" || attr.minValues && attr.minValues > 0 || attr.groups && (attr.groups.includes("REQUIRED") || attr.groups[0] === "REQUIRED");
				const hasValue = attr.value && attr.value.length > 0 || attr.values && attr.values.length > 0 || attr.currentValues && attr.currentValues.length > 0;
				return isRequired && !hasValue;
			}).forEach((attr) => {
				const name = attr.attributeName;
				if (attributes[name]) return;
				if (name.toLowerCase() === "brand" && (attr.customValuesAllowed || !attr.options?.length)) attributes[name] = ["Unbranded"];
				else if (attr.options && attr.options.length > 0) attributes[name] = [attr.options[0].value];
				else attributes[name] = ["Does not apply"];
			});
			let uploadedImages = [];
			if (window.EbayPhotoUploader && epsData) {
				const imageUrls = product.prod_images || [];
				console.log(`[SS EPS] Uploading ${imageUrls.length} images with bounded concurrency (max 3)...`);
				const concurrencyLimit = 3;
				const results = new Array(imageUrls.length);
				const queue = imageUrls.map((url, index) => ({
					url,
					index
				}));
				async function worker() {
					while (queue.length > 0) {
						const item = queue.shift();
						if (!item) break;
						const { url, index } = item;
						try {
							const id = await window.EbayPhotoUploader.uploadPhoto(url, epsData, index);
							console.log(`[SS EPS] ✓ Image ${index + 1}/${imageUrls.length}: ${id}`);
							results[index] = id;
						} catch (err) {
							console.error(`[SS EPS] ✗ Image ${index + 1}/${imageUrls.length} failed: ${err.message} — ${url}`);
							results[index] = void 0;
						}
					}
				}
				const workers = Array(Math.min(concurrencyLimit, imageUrls.length)).fill(null).map(() => worker());
				await Promise.all(workers);
				uploadedImages = results.filter(Boolean);
				console.log(`[SS EPS] ${uploadedImages.length}/${imageUrls.length} images uploaded`);
				if (uploadedImages.length === 0 && imageUrls.length > 0) throw new Error(`All ${imageUrls.length} product image uploads to eBay failed — listing aborted. Check your connection and retry; if it persists, the image host may be blocking downloads.`);
			}
			const descEditorMode = listingModel?.meta?.descriptionEditorMode === "RICH_TEXT_EDITOR" ? "RTE_EDITOR" : listingModel?.meta?.descriptionEditorMode || "RTE_EDITOR";
			const payload = {
				format: "FixedPrice",
				pictures: uploadedImages,
				attributes,
				itemLocationCountry: product.meta?.country || "US",
				itemLocationCityState: "Multiple locations",
				description: product.prod_desc || "",
				meta: { descriptionEditorMode: descEditorMode },
				condition: 1e3,
				removedFields: []
			};
			if (product.meta?.promoteListing) {
				payload.promotedListingSelection = true;
				const pct = _cleanFloat(product.meta.promotePercent);
				if (!isNaN(pct) && pct > 0) payload.adRate = pct;
			}
			if ((product.prod_variations || []).length <= 1) {
				let price = product.prod_variations?.[0]?.price || .99;
				if (price < 1) price = .99;
				payload.price = Number(price).toFixed(2);
				payload.quantity = product.prod_qty || 1;
			}
			const customLabelSku = (product.prod_variations || []).length <= 1 && product.prod_variations?.[0]?.sku || product.ebaySku || product.prod_id;
			if (customLabelSku) {
				const encodedSku = window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(customLabelSku) : customLabelSku;
				payload.sku = encodedSku;
				payload.customLabel = encodedSku;
			}
			const savedListing = await saveListing(csrfToken, draftId, payload);
			if (customLabelSku) {
				const persistedSkuHit = _deepFind(savedListing, (o) => o && typeof o === "object" && (o.sku || o.customLabel));
				const persistedSku = savedListing?.sku ?? savedListing?.customLabel ?? savedListing?.listing?.sku ?? savedListing?.listing?.customLabel ?? (persistedSkuHit ? persistedSkuHit.sku ?? persistedSkuHit.customLabel : void 0);
				window._ssLastSkuConfirmation = {
					sentSku: customLabelSku,
					persistedSku: persistedSku || null,
					confirmed: !!persistedSku,
					draftId
				};
				if (!persistedSku) console.error("[SS Uploader] SKU/Custom Label was NOT confirmed in eBay's draft response — it may not have saved.", {
					sentSku: customLabelSku,
					draftId
				});
				else console.log("[SS Uploader] SKU confirmed in eBay draft response:", persistedSku);
			}
			return savedListing;
		}
		function extractListingDraft(listingData, appData, parsedCsrf) {
			const wData = listingData.w || listingData.o?.w;
			let listingModel = wData?.find((e) => e?.[2]?.model?.ATTRIBUTES?.attributeList)?.[2]?.model ?? wData?.find((e) => e?.[2]?.model?.meta?.draftId)?.[2]?.model ?? wData?.[0]?.[2]?.model;
			if (!listingModel?.meta?.draftId) {
				const found = _deepFind(listingData, (o) => o && typeof o === "object" && o.ATTRIBUTES?.attributeList && o.meta?.draftId) ?? _deepFind(listingData, (o) => o && typeof o === "object" && o.meta?.draftId) ?? _deepFind(appData, (o) => o && typeof o === "object" && o.meta?.draftId);
				if (found) listingModel = found;
			}
			if (!listingModel?.meta?.draftId) throw new Error("Could not find draftId in eBay response");
			const appNorm = appData.o !== void 0 ? appData.o : appData;
			let appStatus = appNorm.w?.find((e) => e?.[2]?.model?.APPSTATUS)?.[2]?.model?.APPSTATUS ?? appNorm.w?.[0]?.[2]?.model?.APPSTATUS;
			if (!appStatus?.widgetConfig?.csrf) {
				const found = _deepFind(appNorm, (o) => o && typeof o === "object" && o.widgetConfig?.csrf) ?? _deepFind(listingData, (o) => o && typeof o === "object" && o.widgetConfig?.csrf);
				if (found) appStatus = found;
			}
			const widgetConfig = appStatus?.widgetConfig;
			let csrfToken = parsedCsrf || widgetConfig?.csrf;
			const csrfPredicates = [
				(k) => k.includes("listing_draft"),
				(k) => k.includes("listingDraft"),
				(k) => /lstng\/api\/listing/i.test(k),
				(k) => /listing.*draft|draft.*listing/i.test(k)
			];
			if (!csrfToken || !csrfPredicates.some((pred) => Object.keys(csrfToken).some(pred))) for (const pred of csrfPredicates) {
				csrfToken = _deepFindCsrfMap(appNorm, pred) ?? _deepFindCsrfMap(listingData, pred);
				if (csrfToken) break;
			}
			let draftCsrfValue;
			if (csrfToken) draftCsrfValue = csrfToken["/lstng/api/listing_draft/:draftId(\\d+)"] ?? csrfToken["/lstng/api/listing_draft/:draftId(d+)"] ?? csrfToken[Object.keys(csrfToken).find((k) => k.includes("listing_draft")) ?? ""] ?? csrfToken[Object.keys(csrfToken).find((k) => /listing.*draft|draft.*listing|lstng\/api\/listing/i.test(k)) ?? ""];
			if (!draftCsrfValue && _lastRaw) for (const target of [_lastRaw.text, ..._lastRaw.chunks]) {
				const m = target.match(/"[^"]*listing_draft[^"]*"\s*:\s*"([^"]+)"/) ?? target.match(/"[^"]*lstng\/api\/listing[^"]*"\s*:\s*"([^"]+)"/i);
				if (m?.[1]) {
					draftCsrfValue = m[1].replace(/\\u002F/gi, "/");
					break;
				}
			}
			if (!draftCsrfValue) throw new Error("Could not find listing_draft CSRF token");
			const epsData = widgetConfig?.epsData ?? _deepFindEpsData(appNorm) ?? _deepFindEpsData(listingData);
			if (!epsData) throw new Error("Could not find epsData in eBay response");
			const draftId = listingModel.meta.draftId;
			const aspectNames = Array.isArray(listingModel.ATTRIBUTES?.attributeList) ? listingModel.ATTRIBUTES.attributeList.map((a) => a.attributeName) : [];
			return {
				draftId,
				draftCsrfValue,
				epsData,
				listingModel,
				aspectNames
			};
		}
		function matchAspectName(attrName, aspectNames) {
			const clean = (s) => s.toLowerCase().replace(/[\s_]/g, "");
			const attrClean = clean(attrName);
			const targetClean = {
				"itemmodelnumber": "mpn",
				"partnumber": "mpn",
				"manufacturerpartnumber": "mpn",
				"brandname": "brand",
				"manufacturer": "brand",
				"manufacturername": "brand",
				"modelname": "model",
				"modelnumber": "model",
				"itemtype": "type",
				"producttype": "type",
				"type": "type"
			}[attrClean] || attrClean;
			let match = aspectNames.find((a) => clean(a) === targetClean);
			if (match) return match;
			const isPlural = targetClean.endsWith("s");
			const singular = isPlural ? targetClean.slice(0, -1) : targetClean;
			const plural = isPlural ? targetClean : targetClean + "s";
			match = aspectNames.find((a) => {
				const c = clean(a);
				return c === singular || c === plural || c === singular + "s" || c.endsWith("s") && c.slice(0, -1) === singular;
			});
			if (match) return match;
			if (targetClean.includes("color") || targetClean.includes("colour")) {
				match = aspectNames.find((a) => {
					const c = clean(a);
					return c.includes("color") || c.includes("colour");
				});
				if (match) return match;
			}
			if (targetClean.includes("size")) {
				match = aspectNames.find((a) => clean(a).includes("size"));
				if (match) return match;
			}
			return attrName;
		}
		async function addVariations(draftId, epsData, product, aspectNames = []) {
			const variations = product.prod_variations;
			if (!variations || variations.length <= 1) return;
			const attrValuesMap = {};
			const variationItems = [];
			const imgPropPictureMap = {};
			const uploadedImgCache = /* @__PURE__ */ new Map();
			const seenCombos = /* @__PURE__ */ new Set();
			const seenSkus = /* @__PURE__ */ new Set();
			const rawImgProp = variations[0]?.imgProp || null;
			let imgPropKey = rawImgProp ? matchAspectName(rawImgProp, aspectNames) : null;
			const allAspectKeys = /* @__PURE__ */ new Set();
			const processedVariations = variations.map((v) => {
				const rawAttrs = v.attrs || {};
				const attrs = {};
				for (const attrName of Object.keys(rawAttrs)) {
					const finalKey = matchAspectName(attrName, aspectNames);
					attrs[finalKey] = rawAttrs[attrName];
					allAspectKeys.add(finalKey);
				}
				return {
					...v,
					attrs
				};
			});
			const aspectKeysArr = Array.from(allAspectKeys);
			for (let idx = 0; idx < processedVariations.length; idx++) {
				const variation = { ...processedVariations[idx] };
				if (!variation.price || variation.price < 1) variation.price = .99;
				const attrs = variation.attrs;
				for (const key of aspectKeysArr) if (!attrs[key]) attrs[key] = { productName: "N/A" };
				else if (attrs[key] && typeof attrs[key].productName === "string") attrs[key].productName = attrs[key].productName.trim();
				const variationSpecific = {};
				for (const attrName in attrs) variationSpecific[attrName] = attrs[attrName].productName;
				const normalizedCombo = Object.keys(variationSpecific).sort().reduce((acc, k) => {
					acc[k.toLowerCase()] = String(variationSpecific[k]).trim().toLowerCase();
					return acc;
				}, {});
				const comboKey = JSON.stringify(normalizedCombo);
				if (seenCombos.has(comboKey)) {
					console.warn(`[SS MSKU] Skipping duplicate variation combo: ${comboKey}`);
					continue;
				}
				seenCombos.add(comboKey);
				for (const attrName in attrs) {
					const productName = attrs[attrName].productName;
					if (!attrValuesMap[attrName]) attrValuesMap[attrName] = [productName];
					else if (!attrValuesMap[attrName].includes(productName)) attrValuesMap[attrName].push(productName);
				}
				let pivotAttr = null;
				if (imgPropKey) {
					const targetClean = imgPropKey.toLowerCase().replace(/[\s_]/g, "");
					const actualKey = Object.keys(attrs).find((k) => k.toLowerCase().replace(/[\s_]/g, "") === targetClean);
					if (actualKey) pivotAttr = attrs[actualKey];
				}
				if (imgPropKey && pivotAttr && variation.img && window.EbayPhotoUploader && epsData) {
					if (!uploadedImgCache.has(variation.img)) try {
						const photoId = await _retry(() => window.EbayPhotoUploader.uploadPhoto(variation.img, epsData, idx), 2, 500);
						uploadedImgCache.set(variation.img, photoId);
					} catch (err) {
						console.warn("[SS MSKU] Variation image upload failed after retries:", err.message);
						uploadedImgCache.set(variation.img, null);
					}
					const photoId = uploadedImgCache.get(variation.img);
					if (photoId) {
						const groupKey = pivotAttr.productName;
						if (!imgPropPictureMap[imgPropKey]) imgPropPictureMap[imgPropKey] = { [groupKey]: [photoId] };
						else if (!imgPropPictureMap[imgPropKey][groupKey]) imgPropPictureMap[imgPropKey][groupKey] = [photoId];
						else if (!imgPropPictureMap[imgPropKey][groupKey].includes(photoId)) imgPropPictureMap[imgPropKey][groupKey].push(photoId);
					}
				}
				let varSku = variation.sku || variation.supplierVariantId || "";
				varSku = varSku.trim();
				if (!varSku || seenSkus.has(varSku.toUpperCase())) {
					const parentId = product.prod_id || "";
					if (window.SSSkuEngine) varSku = window.SSSkuEngine.buildReadable(parentId, attrs, window.SSSkuEngine.prefixFor(product.supplier || "amazon"));
					else varSku = parentId + "-" + Object.values(variationSpecific).join("-");
					let uniqSku = varSku;
					let suffixCounter = 1;
					while (seenSkus.has(uniqSku.toUpperCase())) {
						const suffix = "-" + suffixCounter;
						const maxLen = window.SSSkuEngine ? window.SSSkuEngine.MAX_LEN : 50;
						uniqSku = varSku.slice(0, maxLen - suffix.length) + suffix;
						suffixCounter++;
					}
					varSku = uniqSku;
				}
				const finalSku = window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(varSku) : varSku;
				seenSkus.add(finalSku.toUpperCase());
				variationItems.push({
					variationSpecific,
					listingVariation: {
						price: Number(variation.price).toFixed(2),
						quantity: 1
					},
					sku: finalSku,
					state: "enabled",
					productInfo: {},
					index: variationItems.length
				});
			}
			const variationSpecificsMetaData = Object.entries(attrValuesMap).map(([name, value]) => ({
				name,
				value
			}));
			const seenCombosCheck = /* @__PURE__ */ new Set();
			const metaKeys = variationSpecificsMetaData.map((m) => m.name);
			const seenSkusCheck = /* @__PURE__ */ new Set();
			for (const item of variationItems) {
				const sku = item.sku;
				if (!sku) throw new Error(`Assertion failed: Variation item index ${item.index} has an empty SKU.`);
				if (seenSkusCheck.has(sku.toUpperCase())) throw new Error(`Assertion failed: Duplicate SKU detected in payload: ${sku}`);
				seenSkusCheck.add(sku.toUpperCase());
				const itemKeys = Object.keys(item.variationSpecific);
				for (const key of metaKeys) if (!itemKeys.includes(key)) throw new Error(`Assertion failed: Variation item SKU ${sku} is missing dimension: ${key}`);
				for (const key of itemKeys) if (!metaKeys.includes(key)) throw new Error(`Assertion failed: Variation item SKU ${sku} has unexpected dimension: ${key}`);
				const comboKey = JSON.stringify(Object.keys(item.variationSpecific).sort().reduce((acc, k) => {
					acc[k.toLowerCase()] = String(item.variationSpecific[k]).trim().toLowerCase();
					return acc;
				}, {}));
				if (seenCombosCheck.has(comboKey)) throw new Error(`Assertion failed: Duplicate attribute combination detected: ${comboKey}`);
				seenCombosCheck.add(comboKey);
				const price = parseFloat(item.listingVariation.price);
				if (isNaN(price) || price < .99) throw new Error(`Assertion failed: Variation SKU ${sku} has an invalid price: ${item.listingVariation.price}`);
			}
			if (imgPropPictureMap && Object.keys(imgPropPictureMap).length > 0) {
				const pivotKeys = Object.keys(imgPropPictureMap);
				if (pivotKeys.length > 1) throw new Error(`Assertion failed: eBay allows only one picture pivot dimension, found: ${pivotKeys.join(", ")}`);
				const pivotKey = pivotKeys[0];
				if (!metaKeys.includes(pivotKey)) throw new Error(`Assertion failed: Picture pivot key "${pivotKey}" must be one of the listing dimensions: ${metaKeys.join(", ")}`);
			}
			const requestBody = JSON.stringify({
				action: "save",
				draftId,
				listingMode: "AddItem",
				restricted: false,
				upiFieldName: "upc",
				variationItem: variationItems,
				variationSpecificPictureSet: imgPropPictureMap,
				variationSpecificsMetaData
			});
			const result = await _retry(async () => {
				const resp = await fetch(`https://bulkedit.ebay.${_getEbaySuffix()}/msku-update`, {
					method: "POST",
					credentials: "include",
					body: requestBody
				});
				if (!resp.ok) throw new Error(`eBay variation save failed (HTTP ${resp.status})`);
				return resp.json().catch(() => ({}));
			}, 3, 1200);
			if (!result) throw new Error("eBay variation save: empty response");
			const errs = result.errors || result.errorMessage || result.messages;
			if (Array.isArray(errs) && errs.length) {
				const msg = errs.map((e) => e.message || e.longMessage || e.text || JSON.stringify(e)).join("; ");
				throw new Error(`eBay rejected variations: ${msg}`);
			}
			if (typeof errs === "string" && errs.trim()) throw new Error(`eBay rejected variations: ${errs}`);
			console.log(`[SS MSKU] ${variationItems.length} variations saved OK.`);
			return result;
		}
		function adaptProduct(product) {
			const sourceId = product.sourceId || product.parentAsin || product.asin || "";
			const skuRoot = sourceId || (window.SSSkuEngine ? window.SSSkuEngine.fallbackRootFromTitle(product.title) : "");
			console.log("[SS adaptProduct] isSingleMode:", !!product.isSingleMode, "| images:", Array.isArray(product.images) ? product.images.length : 0, "| variants:", Array.isArray(product.variants) ? product.variants.length : 0, "| images[0]:", Array.isArray(product.images) && product.images[0] || null);
			const bullets = Array.isArray(product.bulletPoints) ? product.bulletPoints : [];
			let descHtml = "";
			if (product.description && (product.description.trim().startsWith("<") || product.description.includes("</"))) descHtml = _sanitizeDescriptionHtml(product.description);
			else {
				if (bullets.length > 0) descHtml += "<ul>" + bullets.map((b) => `<li>${b}</li>`).join("") + "</ul>";
				if (product.description) descHtml += `<p>${product.description}</p>`;
				descHtml = _sanitizeDescriptionHtml(descHtml);
			}
			if (!descHtml.trim()) descHtml = "<p>Quality product.</p>";
			const rawBasePrice = _cleanFloat(product.price);
			const basePrice = rawBasePrice > 0 ? rawBasePrice : .99;
			const hasRealVariants = product.hasVariants && Array.isArray(product.variants) && product.variants.length > 1;
			let prod_variations;
			if (hasRealVariants) {
				const seenCombos = /* @__PURE__ */ new Set();
				const validVariants = [];
				(product.variants || []).forEach((v) => {
					if (v.isDeleted === true || v.deleted === true) return;
					const hasAttrs = v.attrs && Object.keys(v.attrs).length > 0;
					const hasSpecs = v.specs && Object.keys(v.specs).length > 0;
					if (!hasAttrs && !hasSpecs) return;
					if (v.inStock === false) return;
					let combo = "";
					if (window.SSVariationNormalizer) {
						const optVals = window.SSVariationNormalizer.optionValuesFromVariant(v);
						combo = window.SSVariationNormalizer.combinationKey(optVals);
					} else {
						const rawAttrs = v.attrs || {};
						combo = Object.entries(rawAttrs).map(([k, val]) => {
							const str = val && typeof val === "object" ? val.productName || "" : String(val || "");
							return `${k.toLowerCase()}=${str.toLowerCase()}`;
						}).sort().join("");
					}
					if (combo) {
						if (seenCombos.has(combo)) {
							const prettyCombo = combo.split("").join(", ");
							throw new Error(`Duplicate variation combination detected: ${prettyCombo}`);
						}
						seenCombos.add(combo);
					}
					validVariants.push(v);
				});
				const sourceVariants = validVariants.length > 0 ? validVariants : product.variants;
				const firstV = sourceVariants[0];
				const firstAttrs = firstV.attrs || {};
				const attrKeys = Object.keys(firstAttrs);
				const rawImgProp = firstV.imgProp || attrKeys.find((k) => /colou?r/i.test(k)) || attrKeys[0] || null;
				const imgProp = rawImgProp && window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeLabel(rawImgProp) : rawImgProp;
				prod_variations = sourceVariants.map((v) => {
					let attrs;
					if (v.attrs && Object.keys(v.attrs).length > 0) attrs = { ...v.attrs };
					else {
						attrs = {};
						for (const [k, val] of Object.entries(v.specs || {})) attrs[k] = { productName: String(val) };
					}
					const varSku = v.sku || (window.SSSkuEngine ? window.SSSkuEngine.buildReadable(skuRoot, attrs, window.SSSkuEngine.prefixFor(product.supplier)) : skuRoot + (Object.values(attrs).map((a) => a?.productName || "").join("-") || ""));
					const ebayFinalPrice = _cleanFloat(v.ebayFinalPrice) || _cleanFloat(v.ebayPrice) || _cleanFloat(v.finalPrice);
					const rawVariantPrice = _cleanFloat(v.price);
					return {
						price: ebayFinalPrice > 0 ? ebayFinalPrice : rawVariantPrice > 0 ? rawVariantPrice : basePrice,
						raw_supplier_price: _cleanFloat(v.supplierPrice) || _cleanFloat(v.price) || basePrice,
						price_source: v.price_source || product.price_source || null,
						sku: varSku,
						attrs,
						img: v.img || v.image || null,
						imgProp: (v.imgProp && window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeLabel(v.imgProp) : v.imgProp) || imgProp,
						supplierVariantId: v.supplierVariantId || v.asin || null,
						variant_asin: v.supplierVariantId || v.asin || null
					};
				});
			} else {
				const ebayFinalPrice = _cleanFloat(product.ebayFinalPrice) || _cleanFloat(product.finalPrice);
				const finalPrice = ebayFinalPrice > 0 ? ebayFinalPrice : basePrice;
				const supplierPrice = _cleanFloat(product.supplierPrice) || _cleanFloat(product.raw_supplier_price) || _cleanFloat(product.price) || basePrice;
				const sku = product.ebaySku || (window.SSSkuEngine ? window.SSSkuEngine.buildReadable(skuRoot, {}, window.SSSkuEngine.prefixFor(product.supplier)) : skuRoot);
				prod_variations = [{
					price: finalPrice,
					raw_supplier_price: supplierPrice,
					price_source: product.price_source || null,
					sku,
					variant_asin: sourceId || null
				}];
			}
			return {
				prod_title: _enforceEbayTitle(product.title || sourceId || "Product"),
				prod_images: Array.isArray(product.images) ? product.images.slice(0, 12) : [],
				prod_specs: product.specs || product.specifications || {},
				prod_desc: descHtml,
				prod_id: sourceId,
				prod_qty: 1,
				prod_variations,
				supplier: product.supplier || product.marketplace || "amazon",
				meta: {
					country: "US",
					promoteListing: !!product.promoteListing,
					promotePercent: product.promotePercent || null
				}
			};
		}
		async function checkEbayAuth() {
			const suffix = _getEbaySuffix();
			try {
				const finalUrl = ((await fetch(`https://www.ebay.${suffix}/sh/lst/active`, {
					credentials: "include",
					redirect: "follow"
				})).url || "").toLowerCase();
				if (finalUrl.includes("signin") || finalUrl.includes("/login")) return false;
				return true;
			} catch (err) {
				console.warn("[SS Auth] eBay auth check failed (network) — allowing:", err.message);
				return true;
			}
		}
		async function checkVero(title) {
			if (!title) return {
				flagged: false,
				matches: []
			};
			try {
				const base = typeof ExtensionConfig !== "undefined" ? ExtensionConfig.getSupabaseFunctionUrl("check-vero") : "https://ojxzssooylmydystjvdo.supabase.co/functions/v1/check-vero";
				const apikey = typeof ExtensionConfig !== "undefined" ? ExtensionConfig.API_KEYS.SUPABASE_ANON : "";
				const resp = await fetch(base, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"apikey": apikey
					},
					body: JSON.stringify({ title })
				});
				if (!resp.ok) return {
					flagged: false,
					matches: []
				};
				return await resp.json();
			} catch (err) {
				console.warn("[SS VeRO] check failed (allowing):", err.message);
				return {
					flagged: false,
					matches: []
				};
			}
		}
		async function checkDuplicate(asin) {
			if (!asin) return { duplicate: false };
			return new Promise((resolve) => {
				chrome.runtime.sendMessage({
					action: "CHECK_DUPLICATE",
					asin
				}, (resp) => {
					if (chrome.runtime.lastError) {
						console.warn("[SS Dup] check failed (allowing):", chrome.runtime.lastError.message);
						resolve({ duplicate: false });
						return;
					}
					resolve(resp || { duplicate: false });
				});
			});
		}
		function _aiGenerate(kind, productData) {
			return new Promise((resolve) => {
				chrome.runtime.sendMessage({
					action: "SS_AI_GENERATE",
					kind,
					productData
				}, (resp) => {
					if (chrome.runtime.lastError) {
						resolve(null);
						return;
					}
					resolve(resp || null);
				});
			});
		}
		async function aiGenerateTitle(product) {
			const resp = await _aiGenerate("title", {
				title: product.title || "",
				brand: product.brand || "",
				category: product.category || "",
				bulletPoints: Array.isArray(product.bulletPoints) ? product.bulletPoints.slice(0, 3) : []
			});
			if (resp?.success && Array.isArray(resp.titles) && resp.titles.length) return resp.titles[0].title || resp.titles[0];
			return null;
		}
		async function getSelectedListingTemplate() {
			return new Promise((resolve) => {
				chrome.storage.local.get(["selectedListingTemplateId"], (result) => {
					const id = result.selectedListingTemplateId;
					if (!id) {
						resolve(null);
						return;
					}
					resolve([{
						id: "default-professional",
						htmlContent: `<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <header style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #1e3a8a; font-size: 24px; margin: 0; font-weight: 700; line-height: 1.3;">{title}</h1>
  </header>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Product Description</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {description}
    </div>
  </section>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Key Features</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {features}
    </div>
  </section>

  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Specifications</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {specifications}
    </div>
  </section>
  
  <footer style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>📦</span> Shipping & Handling
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Fast and free shipping on all orders. We package professionally and ship within 1 business day.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>🔄</span> 30-Day Returns Policy
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Shop with confidence. If you're not completely satisfied, return the item within 30 days for a full refund.</p>
    </div>
  </footer>
</div>`
					}].find((t) => t.id === id) || null);
				});
			});
		}
		function compileTemplate(template, productData, coreDescription) {
			if (!template || !template.htmlContent) return coreDescription;
			let html = template.htmlContent;
			const title = productData.title || "";
			const brand = productData.brand || "";
			const condition = productData.condition || "New";
			let featuresHtml = "";
			const bullets = productData.bulletPoints || productData.features || [];
			if (bullets.length > 0) featuresHtml = "<ul style=\"margin: 0; padding-left: 20px; line-height: 1.6;\">" + bullets.map((b) => `<li>${b}</li>`).join("") + "</ul>";
			let specificationsHtml = "";
			const specs = productData.specifications || {};
			if (specs && Object.keys(specs).length > 0) specificationsHtml = "<table style=\"width: 100%; border-collapse: collapse; font-size: 14px;\">" + Object.entries(specs).map(([k, v]) => `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>${k}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${v}</td></tr>`).join("") + "</table>";
			const values = {
				title,
				brand,
				condition,
				description: coreDescription,
				features: featuresHtml,
				specifications: specificationsHtml,
				shipping: "",
				returns: ""
			};
			html = html.replace(/<section[^>]*>([\s\S]*?)<\/section>/gi, (match, content) => {
				if ([...content.matchAll(/\{\{?(\w+)\}?\}/g)].map((m) => m[1]).some((key) => {
					return values.hasOwnProperty(key) && !values[key];
				})) return "";
				return match;
			});
			for (const [key, val] of Object.entries(values)) {
				const regex = new RegExp(`\\{\\{?${key}\\}?\\}`, "g");
				html = html.replace(regex, val || "");
			}
			html = html.replace(/\{\{?\w+\}?\}/g, "");
			html = html.replace(/https?:\/\/[^\s<"]+/gi, "").replace(/amazon\.com|walmart\.com/gi, "").replace(/\b(ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at)\b/gi, "").replace(/<img[^>]*>/gi, "");
			return html;
		}
		async function aiGenerateDescription(product) {
			const resp = await _aiGenerate("description", {
				title: product.title || "",
				brand: product.brand || "",
				bulletPoints: Array.isArray(product.bulletPoints) ? product.bulletPoints : [],
				description: product.description || ""
			});
			let aiDesc = resp?.description || resp?.html || (resp?.success ? resp.result : null) || null;
			if (aiDesc) {
				const activeTemplate = await getSelectedListingTemplate();
				if (activeTemplate) {
					console.log("[EbayListingApiHelper] Applying template compiler to generated AI description");
					aiDesc = compileTemplate(activeTemplate, product, aiDesc);
				}
			}
			return aiDesc;
		}
		return {
			getCategoryRecommendations,
			createListing,
			saveListing,
			updateListing,
			addVariations,
			extractListingDraft,
			adaptProduct,
			checkEbayAuth,
			checkVero,
			checkDuplicate,
			aiGenerateTitle,
			aiGenerateDescription,
			compileTemplate,
			getSelectedListingTemplate
		};
	})();
	function _buildSummary(adapted) {
		const prices = adapted.prod_variations.map((v) => _cleanFloat(v.price)).filter((n) => !isNaN(n) && n > 0);
		const lo = prices.length ? Math.min(...prices) : null;
		const hi = prices.length ? Math.max(...prices) : null;
		return {
			photos: Array.isArray(adapted.prod_images) ? adapted.prod_images.length : 0,
			variations: adapted.prod_variations.length,
			priceLow: lo,
			priceHigh: hi
		};
	}
	function _syncListingToDashboard(adapted, product, draftId) {
		return new Promise((resolve) => {
			try {
				console.log("[SS sync] isSingleMode:", !!product.isSingleMode, "| prod_images count:", adapted.prod_images ? adapted.prod_images.length : 0, "| prod_images[0]:", adapted.prod_images?.[0] || null);
				const mainImage = adapted.prod_images?.[0] || null;
				const firstVar = adapted.prod_variations?.[0] || {};
				const listingData = {
					title: adapted.prod_title,
					sku: firstVar.sku || adapted.prod_id || "",
					ebay_price: firstVar.price || null,
					raw_supplier_price: firstVar.raw_supplier_price || _cleanFloat(product.price) || null,
					supplier: product.supplier || "amazon",
					supplier_id: product.sourceId || product.asin || product.parentAsin || null,
					supplier_url: product.url || null,
					supplier_price: _cleanFloat(product.price) || null,
					amazon_price: _cleanFloat(product.price) || null,
					amazon_url: product.url || null,
					amazon_asin: product.parentAsin || product.asin || null,
					status: "draft",
					has_variations: adapted.prod_variations.length > 1,
					variation_count: adapted.prod_variations.length,
					title_source: product.title_source || null,
					description_source: product.description_source || null,
					price_source: product.price_source || null,
					sku_source: product.sku_source || null,
					variations: adapted.prod_variations.map((v) => ({
						sku: v.sku || "",
						ebay_sku_encoded: window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(v.sku || "") : "",
						final_price: v.price || 0,
						raw_supplier_price: v.raw_supplier_price || 0,
						price_source: v.price_source || null,
						currency: product.currency || "USD",
						stock_quantity: 1,
						variant_asin: v.variant_asin || v.supplierVariantId || null,
						parent_asin: product.parentAsin || product.asin || null,
						attributes: v.attrs || {},
						image_url: [v.img, ...adapted.prod_images || []].find((u) => u && u.startsWith("http")) || null
					})),
					...mainImage ? { amazon_data: {
						mainImage,
						imageUrl: mainImage,
						allImages: adapted.prod_images,
						source: "extension",
						draftId
					} } : {},
					...window._ssLastSkuConfirmation ? { ebay_data: { sku_confirmation: window._ssLastSkuConfirmation } } : {}
				};
				chrome.runtime.sendMessage({
					action: "SYNC_LISTING",
					payload: listingData
				}, (resp) => {
					if (chrome.runtime.lastError) {
						console.warn("[SS Sync] SYNC_LISTING failed:", chrome.runtime.lastError.message);
						resolve({
							success: false,
							error: chrome.runtime.lastError.message
						});
						return;
					}
					if (resp && resp.success === false) {
						console.error("[SS Sync] Dashboard sync FAILED:", resp.status || "", resp.error || "unknown error");
						const syncErrMsg = "Listed on eBay, but saving to your dashboard failed: " + (resp.error || "unknown error");
						if (window.UIHelper?.showToast) window.UIHelper.showToast(syncErrMsg, "error");
						else try {
							const div = document.createElement("div");
							div.setAttribute("superSolid", "true");
							div.style.cssText = [
								"position:fixed",
								"bottom:24px",
								"right:24px",
								"z-index:999999",
								"background:#d32f2f",
								"color:#fff",
								"padding:14px 18px",
								"border-radius:8px",
								"font-family:sans-serif",
								"font-size:13px",
								"max-width:360px",
								"box-shadow:0 4px 16px rgba(0,0,0,.3)"
							].join(";");
							div.textContent = syncErrMsg;
							document.body.appendChild(div);
							setTimeout(() => div.remove(), 12e3);
						} catch (_) {}
						resolve(resp);
						return;
					}
					console.log("[SS Sync] Listing synced to dashboard.");
					resolve(resp || { success: true });
				});
			} catch (err) {
				console.warn("[SS Sync] sync error:", err.message);
				resolve({
					success: false,
					error: err.message
				});
			}
		});
	}
	window._syncListingToDashboard = _syncListingToDashboard;
	function validateProductPricing(product) {
		if (!(product.hasVariants && Array.isArray(product.variants) && product.variants.length > 1)) {
			const supplierPrice = _cleanFloat(product.ebayFinalPrice ? product.supplierPrice : null) || _cleanFloat(product.price) || 0;
			const ebayFinalPrice = _cleanFloat(product.ebayFinalPrice) || _cleanFloat(product.finalPrice) || 0;
			if (!ebayFinalPrice || isNaN(ebayFinalPrice) || ebayFinalPrice <= 0) throw new Error("eBay Final Price is missing. Please calculate the final price before uploading.");
			const isManual = product.price_source === "manual";
			if (ebayFinalPrice === supplierPrice && !isManual) throw new Error("eBay Final Price is equal to the original Supplier Price. Please calculate your markup profit rules before listing.");
		} else {
			const activeVariants = [];
			(product.variants || []).forEach((v) => {
				if (v.isDeleted === true || v.deleted === true) return;
				const hasAttrs = v.attrs && Object.keys(v.attrs).length > 0;
				const hasSpecs = v.specs && Object.keys(v.specs).length > 0;
				if (!hasAttrs && !hasSpecs) return;
				if (v.inStock === false) return;
				activeVariants.push(v);
			});
			if (activeVariants.length === 0) throw new Error("No active variations found to upload.");
			activeVariants.forEach((v, idx) => {
				const supplierPrice = _cleanFloat(v.ebayFinalPrice ? v.supplierPrice : null) || _cleanFloat(v.price) || 0;
				const ebayFinalPrice = _cleanFloat(v.ebayFinalPrice) || _cleanFloat(v.ebayPrice) || _cleanFloat(v.finalPrice) || 0;
				if (!ebayFinalPrice || isNaN(ebayFinalPrice) || ebayFinalPrice <= 0) throw new Error(`eBay Final Price is missing for variation ${idx + 1}. Please calculate the final price before uploading.`);
				const isManual = v.price_source === "manual" || product.price_source === "manual";
				if (ebayFinalPrice === supplierPrice && !isManual) throw new Error(`eBay Final Price is equal to the original Supplier Price for variation ${idx + 1} unless intentionally set.`);
			});
		}
	}
	window.SellerSuitUploader = { async run(product) {
		const api = window.EbayListingApiHelper;
		console.log("[SS Uploader] Starting programmatic upload for:", product.title?.substring(0, 60));
		validateProductPricing(product);
		if (product.mockUpload || product.asin === "B08KT2Z93D") {
			console.log("[SS Uploader] MOCK UPLOAD MODE ACTIVE.");
			const adapted = api.adaptProduct(product);
			const draftId = "mock-draft-" + crypto.randomUUID();
			const syncResp = await _syncListingToDashboard(adapted, product, draftId);
			console.log("[SS Uploader] Mock sync response:", syncResp);
			if (product.bulkMode || product.bulkSessionId) return {
				ssBulk: true,
				success: true,
				draftId,
				listingId: syncResp && syncResp.listingId || null,
				variationCount: adapted.prod_variations.length,
				syncOk: !(syncResp && syncResp.success === false)
			};
			if (typeof window !== "undefined" && typeof ExtensionConfig !== "undefined" && ExtensionConfig.URLS?.WEB_APP_DASHBOARD) window.location.href = `${ExtensionConfig.URLS.WEB_APP_DASHBOARD}/ebay/listings`;
			return {
				success: true,
				draftId
			};
		}
		console.log("[SS Uploader] Checking eBay login...");
		if (!await api.checkEbayAuth()) throw new Error("You are not logged into eBay. Open eBay.com, sign in, then retry listing.");
		if (!product.forceVeroOverride) {
			console.log("[SS Uploader] Running VeRO brand check...");
			const vero = await api.checkVero(product.title || "");
			if (vero.flagged && vero.matches?.length) {
				const brands = vero.matches.map((m) => m.brand).join(", ");
				const err = /* @__PURE__ */ new Error(`VeRO risk: this product matches protected brand(s): ${brands}. Listing it may get your eBay account suspended. Remove the brand from the title, or enable "List anyway" to override.`);
				err.veroMatches = vero.matches;
				err.isVeroBlock = true;
				throw err;
			}
		}
		const dupAsin = product.parentAsin || product.asin || "";
		if (dupAsin && !product.forceDuplicateOverride) {
			console.log("[SS Uploader] Checking for duplicate listing...");
			const dup = await api.checkDuplicate(dupAsin);
			if (dup.duplicate) {
				const when = dup.listing?.created_at ? new Date(dup.listing.created_at).toLocaleDateString() : "previously";
				const err = /* @__PURE__ */ new Error(`Duplicate: you already listed this product (ASIN ${dupAsin}) ${when}. List again to create a second listing, or cancel.`);
				err.isDuplicateBlock = true;
				err.duplicateListing = dup.listing || null;
				throw err;
			}
		}
		if (product.useAiTitle) {
			console.log("[SS Uploader] Generating AI title...");
			try {
				const aiTitle = await api.aiGenerateTitle(product);
				if (aiTitle) product = {
					...product,
					title: aiTitle
				};
			} catch (e) {
				console.warn("[SS AI] title gen failed:", e.message);
			}
		}
		if (product.useAiDescription) {
			console.log("[SS Uploader] Generating AI description...");
			try {
				const aiDesc = await api.aiGenerateDescription(product);
				if (aiDesc) product = {
					...product,
					description: aiDesc,
					bulletPoints: []
				};
			} catch (e) {
				console.warn("[SS AI] description gen failed:", e.message);
			}
		} else if (!(product.description && (product.description.trim().startsWith("<") || product.description.includes("</")))) try {
			const activeTemplate = await api.getSelectedListingTemplate();
			if (activeTemplate) {
				console.log("[SS Uploader] Applying active template to raw description");
				product.description = api.compileTemplate(activeTemplate, product, product.description || "");
				product.bulletPoints = [];
			}
		} catch (e) {
			console.warn("[SS Uploader] Failed to apply template to raw description:", e);
		}
		const adapted = api.adaptProduct(product);
		console.log("[SS Uploader] Fetching category recommendations...");
		const categories = (await api.getCategoryRecommendations(adapted.prod_title)).searchCategories;
		if (!categories?.length) throw new Error("No eBay categories found — make sure you are logged into eBay.com and try again.");
		let categoryId;
		for (const cat of categories) if (cat.leaf) {
			categoryId = cat.value;
			break;
		}
		if (!categoryId) categoryId = categories[0].value;
		console.log("[SS Uploader] Category ID:", categoryId);
		console.log("[SS Uploader] Creating listing draft...");
		const [listingData, appData, parsedCsrf] = await api.createListing(adapted.prod_title, categoryId);
		const { draftId, draftCsrfValue, epsData, listingModel, aspectNames } = api.extractListingDraft(listingData, appData, parsedCsrf);
		console.log("[SS Uploader] Draft ID:", draftId, "— uploading images + fields...");
		const _v0 = adapted.prod_variations && adapted.prod_variations[0] || {};
		console.log("[SS Uploader] FINAL PAYLOAD →", {
			title: adapted.prod_title,
			titleLen: (adapted.prod_title || "").length,
			descriptionLen: (adapted.prod_desc || "").length,
			descriptionHead: (adapted.prod_desc || "").slice(0, 80),
			price: _v0.price,
			rawSupplierPrice: _v0.raw_supplier_price,
			sku: _v0.sku,
			skuEncoded: window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(_v0.sku || "") : _v0.sku,
			variations: adapted.prod_variations.length
		});
		await api.updateListing(draftId, draftCsrfValue, epsData, listingModel, adapted);
		console.log("[SS Uploader] Listing saved.");
		const isSingleVariation = adapted.prod_variations.length <= 1;
		const suffix = window.location.host.split("ebay").pop()?.replace(".", "") || "com";
		const ssSummary = _buildSummary(adapted);
		if (isSingleVariation) {
			const uploadSessionId = crypto.randomUUID();
			const syncResp = await _syncListingToDashboard(adapted, product, draftId);
			if (product.bulkMode) {
				console.log("[SS Uploader] Single variation (bulk) — done, returning result.");
				return {
					ssBulk: true,
					success: true,
					draftId,
					listingId: syncResp && syncResp.listingId || null,
					variationCount: adapted.prod_variations.length,
					syncOk: !(syncResp && syncResp.success === false)
				};
			}
			await chrome.storage.local.set({ [uploadSessionId]: {
				product,
				isImported: true,
				draftId,
				epsData,
				smsAspects: aspectNames,
				ssSummary,
				stagedAt: Date.now(),
				skuGuard: window._ssLastSkuConfirmation && window._ssLastSkuConfirmation.sentSku ? {
					sentSku: window._ssLastSkuConfirmation.sentSku,
					apiConfirmation: window._ssLastSkuConfirmation,
					amazonAsin: product.parentAsin || product.asin || null,
					amazonUrl: product.url || null,
					title: adapted.prod_title || null
				} : null
			} });
			console.log("[SS Uploader] Single variation — navigating to listing draft...");
			window.location.href = `https://www.ebay.${suffix}/lstng?draftId=${draftId}&mode=AddItem&uploadSessionId=${uploadSessionId}`;
		} else {
			const uploadSessionId = crypto.randomUUID();
			await chrome.storage.local.set({ [uploadSessionId]: {
				product,
				isImported: false,
				draftId,
				epsData,
				smsAspects: aspectNames,
				categoryId,
				needsVariations: true,
				ssSummary,
				stagedAt: Date.now(),
				...product.bulkMode ? {
					bulkMode: true,
					bulkSessionId: product.__ssBulkSessionId || null
				} : {}
			} });
			console.log("[SS Uploader] Multi-variation — navigating to bulkedit MSKU editor...");
			window.location.href = `https://bulkedit.ebay.${suffix}/msku?draftId=${draftId}&listingMode=AddItem&categoryId=${categoryId}&decimalSymbol=.&maxPics=12&loadDraft=true&uploadSessionId=${uploadSessionId}`;
		}
	} };
	//#endregion
	//#region background/bulk-core.js
	window.SSBulkCore = (() => {
		"use strict";
		const MIN_INTERVAL_MS = 30 * 1e3;
		const MAX_INTERVAL_MS = 3600 * 1e3;
		const DEFAULT_INTERVAL_MS = 60 * 1e3;
		const TERMINAL = new Set([
			"listed",
			"failed",
			"skipped"
		]);
		function sanitizeIntervalMs(seconds) {
			const n = parseInt(seconds, 10);
			if (isNaN(n) || n <= 0) return DEFAULT_INTERVAL_MS;
			return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, n * 1e3));
		}
		/**
		* Build a fresh job state from a START_BULK_JOB payload.
		* @param {object} payload { items:[{id,url,overrides}], interval, settings }
		*/
		function createState(payload) {
			return {
				version: 2,
				items: (Array.isArray(payload.items) ? payload.items : []).filter((it) => it && it.url && it.id).map((it) => ({
					id: String(it.id),
					url: String(it.url),
					overrides: it.overrides && typeof it.overrides === "object" ? it.overrides : {},
					status: "queued",
					error: null,
					listingId: null,
					variationCount: null,
					title: it.title || null,
					image: it.image || null,
					supplier: it.supplier || null,
					startedAt: null,
					finishedAt: null
				})),
				isRunning: false,
				intervalMs: sanitizeIntervalMs(payload.interval),
				settings: {
					useAiTitle: !!(payload.settings && payload.settings.useAiTitle),
					useAiDescription: !!(payload.settings && payload.settings.useAiDescription),
					minQty: parseInt(payload.settings && payload.settings.minQty, 10) || 0,
					allowLowQty: (payload.settings && payload.settings.allowLowQty) !== false
				},
				currentItemId: null,
				startedAt: Date.now(),
				updatedAt: Date.now()
			};
		}
		function nextQueuedItem(state) {
			if (!state || !Array.isArray(state.items)) return null;
			return state.items.find((it) => it.status === "queued") || null;
		}
		function getItem(state, itemId) {
			if (!state || !Array.isArray(state.items)) return null;
			return state.items.find((it) => it.id === itemId) || null;
		}
		/** Immutable item patch; stamps finishedAt on terminal transitions. */
		function patchItem(state, itemId, patch) {
			const items = state.items.map((it) => {
				if (it.id !== itemId) return it;
				const next = {
					...it,
					...patch
				};
				if (TERMINAL.has(next.status) && !next.finishedAt) next.finishedAt = Date.now();
				if (!TERMINAL.has(next.status)) next.finishedAt = null;
				return next;
			});
			return {
				...state,
				items,
				updatedAt: Date.now()
			};
		}
		function isTerminal(status) {
			return TERMINAL.has(status);
		}
		function counts(state) {
			const c = {
				total: 0,
				queued: 0,
				scraping: 0,
				uploading: 0,
				listed: 0,
				failed: 0,
				skipped: 0
			};
			for (const it of state && state.items || []) {
				c.total++;
				if (c[it.status] !== void 0) c[it.status]++;
			}
			return c;
		}
		/**
		* Apply dashboard pre-upload overrides onto a scraped product — the
		* user-edited tier of the data-priority rule. Manual values win and are
		* source-flagged so a later re-scrape can never clobber them.
		* Price override applies to single-listing products only; variation prices
		* stay with the per-variant calculator output.
		* @param {object} product normalized scraped product
		* @param {object} overrides { title?, price?, sku? }
		*/
		function applyOverrides(product, overrides) {
			if (!overrides || typeof overrides !== "object") return product;
			const out = { ...product };
			const title = typeof overrides.title === "string" ? overrides.title.trim() : "";
			if (title) {
				out.title = title;
				out.title_source = "manual";
			}
			const sku = typeof overrides.sku === "string" ? overrides.sku.trim() : "";
			if (sku) {
				out.ebaySku = sku;
				out.sku_source = "manual";
			}
			const price = parseFloat(overrides.price);
			const hasVariants = !!out.hasVariants && Array.isArray(out.variants) && out.variants.length > 1;
			if (!isNaN(price) && price > 0 && !hasVariants) {
				out.finalPrice = price;
				out.price_source = "manual";
			}
			return out;
		}
		/**
		* Dashboard display snapshot for one scraped product. Image is the supplier
		* CDN URL — internal preview only; public eBay images go through EPS.
		*/
		function summarizeProduct(product) {
			const p = product || {};
			const variants = Array.isArray(p.variants) ? p.variants : [];
			return {
				title: p.title || null,
				image: Array.isArray(p.images) && p.images.find((u) => typeof u === "string" && u.startsWith("http")) || p.mainImage || null,
				supplier: p.supplier || p.marketplace || null,
				supplierId: p.sourceId || p.parentAsin || p.asin || null,
				variationCount: variants.length || (p.hasVariants ? null : 1),
				supplierPrice: parseFloat(p.price) || null,
				ebayPrice: parseFloat(p.finalPrice) || null,
				sku: p.ebaySku || null
			};
		}
		/**
		* Recover a persisted state after a service-worker / browser restart.
		* - scraping items had no side effects yet → back to queued
		* - uploading items are ambiguous (may have listed) → failed with guidance
		* Returns { state, changed }.
		*/
		function recoverState(state) {
			if (!state || !Array.isArray(state.items)) return {
				state,
				changed: false
			};
			let changed = false;
			const items = state.items.map((it) => {
				if (it.status === "scraping") {
					changed = true;
					return {
						...it,
						status: "queued",
						error: null
					};
				}
				if (it.status === "uploading") {
					changed = true;
					return {
						...it,
						status: "failed",
						finishedAt: Date.now(),
						error: "Interrupted during eBay upload (browser/extension restarted). Check your eBay drafts before retrying to avoid a duplicate."
					};
				}
				return it;
			});
			return {
				state: changed ? {
					...state,
					items,
					currentItemId: null,
					updatedAt: Date.now()
				} : state,
				changed
			};
		}
		/** Detects errors that should pause the whole job, not just fail one item. */
		function isJobBlockingError(message) {
			const m = String(message || "");
			return /CAPTCHA/i.test(m) || /not logged into eBay/i.test(m) || /Please Log In/i.test(m) || /(limit reached|Insufficient credits|INSUFFICIENT_CREDITS|not have enough credits|subscription|Trial expired)/i.test(m);
		}
		return {
			MIN_INTERVAL_MS,
			DEFAULT_INTERVAL_MS,
			sanitizeIntervalMs,
			createState,
			nextQueuedItem,
			getItem,
			patchItem,
			isTerminal,
			counts,
			applyOverrides,
			summarizeProduct,
			recoverState,
			isJobBlockingError
		};
	})();
	//#endregion
	//#region background/listing-runner.js
	/**
	* SellerSuit Bulk Listing Runner (v2)
	*
	* Background worker for the dashboard Bulk Lister. Processes queue items one
	* at a time through the SAME pipeline the side panel uses:
	*   supplier tab → adapter SCRAPE_VARIANTS (variants + pricing + normalizer)
	*   → duplicate pre-check → dashboard overrides (manual tier)
	*   → import_ebay-style uploadSessionId entry → eBay prelist tab
	*   → SellerSuitUploader.run() (+ ebay_bulkedit for variations)
	*   → BULK_ITEM_RESULT message back here → status + cleanup → next item.
	*
	* There is intentionally NO second upload implementation here — the eBay
	* upload, image handling, SKU/pricing and DB sync are the existing ones.
	*
	* State is persisted to chrome.storage.local (BULK_STATE_KEY) after every
	* transition so a service-worker restart resumes instead of losing the job.
	* Scheduling uses chrome.alarms (MV3-safe), never bare setTimeout across items.
	*/
	var BULK_STATE_KEY = "bulkJobStateV2";
	var BULK_LOCK_KEY = "bulkUploadLock";
	var BULK_ALARM_NEXT = "ss-bulk-next";
	var BULK_ALARM_RESUME = "ss-bulk-resume";
	var SCRAPE_TIMEOUT_MS = 90 * 1e3;
	var UPLOAD_TIMEOUT_MS = 300 * 1e3;
	var LOCK_STALE_MS = 300 * 1e3;
	var bulkRuntime = {
		state: null,
		supplierTabId: null,
		ebayTabId: null,
		uploadWaiters: /* @__PURE__ */ new Map(),
		processing: false
	};
	function bulkLog(message) {
		console.log(`[Bulk Runner] ${message}`);
	}
	async function saveBulkState() {
		if (!bulkRuntime.state) return;
		await chrome.storage.local.set({ [BULK_STATE_KEY]: bulkRuntime.state });
	}
	async function loadBulkState() {
		if (bulkRuntime.state) return bulkRuntime.state;
		bulkRuntime.state = (await chrome.storage.local.get(BULK_STATE_KEY))[BULK_STATE_KEY] || null;
		return bulkRuntime.state;
	}
	function broadcastToDashboard(message) {
		try {
			chrome.tabs.query({}, (tabs) => {
				for (const tab of tabs) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
			});
		} catch (_) {}
	}
	function notifyItemProgress(item) {
		broadcastToDashboard({
			type: "BULK_JOB_PROGRESS_UPDATE",
			payload: {
				itemId: item.id,
				status: item.status,
				error: item.error || null,
				listingId: item.listingId || null,
				variationCount: item.variationCount ?? null,
				title: item.title || null,
				image: item.image || null,
				supplier: item.supplier || null,
				supplierId: item.supplierId || null,
				ebayPrice: item.ebayPrice ?? null,
				supplierPrice: item.supplierPrice ?? null,
				sku: item.sku || null,
				counts: window.SSBulkCore.counts(bulkRuntime.state),
				isRunning: !!(bulkRuntime.state && bulkRuntime.state.isRunning)
			}
		});
	}
	function notifyJobFinished(reason) {
		broadcastToDashboard({
			type: "BULK_JOB_FINISHED",
			payload: {
				reason: reason || "completed",
				counts: window.SSBulkCore.counts(bulkRuntime.state)
			}
		});
	}
	function notifyJobPaused(reason) {
		broadcastToDashboard({
			type: "BULK_JOB_PAUSED",
			payload: {
				reason: reason || "paused",
				counts: window.SSBulkCore.counts(bulkRuntime.state)
			}
		});
	}
	async function acquireUploadLock(itemId) {
		const lock = (await chrome.storage.local.get(BULK_LOCK_KEY))[BULK_LOCK_KEY];
		if (lock && lock.itemId !== itemId && Date.now() - (lock.at || 0) < LOCK_STALE_MS) return false;
		await chrome.storage.local.set({ [BULK_LOCK_KEY]: {
			itemId,
			at: Date.now()
		} });
		return true;
	}
	async function releaseUploadLock(itemId) {
		const lock = (await chrome.storage.local.get(BULK_LOCK_KEY))[BULK_LOCK_KEY];
		if (!lock || lock.itemId === itemId) await chrome.storage.local.remove(BULK_LOCK_KEY);
	}
	async function processNextBulkItem() {
		if (bulkRuntime.processing) return;
		bulkRuntime.processing = true;
		try {
			await loadBulkState();
			const state = bulkRuntime.state;
			if (!state || !state.isRunning) return;
			const item = window.SSBulkCore.nextQueuedItem(state);
			if (!item) {
				await finishBulkJob();
				return;
			}
			if (!await acquireUploadLock(item.id)) {
				bulkLog("Upload lock held elsewhere — retrying in 60s");
				chrome.alarms.create(BULK_ALARM_NEXT, { delayInMinutes: 1 });
				return;
			}
			state.currentItemId = item.id;
			await transitionItem(item.id, {
				status: "scraping",
				error: null,
				startedAt: Date.now()
			});
			bulkLog(`Processing ${item.url}`);
			let product = null;
			try {
				product = await scrapeSupplierProduct(item.url, state.settings);
				const summary = window.SSBulkCore.summarizeProduct(product);
				await transitionItem(item.id, summary);
				const dupId = product.parentAsin || product.asin || product.sourceId || null;
				if (dupId && typeof AuthHelper !== "undefined") try {
					const dupResp = await AuthHelper.callEdgeFunction("check-duplicate", { asin: dupId });
					if (dupResp && dupResp.data && dupResp.data.duplicate) {
						await finishItem(item.id, {
							status: "skipped",
							error: "Already listed (duplicate supplier ID)"
						});
						return scheduleNext();
					}
				} catch (_) {}
				product = window.SSBulkCore.applyOverrides(product, item.overrides);
				if (state.settings.useAiTitle) product = {
					...product,
					useAiTitle: true
				};
				if (state.settings.useAiDescription) product = {
					...product,
					useAiDescription: true
				};
				await transitionItem(item.id, { status: "uploading" });
				const result = await uploadViaEbayTab(product, item.id);
				if (result.success) await finishItem(item.id, {
					status: "listed",
					listingId: result.listingId,
					variationCount: result.variationCount ?? (product.variants ? product.variants.length : 1)
				});
				else await failItem(item.id, result.error || "eBay upload failed");
			} catch (error) {
				const msg = error && error.message ? error.message : "Unknown error";
				console.error(`[Bulk Runner] Item ${item.id} failed:`, msg);
				await failItem(item.id, msg);
				if (window.SSBulkCore.isJobBlockingError(msg)) {
					bulkRuntime.state.isRunning = false;
					await saveBulkState();
					notifyJobPaused(msg);
					bulkLog(`Job paused (blocking error): ${msg}`);
					await releaseUploadLock(item.id);
					return;
				}
			} finally {
				await releaseUploadLock(item.id);
			}
			scheduleNext();
		} finally {
			bulkRuntime.processing = false;
		}
	}
	async function finishBulkJob() {
		const state = bulkRuntime.state;
		if (!state) return;
		state.isRunning = false;
		state.currentItemId = null;
		await saveBulkState();
		await chrome.storage.local.remove(BULK_LOCK_KEY).catch(() => {});
		bulkLog("All items processed");
		notifyJobFinished("completed");
	}
	function scheduleNext() {
		const state = bulkRuntime.state;
		if (!state || !state.isRunning) return;
		if (!window.SSBulkCore.nextQueuedItem(state)) {
			finishBulkJob();
			return;
		}
		const minutes = Math.max(.5, state.intervalMs / 6e4);
		chrome.alarms.create(BULK_ALARM_NEXT, { delayInMinutes: minutes });
		bulkLog(`Next item in ${Math.round(minutes * 60)}s`);
	}
	async function transitionItem(itemId, patch) {
		bulkRuntime.state = window.SSBulkCore.patchItem(bulkRuntime.state, itemId, patch);
		await saveBulkState();
		const item = window.SSBulkCore.getItem(bulkRuntime.state, itemId);
		if (item) notifyItemProgress(item);
	}
	async function finishItem(itemId, patch) {
		bulkRuntime.state.currentItemId = null;
		await transitionItem(itemId, patch);
	}
	async function failItem(itemId, error) {
		await finishItem(itemId, {
			status: "failed",
			error: String(error).slice(0, 500)
		});
	}
	function scrapeSupplierProduct(url, settings) {
		return new Promise((resolve, reject) => {
			let done = false;
			let pollInterval = null;
			const cleanup = () => {
				if (pollInterval) clearInterval(pollInterval);
				if (bulkRuntime.supplierTabId) {
					chrome.tabs.remove(bulkRuntime.supplierTabId).catch(() => {});
					bulkRuntime.supplierTabId = null;
				}
			};
			const timeout = setTimeout(() => {
				if (done) return;
				done = true;
				cleanup();
				reject(/* @__PURE__ */ new Error("Scraping timed out — page stuck, blocked, or CAPTCHA"));
			}, SCRAPE_TIMEOUT_MS);
			chrome.tabs.create({
				url,
				active: true
			}, (tab) => {
				if (chrome.runtime.lastError) {
					clearTimeout(timeout);
					return reject(new Error(chrome.runtime.lastError.message));
				}
				bulkRuntime.supplierTabId = tab.id;
				let scrapeInFlight = false;
				pollInterval = setInterval(() => {
					if (done || scrapeInFlight) return;
					scrapeInFlight = true;
					chrome.tabs.sendMessage(tab.id, {
						action: "SCRAPE_VARIANTS",
						options: {
							minQty: settings.minQty || 0,
							allowLowQty: settings.allowLowQty !== false
						}
					}, (response) => {
						scrapeInFlight = false;
						if (done) return;
						if (chrome.runtime.lastError) return;
						if (!response) return;
						done = true;
						clearTimeout(timeout);
						cleanup();
						if (response.success && response.data) resolve(response.data);
						else reject(new Error(response && response.error || "Scrape failed"));
					});
				}, 3e3);
			});
		});
	}
	/**
	* Mirrors the import_ebay handler (message-router.js) but adds bulk metadata
	* and awaits a BULK_ITEM_RESULT terminal signal from the eBay content scripts.
	*/
	function uploadViaEbayTab(product, bulkItemId) {
		return new Promise((resolve) => {
			const uploadSessionId = crypto.randomUUID();
			const ebayUrl = `https://www.ebay.com/sl/prelist/suggest?sr=shBulkLister&uploadSessionId=${uploadSessionId}`;
			const settle = (result) => {
				if (bulkRuntime.ebayTabId) {
					chrome.tabs.remove(bulkRuntime.ebayTabId).catch(() => {});
					bulkRuntime.ebayTabId = null;
				}
				chrome.storage.local.remove(uploadSessionId).catch(() => {});
				resolve(result);
			};
			const timer = setTimeout(() => {
				bulkRuntime.uploadWaiters.delete(uploadSessionId);
				settle({
					success: false,
					error: "eBay upload timed out (5 min) — page stuck or eBay flow changed"
				});
			}, UPLOAD_TIMEOUT_MS);
			bulkRuntime.uploadWaiters.set(uploadSessionId, {
				timer,
				resolve: (result) => settle(result)
			});
			(async () => {
				const bulkProduct = {
					...product,
					bulkMode: true
				};
				await chrome.storage.local.set({ [uploadSessionId]: {
					product: bulkProduct,
					isImported: false,
					uploadType: "classic",
					bulkMode: true,
					bulkItemId,
					stagedAt: Date.now()
				} });
				chrome.tabs.create({
					url: ebayUrl,
					active: true
				}, (tab) => {
					if (chrome.runtime.lastError) {
						clearTimeout(timer);
						bulkRuntime.uploadWaiters.delete(uploadSessionId);
						settle({
							success: false,
							error: chrome.runtime.lastError.message
						});
						return;
					}
					bulkRuntime.ebayTabId = tab.id;
				});
			})().catch((e) => {
				clearTimeout(timer);
				bulkRuntime.uploadWaiters.delete(uploadSessionId);
				settle({
					success: false,
					error: "Could not stage upload: " + (e && e.message ? e.message : e)
				});
			});
		});
	}
	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === BULK_ALARM_NEXT || alarm.name === BULK_ALARM_RESUME) processNextBulkItem();
	});
	(async () => {
		try {
			const state = await loadBulkState();
			if (!state) return;
			const { state: recovered, changed } = window.SSBulkCore.recoverState(state);
			bulkRuntime.state = recovered;
			if (changed) await saveBulkState();
			if (recovered.isRunning && window.SSBulkCore.nextQueuedItem(recovered)) {
				bulkLog("Recovered running job after restart — resuming in 15s");
				chrome.alarms.create(BULK_ALARM_RESUME, { delayInMinutes: .25 });
			} else if (recovered.isRunning) {
				recovered.isRunning = false;
				await saveBulkState();
			}
		} catch (e) {
			console.warn("[Bulk Runner] recovery failed:", e && e.message);
		}
	})();
	function getSafeListingSyncIdentity(payload = {}) {
		return {
			sku: payload.sku || payload.ebaySku || null,
			asin: payload.amazon_asin || payload.amazonAsin || null
		};
	}
	async function recordListingSyncError$1({ source = "background", status = null, error = "Unknown sync error", details = null, payload = {} } = {}) {
		try {
			const entry = {
				timestamp: (/* @__PURE__ */ new Date()).toISOString(),
				status,
				source,
				error: String(error || "Unknown sync error").slice(0, 500),
				...getSafeListingSyncIdentity(payload)
			};
			if (details && typeof details === "object") entry.details = {
				action: details.action || void 0,
				code: details.code || void 0,
				message: details.message ? String(details.message).slice(0, 300) : void 0
			};
			const data = await chrome.storage.local.get(["listingSyncErrors"]);
			const errors = Array.isArray(data.listingSyncErrors) ? data.listingSyncErrors : [];
			await chrome.storage.local.set({
				listingSyncLastError: entry,
				listingSyncErrors: [entry, ...errors].slice(0, 10)
			});
		} catch (err) {
			console.warn("[listing-sync] Failed to record sync error:", err?.message || err);
		}
	}
	async function postCreateListing$1(payload, source = "background") {
		if (typeof AuthHelper === "undefined") {
			const error = "AuthHelper is not defined.";
			await recordListingSyncError$1({
				source,
				status: 500,
				error,
				payload
			});
			return {
				success: false,
				source,
				status: 500,
				error
			};
		}
		const response = await AuthHelper.callEdgeFunction("create-listing", payload);
		const data = response.data;
		const status = response.status || 0;
		if (response.error) {
			const error = response.error || `create-listing failed with HTTP ${status}`;
			await recordListingSyncError$1({
				source,
				status,
				error,
				details: data,
				payload
			});
			return {
				success: false,
				source,
				status,
				error,
				details: data
			};
		}
		return {
			success: true,
			source,
			status,
			listingId: data?.listing?.id,
			data
		};
	}
	globalThis.postCreateListing = postCreateListing$1;
	globalThis.recordListingSyncError = recordListingSyncError$1;
	//#endregion
	//#region background/alarm-handler.js
	/**
	* SellerSuit Alarm Handler
	* Consolidates all alarm listeners and settings synchronization logic.
	*/
	var EBAY_ORDER_SYNC_INTERVAL = 900 * 1e3;
	async function syncSettings() {
		try {
			const token = (await chrome.storage.local.get("saasToken")).saasToken;
			if (!token) return;
			const urls = getUrls();
			const apiKeys = getApiKeys();
			if (!urls || !apiKeys) return;
			const saasUrl = urls.SUPABASE_URL;
			const saasKey = apiKeys.SUPABASE_ANON;
			const response = await fetch(`${saasUrl}/rest/v1/admin_settings?select=*`, {
				method: "GET",
				headers: {
					"Authorization": `Bearer ${token}`,
					"apikey": saasKey,
					"Prefer": "return=representation"
				}
			});
			if (response.ok) {
				const settingsData = await response.json();
				const updates = {};
				try {
					const userSettingsRes = await fetch(`${saasUrl}/rest/v1/user_ebay_settings?select=*`, {
						method: "GET",
						headers: {
							"Authorization": `Bearer ${token}`,
							"apikey": saasKey,
							"Prefer": "return=representation"
						}
					});
					if (userSettingsRes.ok) {
						const userSet = await userSettingsRes.json();
						if (userSet && userSet.length > 0) updates.userEbaySettings = userSet[0];
					}
				} catch (e) {}
				try {
					const profileRes = await fetch(`${saasUrl}/rest/v1/profiles?select=settings`, {
						method: "GET",
						headers: {
							"Authorization": `Bearer ${token}`,
							"apikey": saasKey,
							"Prefer": "return=representation"
						}
					});
					if (profileRes.ok) {
						const profileData = await profileRes.json();
						if (profileData && profileData.length > 0 && profileData[0].settings) {
							const settings = profileData[0].settings;
							if (settings.selected_listing_template_id) updates.selectedListingTemplateId = settings.selected_listing_template_id;
						}
					}
				} catch (e) {
					console.error("🔄 SYNC: Profile settings fetch failed", e);
				}
				settingsData.forEach((setting) => {
					if (setting.key === "gemini_api_key") updates.geminiApiKey = setting.value;
					if (setting.key === "ebay_sync_enabled") updates.ebaySyncEnabled = setting.value === "true";
					if (setting.key === "ebay_sync_days") updates.ebaySyncDays = parseInt(setting.value, 10) || 90;
					if (setting.key === "ebay_sync_interval") updates.ebaySyncInterval = (parseInt(setting.value, 10) || 60) * 60 * 1e3;
				});
				if (Object.keys(updates).length > 0) {
					await chrome.storage.local.set(updates);
					console.log("🔄 SYNC: Settings updated from Admin Panel.", updates);
					startEbayOrderSyncInterval$1();
				}
			}
		} catch (error) {
			console.error("🔄 SYNC ERROR:", error);
		}
	}
	var ALARM_SYNC_ORDERS = "ebay-order-sync";
	var ALARM_SYNC_SETTINGS = "sync-settings";
	var ALARM_PRICING_SYNC = "pricing-rules-sync";
	var ALARM_SESSION_SWEEP = "session-sweep";
	var SESSION_SWEEP_TTL_MS = 1440 * 60 * 1e3;
	async function sweepStaleListingSessions() {
		try {
			const storage = await chrome.storage.local.get(null);
			const now = Date.now();
			const staleKeys = [];
			for (const [key, entry] of Object.entries(storage)) {
				if (!(entry && typeof entry === "object" && entry.product && typeof entry.product === "object" && Object.prototype.hasOwnProperty.call(entry, "isImported"))) continue;
				if (entry.stagedAt ? now - entry.stagedAt > SESSION_SWEEP_TTL_MS : entry.isImported === true) staleKeys.push(key);
			}
			if (staleKeys.length) {
				await chrome.storage.local.remove(staleKeys);
				console.log(`🧹 [Session Sweep] Removed ${staleKeys.length} stale listing session blob(s).`);
			}
			return staleKeys;
		} catch (err) {
			console.warn("🧹 [Session Sweep] failed:", err?.message || err);
			return [];
		}
	}
	if (typeof window !== "undefined") window.SSSessionSweep = {
		sweepStaleListingSessions,
		SESSION_SWEEP_TTL_MS
	};
	async function startEbayOrderSyncInterval$1() {
		const data = await chrome.storage.local.get(["ebaySyncInterval", "ebaySyncEnabled"]);
		const interval = data.ebaySyncInterval || EBAY_ORDER_SYNC_INTERVAL;
		if (!(data.ebaySyncEnabled !== false)) {
			if (typeof SyncUtils !== "undefined") SyncUtils.syncLog("info", "eBay auto-sync is DISABLED by user.");
			else console.log("SyncUtils undefined, eBay auto-sync is DISABLED by user.");
			await chrome.alarms.clear(ALARM_SYNC_ORDERS);
			return;
		}
		const periodMinutes = Math.max(1, interval / 6e4);
		await chrome.alarms.create(ALARM_SYNC_ORDERS, { periodInMinutes: periodMinutes });
		if (typeof SyncUtils !== "undefined") SyncUtils.syncLog("info", `eBay order sync alarm set (every ${periodMinutes} min)`);
		else console.log(`eBay order sync alarm set (every ${periodMinutes} min)`);
	}
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "local") {
			if (changes.ebaySyncInterval || changes.ebaySyncEnabled) startEbayOrderSyncInterval$1();
		}
	});
	chrome.alarms.onAlarm.addListener(async (alarm) => {
		if (alarm.name === ALARM_SYNC_ORDERS) {
			if (typeof SyncUtils !== "undefined") SyncUtils.triggerEbayOrderSync("alarm");
		} else if (alarm.name === ALARM_SYNC_SETTINGS) syncSettings();
		else if (alarm.name === ALARM_PRICING_SYNC) {
			if (typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.sync().catch(() => {});
		} else if (alarm.name === ALARM_SESSION_SWEEP) sweepStaleListingSessions();
	});
	chrome.runtime.onStartup.addListener(async () => {
		chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
		const isAuth = typeof AuthHelper !== "undefined" ? await AuthHelper.verifyAuthStatus() : false;
		syncSettings();
		if (isAuth) {
			if (typeof SyncUtils !== "undefined") setTimeout(() => SyncUtils.triggerEbayOrderSync("startup"), 1e4);
			startEbayOrderSyncInterval$1();
			if (typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.sync().catch(() => {});
		}
	});
	chrome.runtime.onInstalled.addListener(async (details) => {
		chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
		const isAuth = typeof AuthHelper !== "undefined" ? await AuthHelper.verifyAuthStatus() : false;
		syncSettings();
		if (isAuth) {
			if (typeof SyncUtils !== "undefined") setTimeout(() => SyncUtils.triggerEbayOrderSync("install"), 1e4);
			startEbayOrderSyncInterval$1();
			if (typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.sync().catch(() => {});
		}
		if (details.reason === "install") {
			await chrome.storage.local.set({ firstInstall: true });
			const onboardingUrl = typeof ExtensionConstants !== "undefined" && ExtensionConstants.WEB_BASE_URL || "https://sellersuit.com";
			console.log("🎉 [Background] First Install! Opening onboarding:", onboardingUrl);
			chrome.tabs.create({ url: onboardingUrl });
		}
	});
	chrome.alarms.create(ALARM_SYNC_SETTINGS, { periodInMinutes: 30 });
	chrome.alarms.create(ALARM_PRICING_SYNC, { periodInMinutes: 10 });
	chrome.alarms.create(ALARM_SESSION_SWEEP, {
		periodInMinutes: 360,
		delayInMinutes: 2
	});
	//#endregion
	//#region background/message-router.js
	/**
	* SellerSuit Message Router
	* Centralizes all chrome.runtime.onMessage listeners and routes commands.
	*/
	var LOGOUT_STORAGE_KEYS = [
		"saasToken",
		"saasRefreshToken",
		"saasUser",
		"userId",
		"userEmail",
		"userPlan",
		"userCredits",
		"authTimestamp",
		"ebay_orders_cache_v1",
		"fulfillmentTask",
		"copyButtonData"
	];
	var WRITE_ACTIONS = new Set([
		"START_OPTILIST",
		"SYNC_LISTING",
		"LISTING_PUBLISHED",
		"import_ebay",
		"sync_ebay_orders",
		"trigger_ebay_sync",
		"SS_AI_GENERATE",
		"GENERATE_TITLE",
		"GENERATE_AI_TITLES",
		"GENERATE_DESCRIPTION",
		"AI_REMOVE_BG",
		"SAVE_TO_SHEET",
		"LOG_TO_SHEET",
		"logSheet",
		"START_BULK_JOB",
		"RESUME_BULK_JOB"
	]);
	function cleanPrice(price) {
		if (price === null || price === void 0) return null;
		if (typeof price === "number") return isNaN(price) ? null : price;
		const s = String(price).replace(/[^\d.-]/g, "").trim();
		if (s === "" || s === "-") return null;
		const parsed = parseFloat(s);
		return isNaN(parsed) ? null : parsed;
	}
	var ALLOWED_NAV_HOST_SUFFIXES = [
		"sellersuit.com",
		"ebay.com",
		"ebay.co.uk",
		"ebay.de",
		"ebay.fr",
		"ebay.com.au",
		"ebay.it",
		"ebay.es",
		"amazon.com",
		"amazon.co.uk",
		"amazon.de",
		"amazon.ca",
		"amazon.com.au",
		"walmart.com",
		"walmart.ca",
		"aliexpress.com",
		"aliexpress.ru",
		"aliexpress.us"
	];
	function isSafeNavUrl(rawUrl) {
		if (typeof rawUrl !== "string" || !rawUrl) return false;
		let u;
		try {
			u = new URL(rawUrl);
		} catch {
			return false;
		}
		if (u.protocol !== "https:") return false;
		const host = u.hostname.toLowerCase();
		return ALLOWED_NAV_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith("." + suffix));
	}
	var ALLOWED_IMAGE_HOST_SUFFIXES = [
		"media-amazon.com",
		"ssl-images-amazon.com",
		"images-amazon.com",
		"walmartimages.com",
		"walmartimages.ca",
		"alicdn.com"
	];
	function isAllowedImageUrl(rawUrl) {
		if (typeof rawUrl !== "string" || !rawUrl) return false;
		let u;
		try {
			u = new URL(rawUrl);
		} catch {
			return false;
		}
		if (u.protocol !== "https:" && u.protocol !== "http:") return false;
		const host = u.hostname.toLowerCase();
		return ALLOWED_IMAGE_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
	}
	function detectSupplier(product) {
		if (!product) return "amazon";
		if (product.supplier === "walmart") return "walmart";
		if (product.supplier === "aliexpress") return "aliexpress";
		if (product.supplier === "amazon") return "amazon";
		const url = product.url || product.amazonUrl || "";
		if (url.includes("walmart.")) return "walmart";
		if (url.includes("aliexpress.")) return "aliexpress";
		return "amazon";
	}
	function createLogger(prefix) {
		const icons = {
			debug: "🔍",
			info: "ℹ️",
			success: "✅",
			warn: "⚠️",
			error: "❌"
		};
		return (level, message, data = null) => {
			if (typeof ExtensionConfig !== "undefined" && !ExtensionConfig.FEATURES.DEBUG_MODE && level === "debug") return;
			const logStr = `[${(/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0]}] ${icons[level] || "📝"} [${prefix}] ${message}`;
			data ? console.log(logStr, data) : console.log(logStr);
			if (prefix === "Sync") try {
				chrome.tabs.query({}, (tabs) => {
					for (const tab of tabs) chrome.tabs.sendMessage(tab.id, {
						action: "SYNC_LOG",
						level,
						message: logStr,
						data
					}).catch(() => {});
				});
			} catch (e) {}
		};
	}
	var authLog = createLogger("Auth");
	var syncLog = createLogger("Sync");
	function formatAiGenerationError(functionName, error, status) {
		const raw = (error || "").toString().trim();
		const label = functionName === "generate-description" ? "Description generation" : "Title generation";
		if (status === 0) return `${label} backend is unreachable. ${raw || "Please check the extension backend target and network connection."}`;
		if (status === 401) return raw || "Session expired. Please log in again.";
		if (status === 402) return raw || "AI credits exhausted. Please add credits to continue.";
		if (status === 429) return raw || "Rate limit exceeded. Please wait a moment and try again.";
		if (status && status >= 500) return raw || `${label} service is temporarily unavailable.`;
		return raw || `${label} failed.`;
	}
	function normalizeAiEdgeResult(functionName, edgeResult) {
		if (!edgeResult) return {
			success: false,
			error: formatAiGenerationError(functionName, "No response from AI backend.", 0),
			status: 0
		};
		if (edgeResult.error) return {
			success: false,
			error: formatAiGenerationError(functionName, edgeResult.error, edgeResult.status),
			status: edgeResult.status
		};
		const data = edgeResult.data;
		if (!data || typeof data !== "object") return {
			success: false,
			error: formatAiGenerationError(functionName, "Invalid AI backend response.", edgeResult.status),
			status: edgeResult.status
		};
		if (data.success === false || data.error) return {
			...data,
			success: false,
			error: formatAiGenerationError(functionName, data.error, edgeResult.status),
			status: edgeResult.status
		};
		return {
			...data,
			success: true,
			status: edgeResult.status
		};
	}
	function getFirstGeneratedTitle(result) {
		if (!result) return "";
		if (typeof result.title === "string") return result.title.trim();
		if (!Array.isArray(result.titles) || result.titles.length === 0) return "";
		const first = result.titles[0];
		if (typeof first === "string") return first.trim();
		return (first?.title || "").toString().trim();
	}
	var AUTH_SENSITIVE_ACTIONS = new Set([
		"SYNC_TOKEN",
		"LOGIN_SUCCESS",
		"LOGOUT"
	]);
	function isTrustedAuthSender(sender) {
		if (!sender || sender.id !== chrome.runtime.id) return false;
		const url = sender.url || "";
		if (url.startsWith("chrome-extension://")) return true;
		try {
			const host = new URL(url).hostname.toLowerCase();
			if (host === "sellersuit.com" || host.endsWith(".sellersuit.com")) return true;
			if (host === "localhost" || host === "127.0.0.1") return true;
		} catch (_e) {}
		return false;
	}
	function routeMessage(request, sender, sendResponse) {
		if (AUTH_SENSITIVE_ACTIONS.has(request?.action) && !isTrustedAuthSender(sender)) {
			console.warn("[message-router] Rejected auth-sensitive action from untrusted sender:", request?.action);
			sendResponse({
				success: false,
				error: "Untrusted sender for auth action"
			});
			return true;
		}
		const urls = getUrls();
		const apiKeys = getApiKeys();
		if (request.action === "GET_EXTENSION_AUTH_STATE") {
			AuthHelper.getRemoteConfig().then((config) => {
				AuthHelper.getAuthToken().then(({ token, type, isValid, user }) => {
					sendResponse({
						config,
						token,
						type,
						isValid,
						user
					});
				});
			});
			return true;
		}
		if (request.action === "LOGOUT_EXTENSION_SESSION") {
			(async () => {
				await AuthHelper.clearNewAuthSession();
				chrome.storage.local.remove(LOGOUT_STORAGE_KEYS, () => {
					sendResponse({ success: true });
				});
			})();
			return true;
		}
		if (request.action === "START_PAIRING") {
			(async () => {
				try {
					const installId = (await chrome.storage.local.get("extensionInstallId")).extensionInstallId || crypto.randomUUID();
					await chrome.storage.local.set({ extensionInstallId: installId });
					const response = await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-pairing-start`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {}
						},
						body: JSON.stringify({
							installId,
							version: chrome.runtime.getManifest().version
						})
					});
					if (!response.ok) throw new Error("Failed to start pairing");
					const data = await response.json();
					await chrome.storage.local.set({
						tempConnectToken: data.connectToken,
						tempClientSecret: data.clientSecret,
						tempPairingExpires: data.expiresAt
					});
					sendResponse({
						success: true,
						pairingCode: data.pairingCode,
						expiresAt: data.expiresAt
					});
				} catch (err) {
					authLog("error", "Pairing start error", err);
					sendResponse({
						success: false,
						error: err.message
					});
				}
			})();
			return true;
		}
		if (request.action === "POLL_PAIRING_STATUS") {
			(async () => {
				try {
					const temp = await chrome.storage.local.get(["tempConnectToken", "tempClientSecret"]);
					if (!temp.tempConnectToken) throw new Error("No pairing session");
					sendResponse({
						success: true,
						status: (await (await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-pairing-status`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {}
							},
							body: JSON.stringify({
								connectToken: temp.tempConnectToken,
								clientSecret: temp.tempClientSecret
							})
						})).json()).status
					});
				} catch (err) {
					sendResponse({
						success: false,
						error: err.message
					});
				}
			})();
			return true;
		}
		if (request.action === "REDEEM_PAIRING") {
			(async () => {
				try {
					const temp = await chrome.storage.local.get(["tempConnectToken", "tempClientSecret"]);
					if (!temp.tempConnectToken) throw new Error("No pairing session");
					const response = await fetch(`${urls.SUPABASE_FUNCTIONS}/extension-token-redeem`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...apiKeys.SUPABASE_ANON ? { apikey: apiKeys.SUPABASE_ANON } : {}
						},
						body: JSON.stringify({
							connectToken: temp.tempConnectToken,
							clientSecret: temp.tempClientSecret
						})
					});
					if (!response.ok) {
						const errData = await response.json();
						throw new Error(errData.error || "Failed to redeem pairing code");
					}
					const data = await response.json();
					if (data.session) {
						await AuthHelper.setNewAuthSession(data.session);
						await chrome.storage.local.remove([
							"tempConnectToken",
							"tempClientSecret",
							"tempPairingExpires"
						]);
						const bootstrapRes = await AuthHelper.callEdgeFunction("extension-bootstrap");
						if (bootstrapRes.data) {
							const updates = { extensionBootstrapCache: bootstrapRes.data };
							if (bootstrapRes.data.user?.selectedListingTemplateId) updates.selectedListingTemplateId = bootstrapRes.data.user.selectedListingTemplateId;
							await chrome.storage.local.set(updates);
						}
						AuthHelper.verifyAuthStatus(true);
						sendResponse({ success: true });
					} else throw new Error("No session returned");
				} catch (err) {
					authLog("error", "Redeem error", err);
					await chrome.storage.local.remove([
						"tempConnectToken",
						"tempClientSecret",
						"tempPairingExpires"
					]);
					sendResponse({
						success: false,
						error: err.message
					});
				}
			})();
			return true;
		}
		if (request.action === "LOGIN_SUCCESS") {
			AuthHelper.verifyAuthStatus().then((success) => {
				if (success) {
					if (typeof SyncUtils !== "undefined") setTimeout(() => SyncUtils.triggerEbayOrderSync("login"), 5e3);
					if (typeof startEbayOrderSyncInterval === "function") startEbayOrderSyncInterval();
					if (typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.sync(true).catch(() => {});
				}
				sendResponse({ success });
			});
			return true;
		}
		if (request.action === "OPEN_SIDE_PANEL") {
			(async () => {
				try {
					const tabId = request.tabId || sender?.tab?.id;
					if (tabId) {
						chrome.sidePanel.setOptions({
							tabId,
							path: "sidepanel/side-panel.html",
							enabled: true
						}).catch(() => {});
						await chrome.sidePanel.open({ tabId });
					} else {
						const [tab] = await chrome.tabs.query({
							active: true,
							currentWindow: true
						});
						if (tab) {
							chrome.sidePanel.setOptions({
								tabId: tab.id,
								path: "sidepanel/side-panel.html",
								enabled: true
							}).catch(() => {});
							await chrome.sidePanel.open({ tabId: tab.id });
						}
					}
					sendResponse({ ok: true });
				} catch (e) {
					sendResponse({
						ok: false,
						error: e.message
					});
				}
			})();
			return true;
		}
		if (request.action === "AUTO_LIST_NEW_TAB") {
			(async () => {
				try {
					if (!isSafeNavUrl(request.url)) {
						console.warn("[Background] AUTO_LIST_NEW_TAB blocked unsafe URL:", request.url);
						sendResponse({
							ok: false,
							error: "Blocked: URL is not an allowed https destination"
						});
						return;
					}
					const tab = await chrome.tabs.create({
						url: request.url,
						active: true
					});
					await chrome.sidePanel.setOptions({
						tabId: tab.id,
						path: "sidepanel/side-panel.html",
						enabled: true
					});
					if (!request.skipSidePanelOpen) await chrome.sidePanel.open({ tabId: tab.id });
					sendResponse({
						ok: true,
						tabId: tab.id
					});
				} catch (e) {
					console.error("[Background] Failed to open side panel on new tab:", e);
					sendResponse({
						ok: false,
						error: e.message
					});
				}
			})();
			return true;
		}
		if (request.action === "CLOSE_SIDE_PANEL") {
			(async () => {
				try {
					let windowId;
					if (sender?.tab?.windowId) windowId = sender.tab.windowId;
					else if (request.tabId) windowId = (await chrome.tabs.get(request.tabId)).windowId;
					else windowId = (await chrome.windows.getCurrent()).id;
					await chrome.sidePanel.close({ windowId });
					sendResponse({ ok: true });
				} catch (e) {
					sendResponse({
						ok: false,
						error: e.message
					});
				}
			})();
			return true;
		}
		if (request.action === "OPEN_BACKGROUND_TAB") {
			if (!isSafeNavUrl(request.url)) {
				console.warn("[Background] OPEN_BACKGROUND_TAB blocked unsafe URL:", request.url);
				sendResponse({
					ok: false,
					error: "Blocked: URL is not an allowed https destination"
				});
				return true;
			}
			chrome.tabs.create({
				url: request.url,
				active: false
			});
			sendResponse({ ok: true });
			return true;
		}
		if (request.action === "sync_ebay_orders" || request.action === "trigger_ebay_sync") {
			(async () => {
				try {
					if (!await AuthHelper.verifyAuthStatus(false, false)) {
						sendResponse({
							ok: false,
							error: "Not logged in to SellerSuit."
						});
						return;
					}
					const token = (await chrome.storage.local.get(["saasToken"])).saasToken;
					if (request.payload) {
						syncLog("info", "Syncing custom payload from scraper", { orderCount: request.payload.orders?.length });
						const syncRes = await fetch(`${urls.SUPABASE_FUNCTIONS}/sync-ebay-orders`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"apikey": apiKeys.SUPABASE_ANON,
								"Authorization": `Bearer ${token}`
							},
							body: JSON.stringify(request.payload)
						});
						if (!syncRes.ok) {
							const errorText = await syncRes.text();
							syncLog("error", "Scraper sync failed", errorText);
							sendResponse({
								ok: false,
								error: "Sync failed: " + errorText
							});
						} else {
							const result = await syncRes.json();
							syncLog("success", "Scraper sync successful", result);
							sendResponse({
								ok: true,
								result
							});
						}
					} else {
						if (typeof SyncUtils !== "undefined") await SyncUtils.triggerEbayOrderSync("manual");
						sendResponse({ ok: true });
					}
				} catch (err) {
					syncLog("error", "Manual sync request failed", { error: err.message });
					sendResponse({
						ok: false,
						error: err.message
					});
				}
			})();
			return true;
		}
		if (request.action === "get_ebay_orders") {
			(async () => {
				if (typeof SyncUtils !== "undefined") sendResponse({
					ok: true,
					cache: await SyncUtils.getEbayOrdersCache()
				});
				else sendResponse({
					ok: true,
					cache: null
				});
			})();
			return true;
		}
		if (request.action === "SYNC_TOKEN") {
			if (request.token) {
				(async () => {
					try {
						const saveData = {
							saasToken: request.token,
							authTimestamp: Date.now()
						};
						if (request.refreshToken) saveData.saasRefreshToken = request.refreshToken;
						if (request.user) {
							saveData.saasUser = request.user;
							saveData.userId = request.user.id;
							saveData.userEmail = request.user.email;
						}
						await chrome.storage.local.set(saveData);
						const verified = await AuthHelper.verifyAuthStatus(true);
						if (verified) {
							if (typeof SyncUtils !== "undefined") setTimeout(() => SyncUtils.triggerEbayOrderSync("token_sync"), 5e3);
							if (typeof startEbayOrderSyncInterval === "function") startEbayOrderSyncInterval();
							if (typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.sync(true).catch(() => {});
						} else {
							await chrome.storage.local.remove([
								"saasToken",
								"saasRefreshToken",
								"saasUser",
								"userId",
								"userEmail",
								"authTimestamp"
							]);
							AuthHelper.setUnlocked(false);
						}
						sendResponse({
							success: verified,
							verified
						});
					} catch (err) {
						sendResponse({
							success: false,
							error: err.message
						});
					}
				})();
				return true;
			}
		}
		if (request.action === "LOGOUT") {
			(async () => {
				try {
					if (typeof stopEbayOrderSyncInterval === "function") stopEbayOrderSyncInterval();
					await chrome.storage.local.remove(LOGOUT_STORAGE_KEYS);
					await AuthHelper.clearNewAuthSession();
					AuthHelper.setUnlocked(false);
					AuthHelper.setLastCheck(0);
					sendResponse({ success: true });
				} catch (err) {
					sendResponse({
						success: false,
						error: err.message
					});
				}
			})();
			return true;
		}
		if (request.action === "CHECK_AUTH") {
			(async () => {
				if (await AuthHelper.verifyAuthStatus()) {
					const data = await chrome.storage.local.get(["userEmail", "userId"]);
					sendResponse({
						success: true,
						user: {
							email: data.userEmail,
							id: data.userId
						}
					});
				} else sendResponse({ success: false });
			})();
			return true;
		}
		if (request.action === "BULK_ITEM_RESULT") {
			sendResponse(handleBulkItemResult(request));
			return true;
		}
		if (request.action === "GET_BULK_STATE") {
			getBulkState().then(sendResponse);
			return true;
		}
		if (!AuthHelper.isUnlocked()) {
			const requireFreshAuth = WRITE_ACTIONS.has(request.action);
			AuthHelper.verifyAuthStatus(false, !requireFreshAuth).then((unlocked) => {
				if (unlocked) {
					routeMessage(request, sender, sendResponse);
					return;
				}
				if (request.action !== "AI_REMOVE_BG" && request.action !== "GENERATE_TITLE" && request.action !== "GENERATE_DESCRIPTION") chrome.tabs.create({ url: urls.WEB_APP_DASHBOARD });
				sendResponse({
					success: false,
					error: "Please Log In to use the extension."
				});
			}).catch(() => {
				sendResponse({
					success: false,
					error: "Please Log In to use the extension."
				});
			});
			return true;
		}
		if (request.action === "AI_REMOVE_BG") {
			(async () => {
				try {
					const apiKey = (await chrome.storage.local.get(["replicateApiKey"])).replicateApiKey;
					if (!apiKey) {
						sendResponse({
							success: false,
							error: "Replicate API Key is missing."
						});
						return;
					}
					const blob = await (await fetch(request.imageUrl)).blob();
					if (typeof FileReader !== "undefined") {
						const reader = new FileReader();
						reader.readAsDataURL(blob);
						reader.onloadend = async function() {
							const base64data = reader.result;
							try {
								const data = await (await fetch(urls.AI_REMOVE_BG, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										image_base64: base64data,
										replicate_api_token: apiKey
									})
								})).json();
								if (data.output) chrome.runtime.sendMessage({
									action: "BG_REMOVED_SUCCESS",
									originalUrl: request.imageUrl,
									newUrl: data.output
								});
							} catch (e) {}
						};
					}
				} catch (e) {}
			})();
			return true;
		} else if (request.action === "import_ebay") {
			(async () => {
				try {
					const product = request.product || {};
					request.uploadType;
					const uploadSessionId = crypto.randomUUID();
					const ebayUrl = `https://www.ebay.com/sl/prelist/suggest?sr=shListingsTopNav&uploadSessionId=${uploadSessionId}`;
					await chrome.storage.local.set({
						[uploadSessionId]: {
							product,
							isImported: false,
							uploadType: request.uploadType || "classic",
							stagedAt: Date.now()
						},
						ebayListingTabId: ""
					});
					const tabId = (await chrome.tabs.create({
						active: true,
						url: ebayUrl
					})).id;
					await chrome.storage.local.set({
						[String(tabId)]: {
							product,
							isImported: false,
							uploadType: request.uploadType || "classic",
							stagedAt: Date.now()
						},
						ebayListingTabId: String(tabId)
					});
				} catch (e) {
					console.warn("[import_ebay] Error:", e?.message || e);
				}
			})();
			return true;
		} else if (request.action === "GET_TAB_ID") {
			sendResponse({ tabId: sender.tab ? sender.tab.id : null });
			return true;
		} else if (request.action === "FORCE_PRICING_SYNC") {
			(async () => {
				try {
					if (typeof SSPricingRuleSync !== "undefined") {
						sendResponse({
							success: true,
							updatedAt: (await SSPricingRuleSync.sync(true))?.updatedAt || null
						});
						return;
					}
					sendResponse({
						success: false,
						error: "SSPricingRuleSync unavailable"
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: e?.message || "pricing sync failed"
					});
				}
			})();
			return true;
		} else if (request.action === "START_OPTILIST") {
			(async () => {
				try {
					if (request.title && request.sku) {
						sendResponse({
							success: true,
							message: "Processing started"
						});
						const result = await chrome.storage.local.get("listedCount");
						await chrome.storage.local.set({ listedCount: (result.listedCount || 0) + 1 });
						if (typeof postCreateListing === "function") {
							const detectedSup = detectSupplier({
								supplier: request.supplier,
								url: request.productURL
							});
							if (request.finalPrice && typeof SSPricingRuleSync !== "undefined") SSPricingRuleSync.getRuleForSupplier(detectedSup).then(async (cachedRule) => {
								if (!cachedRule) return;
								try {
									const { token, isValid } = await AuthHelper.getAuthToken();
									if (!token || !isValid) return;
									const urls = getUrls();
									const apiKeys = getApiKeys();
									if (!urls || !apiKeys) return;
									await fetch(`${urls.SUPABASE_FUNCTIONS}/pricing-verify`, {
										method: "POST",
										headers: {
											"Authorization": `Bearer ${token}`,
											"apikey": apiKeys.SUPABASE_ANON || "",
											"Content-Type": "application/json"
										},
										body: JSON.stringify({
											supplierKey: detectedSup,
											supplierPrice: cleanPrice(request.amazonPrice || request.supplierPrice),
											shippingCost: 0,
											clientFinalPrice: cleanPrice(request.finalPrice),
											clientRuleVersion: cachedRule.ruleVersion || 0
										})
									});
								} catch (_) {}
							}).catch(() => {});
							const parsedEbayPrice = cleanPrice(request.finalPrice);
							const parsedSupplierPrice = cleanPrice(request.amazonPrice || request.supplierPrice);
							await postCreateListing({
								title: request.title,
								sku: request.sku,
								ebay_price: parsedEbayPrice,
								supplier: detectedSup,
								supplier_id: request.sourceId || request.asin || null,
								supplier_url: request.productURL,
								supplier_price: parsedSupplierPrice,
								price_source: request.price_source || null,
								amazon_price: parsedSupplierPrice,
								amazon_url: request.productURL,
								amazon_asin: request.asin,
								status: "draft",
								amazon_data: { image: request.mainImage }
							}, "start_optilist").catch((e) => console.warn("[START_OPTILIST] sync error:", e?.message || e));
						}
					} else sendResponse({ success: false });
				} catch (e) {
					console.warn("[START_OPTILIST] Unexpected error:", e?.message || e);
				}
			})();
			return true;
		} else if (request.action === "logSheet") {
			if (typeof SyncUtils !== "undefined") SyncUtils.logToSheet(request.payload);
			return true;
		} else if (request.action === "GET_PRODUCT_META") {
			sendResponse({
				success: true,
				meta: { activeTab: sender.tab.id }
			});
			return true;
		} else if (request.action === "START_BULK_JOB") {
			if (typeof startBulkJob === "function") startBulkJob(request.payload).then(sendResponse);
			return true;
		} else if (request.action === "PAUSE_BULK_JOB") {
			if (typeof pauseBulkJob === "function") pauseBulkJob().then(sendResponse);
			else sendResponse({ success: true });
			return true;
		} else if (request.action === "RESUME_BULK_JOB") {
			if (typeof startBulkJob === "function") startBulkJob(request.payload || {}).then(sendResponse);
			return true;
		} else if (request.action === "STOP_BULK_JOB") {
			if (typeof stopBulkJob === "function") stopBulkJob().then(sendResponse);
			else sendResponse({ success: true });
			return true;
		} else if (request.action === "LOG_TO_SHEET") {
			if (typeof SyncUtils !== "undefined") SyncUtils.logProductToSheet(request.payload);
			sendResponse({ success: true });
			return true;
		} else if (request.action === "SYNC_LISTING") {
			(async () => {
				try {
					if (typeof postCreateListing === "function") sendResponse(await postCreateListing(request.payload || {}, "background"));
				} catch (e) {
					if (typeof recordListingSyncError === "function") await recordListingSyncError({
						source: "background",
						error: e?.message || "Background listing sync failed",
						payload: request.payload || {}
					});
					sendResponse({
						success: false,
						source: "background",
						error: e?.message || "Background listing sync failed"
					});
				}
			})();
			return true;
		} else if (request.action === "LISTING_PUBLISHED") {
			(async () => {
				try {
					if (typeof AuthHelper !== "undefined") {
						const payload = {
							draft_id: request.payload.draftId,
							ebay_item_id: request.payload.ebayItemId,
							status: "active"
						};
						const response = await AuthHelper.callEdgeFunction("sync-listing", payload);
						if (response.error) sendResponse({
							success: false,
							error: response.error
						});
						else sendResponse({
							success: true,
							data: response.data
						});
					} else sendResponse({
						success: false,
						error: "AuthHelper not found"
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: e?.message || "Listing publication sync failed"
					});
				}
			})();
			return true;
		} else if (request.action === "SS_AI_GENERATE") {
			(async () => {
				try {
					const fn = request.kind === "description" ? "generate-description-v2" : "generate-titles";
					const timeout = request.kind === "description" ? 9e4 : 6e4;
					const resp = await AuthHelper.callEdgeFunction(fn, request.productData || {}, { timeout });
					if (resp.error) {
						sendResponse({
							success: false,
							error: resp.error
						});
						return;
					}
					sendResponse(resp.data || {
						success: false,
						error: "No data"
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: e?.message || "AI generation failed"
					});
				}
			})();
			return true;
		} else if (request.action === "CHECK_DUPLICATE") {
			(async () => {
				try {
					const asin = request.asin;
					if (!asin) {
						sendResponse({ duplicate: false });
						return;
					}
					const resp = await AuthHelper.callEdgeFunction("check-duplicate", { asin });
					if (resp.error) {
						sendResponse({
							duplicate: false,
							error: resp.error
						});
						return;
					}
					sendResponse(resp.data || { duplicate: false });
				} catch (e) {
					sendResponse({
						duplicate: false,
						error: e?.message || "check-duplicate failed"
					});
				}
			})();
			return true;
		} else if (request.action === "SAVE_TO_SHEET") {
			const { title, sku, ebayPrice, amazonPrice, amazonUrl } = request.payload;
			const row = [
				(/* @__PURE__ */ new Date()).toLocaleDateString("en-US"),
				title || "",
				sku || "",
				ebayPrice || "",
				amazonPrice || "",
				"",
				"",
				"",
				"",
				"",
				"",
				amazonUrl || ""
			];
			if (typeof SyncUtils !== "undefined") SyncUtils.getGoogleSheetUrl().then((endpoint) => {
				if (!endpoint) return;
				fetch(endpoint, {
					method: "POST",
					mode: "no-cors",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ row })
				});
			});
			return true;
		} else if (request.action === "GENERATE_TITLE") {
			(async () => {
				try {
					const result = normalizeAiEdgeResult("generate-titles", await AuthHelper.callEdgeFunction("generate-titles", request.productData || {}, { timeout: 6e4 }));
					const title = getFirstGeneratedTitle(result);
					if (result.success && title) sendResponse({
						...result,
						success: true,
						title
					});
					else sendResponse({
						...result,
						success: false,
						error: result.error || "No title returned."
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: formatAiGenerationError("generate-titles", e?.message, 0),
						status: 0
					});
				}
			})();
			return true;
		} else if (request.action === "GENERATE_AI_TITLES") {
			(async () => {
				try {
					sendResponse(normalizeAiEdgeResult("generate-titles", await AuthHelper.callEdgeFunction("generate-titles", request.productData || {}, { timeout: 6e4 })));
				} catch (e) {
					sendResponse({
						success: false,
						error: formatAiGenerationError("generate-titles", e?.message, 0),
						status: 0
					});
				}
			})();
			return true;
		} else if (request.action === "GENERATE_DESCRIPTION") {
			(async () => {
				try {
					sendResponse(normalizeAiEdgeResult("generate-description", await AuthHelper.callEdgeFunction("generate-description", request.productData || {}, { timeout: 9e4 })));
				} catch (e) {
					sendResponse({
						success: false,
						error: formatAiGenerationError("generate-description", e?.message, 0),
						status: 0
					});
				}
			})();
			return true;
		} else if (request.action === "START_FULFILLMENT") {
			console.info("Amazon auto-ordering is disabled in this build.");
			sendResponse({
				success: false,
				error: "Auto-ordering is currently disabled."
			});
			return true;
		} else if (request.action === "ORDER_COMPLETED") {
			if (typeof ExtensionConfig !== "undefined" && ExtensionConfig.FEATURES.DEBUG_MODE) console.log("🎉 ORDER COMPLETED (payload hidden in prod)", request.payload);
			try {
				chrome.tabs.query({ url: "*://*/*" }, (tabs) => {
					for (const tab of tabs) chrome.tabs.sendMessage(tab.id, {
						action: "ORDER_COMPLETED_BROADCAST",
						payload: request.payload
					}).catch(() => {});
				});
			} catch (e) {}
			sendResponse({ success: true });
			return true;
		}
		if (request.action === "FETCH_IMAGE_AS_BASE64") {
			(async () => {
				try {
					if (!request.url || !request.url.startsWith("http://") && !request.url.startsWith("https://")) throw new Error("Unsupported URL scheme: Only http/https fetches are permitted.");
					if (!isAllowedImageUrl(request.url)) {
						sendResponse({
							success: false,
							error: "Blocked: image host is not on the allowlist."
						});
						return;
					}
					const response = await fetch(request.url);
					if (response.type === "opaque") throw new Error("opaque_response");
					if (!response.ok) throw new Error("HTTP error " + response.status);
					const blob = await response.blob();
					if (typeof FileReader !== "undefined") {
						const reader = new FileReader();
						reader.readAsDataURL(blob);
						reader.onloadend = () => {
							sendResponse({
								success: true,
								base64: reader.result
							});
						};
						reader.onerror = () => {
							sendResponse({
								success: false,
								error: "Failed to read blob"
							});
						};
					} else {
						const buffer = await blob.arrayBuffer();
						let binary = "";
						const bytes = new Uint8Array(buffer);
						for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
						const base64String = btoa(binary);
						sendResponse({
							success: true,
							base64: `data:${blob.type};base64,${base64String}`
						});
					}
				} catch (err) {
					let errMsg = err.message || String(err);
					if (errMsg.includes("Failed to fetch") || errMsg === "opaque_response") try {
						errMsg = `Host permission missing for origin: ${new URL(request.url).origin}`;
					} catch (_) {}
					sendResponse({
						success: false,
						error: errMsg
					});
				}
			})();
			return true;
		}
	}
	chrome.runtime.onMessage.addListener(routeMessage);
	//#endregion
	//#region background/index.js
	globalThis.getUrls = () => typeof globalThis.ExtensionConfig !== "undefined" ? globalThis.ExtensionConfig.URLS : null;
	globalThis.getApiKeys = () => typeof globalThis.ExtensionConfig !== "undefined" ? globalThis.ExtensionConfig.API_KEYS : null;
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
	var SIDE_PANEL_DOMAINS = [
		"amazon.com",
		"amazon.co.uk",
		"amazon.de",
		"amazon.ca",
		"amazon.com.au",
		"walmart.com",
		"walmart.ca",
		"aliexpress.com",
		"aliexpress.ru",
		"aliexpress.us"
	];
	function isSidePanelUrl(url) {
		if (!url) return false;
		try {
			const hostname = new URL(url).hostname;
			return SIDE_PANEL_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
		} catch (_) {
			return false;
		}
	}
	async function configureSidePanelForTab(tabId, url) {
		if (isSidePanelUrl(url)) await chrome.sidePanel.setOptions({
			tabId,
			path: "sidepanel/side-panel.html",
			enabled: true
		});
		else await chrome.sidePanel.setOptions({
			tabId,
			enabled: false
		});
	}
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		const url = changeInfo.url || (changeInfo.status === "loading" ? tab?.url : null);
		if (url) configureSidePanelForTab(tabId, url).catch(() => {});
	});
	chrome.tabs.onActivated.addListener((activeInfo) => {
		chrome.tabs.get(activeInfo.tabId, (tab) => {
			if (chrome.runtime.lastError || !tab) return;
			configureSidePanelForTab(activeInfo.tabId, tab.url).catch(() => {});
		});
	});
	chrome.tabs.query({}, (tabs) => {
		if (chrome.runtime.lastError || !Array.isArray(tabs)) return;
		for (const tab of tabs) if (tab.id != null) configureSidePanelForTab(tab.id, tab.url).catch(() => {});
	});
	if (chrome.storage && chrome.storage.session && typeof chrome.storage.session.setAccessLevel === "function") chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" }).catch((err) => {
		console.warn("[Background] Failed to set session storage access level:", err);
	});
	if (typeof ExtensionConfig !== "undefined" && ExtensionConfig.FEATURES?.DEBUG_MODE) console.log("✅ Background Service Worker Entry Point Fully Initialized");
	//#endregion
})();

//# sourceMappingURL=background.bundle.js.map