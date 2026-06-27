(function() {
	//#region \0rolldown/runtime.js
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	(/* @__PURE__ */ __commonJSMin(((exports, module) => {
		var ExtensionConfig = (() => {
			const WEB_APP_DOMAIN = "https://sellersuit.com";
			const URLS = Object.freeze({
				SUPABASE_URL: "https://ojxzssooylmydystjvdo.supabase.co",
				SUPABASE_FUNCTIONS: "https://ojxzssooylmydystjvdo.supabase.co/functions/v1",
				WEB_APP_BASE: WEB_APP_DOMAIN,
				WEB_APP_AUTH: `${WEB_APP_DOMAIN}/auth`,
				WEB_APP_DASHBOARD: `${WEB_APP_DOMAIN}/dashboard`,
				DEFAULT_GOOGLE_SHEET: "https://script.google.com/macros/s/AKfycbwU_ER6RWnY0koDjq7zs__LTdkMCF07nP8wvTe_05qZ5pcbDlpTu0VBlPZ3sI-sqIV5/exec",
				LOCAL_BACKEND: WEB_APP_DOMAIN,
				AI_REMOVE_BG: `${WEB_APP_DOMAIN}/v1/ai/remove-bg`
			});
			console.log("🔧 [Config] ExtensionConfig initialized:", {
				DOMAIN: WEB_APP_DOMAIN,
				BASE: URLS.WEB_APP_BASE,
				AUTH: URLS.WEB_APP_AUTH,
				DASHBOARD: URLS.WEB_APP_DASHBOARD
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
	})))();
	function _ssxCleanFloat(val) {
		if (val === null || val === void 0) return 0;
		if (typeof val === "number") return val;
		const cleaned = String(val).replace(/[^\d.-]/g, "");
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	}
	var _SSX_ATTR_PRIORITY = [
		"color",
		"size",
		"style",
		"pattern",
		"material",
		"capacity",
		"model",
		"pack",
		"flavor",
		"scent"
	];
	function _ssxAttrToString(val) {
		if (val == null) return "";
		if (typeof val === "object") return val.productName || val.value || val.name || "";
		return String(val);
	}
	function _ssxVariantDetails(attrs) {
		const entries = Object.entries(attrs || {}).map(([k, v]) => [k, _ssxAttrToString(v)]).filter(([, v]) => v);
		if (entries.length === 0) return {
			primary: "—",
			chips: []
		};
		let primaryIdx = -1;
		for (const pri of _SSX_ATTR_PRIORITY) {
			primaryIdx = entries.findIndex(([k]) => k.toLowerCase().includes(pri));
			if (primaryIdx !== -1) break;
		}
		if (primaryIdx === -1) primaryIdx = 0;
		return {
			primary: entries[primaryIdx][1],
			chips: entries
		};
	}
	function _ssxMoney(n) {
		return "$" + _ssxCleanFloat(n).toFixed(2);
	}
	function _ssxText(id, val) {
		const el = document.getElementById(id);
		if (el) el.textContent = val;
	}
	function _ssxSupplierMeta(supplier) {
		if (window.SSSupplierRegistry?.getMeta) return window.SSSupplierRegistry.getMeta(supplier);
		const s = String(supplier || "");
		return {
			displayName: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Supplier",
			idLabel: "ID"
		};
	}
	function _ssxImg(id, url) {
		const el = document.getElementById(id);
		if (el) {
			el.src = url || "";
			el.style.visibility = url ? "visible" : "hidden";
		}
	}
	function _saveExtEdits() {
		chrome.storage.local.get(["currentProduct"], (result) => {
			const p = result.currentProduct || {};
			const et = document.getElementById("ext-title");
			const ep = document.getElementById("ext-price");
			const es = document.getElementById("ext-sku");
			const eq = document.getElementById("ext-qty");
			if (et && et.value) p.title = et.value;
			if (ep && ep.value && _ssxCleanFloat(ep.value) > 0) {
				const newPrice = _ssxCleanFloat(ep.value);
				if (newPrice !== _ssxCleanFloat(p.finalPrice)) p.price_source = "manual";
				p.finalPrice = newPrice;
			}
			if (es && es.value) p.ebaySku = es.value;
			if (eq && eq.value) p.quantity = parseInt(eq.value, 10) || 1;
			document.querySelectorAll("#ext-specs input[data-spec-key]").forEach((inp) => {
				if (!p.specs) p.specs = {};
				p.specs[inp.dataset.specKey] = inp.value;
			});
			chrome.storage.local.set({ currentProduct: p });
		});
	}
	async function _handleSidebarUpload() {
		const btn = document.getElementById("opti-list-btn") || document.querySelector("[id=\"opti-list-btn\"]");
		if (btn) {
			btn.disabled = true;
			btn.textContent = "Uploading…";
		}
		try {
			_saveExtEdits();
			await new Promise((r) => setTimeout(r, 80));
			let draft = null;
			if (typeof window.SSListingDraft !== "undefined") draft = await window.SSListingDraft.getDraft();
			const result = await chrome.storage.local.get([
				"currentProduct",
				"selectedEbayTitle",
				"selectedEbayDescription",
				"generatedAt",
				"selectedDescriptionTimestamp"
			]);
			const p = result.currentProduct || {};
			const scannedAt = p.lastScannedAt || p.scrapedAt || 0;
			const storedTitleFresh = !scannedAt || (result.generatedAt || 0) >= scannedAt;
			const storedDescFresh = !scannedAt || (result.selectedDescriptionTimestamp || 0) >= scannedAt;
			const scrapedTitle = (p.title || "").trim();
			const extTitleRaw = document.getElementById("ext-title")?.value?.trim() || "";
			const extTitle = extTitleRaw && extTitleRaw !== scrapedTitle ? extTitleRaw : "";
			const aiTitleText = document.getElementById("ai-generated-title")?.textContent?.trim() || "";
			const aiTitle = aiTitleText && !aiTitleText.startsWith("Click AI Generate") && aiTitleText !== scrapedTitle ? aiTitleText : "";
			const draftTitle = draft && draft.title;
			const storedAiTitle = storedTitleFresh ? result.selectedEbayTitle || "" : "";
			const finalTitle = extTitle || aiTitle || draftTitle || storedAiTitle || scrapedTitle || "";
			const titleSource = extTitle ? "manual" : aiTitle || !draftTitle && storedAiTitle ? "ai" : draftTitle ? draft.title_source || "scraped" : "scraped";
			const extSku = document.getElementById("ext-sku")?.value?.trim();
			const draftSku = draft && draft.sku;
			const sku = extSku || p.ebaySku || draftSku || "";
			const skuSource = extSku ? "manual" : p.ebaySku ? p.sku_source || "generated" : draftSku ? draft.sku_source || "generated" : "generated";
			const extPriceStr = document.getElementById("ext-price")?.value?.trim();
			const extPrice = _ssxCleanFloat(extPriceStr) || 0;
			const storedPrice = _ssxCleanFloat(p.finalPrice) || 0;
			const draftFinalPrice = draft && draft.pricing && _ssxCleanFloat(draft.pricing.finalPrice) || 0;
			const finalPrice = extPrice > 0 ? extPrice : storedPrice || draftFinalPrice || 0;
			const priceSource = extPrice > 0 && extPrice !== storedPrice ? "manual" : p.price_source || (draftFinalPrice ? draft.price_source || "calculated" : "calculated");
			const aiDescription = storedDescFresh ? result.selectedEbayDescription || "" : "";
			const description = draft && draft.description || aiDescription || p.description || "";
			const descSource = draft && draft.description ? draft.description_source || "scraped" : aiDescription ? "ai" : "scraped";
			const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : draft && draft.images || [];
			console.log("[SS Upload] title_source:", titleSource, "| title:", finalTitle.slice(0, 60));
			console.log("[SS Upload] price_source:", priceSource, "| finalPrice:", finalPrice);
			console.log("[SS Upload] sku_source:", skuSource, "| sku:", sku);
			console.log("[SS Upload] description_source:", descSource, "| desc length:", description.length);
			console.log("[SS Upload] images count:", images.length);
			if (!finalTitle) {
				alert("No title set. Fill title first.");
				if (btn) {
					btn.disabled = false;
					btn.textContent = "Upload";
				}
				return;
			}
			if (!sku) {
				alert("No SKU. Fill SKU first.");
				if (btn) {
					btn.disabled = false;
					btn.textContent = "Upload";
				}
				return;
			}
			if (finalPrice <= 0) console.warn("[SS Upload] finalPrice is 0 — raw price may not have been calculated yet");
			const uploadProduct = {
				...p,
				title: finalTitle,
				description,
				images,
				ebaySku: sku,
				supplierPrice: _ssxCleanFloat(p.price) || 0,
				ebayFinalPrice: finalPrice || _ssxCleanFloat(p.finalPrice) || 0,
				finalPrice: finalPrice || p.finalPrice || 0,
				price_source: priceSource,
				title_source: titleSource,
				description_source: descSource,
				sku_source: skuSource,
				useStoredWatermarkedImages: false
			};
			if (Array.isArray(p.variants)) uploadProduct.variants = p.variants.map((v) => ({
				...v,
				supplierPrice: _ssxCleanFloat(v.price) || 0,
				ebayFinalPrice: _ssxCleanFloat(v.ebayPrice) || _ssxCleanFloat(v.finalPrice) || 0
			}));
			chrome.runtime.sendMessage({
				action: "import_ebay",
				product: uploadProduct,
				uploadType: "classic"
			});
			if (btn) btn.textContent = "✅ Opening eBay…";
			setTimeout(() => {
				if (btn) {
					btn.disabled = false;
					btn.textContent = "Upload";
				}
			}, 3e3);
		} catch (err) {
			console.error("[SidebarUpload] error:", err);
			if (btn) {
				btn.disabled = false;
				btn.textContent = "Upload";
			}
		}
	}
	function _ssxRenderVariantRows(variants, p) {
		const tbody = document.getElementById("ssx-var-rows");
		if (!tbody) return;
		tbody.innerHTML = "";
		variants.forEach((v) => {
			const det = _ssxVariantDetails(v.attrs);
			const supplier = _ssxCleanFloat(v.raw_supplier_price ?? v.price) || 0;
			const ebay = _ssxCleanFloat(v.finalPrice) || 0;
			const profit = ebay - supplier;
			const profitPct = supplier > 0 ? profit / supplier * 100 : 0;
			const stock = v.quantity != null ? v.quantity : 1;
			const _skuParent = p.sourceId || p.parentAsin || p.asin || p.productId || "";
			const sku = v.sku || v.ebaySku || (window.SSSkuEngine ? window.SSSkuEngine.buildReadable(_skuParent, v.attrs, window.SSSkuEngine.prefixFor && window.SSSkuEngine.prefixFor(p.supplier)) : _skuParent + (Object.values(v.attrs || {}).map((a) => (a && typeof a === "object" ? a.productName : a) || "").join("-") || "") || "—");
			const tr = document.createElement("tr");
			const tdImg = document.createElement("td");
			const img = document.createElement("img");
			img.className = "ssx-row-img";
			img.src = v.img || (Array.isArray(p.images) ? p.images[0] : "") || "";
			img.alt = det.primary;
			img.onerror = () => {
				img.style.visibility = "hidden";
			};
			tdImg.appendChild(img);
			const tdDet = document.createElement("td");
			const wrap = document.createElement("div");
			wrap.className = "ssx-vd";
			const prim = document.createElement("span");
			prim.className = "ssx-vd-primary";
			prim.textContent = det.primary;
			wrap.appendChild(prim);
			det.chips.forEach(([k, val]) => {
				const chip = document.createElement("span");
				chip.className = "ssx-vd-chip";
				chip.textContent = `${k}: ${val}`;
				wrap.appendChild(chip);
			});
			tdDet.appendChild(wrap);
			const tdSup = document.createElement("td");
			tdSup.className = "ssx-cell-price";
			tdSup.textContent = _ssxMoney(supplier);
			const tdEbay = document.createElement("td");
			tdEbay.className = "ssx-cell-ebay";
			const ebayInp = document.createElement("input");
			ebayInp.type = "text";
			ebayInp.inputMode = "decimal";
			ebayInp.value = ebay ? ebay.toFixed(2) : "";
			const tdProfit = document.createElement("td");
			tdProfit.className = "ssx-cell-profit";
			tdProfit.textContent = `${_ssxMoney(profit)} (${profitPct.toFixed(1)}%)`;
			ebayInp.addEventListener("input", () => {
				const val = _ssxCleanFloat(ebayInp.value) || 0;
				v.finalPrice = val;
				v.ebayPrice = val;
				const pr = val - supplier;
				const prPct = supplier > 0 ? pr / supplier * 100 : 0;
				tdProfit.textContent = `${_ssxMoney(pr)} (${prPct.toFixed(1)}%)`;
				chrome.storage.local.set({ currentProduct: p });
			});
			tdEbay.appendChild(ebayInp);
			const tdSku = document.createElement("td");
			tdSku.className = "ssx-cell-sku";
			const skuInp = document.createElement("input");
			skuInp.type = "text";
			skuInp.maxLength = 50;
			skuInp.spellcheck = false;
			skuInp.value = sku;
			skuInp.addEventListener("input", () => {
				v.sku = skuInp.value.trim();
				chrome.storage.local.set({ currentProduct: p });
			});
			tdSku.appendChild(skuInp);
			const tdStock = document.createElement("td");
			tdStock.textContent = String(stock);
			const tdStatus = document.createElement("td");
			const badge = document.createElement("span");
			badge.className = "ssx-status-ready";
			badge.textContent = "Ready";
			tdStatus.appendChild(badge);
			const tdDel = document.createElement("td");
			const delBtn = document.createElement("button");
			delBtn.type = "button";
			delBtn.className = "ssx-var-del";
			delBtn.title = "Delete this variation";
			delBtn.setAttribute("aria-label", "Delete variation");
			delBtn.textContent = "✕";
			delBtn.addEventListener("click", () => {
				const idx = p.variants.indexOf(v);
				if (idx === -1) return;
				p.variants.splice(idx, 1);
				p.hasVariants = p.variants.length > 1;
				chrome.storage.local.set({ currentProduct: p }, () => {
					_ssxRenderVariantRows(p.variants, p);
					_ssxText("ssx-var-count", `(${p.variants.length})`);
					if (window.UIHelper?.showToast) window.UIHelper.showToast("Variation removed", "success");
				});
			});
			tdDel.appendChild(delBtn);
			tr.append(tdImg, tdDet, tdSup, tdEbay, tdProfit, tdSku, tdStock, tdStatus, tdDel);
			tbody.appendChild(tr);
		});
	}
	async function _ssxRenderExtended(p) {
		if (!p) return;
		const variants = Array.isArray(p.variants) ? p.variants : [];
		let variantsUpdated = false;
		const skuParentId = p.sourceId || p.parentAsin || p.asin || p.productId || "";
		const skuPrefix = window.SSSkuEngine?.prefixFor ? window.SSSkuEngine.prefixFor(p.supplier) : "AMZ";
		variants.forEach((v) => {
			if (!v.sku && v.attrs) {
				v.sku = window.SSSkuEngine ? window.SSSkuEngine.buildReadable(skuParentId, v.attrs, skuPrefix) : skuParentId + (Object.values(v.attrs || {}).map((a) => a?.productName || "").join("-") || "");
				variantsUpdated = true;
			}
		});
		if (!p.ebaySku && variants.length <= 1 && skuParentId && window.SSSkuEngine) {
			p.ebaySku = window.SSSkuEngine.buildReadable(skuParentId, {}, skuPrefix);
			variantsUpdated = true;
		}
		if (window.SSPricingEngine) {
			const calcVals = (await new Promise((r) => chrome.storage.local.get("calculatorValues", r))).calculatorValues || {};
			const parseVal = (v, def) => {
				if (v === null || v === void 0 || v === "") return def;
				const cleaned = String(v).replace(/[^\d.-]/g, "");
				const n = parseFloat(cleaned);
				return isNaN(n) ? def : n;
			};
			const pricingConfig = {
				taxPercent: parseVal(calcVals["tax-percent"], 9),
				trackingFee: parseVal(calcVals["tracking-fee"], .2),
				ebayFeePercent: parseVal(calcVals["ebay-fee-percent"], 20),
				promoFeePercent: parseVal(calcVals["promo-fee-percent"], 10),
				desiredProfit: parseVal(calcVals["desired-profit"], 0),
				paymentFixedFee: parseVal(calcVals["payment-fixed-fee"], .3)
			};
			variants.forEach((v) => {
				const rawCost = _ssxCleanFloat(v.raw_supplier_price ?? v.price);
				if (!_ssxCleanFloat(v.finalPrice) && rawCost > 0) {
					v.finalPrice = window.SSPricingEngine.calculatePrice(rawCost, pricingConfig);
					variantsUpdated = true;
				}
			});
			const baseCost = _ssxCleanFloat(p.raw_supplier_price ?? p.price);
			if (!_ssxCleanFloat(p.finalPrice) && baseCost > 0) {
				p.finalPrice = window.SSPricingEngine.calculatePrice(baseCost, pricingConfig);
				variantsUpdated = true;
			}
		}
		if (variantsUpdated) chrome.storage.local.set({ currentProduct: p });
		const mainImg = (Array.isArray(p.images) ? p.images : [])[0] || variants[0] && variants[0].img || p.mainImage || "";
		const productId = p.sourceId || p.asin || p.parentAsin || p.productId || "";
		const isSingle = p.isSingleMode || p.mode === "single" || variants.length <= 1;
		const supplierMeta = _ssxSupplierMeta(p.supplier);
		_ssxImg("ssx-head-img", mainImg);
		_ssxText("ssx-head-title", p.title || "Product");
		const supplierChip = document.getElementById("ssx-head-supplier");
		if (supplierChip) {
			const logo = supplierChip.querySelector("img");
			supplierChip.textContent = "";
			if (logo) supplierChip.appendChild(logo);
			supplierChip.appendChild(document.createTextNode(supplierMeta.displayName));
		}
		_ssxText("ssx-head-asin", `${supplierMeta.idLabel}: ${productId || "—"}`);
		_ssxImg("ssx-sum-img", mainImg);
		_ssxText("ssx-sum-asin", productId || "—");
		_ssxText("ssx-sum-condition", p.condition || "New");
		_ssxText("ssx-sum-varcount", String(variants.length));
		const supplierPrices = variants.map((v) => _ssxCleanFloat(v.raw_supplier_price ?? v.price)).filter((n) => !isNaN(n));
		const ebayPrices = variants.map((v) => _ssxCleanFloat(v.finalPrice)).filter((n) => !isNaN(n));
		const stocks = variants.map((v) => parseInt(v.quantity, 10)).filter((n) => !isNaN(n));
		const baseSupplier = _ssxCleanFloat(p.raw_supplier_price ?? p.price) || supplierPrices[0] || 0;
		const baseEbay = _ssxCleanFloat(p.finalPrice) || ebayPrices[0] || 0;
		const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
		const avgSupplier = supplierPrices.length ? avg(supplierPrices) : baseSupplier;
		const avgEbay = ebayPrices.length ? avg(ebayPrices) : baseEbay;
		const avgProfit = avgEbay - avgSupplier;
		const avgProfitPct = avgSupplier > 0 ? avgProfit / avgSupplier * 100 : 0;
		const totalStock = stocks.length ? stocks.reduce((a, b) => a + b, 0) : parseInt(p.quantity, 10) || 0;
		_ssxText("ssx-stat-supplier", _ssxMoney(avgSupplier));
		_ssxText("ssx-stat-ebay", _ssxMoney(avgEbay));
		_ssxText("ssx-stat-profit", `${_ssxMoney(avgProfit)} (${avgProfitPct.toFixed(1)}%)`);
		_ssxText("ssx-stat-stock", String(totalStock));
		_ssxText("ssx-stat-varcount", String(variants.length));
		const moveNode = (nodeId, mountId) => {
			const node = document.getElementById(nodeId);
			const mount = document.getElementById(mountId);
			if (node && mount && node.parentElement !== mount) mount.appendChild(node);
		};
		moveNode("ai-title-container", "ssx-title-mount");
		moveNode("description-preview", "ssx-desc-mount");
		moveNode("snipe-image-gallery", "ssx-gallery-mount");
		const singleBlock = document.getElementById("ssx-single-block");
		const varBlock = document.getElementById("ssx-var-block");
		function applyModeView(mode) {
			const single = mode === "single";
			if (singleBlock) singleBlock.style.display = single ? "block" : "none";
			if (varBlock) varBlock.style.display = single ? "none" : "block";
			document.querySelectorAll("#ssx-mode-seg .ssx-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
		}
		if (isSingle) {
			const v0 = variants[0] || {};
			const singleCost = _ssxCleanFloat(v0.raw_supplier_price ?? v0.price ?? baseSupplier) || 0;
			_ssxText("ssx-single-supplier", _ssxMoney(singleCost));
			const ebayEl = document.getElementById("ssx-single-ebay");
			const singleEbay = _ssxCleanFloat(v0.finalPrice ?? baseEbay) || 0;
			if (ebayEl && ebayEl.tagName === "INPUT") {
				ebayEl.value = singleEbay ? singleEbay.toFixed(2) : "";
				if (!ebayEl._ssxBound) {
					ebayEl._ssxBound = true;
					ebayEl.addEventListener("input", () => {
						const val = _ssxCleanFloat(ebayEl.value) || 0;
						const extPrice = document.getElementById("ext-price");
						if (extPrice) extPrice.value = ebayEl.value.trim();
						_ssxText("ssx-single-profit", _ssxMoney(val - singleCost));
						_saveExtEdits();
					});
				}
			} else if (ebayEl) ebayEl.textContent = _ssxMoney(singleEbay);
			_ssxText("ssx-single-profit", _ssxMoney(singleEbay - singleCost));
			const skuEl = document.getElementById("ssx-single-sku");
			if (skuEl) {
				const skuVal = p.ebaySku || v0.sku || "";
				if ("value" in skuEl && skuEl.tagName === "INPUT") {
					skuEl.value = skuVal;
					const extSkuFld = document.getElementById("ext-sku");
					if (extSkuFld && !extSkuFld.value && skuVal) extSkuFld.value = skuVal;
					if (!skuEl._ssxBound) {
						skuEl._ssxBound = true;
						skuEl.addEventListener("input", () => {
							const extSku = document.getElementById("ext-sku");
							if (extSku) extSku.value = skuEl.value.trim();
							_saveExtEdits();
						});
					}
				} else skuEl.textContent = skuVal || "—";
			}
			_ssxText("ssx-single-stock", `${v0.quantity || p.quantity || 1} · Ready`);
		} else _ssxRenderVariantRows(variants, p);
		_ssxText("ssx-var-count", `(${variants.length})`);
		applyModeView(isSingle ? "single" : "all");
		document.querySelectorAll("#ssx-mode-seg .ssx-mode-btn").forEach((btn) => {
			if (btn._ssxBound) return;
			btn._ssxBound = true;
			btn.addEventListener("click", () => applyModeView(btn.dataset.mode));
		});
		const bindClick = (newId, targetId) => {
			const nb = document.getElementById(newId);
			const tgt = document.getElementById(targetId);
			if (nb && tgt && !nb._ssxBound) {
				nb._ssxBound = true;
				nb.addEventListener("click", () => tgt.click());
			}
		};
		bindClick("ssx-ai-title-btn", "generate-ai-titles-btn");
		bindClick("ssx-ai-desc-btn", "generate-description-btn");
		const autoEditCb = document.getElementById("ssx-autoedit-toggle");
		if (autoEditCb && !autoEditCb._ssxBound) {
			autoEditCb._ssxBound = true;
			chrome.storage.local.get("autoEditEnabled", (d) => {
				autoEditCb.checked = !!d.autoEditEnabled;
			});
			autoEditCb.addEventListener("change", () => {
				chrome.storage.local.set({ autoEditEnabled: autoEditCb.checked });
			});
			chrome.storage.onChanged.addListener((changes, area) => {
				if (area === "local" && changes.autoEditEnabled) autoEditCb.checked = !!changes.autoEditEnabled.newValue;
			});
		}
		["ssx-upload-top", "ssx-upload-bot"].forEach((id) => {
			const b = document.getElementById(id);
			if (b && !b._ssxBound) {
				b._ssxBound = true;
				b.addEventListener("click", _handleSidebarUpload);
			}
		});
		["ssx-save-draft-top", "ssx-save-draft-bot"].forEach((id) => {
			const b = document.getElementById(id);
			if (b && !b._ssxBound) {
				b._ssxBound = true;
				b.addEventListener("click", () => {
					_saveExtEdits();
					if (window.UIHelper?.showToast) window.UIHelper.showToast("Draft saved", "success");
				});
			}
		});
		["ssx-preview-top", "ssx-preview-bot"].forEach((id) => {
			const b = document.getElementById(id);
			if (b && !b._ssxBound) {
				b._ssxBound = true;
				b.addEventListener("click", () => {
					const sp = document.getElementById("scrape-preview-btn");
					if (sp) sp.click();
				});
			}
		});
		const cancelBtn = document.getElementById("ssx-cancel-btn");
		if (cancelBtn && !cancelBtn._ssxBound) {
			cancelBtn._ssxBound = true;
			cancelBtn.addEventListener("click", () => {
				const cb = document.getElementById("panel-close-btn");
				if (cb) cb.click();
			});
		}
		const backBtn = document.getElementById("ssx-back-btn");
		if (backBtn && !backBtn._ssxBound) {
			backBtn._ssxBound = true;
			backBtn.addEventListener("click", () => {
				const cb = document.getElementById("panel-close-btn");
				if (cb) cb.click();
			});
		}
		const copyIdBtn = document.getElementById("ssx-copy-asin");
		if (copyIdBtn && !copyIdBtn._ssxBound) {
			copyIdBtn._ssxBound = true;
			copyIdBtn.addEventListener("click", () => {
				if (productId) navigator.clipboard?.writeText(productId);
			});
		}
	}
	async function showSidebarExtended$1(opts = {}) {
		const d = await chrome.storage.local.get(["currentProduct", "panelSource"]);
		if (!d.currentProduct) return;
		if (opts.force !== true && d.panelSource !== "sidebar") return;
		const p = d.currentProduct;
		const wrap = document.getElementById("ss-extended-editor");
		if (!wrap) {
			console.warn("[showSidebarExtended] #ss-extended-editor not in DOM");
			return;
		}
		wrap.style.display = "block";
		const shell = document.querySelector(".ss-panel-shell");
		if (shell) shell.classList.add("ssx-active");
		["ss-header", "snipe-main-container"].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.style.display = "none";
		});
		[".ss-image-overview", ".ss-action-bar.bottom-action-toolbar"].forEach((sel) => {
			const el = document.querySelector(sel);
			if (el) el.style.display = "none";
		});
		const fld = (id, val) => {
			const el = document.getElementById(id);
			if (el && val != null) el.value = val;
		};
		fld("ext-title", p.title);
		fld("ext-price", p.finalPrice);
		fld("ext-sku", p.ebaySku);
		fld("ext-qty", p.quantity || 1);
		const mainTitle = document.getElementById("ai-generated-title");
		if (mainTitle && p.title) mainTitle.textContent = p.title;
		const descDisplay = document.getElementById("description-preview");
		if (descDisplay) chrome.storage.local.get([
			"selectedEbayDescription",
			"generatedDescription",
			"selectedDescriptionTimestamp"
		], async (result) => {
			let draft = null;
			if (window.SSListingDraft) try {
				draft = await window.SSListingDraft.getDraft();
			} catch (e) {
				console.warn("[showSidebarExtended] Failed to get draft:", e);
			}
			const scannedAt = p.lastScannedAt || p.scrapedAt || 0;
			const aiDescription = !scannedAt || (result.selectedDescriptionTimestamp || 0) >= scannedAt ? result.selectedEbayDescription || result.generatedDescription || "" : "";
			const description = draft && draft.description || aiDescription || p.description || "";
			if (description) {
				descDisplay.innerHTML = description;
				descDisplay.classList.remove("description-empty-state");
				const copyBtn = document.getElementById("copy-description-btn");
				if (copyBtn) {
					copyBtn.disabled = false;
					copyBtn.style.display = "inline-flex";
				}
				const descCounter = document.querySelector(".ss-desc-counter");
				if (descCounter) descCounter.innerHTML = `${(descDisplay.innerText || "").length} / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
			} else {
				if (!descDisplay.querySelector(".description-placeholder")) descDisplay.innerHTML = `
                        <div class="ss-desc-empty description-placeholder description-empty-state" contenteditable="false">
                          <svg class="ss-empty-icon" viewBox="0 0 24 24" fill="none" stroke="var(--ss-green)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          <h4 class="ss-empty-title">No description yet</h4>
                          <p class="ss-empty-subtitle">Click AI Write Description to generate.</p>
                        </div>
                    `;
				const descCounter = document.querySelector(".ss-desc-counter");
				if (descCounter) descCounter.innerHTML = `0 / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
				const copyBtn = document.getElementById("copy-description-btn");
				if (copyBtn) {
					copyBtn.disabled = true;
					copyBtn.style.display = "none";
				}
			}
		});
		const variations = p.variations || [];
		const varWrap = document.getElementById("ext-variations-wrap");
		const varContainer = document.getElementById("ext-variations");
		if (variations.length > 0 && varWrap && varContainer) {
			varWrap.style.display = "block";
			varContainer.innerHTML = "";
			variations.forEach((dim) => {
				const dimEl = document.createElement("div");
				dimEl.style.cssText = "margin-bottom:8px;";
				const hdr = document.createElement("div");
				hdr.style.cssText = "font-size:11px;color:var(--ss-muted,#94a3b8);margin-bottom:4px;font-weight:600;";
				hdr.textContent = dim.label || "";
				dimEl.appendChild(hdr);
				const chips = document.createElement("div");
				chips.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
				(dim.values || []).forEach((val) => {
					const chip = document.createElement("span");
					chip.textContent = val;
					const isSelected = p.selectedVariation && Object.values(p.selectedVariation).some((v) => String(v).toLowerCase() === String(val).toLowerCase());
					chip.style.cssText = `padding:2px 10px;border-radius:12px;font-size:11px;border:1px solid ${isSelected ? "var(--ss-green,#22c55e)" : "var(--ss-border,#334155)"};background:var(--ss-bg,#0f172a);color:${isSelected ? "var(--ss-green,#22c55e)" : "var(--ss-muted,#94a3b8)"};`;
					chips.appendChild(chip);
				});
				dimEl.appendChild(chips);
				varContainer.appendChild(dimEl);
			});
		}
		const specs = p.specs || p.specifications || {};
		const specKeys = Object.keys(specs);
		const specWrap = document.getElementById("ext-specs-wrap");
		const specContainer = document.getElementById("ext-specs");
		if (specKeys.length > 0 && specWrap && specContainer) {
			specWrap.style.display = "block";
			specContainer.innerHTML = "";
			const details = document.createElement("details");
			details.style.cssText = "border:1px solid var(--ss-border,#334155);border-radius:6px;overflow:hidden;";
			const summary = document.createElement("summary");
			summary.style.cssText = "padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;color:var(--ss-muted,#94a3b8);list-style:none;display:flex;align-items:center;gap:6px;user-select:none;";
			summary.innerHTML = `<span style="font-size:10px;transition:transform 0.2s;" class="ext-specs-arrow">▶</span> Item Specifics <span style="font-size:10px;opacity:0.6;">(${specKeys.length})</span>`;
			details.addEventListener("toggle", () => {
				const arrow = details.querySelector(".ext-specs-arrow");
				if (arrow) arrow.style.transform = details.open ? "rotate(90deg)" : "rotate(0deg)";
			});
			const body = document.createElement("div");
			body.style.cssText = "padding:8px 10px;display:flex;flex-direction:column;gap:4px;";
			specKeys.forEach((key) => {
				const row = document.createElement("div");
				row.style.cssText = "display:flex;gap:8px;align-items:center;";
				const lbl = document.createElement("span");
				lbl.textContent = key;
				lbl.style.cssText = "flex:0 0 130px;font-size:11px;color:var(--ss-muted,#94a3b8);";
				const inp = document.createElement("input");
				inp.type = "text";
				inp.value = specs[key] || "";
				inp.dataset.specKey = key;
				inp.style.cssText = "flex:1;padding:4px 6px;border-radius:4px;border:1px solid var(--ss-border,#334155);background:var(--ss-bg,#0f172a);color:inherit;font-size:12px;";
				inp.addEventListener("input", _saveExtEdits);
				row.appendChild(lbl);
				row.appendChild(inp);
				body.appendChild(row);
			});
			details.appendChild(summary);
			details.appendChild(body);
			specContainer.appendChild(details);
		}
		[
			"ext-title",
			"ext-price",
			"ext-sku",
			"ext-qty"
		].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.addEventListener("input", _saveExtEdits);
		});
		const extTitle = document.getElementById("ext-title");
		if (extTitle && mainTitle) extTitle.addEventListener("input", () => {
			mainTitle.textContent = extTitle.value;
		});
		const origBtn = document.getElementById("opti-list-btn");
		if (origBtn) {
			const newBtn = origBtn.cloneNode(true);
			newBtn.textContent = "Upload";
			origBtn.parentNode.replaceChild(newBtn, origBtn);
			newBtn.addEventListener("click", _handleSidebarUpload);
		}
		await _ssxRenderExtended(p);
	}
	window.showSidebarExtended = showSidebarExtended$1;
	window._ssxRenderExtended = _ssxRenderExtended;
	window._saveExtEdits = _saveExtEdits;
	window._handleSidebarUpload = _handleSidebarUpload;
	//#endregion
	//#region common/pricing-engine.js
	window.SSPricingEngine = (() => {
		"use strict";
		const DEFAULTS = {
			taxPercent: 9,
			trackingFee: .2,
			ebayFeePercent: 20,
			promoFeePercent: 10,
			desiredProfit: 0,
			paymentFixedFee: .3
		};
		function round2(value) {
			return Math.round(value * 100) / 100;
		}
		/**
		* Calculates the final eBay listing price based on supplier cost and settings.
		* @param {number|string} supplierCost - Raw cost of the item.
		* @param {object} settings - Profit, tax, and fee parameters.
		* @returns {number} Marked-up eBay price.
		*/
		function calculatePrice(supplierCost, settings) {
			const cost = parseFloat(supplierCost);
			if (isNaN(cost) || cost <= 0) return .99;
			const s = settings || {};
			const taxPercent = parseFloat(s.taxPercent !== void 0 ? s.taxPercent : DEFAULTS.taxPercent);
			const trackingFee = parseFloat(s.trackingFee !== void 0 ? s.trackingFee : DEFAULTS.trackingFee);
			const ebayFeePercent = parseFloat(s.ebayFeePercent !== void 0 ? s.ebayFeePercent : DEFAULTS.ebayFeePercent);
			const promoFeePercent = parseFloat(s.promoFeePercent !== void 0 ? s.promoFeePercent : DEFAULTS.promoFeePercent);
			const desiredProfit = parseFloat(s.desiredProfit !== void 0 ? s.desiredProfit : DEFAULTS.desiredProfit);
			const paymentFixedFee = parseFloat(s.paymentFixedFee !== void 0 ? s.paymentFixedFee : DEFAULTS.paymentFixedFee);
			const baseCost = cost + cost * (taxPercent / 100) + trackingFee + paymentFixedFee;
			const totalPercentage = (ebayFeePercent + promoFeePercent + desiredProfit) / 100;
			if (totalPercentage >= 1) {
				console.warn("[PricingEngine] Fees exceed 100%. Applying 50% fallback markup.");
				return round2(baseCost * 1.5);
			}
			const calculatedPrice = baseCost / (1 - totalPercentage);
			return Math.max(.99, round2(calculatedPrice));
		}
		return {
			calculatePrice,
			DEFAULTS
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
		return {
			buildReadable,
			encodeForEbay,
			prefixFor,
			MAX_LEN
		};
	})();
	//#endregion
	//#region common/variation-normalizer.js
	window.SSVariationNormalizer = (() => {
		"use strict";
		const SEP = "";
		const INVISIBLE = /[​-‏‪-‮­⁠﻿]/g;
		function _text(value) {
			if (value == null) return "";
			if (typeof value === "object") return String(value.productName ?? value.value ?? value.name ?? "").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
			return String(value).replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
		}
		function normalizeLabel(label) {
			let s = _text(label).replace(/[:]+$/g, "");
			if (!s) return "";
			s = s.replace(/^variation[_\s-]*/i, "");
			s = s.replace(/^actual[_\s-]*/i, "");
			s = s.replace(/^clothing[_\s-]*/i, "");
			s = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
			const low = s.toLowerCase();
			if ([
				"colour",
				"color name",
				"colour name"
			].includes(low)) return "Color";
			if (["size name", "variation size name"].includes(low)) return "Size";
			if (low === "style name") return "Style";
			return s.replace(/\b\w/g, (ch) => ch.toUpperCase());
		}
		function normalizeValue(value) {
			return _text(value);
		}
		function _optionValuesFrom(source) {
			const out = {};
			if (!source || typeof source !== "object") return out;
			for (const [rawKey, rawValue] of Object.entries(source)) {
				const key = normalizeLabel(rawKey);
				const value = normalizeValue(rawValue);
				if (key && value) out[key] = value;
			}
			return out;
		}
		function optionValuesFromVariant(variant) {
			const direct = _optionValuesFrom(variant && variant.optionValues);
			if (Object.keys(direct).length) return direct;
			const attrs = _optionValuesFrom(variant && variant.attrs);
			if (Object.keys(attrs).length) return attrs;
			return _optionValuesFrom(variant && variant.specs);
		}
		function attrsFromOptionValues(optionValues) {
			const attrs = {};
			for (const [key, value] of Object.entries(optionValues || {})) {
				const label = normalizeLabel(key);
				const val = normalizeValue(value);
				if (label && val) attrs[label] = { productName: val };
			}
			return attrs;
		}
		function combinationKey(optionValues) {
			return Object.entries(optionValues || {}).map(([k, v]) => [normalizeLabel(k).toLowerCase(), normalizeValue(v).toLowerCase()]).filter(([k, v]) => k && v).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(SEP);
		}
		function _supplierId(variant) {
			return variant?.asinOrSupplierId || variant?.supplierVariantId || variant?.variant_asin || variant?.asin || variant?.sourceSku || "";
		}
		function _priceNumber(...values) {
			for (const value of values) {
				if (value == null || value === "") continue;
				const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
				if (!isNaN(n) && n > 0) return n;
			}
			return 0;
		}
		function _imageList(variant) {
			const arr = [];
			if (Array.isArray(variant?.finalImages)) arr.push(...variant.finalImages);
			if (Array.isArray(variant?.images)) arr.push(...variant.images);
			if (variant?.img) arr.push(variant.img);
			if (variant?.image) arr.push(variant.image);
			return Array.from(new Set(arr.filter((u) => typeof u === "string" && u.trim())));
		}
		function _mergeVariant(best, next) {
			const merged = { ...best };
			for (const key of [
				"supplierVariantId",
				"variant_asin",
				"asinOrSupplierId",
				"img",
				"imgProp",
				"sku",
				"finalSku",
				"sourceSku"
			]) if (!merged[key] && next[key]) merged[key] = next[key];
			if (!_priceNumber(merged.finalPrice, merged.ebayPrice) && _priceNumber(next.finalPrice, next.ebayPrice)) {
				merged.finalPrice = next.finalPrice;
				merged.ebayPrice = next.ebayPrice;
			}
			if (!_priceNumber(merged.price, merged.raw_supplier_price) && _priceNumber(next.price, next.raw_supplier_price)) {
				merged.price = next.price;
				merged.raw_supplier_price = next.raw_supplier_price;
			}
			if ((!merged.finalImages || merged.finalImages.length === 0) && next.finalImages) merged.finalImages = next.finalImages;
			if ((!merged.images || merged.images.length === 0) && next.images) merged.images = next.images;
			return merged;
		}
		function _scoreVariant(v) {
			return Object.keys(v.optionValues || {}).length * 10 + (_supplierId(v) ? 6 : 0) + (v.sku || v.finalSku ? 5 : 0) + (_priceNumber(v.finalPrice, v.ebayPrice, v.price) ? 4 : 0) + (v.finalImages && v.finalImages.length || v.img ? 3 : 0) + (parseInt(v.quantity, 10) > 0 ? 2 : 0);
		}
		function normalizeVariant(variant, product, index) {
			const v = { ...variant || {} };
			const optionValues = optionValuesFromVariant(v);
			const attrs = attrsFromOptionValues(optionValues);
			const combo = combinationKey(optionValues);
			const parentId = product?.sourceId || product?.parentAsin || product?.asin || product?.productId || "";
			const supplier = product?.supplier || product?.marketplace || "amazon";
			const supplierPrefix = window.SSSkuEngine?.prefixFor ? window.SSSkuEngine.prefixFor(supplier) : supplier;
			const generatedSku = parentId && window.SSSkuEngine ? window.SSSkuEngine.buildReadable(parentId, attrs, supplierPrefix) : "";
			const finalSku = v.finalSku || v.sku || v.ebaySku || generatedSku || _supplierId(v) || "";
			const images = _imageList(v);
			const sourcePrice = _priceNumber(v.raw_supplier_price, v.sourcePrice, v.price);
			const finalPrice = _priceNumber(v.finalPrice, v.ebayPrice, v.calculatedPrice);
			const supplierVariantId = _supplierId(v);
			const variationId = v.variationId || supplierVariantId || combo || `variant-${index}`;
			return {
				...v,
				variationId,
				asinOrSupplierId: supplierVariantId || null,
				supplierVariantId: supplierVariantId || v.supplierVariantId || null,
				variant_asin: v.variant_asin || supplierVariantId || null,
				sourceSku: v.sourceSku || supplierVariantId || null,
				generatedSku: v.generatedSku || generatedSku || null,
				finalSku: finalSku || null,
				sku: finalSku || v.sku || null,
				optionValues,
				attrs,
				combinationKey: combo || (supplierVariantId ? `id=${String(supplierVariantId).toLowerCase()}` : `idx=${index}`),
				sourcePrice,
				calculatedPrice: _priceNumber(v.calculatedPrice, v.finalPrice),
				finalPrice: finalPrice || v.finalPrice,
				ebayPrice: _priceNumber(v.ebayPrice) ? v.ebayPrice : v.ebayPrice,
				raw_supplier_price: sourcePrice || v.raw_supplier_price,
				images,
				finalImages: Array.isArray(v.finalImages) && v.finalImages.length ? v.finalImages : images,
				imgProp: v.imgProp ? normalizeLabel(v.imgProp) : null,
				img: v.img || images[0] || null,
				quantity: v.quantity != null ? v.quantity : 1,
				isDeleted: v.isDeleted === true || v.deleted === true
			};
		}
		function normalizeProduct(product, options = {}) {
			const p = { ...product || {} };
			if (p.specifications && !p.specs) p.specs = p.specifications;
			const source = Array.isArray(p.variants) ? p.variants : [];
			const dropDeleted = options.dropDeleted !== false;
			const dropInvalid = options.dropInvalid === true;
			const dedupe = options.dedupe !== false;
			const warnings = [];
			const rows = [];
			source.forEach((variant, index) => {
				const row = normalizeVariant(variant, p, index);
				if (dropDeleted && row.isDeleted) return;
				if (dropInvalid && Object.keys(row.optionValues).length === 0 && source.length > 1) {
					warnings.push({
						type: "missing-options",
						index,
						variationId: row.variationId
					});
					return;
				}
				rows.push(row);
			});
			let variants = rows;
			if (dedupe) {
				const byCombo = /* @__PURE__ */ new Map();
				for (const row of rows) {
					const key = row.combinationKey;
					if (!byCombo.has(key)) {
						byCombo.set(key, row);
						continue;
					}
					const prev = byCombo.get(key);
					warnings.push({
						type: "duplicate-combination",
						combinationKey: key,
						kept: prev.variationId,
						dropped: row.variationId
					});
					byCombo.set(key, _scoreVariant(row) > _scoreVariant(prev) ? _mergeVariant(row, prev) : _mergeVariant(prev, row));
				}
				variants = Array.from(byCombo.values());
			}
			p.variants = variants;
			p.hasVariants = variants.length > 1;
			p.variationCount = variants.length;
			if (warnings.length) p.variationNormalizationWarnings = warnings;
			else delete p.variationNormalizationWarnings;
			return p;
		}
		function validateUniqueCombinations(variants) {
			const seen = /* @__PURE__ */ new Map();
			const duplicates = [];
			(variants || []).forEach((variant, index) => {
				if (variant?.isDeleted || variant?.deleted) return;
				const key = (variant.combinationKey ? variant : normalizeVariant(variant, {}, index)).combinationKey;
				if (seen.has(key)) duplicates.push({
					key,
					firstIndex: seen.get(key),
					index
				});
				else seen.set(key, index);
			});
			return {
				valid: duplicates.length === 0,
				duplicates
			};
		}
		return {
			normalizeLabel,
			normalizeValue,
			optionValuesFromVariant,
			attrsFromOptionValues,
			combinationKey,
			normalizeVariant,
			normalizeProduct,
			validateUniqueCombinations
		};
	})();
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
	//#region common/storage.js
	var require_storage = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var StorageHelper = (() => {
			const KEYS = {
				WATERMARKED_IMAGES: "watermarkedImages",
				USER_STICKERS: "userStickers",
				THEME: "snipeEditorTheme",
				ADMIN_AUTH: "adminAuth",
				ADMIN_SETTINGS: "adminSettings",
				ANALYTICS: "analytics",
				FIRST_INSTALL: "firstInstall",
				USER_ROLE: "userRole",
				LICENSE_KEY: "licenseKey",
				GOOGLE_SHEET_URL: "googleSheetUrl",
				GOOGLE_APPS_SCRIPT_URL: "googleAppsScriptUrl",
				LISTED_COUNT: "listedCount",
				AUTO_WATERMARK_ENABLED: "autoWatermarkEnabled"
			};
			/**
			* Get data from chrome.storage.local
			* @param {string|string[]} keys - Single key or array of keys
			* @returns {Promise<any>} Retrieved data
			*/
			async function getLocal(keys) {
				try {
					const result = await chrome.storage.local.get(keys);
					return Array.isArray(keys) ? result : result[keys];
				} catch (error) {
					console.error("Storage getLocal error:", error);
					throw error;
				}
			}
			/**
			* Set data in chrome.storage.local
			* @param {Object} items - Key-value pairs to store
			* @returns {Promise<void>}
			*/
			async function setLocal(items) {
				try {
					await chrome.storage.local.set(items);
				} catch (error) {
					console.error("Storage setLocal error:", error);
					throw error;
				}
			}
			/**
			* Remove data from chrome.storage.local
			* @param {string|string[]} keys - Keys to remove
			* @returns {Promise<void>}
			*/
			async function removeLocal(keys) {
				try {
					await chrome.storage.local.remove(keys);
				} catch (error) {
					console.error("Storage removeLocal error:", error);
					throw error;
				}
			}
			/**
			* Get data from chrome.storage.sync
			* @param {string|string[]} keys - Single key or array of keys
			* @returns {Promise<any>} Retrieved data
			*/
			async function getSync(keys) {
				try {
					const result = await chrome.storage.sync.get(keys);
					return Array.isArray(keys) ? result : result[keys];
				} catch (error) {
					console.error("Storage getSync error:", error);
					throw error;
				}
			}
			/**
			* Set data in chrome.storage.sync
			* @param {Object} items - Key-value pairs to store
			* @returns {Promise<void>}
			*/
			async function setSync(items) {
				try {
					await chrome.storage.sync.set(items);
				} catch (error) {
					console.error("Storage setSync error:", error);
					throw error;
				}
			}
			/**
			* Clear all chrome.storage.local data
			* @returns {Promise<void>}
			*/
			async function clearLocal() {
				try {
					await chrome.storage.local.clear();
				} catch (error) {
					console.error("Storage clearLocal error:", error);
					throw error;
				}
			}
			/**
			* Export all settings as JSON
			* @returns {Promise<Object>} All settings
			*/
			async function exportSettings() {
				try {
					return await getLocal([
						KEYS.ADMIN_SETTINGS,
						KEYS.THEME,
						KEYS.USER_ROLE
					]);
				} catch (error) {
					console.error("Export settings error:", error);
					throw error;
				}
			}
			/**
			* Import settings from JSON
			* @param {Object} settings - Settings object to import
			* @returns {Promise<void>}
			*/
			async function importSettings(settings) {
				try {
					await setLocal(settings);
				} catch (error) {
					console.error("Import settings error:", error);
					throw error;
				}
			}
			/**
			* Validate Google Apps Script URL format
			* @param {string} url - URL to validate
			* @returns {Object} Validation result with isValid and error message
			*/
			function validateGoogleScriptUrl(url) {
				if (!url || typeof url !== "string") return {
					isValid: false,
					error: "URL is required"
				};
				try {
					if (new URL(url).protocol !== "https:") return {
						isValid: false,
						error: "URL must use HTTPS"
					};
				} catch (e) {
					return {
						isValid: false,
						error: "Invalid URL format"
					};
				}
				if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(\/|\?|$)/.test(url)) return {
					isValid: false,
					error: "URL must match pattern: https://script.google.com/macros/s/[SCRIPT_ID]/exec"
				};
				return {
					isValid: true,
					error: null
				};
			}
			return {
				KEYS,
				getLocal,
				setLocal,
				removeLocal,
				getSync,
				setSync,
				clearLocal,
				exportSettings,
				importSettings,
				validateGoogleScriptUrl
			};
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = StorageHelper;
	}));
	//#endregion
	//#region common/ui.js
	var require_ui = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var UIHelper = (() => {
			const typingTimers = /* @__PURE__ */ new Map();
			/**
			* Show toast notification
			* @param {string} message - Message to display
			* @param {string} type - Type: 'success', 'error', 'info', 'warning'
			* @param {number} duration - Duration in ms (default 3000)
			*/
			function showToast(message, type = "info", duration = 3e3) {
				let container = document.getElementById("toast-container");
				if (!container) {
					container = document.createElement("div");
					container.id = "toast-container";
					container.className = "toast-container";
					container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
					document.body.appendChild(container);
				}
				const toast = document.createElement("div");
				toast.className = `toast ${type}`;
				const icons = {
					success: "✅",
					error: "❌",
					info: "ℹ️",
					warning: "⚠️"
				};
				toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;
				toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 8px;
      background: ${getToastColor(type)};
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
				container.appendChild(toast);
				setTimeout(() => {
					toast.style.opacity = "1";
					toast.style.transform = "translateX(0)";
				}, 10);
				setTimeout(() => {
					toast.style.opacity = "0";
					toast.style.transform = "translateX(100px)";
					setTimeout(() => {
						if (toast.parentNode) toast.parentNode.removeChild(toast);
					}, 300);
				}, duration);
			}
			function getToastColor(type) {
				const colors = {
					success: "#28a745",
					error: "#dc3545",
					info: "#17a2b8",
					warning: "#ffc107"
				};
				return colors[type] || colors.info;
			}
			/**
			* Show loading overlay
			* @param {string} message - Loading message
			*/
			function showLoading(message = "Processing...") {
				let overlay = document.getElementById("global-loading-overlay");
				if (!overlay) {
					overlay = document.createElement("div");
					overlay.id = "global-loading-overlay";
					overlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div class="spinner"></div>
          <div class="loading-text" style="color: white; font-size: 16px; font-weight: 500;">${message}</div>
        </div>
      `;
					overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
      `;
					document.body.appendChild(overlay);
					const style = document.createElement("style");
					style.textContent = `
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
					document.head.appendChild(style);
				} else {
					overlay.querySelector(".loading-text").textContent = message;
					overlay.style.display = "flex";
				}
			}
			/**
			* Hide loading overlay
			*/
			function hideLoading() {
				const overlay = document.getElementById("global-loading-overlay");
				if (overlay) overlay.style.display = "none";
			}
			/**
			* Show confirmation dialog
			* @param {string} message - Confirmation message
			* @param {string} confirmText - Confirm button text
			* @param {string} cancelText - Cancel button text
			* @returns {Promise<boolean>} True if confirmed
			*/
			function confirm(message, confirmText = "Confirm", cancelText = "Cancel") {
				return new Promise((resolve) => {
					const modal = document.createElement("div");
					modal.className = "confirm-modal";
					modal.innerHTML = `
        <div class="confirm-backdrop"></div>
        <div class="confirm-dialog">
          <div class="confirm-message">${message}</div>
          <div class="confirm-actions">
            <button class="btn-cancel">${cancelText}</button>
            <button class="btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;
					modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
					const style = document.createElement("style");
					style.textContent = `
        .confirm-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
        }
        .confirm-dialog {
          position: relative;
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .confirm-message {
          font-size: 16px;
          color: #1a1a1a;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .confirm-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel {
          background: #e2e8f0;
          color: #64748b;
        }
        .btn-cancel:hover {
          background: #cbd5e1;
        }
        .btn-confirm {
          background: #1a73e8;
          color: white;
        }
        .btn-confirm:hover {
          background: #1557b0;
        }
      `;
					document.head.appendChild(style);
					document.body.appendChild(modal);
					modal.querySelector(".btn-cancel").addEventListener("click", () => {
						document.body.removeChild(modal);
						resolve(false);
					});
					modal.querySelector(".btn-confirm").addEventListener("click", () => {
						document.body.removeChild(modal);
						resolve(true);
					});
					modal.querySelector(".confirm-backdrop").addEventListener("click", () => {
						document.body.removeChild(modal);
						resolve(false);
					});
				});
			}
			/**
			* Create and download a file
			* @param {string} content - File content
			* @param {string} filename - Filename
			* @param {string} mimeType - MIME type
			*/
			function downloadFile(content, filename, mimeType = "text/plain") {
				const blob = new Blob([content], { type: mimeType });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = filename;
				a.click();
				URL.revokeObjectURL(url);
			}
			/**
			* Copy text to clipboard
			* @param {string} text - Text to copy
			* @returns {Promise<boolean>} Success status
			*/
			async function copyToClipboard(text) {
				try {
					await navigator.clipboard.writeText(text);
					showToast("Copied to clipboard!", "success");
					return true;
				} catch (error) {
					console.error("Copy to clipboard failed:", error);
					showToast("Failed to copy", "error");
					return false;
				}
			}
			/**
			* Format date to readable string
			* @param {Date|string|number} date - Date to format
			* @returns {string} Formatted date
			*/
			function formatDate(date) {
				return new Date(date).toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				});
			}
			/**
			* Debounce function
			* @param {Function} func - Function to debounce
			* @param {number} wait - Wait time in ms
			* @returns {Function} Debounced function
			*/
			function debounce(func, wait) {
				let timeout;
				return function executedFunction(...args) {
					const later = () => {
						clearTimeout(timeout);
						func(...args);
					};
					clearTimeout(timeout);
					timeout = setTimeout(later, wait);
				};
			}
			return {
				showToast,
				showLoading,
				hideLoading,
				confirm,
				downloadFile,
				copyToClipboard,
				formatDate,
				debounce,
				showTitleSelectionPopup,
				selectTitle,
				renderInlineTitles
			};
			function showTitleSelectionPopup(titles) {
				console.warn("[UIHelper] Deprecated: showTitleSelectionPopup is disabled. Routing to inline title rendering.");
				return renderInlineTitles(titles);
			}
			function selectTitle(titleValue, optionElement) {
				if (!titleValue) return;
				document.querySelectorAll(".title-option").forEach((opt) => {
					opt.classList.remove("selected");
				});
				optionElement?.classList.add("selected");
				const titleDisplay = document.getElementById("ai-generated-title");
				const titleCounter = document.getElementById("ai-title-counter");
				const copyBtn = document.getElementById("copy-title-btn");
				if (titleDisplay) {
					titleDisplay.innerText = titleValue;
					titleDisplay.classList.add("has-title");
				}
				if (titleCounter) titleCounter.textContent = `${titleValue.length} characters`;
				if (copyBtn) copyBtn.style.display = "inline-flex";
				if (chrome && chrome.storage) chrome.storage.local.set({
					selectedEbayTitle: titleValue,
					selectedTitleTimestamp: Date.now()
				}, () => {
					console.log("[UIHelper] Selected title saved to storage:", titleValue);
				});
				showToast("Title selected! Ready to paste on eBay.", "success");
				setTimeout(() => {
					const popup = document.getElementById("title-selection-popup");
					if (popup) popup.style.display = "none";
				}, 500);
				navigator.clipboard.writeText(titleValue).catch((err) => {
					console.warn("[UIHelper] Could not copy to clipboard:", err);
				});
			}
			function typeIntoElement(element, text, speed = 10) {
				if (!element) return;
				if (typingTimers.has(element)) {
					clearInterval(typingTimers.get(element));
					typingTimers.delete(element);
				}
				if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
					element.innerText = text;
					element.classList.remove("typing-active");
					return;
				}
				element.innerText = "";
				element.classList.add("typing-active");
				let i = 0;
				const timer = setInterval(() => {
					if (i < text.length) {
						element.innerText += text.charAt(i);
						i++;
					} else {
						clearInterval(timer);
						typingTimers.delete(element);
						element.classList.remove("typing-active");
					}
				}, speed);
				typingTimers.set(element, timer);
			}
			function selectTitleFromSlot(titleStr, selectedOptionNum) {
				if (chrome && chrome.storage) chrome.storage.local.set({
					selectedEbayTitle: titleStr,
					generatedAt: Date.now()
				});
				const titleDisplay = document.getElementById("ai-generated-title");
				const titleCounter = document.getElementById("ai-title-counter");
				if (titleDisplay) {
					typeIntoElement(titleDisplay, titleStr, 5);
					titleDisplay.classList.add("has-title");
					if (titleCounter) titleCounter.innerHTML = `${titleStr.length} / 80 chars <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
				}
				for (let i = 1; i <= 3; i++) {
					const card = document.getElementById(`ai-title-option-${i}`);
					const useBtn = document.getElementById(`ai-title-option-${i}-use`);
					if (card && useBtn) if (i === selectedOptionNum) {
						card.classList.add("selected");
						useBtn.textContent = "Selected";
					} else {
						card.classList.remove("selected");
						useBtn.textContent = "Use Title";
					}
				}
			}
			function populateStaticTitleSlots(titles) {
				console.debug("[Titles] populateStaticTitleSlots called");
				let normalizedTitles = [];
				if (Array.isArray(titles)) normalizedTitles = titles;
				else if (titles && Array.isArray(titles.titles)) normalizedTitles = titles.titles;
				else if (titles && titles.data && Array.isArray(titles.data.titles)) normalizedTitles = titles.data.titles;
				if (!normalizedTitles || normalizedTitles.length === 0) return;
				const bestTitleStr = typeof normalizedTitles[0] === "object" ? normalizedTitles[0].title : normalizedTitles[0];
				if (chrome && chrome.storage) chrome.storage.local.set({
					selectedEbayTitle: bestTitleStr,
					generatedAt: Date.now()
				});
				const titleDisplay = document.getElementById("ai-generated-title");
				const titleCounter = document.getElementById("ai-title-counter");
				if (titleDisplay) {
					titleDisplay.classList.add("has-title");
					typeIntoElement(titleDisplay, bestTitleStr, 10);
					if (titleCounter) titleCounter.innerHTML = `${bestTitleStr.length} / 80 chars <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
				}
				for (let i = 0; i < 3; i++) {
					if (i >= normalizedTitles.length) break;
					const titleItem = normalizedTitles[i];
					const titleStr = typeof titleItem === "object" ? titleItem.title : titleItem;
					const optionNum = i + 1;
					const card = document.getElementById(`ai-title-option-${optionNum}`);
					const textEl = document.getElementById(`ai-title-option-${optionNum}-text`);
					const countEl = document.getElementById(`ai-title-option-${optionNum}-count`);
					const useBtn = document.getElementById(`ai-title-option-${optionNum}-use`);
					const copyBtn = document.getElementById(`ai-title-option-${optionNum}-copy`);
					if (card && textEl && countEl && useBtn && copyBtn) {
						textEl.classList.remove("text-muted");
						typeIntoElement(textEl, titleStr, 10);
						countEl.textContent = `${titleStr.length} chars`;
						countEl.className = titleStr.length > 80 ? "warning" : "";
						card.classList.remove("selected");
						if (i === 0) {
							card.classList.add("selected");
							useBtn.textContent = "Selected";
						} else useBtn.textContent = "Use Title";
						useBtn.onclick = () => selectTitleFromSlot(titleStr, optionNum);
						card.onclick = (e) => {
							if (!e.target.closest(".inline-title-copy") && !e.target.closest(".inline-title-use")) selectTitleFromSlot(titleStr, optionNum);
						};
						copyBtn.onclick = (e) => {
							e.stopPropagation();
							navigator.clipboard.writeText(titleStr);
							const originalText = copyBtn.textContent;
							copyBtn.textContent = "Copied!";
							setTimeout(() => {
								copyBtn.textContent = originalText;
							}, 2e3);
						};
					}
				}
			}
			function renderInlineTitles(titles) {
				return populateStaticTitleSlots(titles);
			}
		})();
		if (typeof window !== "undefined") window.UIHelper = UIHelper;
		if (typeof module !== "undefined" && module.exports) module.exports = UIHelper;
	}));
	//#endregion
	//#region common/analytics.js
	var require_analytics = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var Analytics = (() => {
			const LOG_KEY = "analyticsLogs";
			const USAGE_KEY = "analyticsUsage";
			/**
			* Log levels
			*/
			const LogLevel = {
				INFO: "INFO",
				WARNING: "WARNING",
				ERROR: "ERROR",
				DEBUG: "DEBUG"
			};
			/**
			* Log an event
			* @param {string} level - Log level
			* @param {string} message - Log message
			* @param {Object} metadata - Additional metadata
			*/
			async function log(level, message, metadata = {}) {
				try {
					const entry = {
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						level,
						message,
						metadata
					};
					const logs = (await chrome.storage.local.get(LOG_KEY))[LOG_KEY] || [];
					logs.push(entry);
					const trimmedLogs = logs.slice(-1e3);
					await chrome.storage.local.set({ [LOG_KEY]: trimmedLogs });
					console.log(`[${level}] ${message}`, metadata);
				} catch (error) {
					console.error("Analytics log error:", error);
				}
			}
			/**
			* Log info message
			* @param {string} message - Message
			* @param {Object} metadata - Metadata
			*/
			function info(message, metadata = {}) {
				return log(LogLevel.INFO, message, metadata);
			}
			/**
			* Log warning message
			* @param {string} message - Message
			* @param {Object} metadata - Metadata
			*/
			function warn(message, metadata = {}) {
				return log(LogLevel.WARNING, message, metadata);
			}
			/**
			* Log error message
			* @param {string} message - Message
			* @param {Object} metadata - Metadata
			*/
			function error(message, metadata = {}) {
				return log(LogLevel.ERROR, message, metadata);
			}
			/**
			* Log debug message
			* @param {string} message - Message
			* @param {Object} metadata - Metadata
			*/
			function debug(message, metadata = {}) {
				return log(LogLevel.DEBUG, message, metadata);
			}
			/**
			* Track usage event
			* @param {string} action - Action name (e.g., 'image_edited', 'sticker_added')
			* @param {Object} data - Event data
			*/
			async function trackEvent(action, data = {}) {
				try {
					const usage = (await chrome.storage.local.get(USAGE_KEY))[USAGE_KEY] || {};
					if (!usage[action]) usage[action] = {
						count: 0,
						lastUsed: null,
						data: []
					};
					usage[action].count++;
					usage[action].lastUsed = (/* @__PURE__ */ new Date()).toISOString();
					usage[action].data.push({
						timestamp: (/* @__PURE__ */ new Date()).toISOString(),
						...data
					});
					usage[action].data = usage[action].data.slice(-10);
					await chrome.storage.local.set({ [USAGE_KEY]: usage });
					await info(`Event: ${action}`, data);
				} catch (error) {
					console.error("Track event error:", error);
				}
			}
			/**
			* Get all logs
			* @param {string} levelFilter - Filter by level (optional)
			* @returns {Promise<Array>} Array of log entries
			*/
			async function getLogs(levelFilter = null) {
				try {
					const logs = (await chrome.storage.local.get(LOG_KEY))[LOG_KEY] || [];
					if (levelFilter) return logs.filter((log) => log.level === levelFilter);
					return logs;
				} catch (error) {
					console.error("Get logs error:", error);
					return [];
				}
			}
			/**
			* Get usage statistics
			* @returns {Promise<Object>} Usage statistics
			*/
			async function getUsageStats() {
				try {
					return (await chrome.storage.local.get(USAGE_KEY))[USAGE_KEY] || {};
				} catch (error) {
					console.error("Get usage stats error:", error);
					return {};
				}
			}
			/**
			* Clear all logs
			* @returns {Promise<void>}
			*/
			async function clearLogs() {
				try {
					await chrome.storage.local.remove(LOG_KEY);
					await info("Logs cleared");
				} catch (error) {
					console.error("Clear logs error:", error);
				}
			}
			/**
			* Clear usage statistics
			* @returns {Promise<void>}
			*/
			async function clearUsage() {
				try {
					await chrome.storage.local.remove(USAGE_KEY);
					await info("Usage statistics cleared");
				} catch (error) {
					console.error("Clear usage error:", error);
				}
			}
			/**
			* Export logs as JSON
			* @returns {Promise<string>} JSON string of logs
			*/
			async function exportLogs() {
				try {
					const logs = await getLogs();
					return JSON.stringify(logs, null, 2);
				} catch (error) {
					console.error("Export logs error:", error);
					return "[]";
				}
			}
			/**
			* Export usage stats as JSON
			* @returns {Promise<string>} JSON string of usage stats
			*/
			async function exportUsageStats() {
				try {
					const stats = await getUsageStats();
					return JSON.stringify(stats, null, 2);
				} catch (error) {
					console.error("Export usage stats error:", error);
					return "{}";
				}
			}
			/**
			* Get summary statistics
			* @returns {Promise<Object>} Summary stats
			*/
			async function getSummary() {
				try {
					const [logs, usage] = await Promise.all([getLogs(), getUsageStats()]);
					const logsByLevel = logs.reduce((acc, log) => {
						acc[log.level] = (acc[log.level] || 0) + 1;
						return acc;
					}, {});
					const sortedUsage = Object.entries(usage).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
					return {
						totalLogs: logs.length,
						logsByLevel,
						mostUsedFeatures: sortedUsage,
						totalEvents: Object.values(usage).reduce((sum, u) => sum + u.count, 0)
					};
				} catch (error) {
					console.error("Get summary error:", error);
					return {};
				}
			}
			return {
				LogLevel,
				log,
				info,
				warn,
				error,
				debug,
				trackEvent,
				getLogs,
				getUsageStats,
				clearLogs,
				clearUsage,
				exportLogs,
				exportUsageStats,
				getSummary
			};
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = Analytics;
	}));
	//#endregion
	//#region common/undo-manager.js
	var require_undo_manager = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var UndoManager = (() => {
			let undoStack = [];
			let redoStack = [];
			const MAX_HISTORY = 50;
			let isRestoring = false;
			/**
			* State snapshot structure
			* @typedef {Object} Snapshot
			* @property {string} canvasData - Canvas image data as data URL
			* @property {Array} stickers - Array of sticker states
			* @property {number} timestamp - Snapshot timestamp
			* @property {string} action - Description of action (for debugging)
			*/
			/**
			* Save current state to undo stack
			* @param {HTMLCanvasElement} canvas - Canvas element
			* @param {Array} stickers - Current stickers array
			* @param {string} action - Action description
			*/
			function saveState(canvas, stickers, action = "edit") {
				if (isRestoring) return;
				try {
					const snapshot = {
						canvasData: canvas.toDataURL("image/png"),
						stickers: JSON.parse(JSON.stringify(stickers.map((s) => ({
							x: s.x,
							y: s.y,
							w: s.w,
							h: s.h,
							opacity: s.opacity,
							rotation: s.rotation,
							name: s.name,
							imgSrc: s.img?.src || s.imgSrc
						})))),
						timestamp: Date.now(),
						action
					};
					undoStack.push(snapshot);
					if (undoStack.length > MAX_HISTORY) undoStack.shift();
					redoStack = [];
					updateButtons();
					console.log(`✅ State saved: ${action} (Stack: ${undoStack.length})`);
				} catch (error) {
					console.error("❌ Failed to save state:", error);
				}
			}
			/**
			* Undo last action
			* @param {HTMLCanvasElement} canvas - Canvas element
			* @param {Object} context - Canvas 2D context
			* @param {Array} stickers - Stickers array
			* @param {Function} drawCallback - Callback to redraw canvas
			* @returns {Promise<boolean>} Success status
			*/
			async function undo(canvas, context, stickers, drawCallback) {
				if (undoStack.length === 0) {
					console.warn("⚠️ Nothing to undo");
					return false;
				}
				try {
					isRestoring = true;
					const currentState = {
						canvasData: canvas.toDataURL("image/png"),
						stickers: JSON.parse(JSON.stringify(stickers.map((s) => ({
							x: s.x,
							y: s.y,
							w: s.w,
							h: s.h,
							opacity: s.opacity,
							rotation: s.rotation,
							name: s.name,
							imgSrc: s.img?.src || s.imgSrc
						})))),
						timestamp: Date.now(),
						action: "current"
					};
					redoStack.push(currentState);
					const previousState = undoStack.pop();
					await restoreState(canvas, context, stickers, previousState, drawCallback);
					updateButtons();
					console.log(`↶ Undo: ${previousState.action}`);
					return true;
				} catch (error) {
					console.error("❌ Undo failed:", error);
					return false;
				} finally {
					isRestoring = false;
				}
			}
			/**
			* Redo last undone action
			* @param {HTMLCanvasElement} canvas - Canvas element
			* @param {Object} context - Canvas 2D context
			* @param {Array} stickers - Stickers array
			* @param {Function} drawCallback - Callback to redraw canvas
			* @returns {Promise<boolean>} Success status
			*/
			async function redo(canvas, context, stickers, drawCallback) {
				if (redoStack.length === 0) {
					console.warn("⚠️ Nothing to redo");
					return false;
				}
				try {
					isRestoring = true;
					const currentState = {
						canvasData: canvas.toDataURL("image/png"),
						stickers: JSON.parse(JSON.stringify(stickers.map((s) => ({
							x: s.x,
							y: s.y,
							w: s.w,
							h: s.h,
							opacity: s.opacity,
							rotation: s.rotation,
							name: s.name,
							imgSrc: s.img?.src || s.imgSrc
						})))),
						timestamp: Date.now(),
						action: "current"
					};
					undoStack.push(currentState);
					const nextState = redoStack.pop();
					await restoreState(canvas, context, stickers, nextState, drawCallback);
					updateButtons();
					console.log(`↷ Redo: ${nextState.action}`);
					return true;
				} catch (error) {
					console.error("❌ Redo failed:", error);
					return false;
				} finally {
					isRestoring = false;
				}
			}
			/**
			* Restore state from snapshot
			* @param {HTMLCanvasElement} canvas - Canvas element
			* @param {Object} context - Canvas 2D context
			* @param {Array} stickers - Stickers array to update
			* @param {Snapshot} snapshot - State snapshot
			* @param {Function} drawCallback - Callback to redraw canvas
			*/
			async function restoreState(canvas, context, stickers, snapshot, drawCallback) {
				const img = new Image();
				await new Promise((resolve, reject) => {
					img.onload = resolve;
					img.onerror = reject;
					img.src = snapshot.canvasData;
				});
				context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(img, 0, 0);
				stickers.length = 0;
				for (const stickerData of snapshot.stickers) {
					const stickerImg = new Image();
					await new Promise((resolve) => {
						stickerImg.onload = resolve;
						stickerImg.onerror = resolve;
						stickerImg.src = stickerData.imgSrc;
					});
					stickers.push({
						img: stickerImg,
						imgSrc: stickerData.imgSrc,
						x: stickerData.x,
						y: stickerData.y,
						w: stickerData.w,
						h: stickerData.h,
						opacity: stickerData.opacity,
						rotation: stickerData.rotation,
						name: stickerData.name,
						selected: false
					});
				}
				if (drawCallback) drawCallback();
			}
			let domRoot = document;
			/**
			* Set the root element for DOM lookups (e.g. ShadowRoot)
			* @param {Node} root 
			*/
			/**
			* Update undo/redo button states
			*/
			function updateButtons() {
				if (!domRoot || !domRoot.getElementById) return;
				const undoBtn = domRoot.getElementById("btn-undo");
				const redoBtn = domRoot.getElementById("btn-redo");
				if (undoBtn) {
					undoBtn.disabled = undoStack.length === 0;
					undoBtn.style.opacity = undoStack.length === 0 ? "0.5" : "1";
					undoBtn.style.cursor = undoStack.length === 0 ? "not-allowed" : "pointer";
				}
				if (redoBtn) {
					redoBtn.disabled = redoStack.length === 0;
					redoBtn.style.opacity = redoStack.length === 0 ? "0.5" : "1";
					redoBtn.style.cursor = redoStack.length === 0 ? "not-allowed" : "pointer";
				}
			}
			/**
			* Clear all history
			*/
			function clear() {
				undoStack = [];
				redoStack = [];
				updateButtons();
				console.log("🗑️ Undo/Redo history cleared");
			}
			/**
			* Get history info
			* @returns {Object} History information
			*/
			function getInfo() {
				return {
					undoStackSize: undoStack.length,
					redoStackSize: redoStack.length,
					maxHistory: MAX_HISTORY,
					canUndo: undoStack.length > 0,
					canRedo: redoStack.length > 0
				};
			}
			/**
			* Check if currently restoring (to prevent loops)
			* @returns {boolean}
			*/
			function isRestoringState() {
				return isRestoring;
			}
			return {
				saveState,
				undo,
				redo,
				clear,
				getInfo,
				isRestoringState,
				updateButtons
			};
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = UndoManager;
		else if (typeof window !== "undefined") window.undoManager = UndoManager;
	}));
	//#endregion
	//#region common/editor-tools.js
	var require_editor_tools = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var EditorTools = (() => {
			let isDrawing = false;
			let lastX = 0;
			let lastY = 0;
			let cropSelection = null;
			const drawSettings = {
				brushSize: 5,
				color: "#000000",
				opacity: 1,
				hardness: .8
			};
			const textSettings = {
				font: "Arial",
				size: 32,
				color: "#000000",
				bold: false,
				italic: false,
				rotation: 0
			};
			/**
			* Crop Tool - Allows user to select and crop area
			*/
			const CropTool = {
				name: "crop",
				/**
				* Initialize crop tool with aspect ratio options
				* @param {HTMLCanvasElement} canvas
				* @param {string} aspectRatio - '1:1', '16:9', '4:5', 'custom'
				*/
				init(canvas, aspectRatio = "custom") {
					console.log("🔲 Crop tool initialized:", aspectRatio);
					cropSelection = {
						x: canvas.width * .1,
						y: canvas.height * .1,
						width: canvas.width * .8,
						height: canvas.height * .8,
						aspectRatio
					};
					if (aspectRatio !== "custom") {
						const ratio = this.getAspectRatioValue(aspectRatio);
						cropSelection.height = cropSelection.width / ratio;
						if (cropSelection.height > canvas.height * .8) {
							cropSelection.height = canvas.height * .8;
							cropSelection.width = cropSelection.height * ratio;
						}
					}
					return cropSelection;
				},
				getAspectRatioValue(aspectRatio) {
					return {
						"1:1": 1,
						"16:9": 16 / 9,
						"4:5": 4 / 5,
						"9:16": 9 / 16,
						"5:4": 5 / 4
					}[aspectRatio] || null;
				},
				/**
				* Draw crop overlay
				* @param {CanvasRenderingContext2D} ctx
				*/
				drawOverlay(ctx) {
					if (!cropSelection) return;
					const canvas = ctx.canvas;
					ctx.save();
					ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
					ctx.fillRect(0, 0, canvas.width, cropSelection.y);
					ctx.fillRect(0, cropSelection.y, cropSelection.x, cropSelection.height);
					ctx.fillRect(cropSelection.x + cropSelection.width, cropSelection.y, canvas.width - cropSelection.x - cropSelection.width, cropSelection.height);
					ctx.fillRect(0, cropSelection.y + cropSelection.height, canvas.width, canvas.height - cropSelection.y - cropSelection.height);
					ctx.strokeStyle = "#00b3ff";
					ctx.lineWidth = 2;
					ctx.setLineDash([6, 4]);
					ctx.strokeRect(cropSelection.x, cropSelection.y, cropSelection.width, cropSelection.height);
					ctx.setLineDash([]);
					const handleSize = 10;
					ctx.fillStyle = "#00b3ff";
					ctx.fillRect(cropSelection.x - handleSize / 2, cropSelection.y - handleSize / 2, handleSize, handleSize);
					ctx.fillRect(cropSelection.x + cropSelection.width - handleSize / 2, cropSelection.y - handleSize / 2, handleSize, handleSize);
					ctx.fillRect(cropSelection.x - handleSize / 2, cropSelection.y + cropSelection.height - handleSize / 2, handleSize, handleSize);
					ctx.fillRect(cropSelection.x + cropSelection.width - handleSize / 2, cropSelection.y + cropSelection.height - handleSize / 2, handleSize, handleSize);
					ctx.restore();
				},
				/**
				* Apply crop
				* @param {HTMLCanvasElement} canvas
				* @param {Image} baseImg
				* @returns {Image} Cropped image
				*/
				async apply(canvas, baseImg) {
					if (!cropSelection) return baseImg;
					const tempCanvas = document.createElement("canvas");
					const tempCtx = tempCanvas.getContext("2d");
					const scaleX = baseImg.width / canvas.width;
					const scaleY = baseImg.height / canvas.height;
					const sourceX = cropSelection.x * scaleX;
					const sourceY = cropSelection.y * scaleY;
					const sourceWidth = cropSelection.width * scaleX;
					const sourceHeight = cropSelection.height * scaleY;
					tempCanvas.width = sourceWidth;
					tempCanvas.height = sourceHeight;
					tempCtx.drawImage(baseImg, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
					const croppedImg = new Image();
					await new Promise((resolve) => {
						croppedImg.onload = resolve;
						croppedImg.src = tempCanvas.toDataURL();
					});
					cropSelection = null;
					return croppedImg;
				}
			};
			/**
			* Rotate & Flip Tool
			*/
			const RotateTool = {
				name: "rotate",
				/**
				* Rotate image by degrees
				* @param {HTMLCanvasElement} canvas
				* @param {Image} baseImg
				* @param {number} degrees - 90, 180, 270, or custom
				* @returns {Image} Rotated image
				*/
				async rotate(canvas, baseImg, degrees) {
					const tempCanvas = document.createElement("canvas");
					const tempCtx = tempCanvas.getContext("2d");
					const radians = degrees * Math.PI / 180;
					if (degrees === 90 || degrees === 270) {
						tempCanvas.width = baseImg.height;
						tempCanvas.height = baseImg.width;
					} else {
						tempCanvas.width = baseImg.width;
						tempCanvas.height = baseImg.height;
					}
					tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
					tempCtx.rotate(radians);
					tempCtx.drawImage(baseImg, -baseImg.width / 2, -baseImg.height / 2);
					const rotatedImg = new Image();
					await new Promise((resolve) => {
						rotatedImg.onload = resolve;
						rotatedImg.src = tempCanvas.toDataURL();
					});
					return rotatedImg;
				},
				/**
				* Flip image horizontally
				*/
				async flipHorizontal(canvas, baseImg) {
					const tempCanvas = document.createElement("canvas");
					const tempCtx = tempCanvas.getContext("2d");
					tempCanvas.width = baseImg.width;
					tempCanvas.height = baseImg.height;
					tempCtx.translate(tempCanvas.width, 0);
					tempCtx.scale(-1, 1);
					tempCtx.drawImage(baseImg, 0, 0);
					const flippedImg = new Image();
					await new Promise((resolve) => {
						flippedImg.onload = resolve;
						flippedImg.src = tempCanvas.toDataURL();
					});
					return flippedImg;
				},
				/**
				* Flip image vertically
				*/
				async flipVertical(canvas, baseImg) {
					const tempCanvas = document.createElement("canvas");
					const tempCtx = tempCanvas.getContext("2d");
					tempCanvas.width = baseImg.width;
					tempCanvas.height = baseImg.height;
					tempCtx.translate(0, tempCanvas.height);
					tempCtx.scale(1, -1);
					tempCtx.drawImage(baseImg, 0, 0);
					const flippedImg = new Image();
					await new Promise((resolve) => {
						flippedImg.onload = resolve;
						flippedImg.src = tempCanvas.toDataURL();
					});
					return flippedImg;
				}
			};
			/**
			* Draw/Brush Tool
			*/
			const DrawTool = {
				name: "draw",
				init(settings = {}) {
					Object.assign(drawSettings, settings);
				},
				startDrawing(ctx, x, y) {
					isDrawing = true;
					lastX = x;
					lastY = y;
				},
				draw(ctx, x, y) {
					if (!isDrawing) return;
					ctx.save();
					ctx.strokeStyle = drawSettings.color;
					ctx.lineWidth = drawSettings.brushSize;
					ctx.lineCap = "round";
					ctx.lineJoin = "round";
					ctx.globalAlpha = drawSettings.opacity;
					ctx.beginPath();
					ctx.moveTo(lastX, lastY);
					ctx.lineTo(x, y);
					ctx.stroke();
					ctx.restore();
					lastX = x;
					lastY = y;
				},
				stopDrawing() {
					isDrawing = false;
				}
			};
			/**
			* Eraser Tool
			*/
			const EraserTool = {
				name: "eraser",
				size: 20,
				init(size = 20) {
					this.size = size;
				},
				startErasing(ctx, x, y) {
					isDrawing = true;
					lastX = x;
					lastY = y;
				},
				erase(ctx, x, y) {
					if (!isDrawing) return;
					ctx.save();
					ctx.globalCompositeOperation = "destination-out";
					ctx.strokeStyle = "rgba(0,0,0,1)";
					ctx.lineWidth = this.size;
					ctx.lineCap = "round";
					ctx.lineJoin = "round";
					ctx.beginPath();
					ctx.moveTo(lastX, lastY);
					ctx.lineTo(x, y);
					ctx.stroke();
					ctx.restore();
					lastX = x;
					lastY = y;
				},
				stopErasing() {
					isDrawing = false;
				}
			};
			/**
			* Text Tool
			*/
			const TextTool = {
				name: "text",
				init(settings = {}) {
					Object.assign(textSettings, settings);
				},
				/**
				* Add text to canvas
				* @param {CanvasRenderingContext2D} ctx
				* @param {string} text
				* @param {number} x
				* @param {number} y
				*/
				addText(ctx, text, x, y) {
					ctx.save();
					let fontStyle = "";
					if (textSettings.italic) fontStyle += "italic ";
					if (textSettings.bold) fontStyle += "bold ";
					ctx.font = `${fontStyle}${textSettings.size}px ${textSettings.font}`;
					ctx.fillStyle = textSettings.color;
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					if (textSettings.rotation !== 0) {
						ctx.translate(x, y);
						ctx.rotate(textSettings.rotation * Math.PI / 180);
						ctx.fillText(text, 0, 0);
					} else ctx.fillText(text, x, y);
					ctx.restore();
				}
			};
			/**
			* Shapes Tool
			*/
			const ShapesTool = {
				name: "shapes",
				/**
				* Draw rectangle
				*/
				drawRectangle(ctx, x, y, width, height, color, filled = false) {
					ctx.save();
					ctx.strokeStyle = color;
					ctx.fillStyle = color;
					ctx.lineWidth = 3;
					if (filled) ctx.fillRect(x, y, width, height);
					else ctx.strokeRect(x, y, width, height);
					ctx.restore();
				},
				/**
				* Draw circle
				*/
				drawCircle(ctx, x, y, radius, color, filled = false) {
					ctx.save();
					ctx.strokeStyle = color;
					ctx.fillStyle = color;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.arc(x, y, radius, 0, 2 * Math.PI);
					if (filled) ctx.fill();
					else ctx.stroke();
					ctx.restore();
				},
				/**
				* Draw arrow
				*/
				drawArrow(ctx, fromX, fromY, toX, toY, color) {
					const headlen = 15;
					const angle = Math.atan2(toY - fromY, toX - fromX);
					ctx.save();
					ctx.strokeStyle = color;
					ctx.fillStyle = color;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(fromX, fromY);
					ctx.lineTo(toX, toY);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(toX, toY);
					ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
					ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
					ctx.closePath();
					ctx.fill();
					ctx.restore();
				}
			};
			/**
			* Filters Tool
			*/
			const FiltersTool = {
				name: "filters",
				/**
				* Apply brightness filter
				*/
				brightness(ctx, canvas, value) {
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					for (let i = 0; i < data.length; i += 4) {
						data[i] = Math.min(255, Math.max(0, data[i] + value));
						data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
						data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
					}
					ctx.putImageData(imgData, 0, 0);
				},
				/**
				* Apply contrast filter
				*/
				contrast(ctx, canvas, value) {
					const factor = 259 * (value + 255) / (255 * (259 - value));
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					for (let i = 0; i < data.length; i += 4) {
						data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
						data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
						data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
					}
					ctx.putImageData(imgData, 0, 0);
				},
				/**
				* Apply saturation filter
				*/
				saturation(ctx, canvas, value) {
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					for (let i = 0; i < data.length; i += 4) {
						const gray = .2989 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
						data[i] = Math.min(255, Math.max(0, gray + value * (data[i] - gray)));
						data[i + 1] = Math.min(255, Math.max(0, gray + value * (data[i + 1] - gray)));
						data[i + 2] = Math.min(255, Math.max(0, gray + value * (data[i + 2] - gray)));
					}
					ctx.putImageData(imgData, 0, 0);
				},
				/**
				* Apply grayscale filter
				*/
				grayscale(ctx, canvas) {
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					for (let i = 0; i < data.length; i += 4) {
						const gray = .2989 * data[i] + .587 * data[i + 1] + .114 * data[i + 2];
						data[i] = gray;
						data[i + 1] = gray;
						data[i + 2] = gray;
					}
					ctx.putImageData(imgData, 0, 0);
				},
				/**
				* Apply sepia filter
				*/
				sepia(ctx, canvas) {
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					for (let i = 0; i < data.length; i += 4) {
						const r = data[i];
						const g = data[i + 1];
						const b = data[i + 2];
						data[i] = Math.min(255, r * .393 + g * .769 + b * .189);
						data[i + 1] = Math.min(255, r * .349 + g * .686 + b * .168);
						data[i + 2] = Math.min(255, r * .272 + g * .534 + b * .131);
					}
					ctx.putImageData(imgData, 0, 0);
				}
			};
			/**
			* Export Tool
			*/
			const ExportTool = {
				name: "export",
				/**
				* Export canvas as data URL
				* @param {HTMLCanvasElement} canvas
				* @param {string} format - 'png', 'jpeg', 'webp'
				* @param {number} quality - 0.0 to 1.0 for lossy formats
				* @returns {string} Data URL
				*/
				toDataURL(canvas, format = "png", quality = .95) {
					const mimeType = `image/${format}`;
					if (format === "png") return canvas.toDataURL(mimeType);
					else return canvas.toDataURL(mimeType, quality);
				},
				/**
				* Download canvas as file
				* @param {HTMLCanvasElement} canvas
				* @param {string} filename
				* @param {string} format
				* @param {number} quality
				*/
				download(canvas, filename, format = "png", quality = .95) {
					const dataURL = this.toDataURL(canvas, format, quality);
					const link = document.createElement("a");
					link.download = `${filename}.${format}`;
					link.href = dataURL;
					link.click();
				},
				/**
				* Copy canvas to clipboard
				* @param {HTMLCanvasElement} canvas
				* @returns {Promise<boolean>}
				*/
				async copyToClipboard(canvas) {
					try {
						const blob = await new Promise((resolve) => canvas.toBlob(resolve));
						await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
						return true;
					} catch (error) {
						console.error("Copy to clipboard failed:", error);
						return false;
					}
				}
			};
			/**
			* Blur & Sharpen Tool
			*/
			const BlurSharpenTool = {
				name: "blur-sharpen",
				/**
				* Apply Gaussian blur
				* @param {CanvasRenderingContext2D} ctx
				* @param {HTMLCanvasElement} canvas
				* @param {number} radius - Blur radius (0-20)
				*/
				blur(ctx, canvas, radius) {
					if (radius <= 0) return;
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					const width = canvas.width;
					const height = canvas.height;
					const iterations = Math.ceil(radius / 2);
					for (let iter = 0; iter < iterations; iter++) {
						for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
							let r = 0, g = 0, b = 0, a = 0, count = 0;
							const blurRadius = Math.min(radius, Math.min(x, width - x - 1));
							for (let dx = -blurRadius; dx <= blurRadius; dx++) {
								const idx = (y * width + (x + dx)) * 4;
								r += data[idx];
								g += data[idx + 1];
								b += data[idx + 2];
								a += data[idx + 3];
								count++;
							}
							const idx = (y * width + x) * 4;
							data[idx] = r / count;
							data[idx + 1] = g / count;
							data[idx + 2] = b / count;
							data[idx + 3] = a / count;
						}
						for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) {
							let r = 0, g = 0, b = 0, a = 0, count = 0;
							const blurRadius = Math.min(radius, Math.min(y, height - y - 1));
							for (let dy = -blurRadius; dy <= blurRadius; dy++) {
								const idx = ((y + dy) * width + x) * 4;
								r += data[idx];
								g += data[idx + 1];
								b += data[idx + 2];
								a += data[idx + 3];
								count++;
							}
							const idx = (y * width + x) * 4;
							data[idx] = r / count;
							data[idx + 1] = g / count;
							data[idx + 2] = b / count;
							data[idx + 3] = a / count;
						}
					}
					ctx.putImageData(imgData, 0, 0);
				},
				/**
				* Apply sharpen filter
				* @param {CanvasRenderingContext2D} ctx
				* @param {HTMLCanvasElement} canvas
				* @param {number} strength - Sharpen strength (0-100)
				*/
				sharpen(ctx, canvas, strength) {
					if (strength <= 0) return;
					const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
					const data = imgData.data;
					const width = canvas.width;
					const height = canvas.height;
					const factor = strength / 100;
					const kernel = [
						0,
						-factor,
						0,
						-factor,
						1 + 4 * factor,
						-factor,
						0,
						-factor,
						0
					];
					const tempData = new Uint8ClampedArray(data);
					for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
						let r = 0, g = 0, b = 0;
						for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
							const idx = ((y + ky) * width + (x + kx)) * 4;
							const k = kernel[(ky + 1) * 3 + (kx + 1)];
							r += tempData[idx] * k;
							g += tempData[idx + 1] * k;
							b += tempData[idx + 2] * k;
						}
						const idx = (y * width + x) * 4;
						data[idx] = Math.min(255, Math.max(0, r));
						data[idx + 1] = Math.min(255, Math.max(0, g));
						data[idx + 2] = Math.min(255, Math.max(0, b));
					}
					ctx.putImageData(imgData, 0, 0);
				}
			};
			return {
				CropTool,
				RotateTool,
				DrawTool,
				EraserTool,
				TextTool,
				ShapesTool,
				FiltersTool,
				BlurSharpenTool,
				ColorAdjustTool: {
					name: "color-adjust",
					/**
					* Adjust HSL (Hue, Saturation, Lightness)
					* @param {CanvasRenderingContext2D} ctx
					* @param {HTMLCanvasElement} canvas
					* @param {number} hue - Hue shift (-180 to 180)
					* @param {number} saturation - Saturation adjustment (-100 to 100)
					* @param {number} lightness - Lightness adjustment (-100 to 100)
					*/
					adjustHSL(ctx, canvas, hue, saturation, lightness) {
						const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const data = imgData.data;
						const satFactor = (saturation + 100) / 100;
						const lightFactor = lightness / 100;
						for (let i = 0; i < data.length; i += 4) {
							let r = data[i] / 255;
							let g = data[i + 1] / 255;
							let b = data[i + 2] / 255;
							const max = Math.max(r, g, b);
							const min = Math.min(r, g, b);
							let h, s, l = (max + min) / 2;
							if (max === min) h = s = 0;
							else {
								const d = max - min;
								s = l > .5 ? d / (2 - max - min) : d / (max + min);
								switch (max) {
									case r:
										h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
										break;
									case g:
										h = ((b - r) / d + 2) / 6;
										break;
									case b:
										h = ((r - g) / d + 4) / 6;
										break;
								}
							}
							h = (h + hue / 360) % 1;
							s = Math.min(1, Math.max(0, s * satFactor));
							l = Math.min(1, Math.max(0, l + lightFactor));
							if (s === 0) r = g = b = l;
							else {
								const hue2rgb = (p, q, t) => {
									if (t < 0) t += 1;
									if (t > 1) t -= 1;
									if (t < 1 / 6) return p + (q - p) * 6 * t;
									if (t < 1 / 2) return q;
									if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
									return p;
								};
								const q = l < .5 ? l * (1 + s) : l + s - l * s;
								const p = 2 * l - q;
								r = hue2rgb(p, q, h + 1 / 3);
								g = hue2rgb(p, q, h);
								b = hue2rgb(p, q, h - 1 / 3);
							}
							data[i] = Math.round(r * 255);
							data[i + 1] = Math.round(g * 255);
							data[i + 2] = Math.round(b * 255);
						}
						ctx.putImageData(imgData, 0, 0);
					},
					/**
					* Adjust color temperature
					* @param {CanvasRenderingContext2D} ctx
					* @param {HTMLCanvasElement} canvas
					* @param {number} temperature - Temperature in Kelvin (2000-8000, 5500 is neutral)
					*/
					adjustTemperature(ctx, canvas, temperature) {
						const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const data = imgData.data;
						const temp = temperature / 100;
						let r, g, b;
						if (temp <= 66) {
							r = 255;
							g = temp;
							g = 99.4708025861 * Math.log(g) - 161.1195681661;
							if (temp < 19) b = 0;
							else {
								b = temp - 10;
								b = 138.5177312231 * Math.log(b) - 305.0447927307;
							}
						} else {
							r = temp - 60;
							r = 329.698727446 * Math.pow(r, -.1332047592);
							g = temp - 60;
							g = 288.1221695283 * Math.pow(g, -.0755148492);
							b = 255;
						}
						r = Math.min(255, Math.max(0, r));
						g = Math.min(255, Math.max(0, g));
						b = Math.min(255, Math.max(0, b));
						const rFactor = r / 255;
						const gFactor = g / 255;
						const bFactor = b / 255;
						for (let i = 0; i < data.length; i += 4) {
							data[i] = Math.min(255, data[i] * rFactor);
							data[i + 1] = Math.min(255, data[i + 1] * gFactor);
							data[i + 2] = Math.min(255, data[i + 2] * bFactor);
						}
						ctx.putImageData(imgData, 0, 0);
					},
					/**
					* Adjust color balance (RGB channels)
					* @param {CanvasRenderingContext2D} ctx
					* @param {HTMLCanvasElement} canvas
					* @param {number} red - Red adjustment (-100 to 100)
					* @param {number} green - Green adjustment (-100 to 100)
					* @param {number} blue - Blue adjustment (-100 to 100)
					*/
					adjustColorBalance(ctx, canvas, red, green, blue) {
						const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const data = imgData.data;
						const rFactor = (red + 100) / 100;
						const gFactor = (green + 100) / 100;
						const bFactor = (blue + 100) / 100;
						for (let i = 0; i < data.length; i += 4) {
							data[i] = Math.min(255, Math.max(0, data[i] * rFactor));
							data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * gFactor));
							data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bFactor));
						}
						ctx.putImageData(imgData, 0, 0);
					}
				},
				AdvancedFiltersTool: {
					name: "advanced-filters",
					/**
					* Apply vignette effect
					* @param {CanvasRenderingContext2D} ctx
					* @param {HTMLCanvasElement} canvas
					* @param {number} intensity - Vignette intensity (0-100)
					*/
					vignette(ctx, canvas, intensity) {
						const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
						const data = imgData.data;
						const width = canvas.width;
						const height = canvas.height;
						const centerX = width / 2;
						const centerY = height / 2;
						const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
						const factor = intensity / 100;
						for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
							const vignette = 1 - Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / maxDist * factor;
							const idx = (y * width + x) * 4;
							data[idx] = Math.max(0, Math.min(255, data[idx] * vignette));
							data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] * vignette));
							data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] * vignette));
						}
						ctx.putImageData(imgData, 0, 0);
					},
					/**
					* Apply noise reduction (simple blur-based)
					* @param {CanvasRenderingContext2D} ctx
					* @param {HTMLCanvasElement} canvas
					* @param {number} strength - Noise reduction strength (0-100)
					*/
					noiseReduction(ctx, canvas, strength) {
						if (strength <= 0) return;
						BlurSharpenTool.blur(ctx, canvas, strength / 10);
					}
				},
				ExportTool
			};
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = EditorTools;
		else if (typeof window !== "undefined") window.editorTools = EditorTools;
	}));
	//#endregion
	//#region common/image-renderer.js
	var require_image_renderer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
		var ImageRenderer = (() => {
			"use strict";
			const CONFIG = {
				BATCH_SIZE: 2,
				BATCH_DELAY: 50,
				STAGGER_DELAY: 80,
				FADE_DURATION: 300,
				SKELETON_MIN_TIME: 150,
				INTERSECTION_THRESHOLD: .1,
				INTERSECTION_MARGIN: "50px"
			};
			const PERFORMANCE_STYLES = `
    /* Base container - uses contain for paint isolation */
    .ss-gallery-container {
      contain: layout style;
    }

    /* Skeleton placeholder */
    .ss-image-skeleton {
      position: relative;
      width: 140px;
      height: 120px;
      background: #f0f4f8;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      margin: 5px;
      display: inline-block;
      vertical-align: top;
      border: 1px solid #dbe4ee;
    }

    /* Image container */
    .ss-image-item {
      position: relative;
      display: inline-block;
      margin: 5px;
      vertical-align: top;
      border-radius: 6px;
      overflow: hidden;
      opacity: 1;
      transform: none;
      contain: layout paint style;
    }

    .ss-image-item.ss-visible {
      opacity: 1;
      transform: none;
    }

    .ss-image-item.ss-instant {
      opacity: 1;
      transform: none;
    }

    /* Image element */
    .ss-image-item img {
      display: block;
      width: 140px;
      height: 100px;
      object-fit: contain;
      background: #fafafa;
      border-radius: 4px;
    }

    /* Overlay elements */
    .ss-image-overlay {
      position: absolute;
      inset: 0;
      opacity: 1;
      pointer-events: auto;
    }

    /* Button overlays */
    .ss-overlay-btn {
      position: absolute;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }

    .ss-overlay-btn:hover {
      background: rgba(0, 0, 0, 0.9);
    }

    .ss-overlay-btn.ss-delete {
      top: 5px;
      right: 5px;
      background: rgba(239, 68, 68, 0.9);
    }

    .ss-overlay-btn.ss-delete:hover {
      background: rgba(220, 38, 38, 1);
    }

    .ss-overlay-btn.ss-edit {
      top: 5px;
      left: 5px;
    }

    /* Metadata overlay */
    .ss-image-meta {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 4px 6px;
      font-size: 10px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Loading state indicator */
    .ss-gallery-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #64748b;
      font-size: 13px;
    }

    .ss-gallery-loading::before {
      content: '•';
      width: auto;
      height: auto;
      border: 0;
      margin-right: 8px;
    }
  `;
			let stylesInjected = false;
			function injectStyles() {
				if (stylesInjected) return;
				if (document.getElementById("ss-perf-image-styles")) {
					stylesInjected = true;
					return;
				}
				const styleEl = document.createElement("style");
				styleEl.id = "ss-perf-image-styles";
				styleEl.textContent = PERFORMANCE_STYLES;
				document.head.appendChild(styleEl);
				stylesInjected = true;
			}
			let observer = null;
			function getIntersectionObserver() {
				if (observer) return observer;
				observer = new IntersectionObserver((entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const el = entry.target;
							requestAnimationFrame(() => {
								el.classList.add("ss-visible");
							});
							observer.unobserve(el);
						}
					});
				}, {
					threshold: CONFIG.INTERSECTION_THRESHOLD,
					rootMargin: CONFIG.INTERSECTION_MARGIN
				});
				return observer;
			}
			function createSkeletons(container, count) {
				const fragment = document.createDocumentFragment();
				const skeletons = [];
				for (let i = 0; i < count; i++) {
					const skeleton = document.createElement("div");
					skeleton.className = "ss-image-skeleton";
					skeleton.dataset.index = i;
					fragment.appendChild(skeleton);
					skeletons.push(skeleton);
				}
				container.appendChild(fragment);
				return skeletons;
			}
			function createImageItem(imageUrl, index, options = {}) {
				const { onDelete, onEdit, metadata } = options;
				const container = document.createElement("div");
				container.className = "ss-image-item product-image-container scifi-image-container";
				container.dataset.imageIndex = index;
				const img = document.createElement("img");
				img.src = imageUrl;
				img.alt = `Product image ${index + 1}`;
				img.title = `Product Image ${index + 1}`;
				img.loading = "lazy";
				img.decoding = "async";
				img.className = "product-image-1600";
				container.appendChild(img);
				const overlay = document.createElement("div");
				overlay.className = "ss-image-overlay";
				if (onDelete) {
					const deleteBtn = document.createElement("button");
					deleteBtn.className = "ss-overlay-btn ss-delete image-delete-btn";
					deleteBtn.innerHTML = "×";
					deleteBtn.addEventListener("click", (e) => {
						e.stopPropagation();
						onDelete(index, container, imageUrl);
					});
					overlay.appendChild(deleteBtn);
				}
				if (onEdit) {
					const editBtn = document.createElement("button");
					editBtn.className = "ss-overlay-btn ss-edit image-edit-btn";
					editBtn.textContent = "✎";
					editBtn.addEventListener("click", (e) => {
						e.stopPropagation();
						onEdit(index, imageUrl);
					});
					overlay.appendChild(editBtn);
				}
				container.appendChild(overlay);
				if (metadata !== false) {
					const meta = document.createElement("div");
					meta.className = "ss-image-meta product-image-metadata";
					meta.textContent = metadata || `Image ${index + 1} | 1600x1600`;
					container.appendChild(meta);
				}
				return container;
			}
			async function renderProgressively(container, items, createItemFn, options = {}) {
				const { batchSize = CONFIG.BATCH_SIZE, batchDelay = CONFIG.BATCH_DELAY, staggerDelay = CONFIG.STAGGER_DELAY, showSkeletons = true, onProgress, onComplete } = options;
				injectStyles();
				container.classList.add("ss-gallery-container");
				let skeletons = [];
				if (showSkeletons && items.length > 0) skeletons = createSkeletons(container, Math.min(items.length, 8));
				const io = getIntersectionObserver();
				let rendered = 0;
				for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
					const batchEnd = Math.min(batchStart + batchSize, items.length);
					const batchItems = items.slice(batchStart, batchEnd);
					if (batchStart > 0) await new Promise((resolve) => {
						requestAnimationFrame(() => {
							setTimeout(resolve, batchDelay);
						});
					});
					const fragment = document.createDocumentFragment();
					for (let i = 0; i < batchItems.length; i++) {
						const globalIndex = batchStart + i;
						const item = batchItems[i];
						let element;
						try {
							element = await createItemFn(item, globalIndex);
						} catch (err) {
							console.error(`[ImageRenderer] Failed to create item ${globalIndex}:`, err);
							continue;
						}
						if (!element) continue;
						element.style.setProperty("--stagger-delay", `${i * staggerDelay}ms`);
						fragment.appendChild(element);
						if (skeletons[globalIndex]) skeletons[globalIndex].remove();
						rendered++;
					}
					container.appendChild(fragment);
					container.querySelectorAll(".ss-image-item:not(.ss-visible):not(.ss-observed)").forEach((el) => {
						el.classList.add("ss-observed");
						io.observe(el);
					});
					if (onProgress) onProgress(rendered, items.length);
				}
				skeletons.forEach((s) => s.remove());
				if (onComplete) onComplete(rendered);
				return rendered;
			}
			function displayImagesSimple(container, images, options = {}) {
				if (!container) return;
				injectStyles();
				if (!images || images.length === 0) {
					container.innerHTML = "<div class=\"gallery-empty\"><span>No images available</span></div>";
					return;
				}
				container.innerHTML = "";
				container.classList.add("ss-gallery-container");
				const io = getIntersectionObserver();
				const fragment = document.createDocumentFragment();
				images.forEach((url, index) => {
					const item = document.createElement("div");
					item.className = "ss-image-item gallery-item";
					item.style.setProperty("--stagger-delay", `${index * 50}ms`);
					const img = document.createElement("img");
					img.src = url;
					img.alt = `Product image ${index + 1}`;
					img.loading = "lazy";
					img.decoding = "async";
					item.appendChild(img);
					fragment.appendChild(item);
				});
				container.appendChild(fragment);
				requestAnimationFrame(() => {
					container.querySelectorAll(".ss-image-item").forEach((el) => {
						io.observe(el);
					});
				});
			}
			async function renderProcessedImages(galleryContainer, allImages, options = {}) {
				const { processImage, onDelete, onEdit, getMetadata, onProgress, onComplete, batchSize = CONFIG.BATCH_SIZE } = options;
				if (!galleryContainer) return 0;
				injectStyles();
				galleryContainer.classList.add("ss-gallery-container");
				const loadingIndicator = galleryContainer.querySelector("#image-loading-indicator, .scifi-loading-container");
				if (loadingIndicator) loadingIndicator.remove();
				const galleryEmpty = galleryContainer.querySelector(".gallery-empty");
				if (galleryEmpty) galleryEmpty.remove();
				if (!allImages || allImages.length === 0) {
					const placeholder = document.createElement("div");
					placeholder.className = "gallery-empty";
					placeholder.textContent = "No high-quality product images found.";
					placeholder.style.cssText = "padding:20px;text-align:center;color:#666;";
					galleryContainer.appendChild(placeholder);
					return 0;
				}
				console.log(`[ImageRenderer] Processing ${allImages.length} images progressively`);
				const skeletons = createSkeletons(galleryContainer, Math.min(allImages.length, 6));
				const io = getIntersectionObserver();
				let rendered = 0;
				let processingQueue = [...allImages.map((img, i) => ({
					img,
					index: i
				}))];
				while (processingQueue.length > 0) {
					const batch = processingQueue.splice(0, batchSize);
					const batchResults = await Promise.allSettled(batch.map(async ({ img, index }) => {
						const imageInfo = typeof img === "string" ? { url: img } : img;
						let processedUrl = imageInfo.url;
						if (processImage) try {
							processedUrl = await processImage(imageInfo.url, index);
						} catch (err) {
							console.warn(`[ImageRenderer] Process failed for image ${index}:`, err);
							processedUrl = imageInfo.url;
						}
						return {
							imageInfo,
							processedUrl,
							index
						};
					}));
					const fragment = document.createDocumentFragment();
					for (const result of batchResults) {
						if (result.status === "rejected") continue;
						const { imageInfo, processedUrl, index } = result.value;
						const element = createImageItem(processedUrl, index, {
							onDelete,
							onEdit,
							metadata: getMetadata ? getMetadata(imageInfo, index) : `Image ${index + 1} | 1600x1600`
						});
						element.style.setProperty("--stagger-delay", `${rendered % batchSize * CONFIG.STAGGER_DELAY}ms`);
						fragment.appendChild(element);
						if (skeletons[index]) skeletons[index].remove();
						rendered++;
					}
					galleryContainer.appendChild(fragment);
					requestAnimationFrame(() => {
						galleryContainer.querySelectorAll(".ss-image-item:not(.ss-observed)").forEach((el) => {
							el.classList.add("ss-observed");
							io.observe(el);
						});
					});
					if (onProgress) onProgress(rendered, allImages.length);
					if (processingQueue.length > 0) await new Promise((resolve) => {
						requestAnimationFrame(() => setTimeout(resolve, CONFIG.BATCH_DELAY));
					});
				}
				skeletons.forEach((s) => s.remove());
				console.log(`[ImageRenderer] Completed: ${rendered} images rendered`);
				if (onComplete) onComplete(rendered);
				return rendered;
			}
			return Object.freeze({
				injectStyles,
				createSkeletons,
				createImageItem,
				renderProgressively,
				displayImagesSimple,
				renderProcessedImages,
				CONFIG
			});
		})();
		if (typeof module !== "undefined" && module.exports) module.exports = ImageRenderer;
		if (typeof self !== "undefined") self.ImageRenderer = ImageRenderer;
		if (typeof window !== "undefined") window.ImageRenderer = ImageRenderer;
	}));
	require_performance();
	require_storage();
	require_ui();
	require_analytics();
	require_undo_manager();
	require_editor_tools();
	require_image_renderer();
	//#endregion
	//#region common/images/core/image-schema.js
	var ImageSource = Object.freeze({
		HYDRATION: "hydration",
		DYNAMIC_ATTR: "dynamic-attr",
		SCRIPT: "script",
		THUMBNAIL: "thumbnail",
		MODAL: "modal"
	});
	var ImageRole = Object.freeze({
		MAIN: "main",
		GALLERY: "gallery",
		VARIATION: "variation"
	});
	var SOURCE_CONFIDENCE = {
		[ImageSource.HYDRATION]: .95,
		[ImageSource.DYNAMIC_ATTR]: .85,
		[ImageSource.SCRIPT]: .75,
		[ImageSource.THUMBNAIL]: .6,
		[ImageSource.MODAL]: .4
	};
	function createExtractedImage({ id = "", url = "", variants = {}, source = ImageSource.THUMBNAIL, confidence = null, role = ImageRole.GALLERY, variantKey = null, width = 0, height = 0, alt = "Product Image" } = {}) {
		return {
			id,
			url,
			variants,
			source,
			confidence: confidence ?? SOURCE_CONFIDENCE[source] ?? .5,
			role,
			variantKey,
			width,
			height,
			alt
		};
	}
	function createProductImageResult(marketplace, productId, images) {
		return {
			marketplace,
			productId,
			images
		};
	}
	if (typeof window !== "undefined") window.SSImageSchema = {
		ImageSource,
		ImageRole,
		SOURCE_CONFIDENCE,
		createExtractedImage,
		createProductImageResult
	};
	var RULES = {
		amazon: {
			cdnDomains: [
				"m.media-amazon.com",
				"images-na.ssl-images-amazon.com",
				"images-eu.ssl-images-amazon.com",
				"images-fe.ssl-images-amazon.com"
			],
			normalize(url) {
				if (!url || typeof url !== "string") return url;
				const baseMatch = url.match(/^(https?:\/\/[^/]+\/images\/I\/[A-Za-z0-9._+%-]+?)\._[^.]*\.(jpg|jpeg|png|webp)$/i);
				if (baseMatch) return `${baseMatch[1]}._AC_SL3000_.${baseMatch[2]}`;
				let out = url.replace(/\._AC_S[XLYS]\d+_|\._AC_U[SXYL]\d+_|\._S[SXYL]\d+_|\._U[SXYL]\d+_|\._CR[\d,]+_|\._SL\d+_/gi, "._AC_SL3000_");
				if (!out.includes("_SL3000_") && !out.includes("._")) out = out.replace(/\.(jpg|jpeg|png|webp)$/i, "._AC_SL3000_.$1");
				return out;
			},
			baseId(url) {
				if (!url) return url;
				const m = url.match(/\/images\/I\/([A-Za-z0-9._+%-]+?)(?:\._|\.(?:jpg|jpeg|png|webp))/i);
				return m ? m[1] : url;
			}
		},
		walmart: {
			cdnDomains: ["i5.walmartimages.com", "i8.walmartimages.com"],
			normalize(url) {
				if (!url || typeof url !== "string") return url;
				let out = url;
				out = out.replace(/odnWidth=\d+/g, "odnWidth=1200");
				out = out.replace(/odnHeight=\d+/g, "odnHeight=1200");
				out = out.replace(/odnBg=[^&]+/g, "odnBg=ffffff");
				out = out.replace(/_\d{2,3}x\d{2,3}\./g, "_1200x1200.");
				out = out.replace(/\/\d{2,3}x\d{2,3}\//g, "/1200x1200/");
				out = out.replace(/w_\d+/g, "w_1200");
				out = out.replace(/h_\d+/g, "h_1200");
				return out;
			},
			baseId(url) {
				if (!url) return url;
				const m = url.match(/\/([A-Za-z0-9_-]{20,})\/?(?:\.[a-z]+)?(?:\?|$)/i);
				return m ? m[1] : url;
			}
		}
	};
	function normalizeImage(image, marketplace) {
		const rules = RULES[marketplace];
		if (!rules) return image;
		return {
			...image,
			url: rules.normalize(image.url),
			variants: Object.fromEntries(Object.entries(image.variants || {}).map(([k, v]) => [k, rules.normalize(v)]))
		};
	}
	function getBaseId(url, marketplace) {
		return RULES[marketplace]?.baseId(url) || url;
	}
	if (typeof window !== "undefined") window.SSImageNormalizer = {
		normalizeImage,
		getBaseId,
		RULES
	};
	//#endregion
	//#region common/images/core/image-deduper.js
	function dedup(images) {
		const map = /* @__PURE__ */ new Map();
		for (const img of images) {
			const key = img.id || img.url;
			if (!key) continue;
			const existing = map.get(key);
			if (!existing) map.set(key, {
				...img,
				variants: { ...img.variants }
			});
			else {
				const merged = existing.confidence >= img.confidence ? existing : { ...img };
				merged.variants = {
					...existing.variants,
					...img.variants
				};
				if (!merged.variantKey && (existing.variantKey || img.variantKey)) merged.variantKey = existing.variantKey || img.variantKey;
				map.set(key, merged);
			}
		}
		return Array.from(map.values());
	}
	function assignIds(images, marketplace) {
		const { getBaseId } = window.SSImageNormalizer || {};
		if (!getBaseId) return images;
		return images.map((img) => ({
			...img,
			id: img.id || getBaseId(img.url, marketplace) || img.url
		}));
	}
	if (typeof window !== "undefined") window.SSImageDeduper = {
		dedup,
		assignIds
	};
	//#endregion
	//#region common/images/core/image-validator.js
	var AMAZON_CDN = [
		"m.media-amazon.com",
		"images-na.ssl-images-amazon.com",
		"images-eu.ssl-images-amazon.com",
		"images-fe.ssl-images-amazon.com"
	];
	var WALMART_CDN = [
		"i5.walmartimages.com",
		"i8.walmartimages.com",
		"walmartimages.com"
	];
	var EXCLUDE_PATTERNS = [
		"sprite",
		"icon",
		"logo",
		"banner",
		"transparent-pixel",
		"badge",
		"button",
		"nav",
		"header",
		"footer",
		"review",
		"avatar",
		"profile",
		"spacer",
		"loading",
		"placeholder",
		"video",
		"play-button",
		"play_icon",
		"play-icon",
		"360",
		"spin",
		"rotate",
		"swatch",
		"prime",
		"shipping",
		"delivery",
		"cart",
		"wishlist",
		"watermark",
		"tracking"
	];
	var IMAGE_EXTS = [
		".jpg",
		".jpeg",
		".png",
		".webp"
	];
	function isKnownCdn(url, marketplace) {
		return (marketplace === "amazon" ? AMAZON_CDN : WALMART_CDN).some((d) => url.includes(d));
	}
	function hasImageExtension(url) {
		const lower = url.toLowerCase().split("?")[0];
		return IMAGE_EXTS.some((ext) => lower.endsWith(ext)) || lower.includes("walmartimages");
	}
	function hasExcludePattern(url) {
		const lower = url.toLowerCase();
		return EXCLUDE_PATTERNS.some((p) => lower.includes(p));
	}
	function validateCheap(image, marketplace) {
		const url = image.url;
		if (!url || url.length < 20) return false;
		if (hasExcludePattern(url)) return false;
		if (!isKnownCdn(url, marketplace) && !hasImageExtension(url)) return false;
		if (marketplace === "amazon" && !url.includes("/images/I/")) return false;
		return true;
	}
	async function validateWithHead(url) {
		try {
			const res = await fetch(url, { method: "HEAD" });
			const ct = res.headers.get("content-type") || "";
			const cl = parseInt(res.headers.get("content-length") || "0", 10);
			return ct.startsWith("image/") && cl > 1e4;
		} catch {
			return null;
		}
	}
	async function filter(images, marketplace, { headThreshold = 0, maxHead = 5 } = {}) {
		const valid = [];
		let headCount = 0;
		for (const img of images) {
			if (!validateCheap(img, marketplace)) continue;
			if (img.confidence < headThreshold && headCount < maxHead) {
				headCount++;
				if (await validateWithHead(img.url) === false) continue;
			}
			valid.push(img);
		}
		return valid;
	}
	if (typeof window !== "undefined") window.SSImageValidator = {
		filter,
		validateCheap,
		validateWithHead
	};
	//#endregion
	//#region common/images/core/image-cache.js
	var CACHE_KEY_PREFIX = "ss_img_cache_";
	var CACHE_TTL_MS = 1800 * 1e3;
	function cacheKey(marketplace, productId) {
		return `${CACHE_KEY_PREFIX}${marketplace}:${productId}`;
	}
	async function get(marketplace, productId) {
		const key = cacheKey(marketplace, productId);
		return new Promise((resolve) => {
			chrome.storage.local.get([key], (result) => {
				const entry = result[key];
				if (!entry) return resolve(null);
				if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
					chrome.storage.local.remove(key);
					return resolve(null);
				}
				resolve(entry);
			});
		});
	}
	async function set(marketplace, productId, images, processedImages = null) {
		const key = cacheKey(marketplace, productId);
		const entry = {
			marketplace,
			productId,
			images,
			processedImages,
			cachedAt: Date.now()
		};
		return new Promise((resolve) => {
			chrome.storage.local.set({ [key]: entry }, resolve);
		});
	}
	async function clear(marketplace, productId) {
		return new Promise((resolve) => {
			chrome.storage.local.remove(cacheKey(marketplace, productId), resolve);
		});
	}
	async function setProcessed(marketplace, productId, imageId, dataUrl) {
		const entry = await get(marketplace, productId);
		if (!entry) return;
		const processed = entry.processedImages || {};
		processed[imageId] = dataUrl;
		await set(marketplace, productId, entry.images, processed);
	}
	async function getProcessed(marketplace, productId, imageId) {
		return (await get(marketplace, productId))?.processedImages?.[imageId] || null;
	}
	if (typeof window !== "undefined") window.SSImageCache = {
		get,
		set,
		clear,
		setProcessed,
		getProcessed
	};
	//#endregion
	//#region common/images/core/extraction-engine.js
	var ExtractionEngine = class {
		constructor() {
			this._schema = window.SSImageSchema;
			this._normalizer = window.SSImageNormalizer;
			this._deduper = window.SSImageDeduper;
			this._validator = window.SSImageValidator;
		}
		async extract(adapter, options = {}) {
			const { minConfidentImages = 1, maxModalFallback = true } = options;
			const marketplace = adapter.marketplace;
			const rawImages = [];
			const tiers = [
				{
					name: "hydration",
					fn: () => adapter.getHydrationImages(),
					earlyStop: true
				},
				{
					name: "dynamic-attr",
					fn: () => adapter.getDynamicAttrImages(),
					earlyStop: true
				},
				{
					name: "script",
					fn: () => adapter.getScriptImages(),
					earlyStop: false
				},
				{
					name: "thumbnail",
					fn: () => adapter.getThumbnailImages(),
					earlyStop: false
				},
				{
					name: "modal",
					fn: () => maxModalFallback && adapter.getModalImages?.(),
					earlyStop: false
				}
			];
			for (const tier of tiers) {
				let results;
				try {
					results = await tier.fn();
				} catch (err) {
					console.warn(`[ExtractionEngine:${marketplace}] Tier "${tier.name}" error:`, err?.message);
					continue;
				}
				if (!results || !results.length) continue;
				rawImages.push(...results);
				if (tier.earlyStop) {
					if (rawImages.filter((img) => img.confidence >= .85).length >= minConfidentImages) break;
				}
			}
			try {
				const varImages = await adapter.getVariationImages?.();
				if (varImages?.length) rawImages.push(...varImages);
			} catch (err) {
				console.warn(`[ExtractionEngine:${marketplace}] Variation images error:`, err?.message);
			}
			const normalized = rawImages.map((img) => this._normalizer.normalizeImage(img, marketplace));
			const withIds = this._deduper.assignIds(normalized, marketplace);
			const deduped = this._deduper.dedup(withIds);
			const valid = await this._validator.filter(deduped, marketplace);
			valid.sort((a, b) => {
				if (a.role === "main" && b.role !== "main") return -1;
				if (b.role === "main" && a.role !== "main") return 1;
				return b.confidence - a.confidence;
			});
			console.log(`[ExtractionEngine:${marketplace}] ${valid.length} images extracted`);
			return valid;
		}
	};
	if (typeof window !== "undefined") window.SSExtractionEngine = ExtractionEngine;
	//#endregion
	//#region common/images/adapters/walmart.image-adapter.js
	var WalmartImageAdapter = class {
		constructor() {
			this.marketplace = "walmart";
		}
		getProductId() {
			return window.location.pathname.match(/\/ip\/[^/]+\/(\d+)/)?.[1] || window.location.pathname.match(/\/(\d{8,12})(?:\/|$|\?)/)?.[1] || null;
		}
		async getHydrationImages() {
			const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
			const images = [];
			const nextDataEl = document.getElementById("__NEXT_DATA__");
			if (!nextDataEl) return images;
			let data;
			try {
				data = JSON.parse(nextDataEl.textContent);
			} catch {
				return images;
			}
			const product = this._dig(data, "props.pageProps.initialData.data.product", "props.pageProps.product", "props.initialData.data.product");
			if (!product) return images;
			const allImages = this._dig(product, "imageInfo.allImages", "imageInfo.images");
			if (Array.isArray(allImages)) {
				allImages.forEach((item, idx) => {
					const url = item.url || item.imageUrl || item.largeImage || item.zoomUrl;
					if (!url) return;
					images.push(createExtractedImage({
						url,
						source: ImageSource.HYDRATION,
						role: idx === 0 ? ImageRole.MAIN : ImageRole.GALLERY,
						alt: item.altText || "Product Image"
					}));
				});
				if (images.length) return images;
			}
			for (const field of [
				"primaryImage",
				"imageUrl",
				"largeImage",
				"heroImage"
			]) {
				const url = product[field];
				if (url && typeof url === "string") images.push(createExtractedImage({
					url,
					source: ImageSource.HYDRATION,
					role: ImageRole.MAIN
				}));
			}
			return images;
		}
		async getDynamicAttrImages() {
			const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
			const images = [];
			const ldScripts = document.querySelectorAll("script[type=\"application/ld+json\"]");
			for (const el of ldScripts) {
				let data;
				try {
					data = JSON.parse(el.textContent);
				} catch {
					continue;
				}
				const img = data.image;
				if (!img) continue;
				(Array.isArray(img) ? img : [img]).forEach((url, idx) => {
					const u = typeof url === "string" ? url : url?.url;
					if (!u) return;
					images.push(createExtractedImage({
						url: u,
						source: ImageSource.DYNAMIC_ATTR,
						role: idx === 0 ? ImageRole.MAIN : ImageRole.GALLERY
					}));
				});
			}
			return images;
		}
		async getScriptImages() {
			const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
			const images = [];
			const seen = /* @__PURE__ */ new Set();
			const patterns = [
				/"imageUrl"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
				/"url"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
				/"largeImage"\s*:\s*"([^"]+)"/g,
				/"heroImage"\s*:\s*"([^"]+)"/g,
				/"zoomImage"\s*:\s*"([^"]+)"/g
			];
			const scripts = document.querySelectorAll("script:not([src]):not([type=\"application/ld+json\"])");
			for (const el of scripts) {
				const text = el.textContent || "";
				if (!text.includes("walmartimages") && !text.includes("imageUrl")) continue;
				for (const pattern of patterns) {
					pattern.lastIndex = 0;
					let m;
					while ((m = pattern.exec(text)) !== null) {
						let url = m[1].replace(/\\u002F/g, "/").replace(/\\/g, "").replace(/&amp;/g, "&");
						if (!url.startsWith("http") || seen.has(url)) continue;
						seen.add(url);
						images.push(createExtractedImage({
							url,
							source: ImageSource.SCRIPT,
							role: ImageRole.GALLERY
						}));
					}
				}
			}
			return images;
		}
		async getThumbnailImages() {
			const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
			const images = [];
			const seen = /* @__PURE__ */ new Set();
			const imgs = (document.querySelector("[data-testid=\"image-gallery\"], .prod-hero-image-area, .prod-ProductImageCarousel") || document).querySelectorAll("[data-testid=\"hero-image\"] img, [data-testid=\"media-thumbnail\"] img, .prod-hero-image img");
			for (const img of imgs) {
				const url = img.dataset?.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.src;
				if (!url || !url.startsWith("http") || seen.has(url)) continue;
				seen.add(url);
				images.push(createExtractedImage({
					url,
					source: ImageSource.THUMBNAIL,
					role: ImageRole.GALLERY,
					alt: img.alt || "Product Image"
				}));
			}
			return images;
		}
		async getVariationImages() {
			return [];
		}
		async getModalImages() {
			return [];
		}
		_dig(obj, ...paths) {
			for (const path of paths) {
				let cur = obj;
				for (const key of path.split(".")) {
					if (cur == null) break;
					cur = cur[key];
				}
				if (cur != null) return cur;
			}
			return null;
		}
	};
	if (typeof window !== "undefined") window.WalmartImageAdapter = WalmartImageAdapter;
	//#endregion
	//#region content_scripts/walmart-variant-scraper.js
	window.SsWalmartVariantScraper = (() => {
		"use strict";
		function humanizeDimLabel(id) {
			let s = String(id || "").replace(/^actual_/, "").replace(/^clothing_/, "");
			s = s.replace(/_/g, " ").trim();
			return s.replace(/\b\w/g, (c) => c.toUpperCase()) || "Option";
		}
		function getProductJson(doc) {
			const el = (doc || document).getElementById("__NEXT_DATA__");
			if (!el || !el.textContent) return null;
			let root;
			try {
				root = JSON.parse(el.textContent);
			} catch (_) {
				return null;
			}
			return root?.props?.pageProps?.initialData?.data?.product || root?.props?.pageProps?.initialData?.product || root?.props?.pageProps?.product || null;
		}
		function parseProduct(p) {
			if (!p || typeof p !== "object") return null;
			const price = p.priceInfo?.currentPrice?.price ?? p.priceInfo?.unitPrice?.price ?? null;
			const images = Array.isArray(p.imageInfo?.allImages) ? p.imageInfo.allImages.map((i) => i?.url).filter(Boolean) : [];
			return {
				sourceId: p.usItemId || p.id || "",
				title: p.name || "",
				brand: p.brand || "",
				price: price != null ? String(price) : "",
				currency: p.priceInfo?.currentPrice?.currencyUnit || "USD",
				images,
				mainImage: images[0] || p.imageInfo?.thumbnailUrl || "",
				description: p.shortDescription || "",
				availabilityStatus: p.availabilityStatus || "",
				quantity: p.availabilityStatus === "OUT_OF_STOCK" ? 0 : 1
			};
		}
		/**
		* variantCriteria + variantsMap → universal variants array.
		*
		* variantCriteria: [{ id: 'actual_color', name?, variantList: [{ id: 'actual_color-Black',
		*   name: 'Black', images?: [url], products?: [usItemId], availabilityStatus? }] }]
		* variantsMap: { '<key>': { usItemId, variants: ['actual_color-Black', 'shoe_size-7'],
		*   priceInfo?: { currentPrice: { price } }, availabilityStatus?, productImageUrl? } }
		*/
		function parseVariants(p) {
			const criteria = Array.isArray(p?.variantCriteria) ? p.variantCriteria : [];
			const map = p?.variantsMap && typeof p.variantsMap === "object" ? p.variantsMap : {};
			const dims = {};
			for (const c of criteria) {
				if (!c || !c.id) continue;
				const label = humanizeDimLabel(c.name || c.id);
				const values = {};
				for (const v of c.variantList || []) {
					if (!v || !v.id) continue;
					values[v.id] = {
						name: v.name || String(v.id).split("-").slice(1).join("-"),
						image: Array.isArray(v.images) ? v.images[0] : null
					};
				}
				dims[c.id] = {
					label,
					values
				};
			}
			const parentPrice = parseProduct(p)?.price || "";
			const imgProp = (() => {
				const colorDim = Object.values(dims).find((d) => /colou?r/i.test(d.label));
				return colorDim ? colorDim.label : Object.values(dims)[0]?.label || null;
			})();
			const variants = [];
			for (const [key, entry] of Object.entries(map)) {
				if (!entry || typeof entry !== "object") continue;
				const attrs = {};
				let img = entry.productImageUrl || entry.imageInfo?.thumbnailUrl || null;
				for (const valueId of entry.variants || []) {
					const dim = dims[String(valueId).split("-")[0]];
					if (!dim) continue;
					const val = dim.values[valueId];
					const name = val?.name || String(valueId).split("-").slice(1).join("-");
					if (name) attrs[dim.label] = { productName: name };
					if (!img && val?.image) img = val.image;
				}
				if (Object.keys(attrs).length === 0) continue;
				const rawPrice = entry.priceInfo?.currentPrice?.price;
				variants.push({
					attrs,
					price: rawPrice != null ? String(rawPrice) : parentPrice,
					currency: entry.priceInfo?.currentPrice?.currencyUnit || "USD",
					quantity: entry.availabilityStatus === "OUT_OF_STOCK" ? 0 : 1,
					img,
					imgProp,
					supplierVariantId: entry.usItemId || key
				});
			}
			return variants;
		}
		function buildProduct(p, pageUrl) {
			const base = parseProduct(p);
			if (!base) return null;
			const variants = parseVariants(p);
			return {
				...base,
				url: pageUrl || "",
				supplier: "walmart",
				hasVariants: variants.length > 1,
				variants
			};
		}
		async function scrapeProductWithVariants() {
			const p = getProductJson(document);
			if (!p) throw new Error("Walmart __NEXT_DATA__ product JSON not found");
			const product = buildProduct(p, window.location.href);
			if (!product || !product.title) throw new Error("Walmart product parse failed");
			return product;
		}
		async function scrapeSingleProduct() {
			const product = await scrapeProductWithVariants();
			const selected = product.variants.find((v) => v.supplierVariantId === product.sourceId) || product.variants[0];
			return {
				...product,
				hasVariants: false,
				variants: selected ? [selected] : []
			};
		}
		return {
			scrapeProductWithVariants,
			scrapeSingleProduct,
			_internals: {
				humanizeDimLabel,
				getProductJson,
				parseProduct,
				parseVariants,
				buildProduct
			}
		};
	})();
	//#endregion
	//#region suppliers/core/supplier-adapter.js
	window.SSSupplierAdapter = (() => {
		"use strict";
		const REQUIRED_FIELDS = [
			"sourceId",
			"supplier",
			"title"
		];
		/**
		* Validate a normalized product has the minimum fields the universal pipeline
		* (productToDraft → adaptProduct) needs. Does NOT validate marketplace rules —
		* that is the MarketplaceAdapter's job.
		* @param {object} product normalized product
		* @returns {{ valid: boolean, errors: string[] }}
		*/
		function validate(product) {
			const errors = [];
			if (!product || typeof product !== "object") return {
				valid: false,
				errors: ["product is not an object"]
			};
			for (const key of REQUIRED_FIELDS) {
				const v = product[key];
				if (v === void 0 || v === null || v === "") errors.push(`missing ${key}`);
			}
			if (!Array.isArray(product.images)) errors.push("images must be an array");
			if (!Array.isArray(product.variants)) errors.push("variants must be an array");
			return {
				valid: errors.length === 0,
				errors
			};
		}
		/**
		* Assert an object looks like a supplier adapter. Throws on contract violation —
		* called by the registry at register() time so a broken adapter fails loud.
		* @param {object} adapter
		*/
		function assertContract(adapter) {
			if (!adapter || typeof adapter !== "object") throw new Error("adapter must be an object");
			if (!adapter.supplierId || typeof adapter.supplierId !== "string") throw new Error("adapter.supplierId must be a non-empty string");
			for (const fn of ["matchUrl", "normalize"]) if (typeof adapter[fn] !== "function") throw new Error(`adapter.${fn} must be a function`);
			return true;
		}
		return {
			REQUIRED_FIELDS,
			validate,
			assertContract
		};
	})();
	//#endregion
	//#region suppliers/core/registry.js
	window.SSSupplierRegistry = (() => {
		"use strict";
		const _adapters = [];
		/**
		* Register a supplier adapter. Validates the contract — a broken adapter throws
		* here, at registration, not at scrape time.
		* @param {object} adapter
		*/
		function register(adapter) {
			if (window.SSSupplierAdapter) window.SSSupplierAdapter.assertContract(adapter);
			const i = _adapters.findIndex((a) => a.supplierId === adapter.supplierId);
			if (i >= 0) _adapters[i] = adapter;
			else _adapters.push(adapter);
			return adapter;
		}
		/**
		* Find the adapter that matches a URL. First match wins (registration order).
		* @param {string} url
		* @returns {object|null}
		*/
		function match(url) {
			if (!url) return null;
			for (const a of _adapters) try {
				if (a.matchUrl(url)) return a;
			} catch (_) {}
			return null;
		}
		/**
		* Get a registered adapter by supplierId.
		* @param {string} supplierId
		* @returns {object|null}
		*/
		function get(supplierId) {
			return _adapters.find((a) => a.supplierId === supplierId) || null;
		}
		/** List registered supplierIds (debug / introspection). */
		function list() {
			return _adapters.map((a) => a.supplierId);
		}
		/**
		* Display metadata for a supplier — name + identifier label for UI chrome
		* (panel top bar, side panel). Never throws: unknown/missing suppliers get a
		* capitalized name and a generic "ID" label so the UI renders for suppliers
		* that have no adapter loaded in this context.
		* @param {string} supplierId normalized product.supplier (e.g. 'amazon')
		* @returns {{ displayName: string, idLabel: string }}
		*/
		function getMeta(supplierId) {
			const a = get(supplierId);
			const fallbackName = supplierId ? String(supplierId).charAt(0).toUpperCase() + String(supplierId).slice(1) : "Supplier";
			return {
				displayName: a && a.displayName || fallbackName,
				idLabel: a && a.idLabel || "ID"
			};
		}
		/** Clear all adapters — test isolation only. */
		function _reset() {
			_adapters.length = 0;
		}
		return {
			register,
			match,
			get,
			getMeta,
			list,
			_reset
		};
	})();
	//#endregion
	//#region suppliers/walmart/adapter.js
	window.SSWalmartAdapter = (() => {
		"use strict";
		const HOST_RE = /(^|\.)walmart\.(com|ca)$/i;
		function matchUrl(url) {
			try {
				return HOST_RE.test(new URL(url).hostname);
			} catch (_) {
				return false;
			}
		}
		async function scrapeProduct(opts) {
			const s = window.SSWalmartScraper;
			if (!s) throw new Error("SSWalmartScraper not loaded");
			return s.scrapeProduct(opts);
		}
		async function scrapeVariants(opts) {
			const s = window.SSWalmartScraper;
			if (s && typeof s.scrapeVariants === "function") return s.scrapeVariants(opts);
			return scrapeProduct(opts);
		}
		/**
		* Raw scraper output → universal NormalizedProduct. Pure. Derives sourceId
		* from the Walmart item id in the URL (…/ip/slug/123456789). Everything else
		* passes through unchanged so no scrape behavior is altered.
		* @param {object} raw injector scrape output ({ title, url, specifications, ... })
		* @returns {object} normalized product
		*/
		function normalize(raw) {
			raw = raw || {};
			const url = raw.url || (window.location ? window.location.href : "");
			const idMatch = /\/ip\/(?:[^/]+\/)?(\d+)/.exec(url || "");
			const sourceId = raw.sourceId || raw.itemId || (idMatch ? idMatch[1] : "");
			const product = {
				...raw,
				sourceId,
				supplier: raw.supplier || "walmart",
				url,
				images: Array.isArray(raw.images) ? raw.images : [],
				variants: Array.isArray(raw.variants) ? raw.variants : [],
				hasVariants: typeof raw.hasVariants === "boolean" ? raw.hasVariants : Array.isArray(raw.variants) && raw.variants.length > 1
			};
			return window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeProduct(product, {
				dedupe: true,
				dropInvalid: true
			}) : product;
		}
		return {
			supplierId: "walmart",
			displayName: "Walmart",
			idLabel: "Item ID",
			matchUrl,
			scrapeProduct,
			scrapeVariants,
			normalize,
			validate: (p) => window.SSSupplierAdapter ? window.SSSupplierAdapter.validate(p) : {
				valid: true,
				errors: []
			}
		};
	})();
	if (typeof window.SSSupplierRegistry !== "undefined") window.SSSupplierRegistry.register(window.SSWalmartAdapter);
	//#endregion
	//#region content_scripts/walmart_injector.js
	var uiInjected = false;
	var injectUI = async ({ fromSidebar = false, sidebarImages = [] } = {}) => {
		if (uiInjected) return;
		if (document.getElementById("snipe-root-wrapper")) return;
		const panelUrl = chrome.runtime.getURL("ui/panel.html") + "?t=" + Date.now();
		const uiHtml = await (await fetch(panelUrl)).text();
		const panelContent = new DOMParser().parseFromString(uiHtml, "text/html").getElementById("snipe-root-wrapper");
		if (!panelContent) {
			console.error("❌ Could not find snipe-root-wrapper in panel.html");
			return;
		}
		const clonedPanel = panelContent.cloneNode(true);
		clonedPanel.querySelectorAll("img").forEach((img) => {
			const srcAttr = img.getAttribute("src");
			if (srcAttr && srcAttr.startsWith("../")) {
				const cleanPath = srcAttr.replace(/^\.\.\//, "");
				img.src = chrome.runtime.getURL(cleanPath);
			}
		});
		if (!document.getElementById("sellersuit-panel-css")) {
			const cssLink = document.createElement("link");
			cssLink.id = "sellersuit-panel-css";
			cssLink.rel = "stylesheet";
			cssLink.href = chrome.runtime.getURL("ui/panel.css");
			document.head.appendChild(cssLink);
		}
		document.body.prepend(clonedPanel);
		uiInjected = true;
		addEventListenersToPanel();
		addCalculatorEventListeners();
		if (fromSidebar) renderGalleryFromUrls(sidebarImages);
		else {
			scrapeAndDisplayInitialTitle();
			scrapeAndDisplayImages();
			setTimeout(() => {
				console.log("🔄 Auto-calculating price on panel load...");
				quickCalculate();
			}, 1500);
		}
		let lastUrl = window.location.href;
		setInterval(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				console.log("🔄 URL changed, auto-resetting price calculation...");
				const sellItForInput = document.getElementById("sell-it-for-input");
				if (sellItForInput) sellItForInput.value = "";
				if (typeof quickCalculate === "function") quickCalculate();
			}
		}, 1e3);
	};
	var scrapeProductDetails = () => {
		const details = {
			brand: "",
			model: "",
			color: "",
			dimensions: "",
			height: "",
			weight: "",
			description: "",
			rawSpecs: {}
		};
		for (const selector of [
			"[itemprop=\"brand\"]",
			"[data-testid=\"product-brand\"]",
			".prod-brandName",
			".brand-name",
			"a[data-automation-id=\"product-brand\"]",
			"[class*=\"brand\"]",
			".product-brand-link"
		]) {
			const brandElement = document.querySelector(selector);
			if (brandElement) {
				details.brand = brandElement.innerText?.trim() || brandElement.textContent?.trim() || "";
				if (details.brand) break;
			}
		}
		[
			".specifications-table",
			"[data-testid=\"product-specifications\"]",
			".product-specifications",
			".spec-table",
			"#product-specifications",
			".wt-specifications",
			"[class*=\"specification\"]",
			".product-attribute-list"
		].forEach((selector) => {
			const specTable = document.querySelector(selector);
			if (specTable) specTable.querySelectorAll("tr, .spec-row, [class*=\"spec-row\"], div[class*=\"row\"], li").forEach((row) => {
				const labelElement = row.querySelector("th, td:first-child, .spec-label, [class*=\"label\"], dt, span:first-child, h3");
				const valueElement = row.querySelector("td:last-child, .spec-value, [class*=\"value\"], dd, span:last-child, p, div:last-child");
				if (labelElement && valueElement && labelElement !== valueElement) {
					const label = (labelElement.innerText || labelElement.textContent)?.trim() || "";
					const value = (valueElement.innerText || valueElement.textContent)?.trim() || "";
					const lowerLabel = label.toLowerCase();
					if (label && value && label.length < 50 && value.length < 200) {
						details.rawSpecs[label] = value;
						if (lowerLabel.includes("brand") || lowerLabel.includes("manufacturer")) {
							if (!details.brand) details.brand = value;
						} else if (lowerLabel.includes("model")) {
							if (!details.model) details.model = value;
						} else if (lowerLabel.includes("color")) {
							if (!details.color) details.color = value;
						} else if (lowerLabel.includes("dimension") || lowerLabel.includes("size")) {
							if (!details.dimensions) details.dimensions = value;
						} else if (lowerLabel.includes("weight")) {
							if (!details.weight) details.weight = value;
						} else if (lowerLabel.includes("height")) {
							if (!details.height) details.height = value;
						}
					}
				}
			});
		});
		const highlightSelectors = [
			".product-short-description",
			"[data-testid=\"product-highlights\"]",
			".about-product",
			".product-highlights",
			"[class*=\"highlight\"]",
			".about-item-list",
			"[data-testid=\"key-features\"]",
			".key-item-features"
		];
		let combinedDescription = [];
		highlightSelectors.forEach((selector) => {
			const highlightSection = document.querySelector(selector);
			if (highlightSection) {
				const text = highlightSection.innerText?.trim();
				if (text && !combinedDescription.includes(text)) combinedDescription.push(text);
			}
		});
		document.querySelectorAll("h3, h2").forEach((heading) => {
			if (heading.innerText && (heading.innerText.toLowerCase().includes("key item features") || heading.innerText.toLowerCase().includes("key features") || heading.innerText.toLowerCase().includes("about this item"))) {
				let nextEl = heading.nextElementSibling;
				while (nextEl && ![
					"H2",
					"H3",
					"H1",
					"DIV"
				].includes(nextEl.tagName)) {
					if (nextEl.innerText) {
						const text = nextEl.innerText.trim();
						if (text && !combinedDescription.includes(text)) combinedDescription.push(text);
					}
					nextEl = nextEl.nextElementSibling;
				}
				const parent = heading.parentElement;
				if (parent && parent.innerText && parent.innerText.length < 2e3) {
					const text = parent.innerText.trim();
					if (text && !combinedDescription.includes(text)) combinedDescription.push(text);
				}
			}
		});
		for (const selector of [
			"h1[itemprop=\"name\"]",
			".prod-ProductTitle",
			"[data-testid=\"product-title\"]",
			"h1.prod-Title",
			".product-title h1",
			"h1[data-automation-id=\"product-title\"]"
		]) {
			const titleElement = document.querySelector(selector);
			if (titleElement && !details.brand) {
				const brandMatch = (titleElement.innerText?.trim() || "").match(/^([A-Za-z\s]+?)(?:\s|$)/);
				if (brandMatch) details.brand = brandMatch[1].trim();
				break;
			}
		}
		for (const selector of [
			"[data-testid=\"product-description\"]",
			"[data-testid=\"long-description\"]",
			".dangerous-html",
			".product-description",
			".about-desc",
			"#product-description",
			".prod-ProductDescription",
			"[itemprop=\"description\"]",
			".about-item-complete"
		]) document.querySelectorAll(selector).forEach((descElement) => {
			const text = descElement.innerText?.trim();
			if (text && !combinedDescription.includes(text)) combinedDescription.push(text);
		});
		details.description = combinedDescription.join("\n\n");
		return details;
	};
	var WalmartImageExtractor = class {
		constructor() {
			this.images = /* @__PURE__ */ new Set();
			this.highQualityImages = [];
			this.attempts = 0;
			this.maxAttempts = 3;
		}
		async extractAllImages() {
			this.images.clear();
			this.highQualityImages = [];
			await this.waitForPageLoad();
			const approaches = [
				{
					name: "Standard DOM",
					method: () => this.extractFromDOM()
				},
				{
					name: "JSON Data",
					method: () => this.extractFromJSONData()
				},
				{
					name: "Comprehensive",
					method: () => this.extractComprehensive()
				},
				{
					name: "Fallback",
					method: () => this.extractFallback()
				}
			];
			for (let i = 0; i < approaches.length; i++) {
				const approach = approaches[i];
				try {
					updateScrapeStatus(`Scraping product images (${approach.name})...`);
					await approach.method();
					if (this.images.size > 0) break;
				} catch (error) {
					console.warn(`❌ ${approach.name} failed:`, error);
				}
			}
			this.transformToHighRes();
			await this.validateImageQuality();
			return this.highQualityImages;
		}
		async waitForPageLoad() {
			return new Promise((resolve) => {
				if (document.readyState === "complete") resolve();
				else window.addEventListener("load", resolve);
			});
		}
		async extractFromDOM() {
			console.log("🔍 Extracting MAIN product images from Walmart DOM...");
			[
				".prod-hero-image img",
				"[data-testid=\"hero-image\"] img",
				"[data-testid=\"media-thumbnail\"] img",
				".prod-HeroImage-container img",
				".hover-zoom-hero-image img"
			].forEach((selector) => {
				const images = document.querySelectorAll(selector);
				console.log(`Checking main selector "${selector}": found ${images.length} images`);
				images.forEach((img) => {
					[
						img.src,
						img.dataset.src,
						img.dataset.lazySrc,
						img.getAttribute("data-src"),
						img.getAttribute("data-lazy-src"),
						img.getAttribute("srcset")?.split(",")[0]?.trim()?.split(" ")[0]
					].forEach((url) => {
						if (url && this.isValidImageUrl(url)) {
							this.images.add(url);
							console.log(`Found main product image: ${url}`);
						}
					});
				});
			});
		}
		async extractFromJSONData() {
			console.log("🔍 Extracting from Walmart JSON data...");
			document.querySelectorAll("script[type=\"application/json\"], script[type=\"application/ld+json\"], script:not([src])").forEach((script) => {
				try {
					const content = script.textContent || script.innerHTML;
					if (content && (content.includes("walmartimages") || content.includes("productImage") || content.includes("imageUrl"))) [
						/"imageUrl"\s*:\s*"([^"]+)"/g,
						/"url"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
						/"image"\s*:\s*"([^"]+)"/g,
						/"largeImage"\s*:\s*"([^"]+)"/g,
						/"thumbnailUrl"\s*:\s*"([^"]+)"/g,
						/"heroImage"\s*:\s*"([^"]+)"/g,
						/"zoomImage"\s*:\s*"([^"]+)"/g,
						/"primaryImage"\s*:\s*"([^"]+)"/g,
						/"contentUrl"\s*:\s*"([^"]+walmartimages[^"]+)"/g
					].forEach((pattern) => {
						let match;
						while ((match = pattern.exec(content)) !== null) {
							let imageUrl = match[1];
							imageUrl = imageUrl.replace(/\\u002F/g, "/").replace(/\\/g, "").replace(/&amp;/g, "&");
							if (this.isValidImageUrl(imageUrl)) {
								this.images.add(imageUrl);
								console.log(`Found JSON image: ${imageUrl}`);
							}
						}
					});
				} catch (error) {
					console.warn("Error parsing script content:", error);
				}
			});
		}
		async extractComprehensive() {
			console.log("🔍 Extracting from Walmart main product section...");
			const mainSection = document.querySelector("[data-testid=\"image-gallery\"], .prod-hero-image-area, .prod-ProductImageCarousel");
			if (!mainSection) {
				console.log("No main product section found");
				return;
			}
			mainSection.querySelectorAll("img[data-src], img[data-lazy-src], img[srcset]").forEach((img) => {
				[
					img.dataset.src,
					img.dataset.lazySrc,
					img.getAttribute("srcset")?.split(",")[0]?.trim()?.split(" ")[0]
				].forEach((url) => {
					if (url && this.isValidImageUrl(url)) {
						this.images.add(url);
						console.log(`Found main product image: ${url}`);
					}
				});
			});
		}
		async extractFallback() {
			console.log("🔍 Fallback Walmart extraction for main images only...");
			document.querySelectorAll(".prod-hero-image, [data-testid=\"image-gallery\"], .prod-ProductImageCarousel").forEach((container) => {
				const images = container.querySelectorAll("img");
				console.log(`Found ${images.length} images in main container`);
				images.forEach((img, index) => {
					try {
						[
							img.src,
							img.dataset.src,
							img.dataset.lazySrc,
							img.getAttribute("data-src")
						].forEach((url) => {
							if (url && this.isValidImageUrl(url)) {
								this.images.add(url);
								console.log(`Fallback found main image: ${url}`);
							}
						});
					} catch (e) {
						console.warn(`Error processing fallback image ${index}:`, e);
					}
				});
			});
		}
		transformToHighRes() {
			const originalUrls = Array.from(this.images);
			this.images.clear();
			originalUrls.forEach((url) => {
				const highResUrl = this.getHighResUrl(url);
				this.images.add(highResUrl);
				console.log(`Transformed: ${url} -> ${highResUrl}`);
			});
		}
		getHighResUrl(originalUrl) {
			if (!originalUrl) return originalUrl;
			let highResUrl = originalUrl;
			[
				{
					pattern: /_\d{2,3}\./g,
					replacement: "_1200."
				},
				{
					pattern: /_\d{2,3}x\d{2,3}\./g,
					replacement: "_1200x1200."
				},
				{
					pattern: /\/\d{2,3}x\d{2,3}\//g,
					replacement: "/1200x1200/"
				},
				{
					pattern: /odnWidth=\d+/g,
					replacement: "odnWidth=1200"
				},
				{
					pattern: /odnHeight=\d+/g,
					replacement: "odnHeight=1200"
				},
				{
					pattern: /w_\d+/g,
					replacement: "w_1200"
				},
				{
					pattern: /h_\d+/g,
					replacement: "h_1200"
				},
				{
					pattern: /\?.*$/,
					replacement: ""
				},
				{
					pattern: /_AC_SX\d+/g,
					replacement: "_AC_SL1500"
				},
				{
					pattern: /_AC_SY\d+/g,
					replacement: "_AC_SL1500"
				}
			].forEach((transform) => {
				highResUrl = highResUrl.replace(transform.pattern, transform.replacement);
			});
			if (highResUrl.includes("i5.walmartimages.com")) highResUrl = highResUrl.replace(/\?[^?]*$/, "");
			return highResUrl;
		}
		async validateImageQuality() {
			const imageUrls = Array.from(this.images);
			console.log(`Validating ${imageUrls.length} images for quality...`);
			const uniqueUrls = [...new Set(imageUrls)].slice(0, 20);
			console.log(`Processing ${uniqueUrls.length} unique images (limited to 20)`);
			let index = 0;
			for (const url of uniqueUrls) {
				index++;
				updateScrapeStatus(`Validating quality of image ${index} of ${uniqueUrls.length}...`);
				try {
					let isHighQuality = false;
					let contentType = "image/jpeg";
					let contentLength = "Unknown";
					if (this.isHighResUrl(url)) {
						isHighQuality = true;
						console.log(`✅ URL pattern indicates high-res: ${url}`);
					} else try {
						const response = await fetch(url, { method: "HEAD" });
						contentLength = response.headers.get("content-length");
						contentType = response.headers.get("content-type");
						isHighQuality = contentLength && parseInt(contentLength) > 5e4;
						if (isHighQuality) console.log(`✅ HEAD request confirms high-res: ${url} (${contentLength} bytes)`);
					} catch (headError) {
						console.log(`HEAD request failed for ${url}, using URL pattern validation`);
						isHighQuality = this.isHighResUrl(url);
					}
					const isImage = contentType && contentType.startsWith("image/");
					if (isHighQuality && isImage) {
						this.highQualityImages.push({
							url,
							size: contentLength,
							type: contentType,
							alt: this.getImageAlt(url)
						});
						console.log(`✅ Added high-quality image: ${url}`);
					} else console.log(`❌ Rejected image: ${url} (quality: ${isHighQuality}, isImage: ${isImage})`);
				} catch (error) {
					console.log(`Failed to validate image: ${url}`, error);
				}
			}
			console.log(`Validation complete. Found ${this.highQualityImages.length} high-quality images`);
		}
		getImageAlt(url) {
			const img = document.querySelector(`img[src="${url}"]`);
			return img ? img.alt || "Product Image" : "Product Image";
		}
		isValidImageUrl(url) {
			if (!url) return false;
			if (!url.includes("walmartimages") && !url.includes("walmart")) return false;
			const hasValidFormat = [
				".jpg",
				".jpeg",
				".png",
				".webp"
			].some((format) => url.toLowerCase().includes(format)) || url.includes("walmartimages");
			const hasExcludedContent = [
				"sprite",
				"icon",
				"logo",
				"banner",
				"data:image",
				"pixel",
				"tracking",
				"badge",
				"button",
				"nav",
				"header",
				"footer",
				"review",
				"customer",
				"avatar",
				"profile",
				"spacer",
				"loading",
				"shipping",
				"returns",
				"warranty",
				"video-thumb",
				"play-button",
				"overlay",
				"spark",
				"savings",
				"promotion",
				"ad-",
				"advertisement"
			].some((excluded) => url.toLowerCase().includes(excluded));
			const isLongEnoughUrl = url.length > 50;
			return hasValidFormat && !hasExcludedContent && url.startsWith("http") && isLongEnoughUrl;
		}
		isHighResUrl(url) {
			if (!url) return false;
			return [
				/_1200\./,
				/_1200x1200\./,
				/\/1200x1200\//,
				/odnWidth=1200/,
				/odnHeight=1200/,
				/w_1200/,
				/h_1200/,
				/_AC_SL1500/,
				/_AC_SL2000/,
				/large/i,
				/zoom/i
			].some((pattern) => pattern.test(url));
		}
	};
	var extractor = new WalmartImageExtractor();
	var scrapeCompleteProductData = () => {
		const details = scrapeProductDetails();
		const titleSelectors = [
			"h1[itemprop=\"name\"]",
			".prod-ProductTitle",
			"[data-testid=\"product-title\"]",
			"h1.prod-Title",
			".product-title h1",
			"h1[data-automation-id=\"product-title\"]"
		];
		let title = document.title;
		for (const selector of titleSelectors) {
			const el = document.querySelector(selector);
			if (el) {
				title = (el.innerText || el.textContent).trim();
				break;
			}
		}
		const categoryList = [];
		document.querySelectorAll("[data-testid=\"breadcrumb-list\"] li a, .breadcrumb-list li a").forEach((el) => {
			const text = (el.innerText || el.textContent).trim();
			if (text) categoryList.push(text);
		});
		const bulletPoints = [];
		document.querySelectorAll(".about-product-bullets li, .about-item-list li, [data-testid=\"product-highlights\"] li, [data-testid=\"long-description\"] li, [data-testid=\"key-features\"] li, .key-item-features li").forEach((el) => {
			const text = (el.innerText || el.textContent).trim();
			if (text && !bulletPoints.includes(text)) bulletPoints.push(text);
		});
		document.querySelectorAll("h3, h2, span, font, p").forEach((heading) => {
			if (heading.innerText && (heading.innerText.toLowerCase().includes("key item features") || heading.innerText.toLowerCase().includes("key features") || heading.innerText.toLowerCase().includes("about this item"))) {
				const parent = heading.closest("section") || heading.parentElement;
				if (parent) parent.querySelectorAll("li").forEach((li) => {
					const text = (li.innerText || li.textContent).trim();
					if (text && !bulletPoints.includes(text)) bulletPoints.push(text);
				});
			}
		});
		const specifications = { ...details.rawSpecs };
		if (details.brand && !specifications.Brand && !specifications.brand) specifications.Brand = details.brand;
		if (details.model && !specifications.Model && !specifications.model) specifications.Model = details.model;
		if (details.color && !specifications.Color && !specifications.color) specifications.Color = details.color;
		if (details.dimensions && !specifications.Dimensions && !specifications.dimensions) specifications.Dimensions = details.dimensions;
		if (details.weight && !specifications.Weight && !specifications.weight) specifications.Weight = details.weight;
		const idMatch = /\/ip\/(?:[^/]+\/)?(\d+)/.exec(window.location.href || "");
		const sourceId = idMatch ? idMatch[1] : "";
		const scrapedPrice = typeof scrapeWalmartPrice === "function" ? scrapeWalmartPrice() : "0";
		return {
			title,
			productTitle: title,
			brand: details.brand,
			category: categoryList.join(" > "),
			description: details.description,
			features: bulletPoints,
			bulletPoints,
			specifications,
			url: window.location.href,
			amazonPrice: scrapedPrice,
			price: scrapedPrice,
			supplier: "walmart",
			sourceId
		};
	};
	var _enrichWalmartProduct = async (product) => {
		try {
			const price = scrapeWalmartPrice();
			if (price) product.price = String(price);
		} catch (e) {
			console.warn("[SSWalmartScraper] price scrape failed:", e?.message || e);
		}
		try {
			const images = await extractor.extractAllImages();
			if (Array.isArray(images) && images.length) {
				const urls = images.map((i) => i && i.url || i).filter((u) => typeof u === "string");
				if (urls.length) {
					product.images = urls;
					product.mainImage = urls[0];
				}
			}
		} catch (e) {
			console.warn("[SSWalmartScraper] image extraction failed:", e?.message || e);
		}
		return product;
	};
	window.SSWalmartScraper = {
		scrapeProduct: async () => {
			let product;
			try {
				product = await window.SsWalmartVariantScraper.scrapeSingleProduct();
				const domData = scrapeCompleteProductData();
				product.description = product.description || domData.description;
				product.specifications = domData.specifications;
				product.features = domData.features;
				product.bulletPoints = domData.bulletPoints;
				product.category = domData.category;
			} catch (e) {
				console.warn("[SSWalmartScraper] data-first scrape failed, DOM fallback:", e?.message || e);
				product = scrapeCompleteProductData();
			}
			return _enrichWalmartProduct(product);
		},
		scrapeVariants: async () => {
			const product = await window.SsWalmartVariantScraper.scrapeProductWithVariants();
			const domData = scrapeCompleteProductData();
			product.description = product.description || domData.description;
			product.specifications = domData.specifications;
			product.features = domData.features;
			product.bulletPoints = domData.bulletPoints;
			product.category = domData.category;
			return _enrichWalmartProduct(product);
		}
	};
	var showScrapeOverlay = (text) => {
		const overlay = document.getElementById("ss-scrape-overlay");
		const statusText = document.getElementById("ss-scrape-status-text");
		if (overlay) overlay.classList.add("active");
		if (statusText && text) statusText.textContent = text;
	};
	var updateScrapeStatus = (text) => {
		const statusText = document.getElementById("ss-scrape-status-text");
		if (statusText && text) statusText.textContent = text;
		try {
			chrome.runtime.sendMessage({
				action: "SCRAPE_PROGRESS",
				message: text
			});
		} catch (e) {}
	};
	var hideScrapeOverlay = () => {
		const overlay = document.getElementById("ss-scrape-overlay");
		if (overlay) overlay.classList.remove("active");
	};
	var renderGalleryFromUrls = async (urls = []) => {
		const galleryContainer = document.getElementById("snipe-image-gallery");
		if (!galleryContainer) return;
		galleryContainer.innerHTML = "";
		if (!urls.length) {
			const placeholder = document.createElement("div");
			placeholder.textContent = "No images available.";
			placeholder.style.cssText = "padding:20px;text-align:center;color:#666;";
			galleryContainer.appendChild(placeholder);
			return;
		}
		const allImages = urls.map((url) => ({ url }));
		const _wmSettings = await chrome.storage.local.get(["autoWatermarkEnabled", "autoEditEnabled"]);
		const autoWatermarkEnabled = _wmSettings.autoEditEnabled || _wmSettings.autoWatermarkEnabled || false;
		if (typeof ImageRenderer !== "undefined") await ImageRenderer.renderProcessedImages(galleryContainer, allImages, {
			processImage: async (url, index) => {
				if (index === 0 && autoWatermarkEnabled) return await processFirstImageWithWatermark(url);
				return await processImageTo1600x1600NoWatermark(url);
			},
			onDelete: (index, container, url) => deleteImageFromStorage(index, container, url),
			onEdit: (index, url) => window.__SNIPE_OPEN_IMAGE_EDITOR__?.(url, index),
			getMetadata: (imageInfo, index) => `Image ${index + 1} | 1600x1600`,
			onProgress: (current, total) => console.log(`[renderGalleryFromUrls] ${current}/${total}`)
		});
		else for (let i = 0; i < allImages.length; i++) try {
			const processedUrl = i === 0 && autoWatermarkEnabled ? await processFirstImageWithWatermark(allImages[i].url) : await processImageTo1600x1600NoWatermark(allImages[i].url);
			const imgEl = document.createElement("img");
			imgEl.src = processedUrl;
			imgEl.style.cssText = "max-width:120px;margin:4px;border-radius:4px;";
			imgEl.setAttribute("data-image-index", i);
			galleryContainer.appendChild(imgEl);
		} catch (e) {
			console.warn(`[renderGalleryFromUrls] image ${i} failed:`, e);
		}
	};
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "extractImages") {
			showScrapeOverlay("Initializing image extraction...");
			extractor.extractAllImages().then((images) => {
				hideScrapeOverlay();
				sendResponse({
					success: true,
					images
				});
			}).catch((error) => {
				hideScrapeOverlay();
				sendResponse({
					success: false,
					error: error.message
				});
			});
			return true;
		}
		if (request.action === "SCRAPE_SINGLE" || request.action === "SCRAPE_VARIANTS") {
			(async () => {
				try {
					const _adapter = window.SSSupplierRegistry?.match(location.href);
					if (!_adapter) {
						sendResponse({
							success: false,
							error: "No supplier adapter for this page"
						});
						return;
					}
					const raw = request.action === "SCRAPE_VARIANTS" ? await _adapter.scrapeVariants(request.options || {}) : await _adapter.scrapeProduct();
					const product = _adapter.normalize(raw);
					await chrome.storage.local.set({
						currentProduct: product,
						lastScraped: Date.now()
					});
					sendResponse({
						success: true,
						data: product
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
		if (request.action === "SCRAPE_PRODUCT_DATA" || request.action === "SCRAPE_COMPLETE_PRODUCT") {
			console.log(`[Walmart Injector] Received ${request.action} request`);
			try {
				const productData = scrapeCompleteProductData();
				chrome.storage.local.set({
					completeProductData: productData,
					currentProduct: productData,
					lastScraped: Date.now()
				});
				sendResponse({
					success: true,
					data: productData
				});
			} catch (error) {
				console.error("[Walmart Injector] Error scraping product data:", error);
				sendResponse({
					success: false,
					error: error.message
				});
			}
			return true;
		}
		if (request.action === "GENERATE_AI_TITLES") {
			console.log("[Walmart Injector] Received GENERATE_AI_TITLES request");
			const generateBtn = document.getElementById("generate-ai-titles-btn");
			if (generateBtn) {
				generateBtn.click();
				sendResponse({ success: true });
			} else sendResponse({
				success: false,
				error: "UI Button not found"
			});
			return true;
		}
		if (request.action === "EXTEND_PANEL") {
			(async () => {
				try {
					if (!document.getElementById("snipe-root-wrapper")) {
						const d = await chrome.storage.local.get("currentProduct");
						await injectUI({
							fromSidebar: true,
							sidebarImages: Array.isArray(d.currentProduct?.images) ? d.currentProduct.images : []
						});
					}
					await showSidebarExtended();
					chrome.runtime.sendMessage({ action: "CLOSE_SIDE_PANEL" });
					sendResponse({ success: true });
				} catch (e) {
					console.error("[EXTEND_PANEL] error:", e);
					sendResponse({
						success: false,
						error: e.message
					});
				}
			})();
			return true;
		}
	});
	var scrapeAndDisplayInitialTitle = () => {
		const titleSelectors = [
			"h1[itemprop=\"name\"]",
			".prod-ProductTitle",
			"[data-testid=\"product-title\"]",
			"h1.prod-Title",
			".product-title h1",
			"h1[data-automation-id=\"product-title\"]",
			"[class*=\"ProductTitle\"]",
			".heading_title h1"
		];
		let attempts = 0;
		const maxAttempts = 10;
		const pollInterval = 300;
		const tryGetTitle = () => {
			attempts++;
			console.log(`🔍 Attempting to scrape title (attempt ${attempts}/${maxAttempts})...`);
			let titleElement = null;
			for (const selector of titleSelectors) {
				titleElement = document.querySelector(selector);
				if (titleElement) {
					console.log(`✅ Found title element with selector: ${selector}`);
					break;
				}
			}
			let originalTitle = "";
			if (titleElement) originalTitle = titleElement.innerText?.trim() || titleElement.textContent?.trim() || "";
			if (!originalTitle && attempts < maxAttempts) {
				console.log(`⏳ Title not found yet, retrying in ${pollInterval}ms...`);
				setTimeout(tryGetTitle, pollInterval);
				return;
			}
			if (!originalTitle) {
				console.log("🔄 Using document.title as fallback...");
				originalTitle = document.title || "";
				originalTitle = originalTitle.replace(/\s*[-|]\s*Walmart\.com.*$/i, "").trim();
				originalTitle = originalTitle.replace(/^Walmart\.com\s*[-|]\s*/i, "").trim();
				if (!originalTitle) {
					const ogTitle = document.querySelector("meta[property=\"og:title\"]");
					if (ogTitle) {
						originalTitle = ogTitle.getAttribute("content") || "";
						console.log("✅ Found title from og:title meta tag");
					}
				}
			}
			if (!originalTitle) {
				originalTitle = "Product Title Not Found";
				console.warn("⚠️ Could not find product title, using placeholder");
			}
			console.log("✅ Final title:", originalTitle);
			const titleDisplay = document.getElementById("ai-generated-title");
			const titleCounter = document.getElementById("ai-title-counter");
			if (titleDisplay && originalTitle) {
				titleDisplay.innerText = originalTitle;
				titleDisplay.classList.add("has-title");
				if (titleCounter) titleCounter.textContent = originalTitle.length + " characters";
				if (chrome && chrome.storage) chrome.storage.local.set({ selectedEbayTitle: originalTitle });
			} else {
				const titleListContainer = document.getElementById("snipe-title-list");
				if (titleListContainer) titleListContainer.innerHTML = createTitleRow({
					rank: 1,
					type: "Filtered",
					title: originalTitle,
					charCount: originalTitle.length
				}, true);
			}
		};
		tryGetTitle();
	};
	var scrapeAndDisplayImages = async () => {
		const galleryContainer = document.getElementById("snipe-image-gallery");
		if (!galleryContainer) return;
		console.log("Starting comprehensive Walmart image extraction...");
		showScrapeOverlay("Initializing image extraction...");
		const optiListBtn = document.getElementById("opti-list-btn");
		const downloadBtn = document.getElementById("download-images-btn");
		const refreshBtn = document.getElementById("refresh-images-btn");
		if (optiListBtn) {
			optiListBtn.disabled = true;
			optiListBtn.textContent = "Processing Images...";
		}
		if (downloadBtn) {
			downloadBtn.disabled = true;
			downloadBtn.textContent = "Processing Images...";
		}
		if (refreshBtn) {
			refreshBtn.disabled = true;
			refreshBtn.textContent = "Processing Images...";
		}
		if (!document.getElementById("sellersuit-scifi-styles")) {
			const scifiStyles = document.createElement("style");
			scifiStyles.id = "sellersuit-scifi-styles";
			scifiStyles.textContent = `
            @keyframes holographicScan {
                0% { background-position: 0% 0%; }
                100% { background-position: 0% 100%; }
            }
            @keyframes imageFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .scifi-image-container {
                border-radius: 4px;
                opacity: 0;
                animation: imageFadeIn 0.4s ease-out forwards;
            }
            .scifi-loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 30px;
                background: linear-gradient(135deg, rgba(0,20,40,0.95) 0%, rgba(0,40,80,0.9) 100%);
                border: 2px solid rgba(0, 255, 255, 0.5);
                border-radius: 8px;
                animation: neonPulse 1.5s ease-in-out infinite;
                position: relative;
                overflow: hidden;
            }
            .scifi-loading-container::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.1), transparent 30%);
                animation: spin 3s linear infinite;
            }
            @keyframes spin {
                100% { transform: rotate(360deg); }
            }
            .scifi-loading-text {
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #00ffff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4);
                letter-spacing: 2px;
                text-transform: uppercase;
                z-index: 2;
            }
            .scifi-progress-bar {
                width: 200px;
                height: 4px;
                background: rgba(0, 255, 255, 0.2);
                border-radius: 2px;
                margin-top: 15px;
                overflow: hidden;
                z-index: 2;
            }
            .scifi-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ffff, #00ff88, #00ffff);
                background-size: 200% 100%;
                animation: holographicScan 1s linear infinite;
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
            }
            .scifi-hex-grid {
                position: absolute;
                inset: 0;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2300ffff' fill-opacity='0.05'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                pointer-events: none;
                z-index: 1;
            }
        `;
			document.head.appendChild(scifiStyles);
		}
		const loadingIndicator = document.createElement("div");
		loadingIndicator.className = "scifi-loading-container";
		loadingIndicator.id = "image-loading-indicator";
		loadingIndicator.innerHTML = `
        <div class="scifi-hex-grid"></div>
        <div class="scifi-loading-text">⟨ SCANNING PRODUCT DATA ⟩</div>
        <div class="scifi-progress-bar">
            <div class="scifi-progress-fill" style="width: 100%;"></div>
        </div>
    `;
		galleryContainer.appendChild(loadingIndicator);
		try {
			const allImages = await extractor.extractAllImages();
			const existingLoadingIndicator = document.getElementById("image-loading-indicator");
			if (existingLoadingIndicator) existingLoadingIndicator.remove();
			if (allImages.length === 0) {
				const placeholder = document.createElement("div");
				placeholder.textContent = "No high-quality product images found. Please check if this is a valid Walmart product page.";
				placeholder.style.padding = "20px";
				placeholder.style.textAlign = "center";
				placeholder.style.color = "#666";
				galleryContainer.appendChild(placeholder);
				hideScrapeOverlay();
				return;
			}
			console.log(`Processing ${allImages.length} high-quality images with progressive rendering`);
			const _wmSettings = await chrome.storage.local.get(["autoWatermarkEnabled", "autoEditEnabled"]);
			const autoWatermarkEnabled = _wmSettings.autoEditEnabled || _wmSettings.autoWatermarkEnabled || false;
			console.log(`💧 Auto Watermark Enabled: ${autoWatermarkEnabled}`);
			if (typeof ImageRenderer !== "undefined") {
				await ImageRenderer.renderProcessedImages(galleryContainer, allImages, {
					processImage: async (url, index) => {
						if (index === 0 && autoWatermarkEnabled) {
							console.log("💧 Applying watermark to first image (Auto-edit ON)");
							return await processFirstImageWithWatermark(url);
						}
						return await processImageTo1600x1600NoWatermark(url);
					},
					onDelete: (index, container, url) => {
						deleteImageFromStorage(index, container, url);
					},
					onEdit: (index, url) => {
						window.__SNIPE_OPEN_IMAGE_EDITOR__?.(url, index);
					},
					getMetadata: (imageInfo, index) => {
						const sizeKB = imageInfo.size ? Math.round(parseInt(imageInfo.size) / 1024) + "KB" : "Unknown size";
						return `Image ${index + 1} | 1600x1600 | ${sizeKB}`;
					},
					onProgress: (current, total) => {
						console.log(`[Progressive] Rendered ${current}/${total} images`);
					}
				});
				console.log(`Successfully processed ${allImages.length} high-quality images with progressive rendering`);
			} else {
				console.log("[Fallback] Using vanilla progressive rendering");
				const BATCH_SIZE = 2;
				const BATCH_DELAY = 50;
				for (let batchStart = 0; batchStart < allImages.length; batchStart += BATCH_SIZE) {
					const batchEnd = Math.min(batchStart + BATCH_SIZE, allImages.length);
					const batchPromises = [];
					for (let i = batchStart; i < batchEnd; i++) batchPromises.push((async () => {
						const imageInfo = allImages[i];
						try {
							return {
								imageInfo,
								processedImageUrl: i === 0 && autoWatermarkEnabled ? await processFirstImageWithWatermark(imageInfo.url) : await processImageTo1600x1600NoWatermark(imageInfo.url),
								index: i
							};
						} catch (error) {
							console.error(`Failed to process image ${i + 1}:`, error);
							return null;
						}
					})());
					const results = await Promise.all(batchPromises);
					const fragment = document.createDocumentFragment();
					for (const result of results) {
						if (!result) continue;
						const { imageInfo, processedImageUrl, index: i } = result;
						const imgContainer = document.createElement("div");
						imgContainer.className = "product-image-container scifi-image-container";
						imgContainer.style.cssText = "position:relative;display:inline-block;margin:5px;vertical-align:top;opacity:0;transform:translateY(8px);transition:opacity 0.3s ease, transform 0.3s ease;will-change:opacity,transform;contain:layout paint;";
						imgContainer.style.transitionDelay = `${(i - batchStart) * 80}ms`;
						imgContainer.setAttribute("data-image-index", i);
						const img = document.createElement("img");
						img.src = processedImageUrl;
						img.className = "product-image-1600";
						img.alt = imageInfo.alt || `Product image ${i + 1}`;
						img.title = `Product Image ${i + 1} - 1600x1600px`;
						img.loading = "lazy";
						img.decoding = "async";
						const overlay = document.createElement("div");
						overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 0.15s ease;";
						imgContainer.addEventListener("mouseenter", () => {
							overlay.style.opacity = "1";
							overlay.style.pointerEvents = "auto";
						});
						imgContainer.addEventListener("mouseleave", () => {
							overlay.style.opacity = "0";
							overlay.style.pointerEvents = "none";
						});
						const deleteButton = document.createElement("button");
						deleteButton.innerHTML = "×";
						deleteButton.className = "image-delete-btn";
						deleteButton.style.cssText = "position:absolute;top:5px;right:5px;width:24px;height:24px;background:rgba(239,68,68,0.9);color:white;border:none;border-radius:50%;cursor:pointer;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;z-index:10;transition:background 0.15s ease,transform 0.15s ease;";
						deleteButton.addEventListener("mouseenter", () => {
							deleteButton.style.background = "rgba(220,38,38,1)";
							deleteButton.style.transform = "scale(1.1)";
						});
						deleteButton.addEventListener("mouseleave", () => {
							deleteButton.style.background = "rgba(239,68,68,0.9)";
							deleteButton.style.transform = "scale(1)";
						});
						deleteButton.addEventListener("click", (e) => {
							e.stopPropagation();
							deleteImageFromStorage(i, imgContainer, processedImageUrl);
						});
						overlay.appendChild(deleteButton);
						const editBtn = document.createElement("button");
						editBtn.textContent = "✎";
						editBtn.className = "image-edit-btn";
						editBtn.style.cssText = "position:absolute;top:5px;left:5px;width:24px;height:24px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:4px;cursor:pointer;z-index:10;transition:background 0.15s ease;";
						editBtn.addEventListener("click", (e) => {
							e.stopPropagation();
							window.__SNIPE_OPEN_IMAGE_EDITOR__?.(img.src, i);
						});
						overlay.appendChild(editBtn);
						const metadataOverlay = document.createElement("div");
						metadataOverlay.className = "product-image-metadata";
						metadataOverlay.style.cssText = "position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.75);color:white;padding:4px;font-size:10px;text-align:center;";
						metadataOverlay.textContent = `Image ${i + 1} | 1600x1600 | ${imageInfo.size ? Math.round(parseInt(imageInfo.size) / 1024) + "KB" : "Unknown size"}`;
						imgContainer.appendChild(img);
						imgContainer.appendChild(overlay);
						imgContainer.appendChild(metadataOverlay);
						fragment.appendChild(imgContainer);
					}
					galleryContainer.appendChild(fragment);
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							for (const result of results) {
								if (!result) continue;
								const container = galleryContainer.querySelector(`[data-image-index="${result.index}"]`);
								if (container) {
									container.style.opacity = "1";
									container.style.transform = "translateY(0)";
								}
							}
						});
					});
					if (batchStart + BATCH_SIZE < allImages.length) await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
				}
				console.log(`Successfully processed ${allImages.length} high-quality images`);
			}
			if (optiListBtn) {
				optiListBtn.disabled = false;
				optiListBtn.textContent = "Upload";
			}
			if (downloadBtn) {
				downloadBtn.disabled = false;
				downloadBtn.textContent = "Download All Images";
			}
			if (refreshBtn) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = "Refresh Images";
			}
			hideScrapeOverlay();
		} catch (error) {
			console.error("Error in comprehensive image extraction:", error);
			const existingLoadingIndicator = document.getElementById("image-loading-indicator");
			if (existingLoadingIndicator) existingLoadingIndicator.remove();
			if (optiListBtn) {
				optiListBtn.disabled = false;
				optiListBtn.textContent = "Upload";
			}
			if (downloadBtn) {
				downloadBtn.disabled = false;
				downloadBtn.textContent = "Download All Images";
			}
			if (refreshBtn) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = "Refresh Images";
			}
			const errorMessage = document.createElement("div");
			errorMessage.textContent = "Error extracting images. Please try refreshing the page.";
			errorMessage.style.padding = "20px";
			errorMessage.style.textAlign = "center";
			errorMessage.style.color = "#ff0000";
			galleryContainer.appendChild(errorMessage);
			hideScrapeOverlay();
		}
	};
	var processImageTo1600x1600NoWatermark = (imageUrl) => {
		return new Promise((resolve, reject) => {
			const sourceImage = new Image();
			sourceImage.crossOrigin = "Anonymous";
			const loadPromise = new Promise((res, rej) => {
				sourceImage.onload = res;
				sourceImage.onerror = () => rej(/* @__PURE__ */ new Error(`Failed to load image: ${imageUrl}`));
			});
			sourceImage.src = imageUrl;
			loadPromise.then(() => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				canvas.width = 1600;
				canvas.height = 1600;
				ctx.fillStyle = "#FFFFFF";
				ctx.fillRect(0, 0, 1600, 1600);
				const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
				const targetAspect = 1600 / 1600;
				let drawWidth, drawHeight, drawX, drawY;
				if (sourceAspect > targetAspect) {
					drawWidth = 1600;
					drawHeight = 1600 / sourceAspect;
					drawX = 0;
					drawY = (1600 - drawHeight) / 2;
				} else {
					drawHeight = 1600;
					drawWidth = 1600 * sourceAspect;
					drawX = (1600 - drawWidth) / 2;
					drawY = 0;
				}
				ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
				resolve(canvas.toDataURL("image/jpeg", .95));
			}).catch(reject);
		});
	};
	var processFirstImageWithWatermark = async (imageUrl) => {
		try {
			return await processImageTo1600x1600(imageUrl);
		} catch (e) {
			console.warn("💧 Watermark failed, using original image:", e?.message || e);
			return processImageTo1600x1600NoWatermark(imageUrl);
		}
	};
	var processImageTo1600x1600 = (imageUrl) => {
		return new Promise((resolve, reject) => {
			console.log(`🔍 processImageTo1600x1600: Processing image with watermark - ${imageUrl.substring(0, 100)}...`);
			const watermark = new Image();
			const sourceImage = new Image();
			sourceImage.crossOrigin = "Anonymous";
			const watermarkPromise = new Promise((res, rej) => {
				watermark.onload = res;
				watermark.onerror = () => rej(/* @__PURE__ */ new Error("Failed to load watermark"));
			});
			const sourcePromise = new Promise((res, rej) => {
				sourceImage.onload = res;
				sourceImage.onerror = () => rej(/* @__PURE__ */ new Error(`Failed to load image: ${imageUrl}`));
			});
			watermark.src = chrome.runtime.getURL("assets/watermark.png");
			sourceImage.src = imageUrl;
			Promise.all([watermarkPromise, sourcePromise]).then(() => {
				console.log(`✅ processImageTo1600x1600: Both images loaded successfully`);
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				canvas.width = 1600;
				canvas.height = 1600;
				ctx.fillStyle = "#FFFFFF";
				ctx.fillRect(0, 0, 1600, 1600);
				const sourceAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
				const targetAspect = 1600 / 1600;
				let drawWidth, drawHeight, drawX, drawY;
				if (sourceAspect > targetAspect) {
					drawWidth = 1600;
					drawHeight = 1600 / sourceAspect;
					drawX = 0;
					drawY = (1600 - drawHeight) / 2;
				} else {
					drawHeight = 1600;
					drawWidth = 1600 * sourceAspect;
					drawX = (1600 - drawWidth) / 2;
					drawY = 0;
				}
				ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
				ctx.globalAlpha = 1;
				const padding = 20;
				const watermarkWidth = 1600 / 4;
				const watermarkHeight = watermark.naturalHeight / watermark.naturalWidth * watermarkWidth;
				const watermarkX = 1600 - watermarkWidth - padding;
				const watermarkY = 1600 - watermarkHeight - padding;
				ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
				ctx.globalAlpha = 1;
				const dataUrl = canvas.toDataURL("image/jpeg", .95);
				console.log(`✅ processImageTo1600x1600: Generated Data URL (${dataUrl.substring(0, 50)}...)`);
				resolve(dataUrl);
			}).catch(reject);
		});
	};
	var storeWatermarkedImages = async () => {
		console.log("🔍 storeWatermarkedImages: Starting image storage process...");
		const galleryContainer = document.getElementById("snipe-image-gallery");
		if (!galleryContainer) {
			console.error("❌ storeWatermarkedImages: Gallery container not found");
			return;
		}
		console.log("✅ storeWatermarkedImages: Gallery container found");
		const images = galleryContainer.querySelectorAll(".product-image-1600");
		console.log(`🔍 storeWatermarkedImages: Found ${images.length} images in gallery`);
		const watermarkedDataUrls = [];
		for (let i = 0; i < images.length; i++) {
			const img = images[i];
			console.log(`🔍 storeWatermarkedImages: Processing image ${i + 1}/${images.length}`);
			console.log(`🔍 storeWatermarkedImages: Image src type: ${img.src ? img.src.startsWith("data:image") ? "Data URL" : "URL" : "No src"}`);
			if (img.src && img.src.startsWith("data:image")) if (img.src.length > 1e4) {
				watermarkedDataUrls.push(img.src);
				console.log(`✅ storeWatermarkedImages: Added scraped watermarked image ${i + 1} to storage array (${img.src.length} chars)`);
			} else console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is too small (${img.src.length} chars) - may not be properly watermarked, skipping`);
			else console.log(`⚠️ storeWatermarkedImages: Image ${i + 1} is not a Data URL, skipping`);
		}
		console.log(`🔍 storeWatermarkedImages: Total Data URLs collected: ${watermarkedDataUrls.length}`);
		if (watermarkedDataUrls.length > 0) {
			const totalCharCount = watermarkedDataUrls.reduce((sum, url) => sum + url.length, 0);
			console.log(`📊 storeWatermarkedImages: Estimated storage payload size: ${(totalCharCount / 1024 / 1024).toFixed(2)} MB`);
			if (totalCharCount > 9.5 * 1024 * 1024) {
				console.error(`❌ storeWatermarkedImages: Payload size of ${(totalCharCount / 1024 / 1024).toFixed(2)} MB exceeds the session storage quota (~10MB limit).`);
				alert(`⚠️ Error: The total size of edited/watermarked images is too large (${(totalCharCount / 1024 / 1024).toFixed(2)} MB). Please remove some images or reduce their complexity before proceeding.`);
				return;
			}
			try {
				await new Promise((resolve, reject) => {
					chrome.storage.session.set({ watermarkedImages: watermarkedDataUrls }, () => {
						if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
						else resolve();
					});
				});
				console.log(`✅ storeWatermarkedImages: Successfully stored ${watermarkedDataUrls.length} watermarked 1600x1600 images in Chrome session storage`);
				const verification = await chrome.storage.session.get(["watermarkedImages"]);
				console.log(`🔍 storeWatermarkedImages: Storage verification - ${verification.watermarkedImages?.length || 0} images in storage`);
				if (verification.watermarkedImages && verification.watermarkedImages.length > 0) {
					console.log("🔍 storeWatermarkedImages: Verifying stored images...");
					verification.watermarkedImages.forEach((imageData, index) => {
						if (imageData && imageData.startsWith("data:image")) console.log(`✅ storeWatermarkedImages: Image ${index + 1} is valid Data URL (${imageData.substring(0, 50)}...)`);
						else console.error(`❌ storeWatermarkedImages: Image ${index + 1} is not a valid Data URL`);
					});
				}
			} catch (error) {
				console.error("❌ storeWatermarkedImages: Failed to store images:", error);
				alert(`⚠️ Error storing images in session storage: ${error.message || error}`);
			}
		} else console.warn("⚠️ storeWatermarkedImages: No Data URLs found to store");
	};
	var deleteImageFromStorage = async (imageIndex, imgContainer, imageUrl) => {
		try {
			console.log(`Deleting image ${imageIndex + 1} from storage...`);
			const storedImages = (await chrome.storage.session.get(["watermarkedImages"])).watermarkedImages || [];
			if (storedImages.length > imageIndex) {
				storedImages.splice(imageIndex, 1);
				await new Promise((resolve, reject) => {
					chrome.storage.session.set({ watermarkedImages: storedImages }, () => {
						if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
						else resolve();
					});
				});
				console.log(`Image ${imageIndex + 1} deleted from session storage. ${storedImages.length} images remaining.`);
			}
			try {
				const prod = (await chrome.storage.local.get(["currentProduct"])).currentProduct;
				if (prod && Array.isArray(prod.images) && imageIndex >= 0 && imageIndex < prod.images.length) {
					prod.images.splice(imageIndex, 1);
					await chrome.storage.local.set({ currentProduct: prod });
					console.log(`Image ${imageIndex + 1} also removed from currentProduct.images`);
				}
			} catch (cpErr) {
				console.warn("Could not sync delete to currentProduct.images:", cpErr);
			}
			imgContainer.style.transition = "all 0.3s ease";
			imgContainer.style.transform = "scale(0)";
			imgContainer.style.opacity = "0";
			setTimeout(() => {
				imgContainer.remove();
				updateImageNumbers();
				console.log(`Image ${imageIndex + 1} removed from UI`);
			}, 300);
		} catch (error) {
			console.error("Error deleting image from storage:", error);
			alert("Failed to delete image. Please try again.");
		}
	};
	var updateImageNumbers = () => {
		const galleryContainer = document.getElementById("snipe-image-gallery");
		if (!galleryContainer) return;
		const imageContainers = galleryContainer.querySelectorAll(".product-image-container");
		imageContainers.forEach((container, index) => {
			const metadataOverlay = container.querySelector(".product-image-metadata");
			if (metadataOverlay) metadataOverlay.textContent = metadataOverlay.textContent.replace(/Image \d+/, `Image ${index + 1}`);
			container.setAttribute("data-image-index", index);
		});
		console.log(`Updated image numbers. ${imageContainers.length} images remaining.`);
	};
	var updateDescriptionCounterElements = () => {
		const descDisplay = document.getElementById("description-preview");
		const descCounter = document.querySelector(".ss-desc-counter");
		if (descDisplay && descCounter) {
			if (descDisplay.querySelector(".description-placeholder") || descDisplay.querySelector(".description-empty-state") || descDisplay.classList.contains("description-empty-state") || descDisplay.querySelector(".ss-desc-empty")) {
				descCounter.innerHTML = `0 / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
				return;
			}
			descCounter.innerHTML = `${(descDisplay.innerText || "").length} / 5000 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 12px; height: 12px; color: #22c55e;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
		}
	};
	var addEventListenersToPanel = () => {
		const descDisplay = document.getElementById("description-preview");
		if (descDisplay) {
			descDisplay.addEventListener("input", () => {
				const currentHtml = descDisplay.innerHTML || "";
				updateDescriptionCounterElements();
				chrome.storage.local.set({ generatedDescription: currentHtml });
			});
			updateDescriptionCounterElements();
			new MutationObserver(() => {
				updateDescriptionCounterElements();
			}).observe(descDisplay, {
				childList: true,
				characterData: true,
				subtree: true
			});
		}
		const titleDisplay = document.getElementById("ai-generated-title");
		const titleCounter = document.getElementById("ai-title-counter");
		if (titleDisplay && titleCounter) titleDisplay.addEventListener("input", () => {
			titleCounter.textContent = `${(titleDisplay.innerText || "").length} / 80 chars`;
		});
		const nightModeBtn = document.getElementById("panel-night-mode-btn");
		const restoreBtn = document.getElementById("panel-restore-btn");
		const setPanelMinimizedState = (isMinimized) => {
			const rootWrapper = document.getElementById("snipe-root-wrapper");
			if (!rootWrapper) return;
			rootWrapper.classList.toggle("panel-minimized", isMinimized);
		};
		if (!window.__sellerSuitPanelScrollBound) {
			window.__sellerSuitPanelScrollBound = true;
			let rafId = 0;
			const updatePanelOffset = () => {
				rafId = 0;
				const rootWrapper = document.getElementById("snipe-root-wrapper");
				if (!rootWrapper) return;
				const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
				const lift = Math.min(scrollY, 88);
				rootWrapper.style.setProperty("--ss-panel-scroll-offset", String(lift));
				rootWrapper.classList.toggle("ss-panel-scrolled", lift > 4);
			};
			const requestOffsetUpdate = () => {
				if (rafId) return;
				rafId = window.requestAnimationFrame(updatePanelOffset);
			};
			window.addEventListener("scroll", requestOffsetUpdate, { passive: true });
			window.addEventListener("resize", requestOffsetUpdate);
			updatePanelOffset();
		}
		if (nightModeBtn) nightModeBtn.addEventListener("click", () => {
			const rootWrapper = document.getElementById("snipe-root-wrapper");
			if (rootWrapper) rootWrapper.classList.toggle("ss-dark-mode");
			else document.body.classList.toggle("ss-dark-mode");
		});
		const minimizeBtn = document.getElementById("panel-minimize-btn");
		if (minimizeBtn) minimizeBtn.addEventListener("click", () => {
			setPanelMinimizedState(true);
		});
		if (restoreBtn) restoreBtn.addEventListener("click", () => {
			setPanelMinimizedState(false);
		});
		const closeBtn = document.getElementById("panel-close-btn");
		if (closeBtn) closeBtn.addEventListener("click", () => {
			const rootWrapper = document.getElementById("snipe-root-wrapper");
			if (rootWrapper) {
				rootWrapper.remove();
				uiInjected = false;
				chrome.storage.local.get("panelSource", (d) => {
					if (d.panelSource === "sidebar") chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
					chrome.storage.local.remove("panelSource");
				});
				const startBtn = document.getElementById("initial-list-button") || document.querySelector(".floating-snipe-btn");
				if (startBtn) startBtn.style.display = "flex";
			}
		});
		const snipeTitleBtn = document.getElementById("snipe-title-btn");
		if (snipeTitleBtn) {
			snipeTitleBtn.addEventListener("click", async () => {
				const generateAITitlesBtn = document.getElementById("generate-ai-titles-btn");
				if (generateAITitlesBtn) generateAITitlesBtn.click();
				else console.warn("⚠️ Generate AI Titles button not found");
			});
			console.log("✅ Snipe Title button listener added");
		}
		const generateAITitlesBtn = document.getElementById("generate-ai-titles-btn");
		if (generateAITitlesBtn) {
			generateAITitlesBtn.addEventListener("click", async () => {
				const completeData = scrapeCompleteProductData();
				if (!completeData.title) {
					console.error("No product title found on page");
					return;
				}
				const originalContent = generateAITitlesBtn.innerHTML;
				generateAITitlesBtn.disabled = true;
				generateAITitlesBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-animation">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Generating...
            `;
				try {
					const bgResp = await new Promise((resolve, reject) => {
						chrome.runtime.sendMessage({
							action: "GENERATE_AI_TITLES",
							productData: completeData
						}, (response) => {
							const err = chrome.runtime.lastError;
							if (err) return reject(new Error(err.message || "Background message failed"));
							resolve(response);
						});
					});
					if (!bgResp?.success) throw new Error(bgResp?.error || "Failed to generate titles");
					if (bgResp.titles && bgResp.titles.length > 0) {
						const titles = bgResp.titles;
						const titlesToSave = titles.map((t, i) => typeof t === "object" ? t.title : t);
						await chrome.storage.local.set({
							savedTitles: titlesToSave,
							selectedEbayTitle: titlesToSave[0]
						});
						if (typeof window !== "undefined" && window.UIHelper && typeof window.UIHelper.renderInlineTitles === "function") window.UIHelper.renderInlineTitles(titles);
						else if (typeof UIHelper !== "undefined" && typeof UIHelper.renderInlineTitles === "function") UIHelper.renderInlineTitles(titles);
						else {
							const titleDisplay = document.getElementById("ai-generated-title");
							const titleCounter = document.getElementById("ai-title-counter");
							if (titleDisplay) {
								titleDisplay.innerText = titlesToSave[0];
								titleDisplay.classList.add("has-title");
								if (titleCounter) titleCounter.textContent = titlesToSave[0].length + " characters";
							}
						}
					} else throw new Error("No titles returned");
				} catch (error) {
					console.error("❌ Error generating AI titles:", error);
				} finally {
					generateAITitlesBtn.disabled = false;
					generateAITitlesBtn.innerHTML = originalContent;
				}
			});
			console.log("✅ Generate AI Titles button listener added");
		}
		const generateDescriptionBtn = document.getElementById("generate-description-btn");
		const descriptionPreviewEl = document.getElementById("description-preview");
		if (generateDescriptionBtn) {
			generateDescriptionBtn.addEventListener("click", async () => {
				const originalContent = generateDescriptionBtn.innerHTML;
				generateDescriptionBtn.disabled = true;
				if (descriptionPreviewEl) descriptionPreviewEl.innerHTML = `
                    <div class="description-placeholder">
                        <div class="spinner-small"></div>
                        <span>Scraping product data & generating description...</span>
                    </div>
                `;
				try {
					const productData = scrapeCompleteProductData();
					if (!productData?.title) throw new Error("No product title found.");
					const bgResp = await new Promise((resolve, reject) => {
						chrome.runtime.sendMessage({
							action: "GENERATE_DESCRIPTION",
							productData
						}, (response) => {
							const err = chrome.runtime.lastError;
							if (err) return reject(new Error(err.message || "Background message failed"));
							resolve(response);
						});
					});
					if (!bgResp?.success) throw new Error(bgResp?.error || "Failed to generate description");
					if (!bgResp?.description) throw new Error("No description returned");
					if (descriptionPreviewEl) descriptionPreviewEl.innerHTML = bgResp.description;
					await chrome.storage.local.set({
						generatedDescription: bgResp.description,
						selectedEbayDescription: bgResp.description
					});
					if (bgResp.title) {
						console.log("🎯 AI Title generated with description:", bgResp.title);
						await chrome.storage.local.set({
							selectedEbayTitle: bgResp.title,
							savedTitles: [bgResp.title],
							selectedTitleTimestamp: Date.now(),
							generatedAt: Date.now()
						});
						if (typeof window.SSListingDraft !== "undefined") window.SSListingDraft.patchDraft({
							title: bgResp.title,
							title_source: "ai"
						}).catch(() => {});
						const titleDisplay = document.getElementById("ai-generated-title");
						const titleCounter = document.getElementById("ai-title-counter");
						const extTitle = document.getElementById("ext-title");
						if (titleDisplay) {
							titleDisplay.classList.add("has-title");
							titleDisplay.innerText = bgResp.title;
							if (titleCounter) titleCounter.innerHTML = `${bgResp.title.length} / 80 chars <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
						}
						if (extTitle) extTitle.value = bgResp.title;
					}
				} catch (error) {
					console.error("❌ Error generating AI description:", error);
					if (descriptionPreviewEl) descriptionPreviewEl.innerHTML = `
                        <div class="description-placeholder" style="color: #dc2626;">
                            <span>Error generating description: ${error.message}</span>
                        </div>
                    `;
				} finally {
					generateDescriptionBtn.disabled = false;
					generateDescriptionBtn.innerHTML = originalContent;
				}
			});
			console.log("✅ Generate AI Description button listener added");
		}
		const optiListBtn = document.getElementById("opti-list-btn");
		if (optiListBtn) {
			optiListBtn.addEventListener("click", async () => {
				const selectedRow = document.querySelector("#snipe-title-list .title-row.selected");
				const aiTitleDisplay = document.getElementById("ai-generated-title");
				const hasAiTitle = aiTitleDisplay && (aiTitleDisplay.classList.contains("has-title") || aiTitleDisplay.innerText.trim().length > 0 && aiTitleDisplay.innerText !== "Click \"Generate\" to create optimized eBay title...");
				if (selectedRow || hasAiTitle) {
					const btn = document.getElementById("opti-list-btn");
					btn.disabled = true;
					btn.textContent = "Processing...";
					try {
						if (typeof getProductDataForExport === "function") {
							const freshData = await getProductDataForExport();
							const aiTitleDisplay = document.getElementById("ai-generated-title");
							const isDefaultText = (text) => text.includes("Click \"Generate\"");
							if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) {
								freshData.title = aiTitleDisplay.innerText.trim();
								console.log("🔄 Opti-List: Auto-updated export data with AI Title:", freshData.title);
							}
							await chrome.storage.local.set({ copyButtonData: freshData });
							console.log("✅ Opti-List: Auto-saved fresh data to storage");
						}
					} catch (syncError) {
						console.error("⚠️ Opti-List: Auto-sync failed, using existing storage", syncError);
					}
					try {
						console.log("═══════════════════════════════════════════════════════");
						console.log("📋 OPTI-LIST: RETRIEVING SAVED COPY BUTTON DATA");
						console.log("═══════════════════════════════════════════════════════");
						const exportData = (await chrome.storage.local.get("copyButtonData")).copyButtonData;
						if (!exportData) {
							console.warn("⚠️ WARNING: No saved Copy button data found!");
							alert("⚠️ No saved data found!\n\nPlease click the Copy button first to save the product data.");
							btn.disabled = false;
							btn.textContent = "Upload";
							return;
						}
						console.log("═══════════════════════════════════════════════════════");
						console.log("📊 RETRIEVED COPY BUTTON DATA FROM STORAGE:");
						console.log("   Timestamp:", exportData.timestamp);
						console.log("   Title:", exportData.title);
						console.log("   SKU:", exportData.sku);
						console.log("   Sell Price (calculated):", exportData.sellPrice);
						console.log("   Walmart Price:", exportData.walmartPrice || exportData.amazonPrice);
						console.log("   Walmart Link:", exportData.walmartLink || exportData.amazonLink);
						console.log("═══════════════════════════════════════════════════════");
						if (!exportData.title || exportData.title === "No title selected") {
							alert("⚠️ No title in saved data!\n\nPlease click Copy button again after selecting a title.");
							btn.disabled = false;
							btn.textContent = "Upload";
							return;
						}
						if (!exportData.sku || exportData.sku === "No SKU") {
							alert("⚠️ No SKU in saved data!\n\nPlease click Copy button again after generating a SKU.");
							btn.disabled = false;
							btn.textContent = "Upload";
							return;
						}
						if (exportData.sellPrice === "No price" || !exportData.sellPrice) {
							alert("⚠️ No calculated price in saved data!\n\nPlease click Copy button again after calculating the price.");
							btn.disabled = false;
							btn.textContent = "Upload";
							return;
						}
						const selectedTitle = exportData.title;
						exportData.sku;
						exportData.sellPrice;
						const productDetails = scrapeProductDetails();
						await storeWatermarkedImages();
						console.log("═══════════════════════════════════════════════════════");
						console.log("🔍 Verifying image storage before navigation...");
						const storedImages = (await chrome.storage.session.get(["watermarkedImages"])).watermarkedImages || [];
						console.log(`📸 Storage verification: Found ${storedImages.length} images in storage`);
						if (storedImages.length === 0) {
							console.error("❌ CRITICAL: No images found in storage after storeWatermarkedImages()!");
							btn.disabled = false;
							btn.textContent = "❌ No Images - Try Again";
							alert("⚠️ Error: Images were not stored properly. Please try again.");
							return;
						} else console.log("✅ Image storage verification passed - proceeding to eBay");
						const finalPrice = exportData.sellPrice === "No price" ? "0" : String(exportData.sellPrice);
						const walmartPrice = (exportData.walmartPrice || exportData.amazonPrice) === "No price found" ? "0" : String(exportData.walmartPrice || exportData.amazonPrice);
						const ebayProduct = {
							title: selectedTitle,
							price: finalPrice,
							images: [],
							asin: exportData.sku || exportData.itemId || "",
							url: exportData.walmartLink || exportData.amazonLink || "",
							description: productDetails.description || "",
							specs: {
								...productDetails.brand ? { Brand: productDetails.brand } : {},
								...productDetails.model ? { "Model Number": productDetails.model } : {},
								...productDetails.color ? { Color: productDetails.color } : {},
								...productDetails.dimensions ? { Dimensions: productDetails.dimensions } : {},
								...productDetails.weight ? { Weight: productDetails.weight } : {}
							},
							ebaySku: exportData.sku,
							amazonPrice: walmartPrice,
							supplierPrice: walmartPrice,
							useStoredWatermarkedImages: true,
							supplier: "walmart",
							sourceId: exportData.itemId || ""
						};
						chrome.runtime.sendMessage({
							action: "import_ebay",
							product: ebayProduct,
							uploadType: "classic"
						});
						btn.textContent = "✅ Opening eBay…";
						setTimeout(() => {
							btn.disabled = false;
							btn.textContent = "Upload";
						}, 3e3);
					} catch (error) {
						console.error("Error in Opti-List process:", error);
						btn.disabled = false;
						btn.textContent = "Upload";
					}
				} else alert("Please select a title first.");
			});
			console.log("✅ Opti-List button listener added");
		}
		const copyBtn = document.getElementById("copy-btn");
		if (copyBtn) {
			copyBtn.addEventListener("click", async () => {
				try {
					console.log("═══════════════════════════════════════════════════════");
					console.log("📋 COPY BUTTON CLICKED - STARTING DATA COLLECTION");
					console.log("═══════════════════════════════════════════════════════");
					const productData = await getProductDataForExport();
					console.log("═══════════════════════════════════════════════════════");
					console.log("📊 PRODUCT DATA COLLECTED:");
					console.log("   Timestamp:", productData.timestamp);
					console.log("   Title:", productData.title);
					console.log("   SKU:", productData.sku);
					console.log("   Sell Price (calculated):", productData.sellPrice);
					console.log("   Walmart Price:", productData.walmartPrice);
					console.log("   Walmart Link:", productData.walmartLink);
					console.log("═══════════════════════════════════════════════════════");
					if (productData.sellPrice === "No price" || !productData.sellPrice) {
						console.warn("⚠️ WARNING: No calculated price found!");
						alert("⚠️ No calculated price found!\n\nPlease calculate the price first using the calculator (💰 Calculator or 💲 Quick Calculate button).");
						return;
					}
					const tabSeparatedData = formatDataForCopy(productData);
					console.log("📋 Tab-separated data to copy:");
					if (typeof ExtensionConfig !== "undefined" && ExtensionConfig.FEATURES.DEBUG_MODE) console.log(tabSeparatedData);
					await navigator.clipboard.writeText(tabSeparatedData);
					await chrome.storage.local.set({ copyButtonData: productData });
					console.log("💾 Copy button data saved to storage for Opti-List");
					const originalText = copyBtn.textContent;
					copyBtn.textContent = "✅ Copied!";
					copyBtn.style.background = "#28a745";
					setTimeout(() => {
						copyBtn.textContent = originalText;
						copyBtn.style.background = "";
					}, 2e3);
					console.log("✅ Data successfully copied to clipboard and saved!");
				} catch (error) {
					console.error("❌ ERROR COPYING DATA:", error);
					alert("Failed to copy data to clipboard. Please check the console for details.");
				}
			});
			console.log("✅ Copy button listener added");
		}
		const titleList = document.getElementById("snipe-title-list");
		if (titleList) {
			titleList.addEventListener("click", (e) => {
				const row = e.target.closest(".title-row");
				if (row) {
					document.querySelectorAll("#snipe-title-list .title-row").forEach((r) => r.classList.remove("selected"));
					row.classList.add("selected");
				}
			});
			console.log("✅ Title selection listener added");
		}
		const downloadBtn = document.getElementById("download-images-btn");
		if (downloadBtn) {
			downloadBtn.addEventListener("click", () => {
				downloadAllImages();
				console.log("✅ Download images button clicked");
			});
			console.log("✅ Download images button listener added");
		}
		const refreshBtn = document.getElementById("refresh-images-btn");
		if (refreshBtn) {
			refreshBtn.addEventListener("click", () => {
				const galleryContainer = document.getElementById("snipe-image-gallery");
				if (galleryContainer) galleryContainer.innerHTML = "";
				scrapeAndDisplayImages();
				console.log("✅ Refresh images button clicked");
			});
			console.log("✅ Refresh images button listener added");
		}
		const descriptionBtn = document.getElementById("new-description-btn");
		if (descriptionBtn) {
			descriptionBtn.addEventListener("click", () => {
				const productURL = window.location.href;
				chrome.runtime.sendMessage({
					action: "openNewTabForDescription",
					targetURL: "https://gemini.google.com/gem/6dced44c5365?usp=sharing",
					walmartURL: productURL
				});
				console.log("✅ Description button clicked");
			});
			console.log("✅ Description button listener added");
		}
		const productDetailsBtn = document.getElementById("product-details-btn");
		if (productDetailsBtn) {
			productDetailsBtn.addEventListener("click", () => {
				const titleSelectors = [
					"h1[itemprop=\"name\"]",
					".prod-ProductTitle",
					"[data-testid=\"product-title\"]",
					"h1.prod-Title",
					".product-title h1",
					"h1[data-automation-id=\"product-title\"]"
				];
				let productTitle = "Product Title Not Found";
				for (const selector of titleSelectors) {
					const titleElement = document.querySelector(selector);
					if (titleElement) {
						productTitle = titleElement.innerText?.trim() || productTitle;
						break;
					}
				}
				chrome.runtime.sendMessage({
					action: "openNewTabForProductDetails",
					targetURL: "https://gemini.google.com/gem/6dced44c5365?usp=sharing",
					walmartTitle: productTitle
				});
				console.log("✅ Product Details button clicked - Title scraped:", productTitle);
			});
			console.log("✅ Product Details button listener added");
		}
		const generateSkuBtn = document.getElementById("generate-sku-btn");
		if (generateSkuBtn) {
			generateSkuBtn.addEventListener("click", async () => {
				await generateSKU();
			});
			console.log("✅ SKU Generator button listener added");
		}
		loadSKUSettings();
		chrome.storage.onChanged.addListener((changes, namespace) => {
			if (namespace === "sync" && (changes.selectedSKU || changes.autoSkuEnabled)) {
				console.log("🔄 SKU settings changed, reloading...");
				loadSKUSettings();
			}
		});
		chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message.type === "SKU_SETTINGS_UPDATED") {
				console.log("📨 SKU settings update received:", message.data);
				loadSKUSettings();
			}
		});
		const calculatorBtn = document.getElementById("calculator-btn");
		if (calculatorBtn) {
			calculatorBtn.addEventListener("click", () => {
				openCalculator();
				console.log("✅ Calculator button clicked");
			});
			console.log("✅ Calculator button listener added");
		}
		const quickCalcBtn = document.getElementById("quick-calc-btn");
		if (quickCalcBtn) {
			quickCalcBtn.addEventListener("click", () => {
				quickCalculate();
				console.log("✅ Quick Calculate button clicked");
			});
			console.log("✅ Quick Calculate button listener added");
		}
		const priceInput = document.querySelector(".price-field input");
		const skuInput = document.getElementById("sku-input");
		if (priceInput) {
			priceInput.addEventListener("input", validatePriceInput);
			priceInput.addEventListener("blur", validatePriceInput);
		}
		if (skuInput) skuInput.addEventListener("focus", () => {
			if (!skuInput.value) {
				skuInput.style.backgroundColor = "#fff3cd";
				skuInput.style.borderColor = "#ffc107";
			}
		});
		window.checkStoredSku = () => {
			chrome.storage.local.get(["ebaySku"], (result) => {
				console.log("🔍 Checking stored SKU:", result);
				if (result.ebaySku) {
					console.log("✅ SKU found in storage:", result.ebaySku);
					alert(`SKU in storage: ${result.ebaySku}`);
				} else {
					console.log("❌ No SKU found in storage");
					alert("No SKU found in storage");
				}
			});
		};
		window.clearStoredSku = () => {
			chrome.storage.local.remove(["ebaySku"], () => {
				console.log("🧹 SKU cleared from storage");
				alert("SKU cleared from storage");
			});
		};
	};
	var createTitleRow = (data, isSelected = false) => `<div class="title-row ${isSelected ? "selected" : ""}" data-title="${data.title}"><div class="rank">${data.rank}</div><div class="type">${data.type}</div><div class="title-text" contenteditable="true">${data.title}</div><div class="char-count">${data.charCount}</div><button class="action-btn">Change</button></div>`;
	var downloadAllImages = () => {
		console.log("Starting download of all images...");
		const galleryContainer = document.getElementById("snipe-image-gallery");
		if (!galleryContainer) {
			console.error("Image gallery not found");
			return;
		}
		const images = galleryContainer.querySelectorAll(".product-image-1600");
		if (images.length === 0) {
			alert("No images found to download. Please scrape images first.");
			return;
		}
		console.log(`Found ${images.length} images to download`);
		if (typeof JSZip !== "undefined") downloadImagesAsZip(images);
		else downloadImagesIndividually(images);
	};
	var downloadImagesIndividually = (images) => {
		images.forEach((img, index) => {
			try {
				const link = document.createElement("a");
				link.download = `product-image-${index + 1}-1600x1600.jpg`;
				link.href = img.src;
				link.click();
				console.log(`Downloaded image ${index + 1}`);
			} catch (error) {
				console.error(`Failed to download image ${index + 1}:`, error);
			}
		});
		setTimeout(() => {
			console.log("All images download initiated");
		}, 100);
	};
	var downloadImagesAsZip = (images) => {
		const zip = new JSZip();
		const folder = zip.folder("product-images");
		images.forEach((img, index) => {
			try {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				const tempImg = new Image();
				tempImg.onload = () => {
					canvas.width = tempImg.width;
					canvas.height = tempImg.height;
					ctx.drawImage(tempImg, 0, 0);
					canvas.toBlob((blob) => {
						folder.file(`product-image-${index + 1}-1600x1600.jpg`, blob);
						if (index === images.length - 1) zip.generateAsync({ type: "blob" }).then((content) => {
							const link = document.createElement("a");
							link.download = "product-images-1600x1600.zip";
							link.href = URL.createObjectURL(content);
							link.click();
							console.log("ZIP file downloaded");
						});
					}, "image/jpeg", .9);
				};
				tempImg.src = img.src;
			} catch (error) {
				console.error(`Failed to add image ${index + 1} to ZIP:`, error);
			}
		});
	};
	var injectInlineButtons = () => {
		document.querySelectorAll("div[data-item-id], [data-testid=\"list-view\"] [data-testid=\"item-card\"], [data-testid=\"grid-view\"] [data-testid=\"item-card\"]").forEach((tile) => {
			if (tile.querySelector(".sellersuit-btn-marker")) return;
			const linkEl = tile.querySelector("a[href*=\"/ip/\"]");
			if (!linkEl) return;
			let targetUrl = linkEl.href;
			if (!targetUrl.startsWith("http")) targetUrl = window.location.origin + linkEl.getAttribute("href");
			targetUrl = targetUrl.includes("#") ? targetUrl.split("#")[0] + "#sellersuit_auto_list=true" : targetUrl + "#sellersuit_auto_list=true";
			const wrapper = document.createElement("div");
			wrapper.className = "sellersuit-btn-wrapper";
			wrapper.style.cssText = "position: static; display: block; margin: 8px 0 0 0; padding: 6px 8px; border-radius: 6px;";
			const btn = document.createElement("a");
			btn.className = "sellersuit-btn-marker";
			btn.href = targetUrl;
			btn.target = "_blank";
			btn.innerHTML = `
            <span aria-hidden="true" style="display:inline-flex;align-items:baseline;margin-right:8px;font-weight:900;font-size:14px;line-height:1;letter-spacing:-0.02em;">
                <span style="color: #E53238;">e</span><span style="color: #0064D2;">b</span><span style="color: #F5AF02;">a</span><span style="color: #86B817;">y</span>
            </span>
            <span style="font-weight:600;">List on eBay</span>
        `;
			btn.style.cssText = "display: inline-block; padding: 6px 12px; border-radius: 5px; background: #0654ba; color: #fff; text-decoration: none; cursor: pointer; border: none; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-weight: 600; font-size: 13px; transition: opacity 0.2s;";
			btn.addEventListener("mouseenter", () => btn.style.opacity = "0.9");
			btn.addEventListener("mouseleave", () => btn.style.opacity = "1.0");
		});
		if (!!document.querySelector("h1[itemprop=\"name\"], .prod-ProductTitle, [data-testid=\"product-title\"]") || !!document.querySelector("[data-testid=\"buy-box-container\"], #buy-box-container, [data-automation=\"buybox\"]")) {
			if (document.querySelector("[data-testid=\"buy-box-container\"], #buy-box-container, [data-automation=\"buybox\"], .prod-product-cta-add-to-cart, .add-to-cart-section") && !document.getElementById("initial-list-button-container")) {
				const wrapper = document.createElement("div");
				wrapper.id = "initial-list-button-container";
				wrapper.className = "sellersuit-btn-wrapper";
				wrapper.style.cssText = "position: static; display: block; margin: 8px 0 16px 0; padding: 6px 8px; border-radius: 6px;";
				const btn = document.createElement("button");
				btn.id = "initial-list-button";
				btn.className = "sellersuit-btn-marker";
				btn.type = "button";
				btn.innerHTML = `
                <span aria-hidden="true" style="display:inline-flex;align-items:baseline;margin-right:10px;font-weight:900;font-size:16px;line-height:1;letter-spacing:-0.02em;">
                    <span style="color: #E53238;">e</span><span style="color: #0064D2;">b</span><span style="color: #F5AF02;">a</span><span style="color: #86B817;">y</span>
                </span>
                <span style="font-weight:600;">List it</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;opacity:0.75;">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            `;
				btn.style.cssText = "display: inline-block; padding: 6px 12px; border-radius: 5px; background: #0654ba; color: #fff; text-decoration: none; cursor: pointer; border: none; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-weight: 600; font-size: 13px; transition: opacity 0.2s;";
				btn.addEventListener("mouseenter", () => btn.style.opacity = "0.9");
				btn.addEventListener("mouseleave", () => btn.style.opacity = "1.0");
				btn.addEventListener("click", () => {
					chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
					wrapper.style.display = "none";
				});
			}
		}
	};
	var waitForProductPageReady = (checkReady, callback) => {
		if (checkReady()) {
			callback();
			return;
		}
		const observer = new MutationObserver((mutations, obs) => {
			if (checkReady()) {
				obs.disconnect();
				callback();
			}
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		setTimeout(() => {
			observer.disconnect();
			callback();
		}, 1e4);
	};
	var initializeApp = () => {
		console.log("🚀 Initializing Walmart app...");
		console.log("🌐 Current URL:", window.location.href);
		console.log("🏷️ Page title:", document.title);
		const isWalmartDomain = window.location.hostname.includes("walmart");
		console.log("🛒 Is Walmart domain:", isWalmartDomain);
		if (!isWalmartDomain) {
			console.log("❌ Not on Walmart domain, skipping initialization");
			return;
		}
		if (window.location.hash.includes("sellersuit_auto_list") || window.location.search.includes("sellersuit_auto_list")) {
			console.log("[Walmart Injector] Auto-list trigger detected, waiting for scannable DOM...");
			const checkReady = () => {
				return !!document.querySelector("h1[itemprop=\"name\"], .prod-ProductTitle, [data-testid=\"product-title\"]") || !!document.querySelector("[data-testid=\"buy-box-container\"], #buy-box-container, [data-automation=\"buybox\"], .prod-product-cta-add-to-cart, .add-to-cart-section");
			};
			waitForProductPageReady(checkReady, () => {
				console.log("[Walmart Injector] DOM scannable, opening side panel & triggering auto-scan...");
				chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
				chrome.runtime.sendMessage({ action: "DOM_READY_AUTO_SCAN" });
			});
			const newSearch = window.location.search.replace(/[?&]sellersuit_auto_list=true/, "").replace(/^&/, "?");
			const newHash = window.location.hash.replace(/#?sellersuit_auto_list=true/, "");
			history.replaceState(null, null, window.location.pathname + newSearch + newHash);
		}
		injectInlineButtons();
		new MutationObserver((mutations) => {
			if (mutations.some((m) => m.addedNodes.length > 0 && Array.from(m.addedNodes).some((n) => n.nodeType === Node.ELEMENT_NODE))) injectInlineButtons();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
		setInterval(injectInlineButtons, 1500);
		console.log("✅ eBay Lister extension initialized with inline button injection for Walmart.");
	};
	function openCalculator() {
		console.log("🔍 Opening calculator...");
		const popup = document.getElementById("calculator-popup");
		if (popup) {
			popup.style.display = "flex";
			console.log("✅ Calculator popup displayed");
			loadCalculatorValues();
			const walmartPriceInput = document.getElementById("supplier-price");
			if (walmartPriceInput) {
				const scrapedPrice = scrapeWalmartPrice();
				if (scrapedPrice !== "No price found") {
					walmartPriceInput.value = scrapedPrice;
					console.log("💰 Auto-filled Walmart price:", scrapedPrice);
				} else console.log("⚠️ No fresh Walmart price scraped on open");
			}
			calculatePrice();
			console.log("✅ Calculator opened successfully");
		} else console.error("❌ Calculator popup not found");
	}
	function closeCalculator() {
		console.log("🔍 Closing calculator...");
		const popup = document.getElementById("calculator-popup");
		if (popup) {
			popup.style.display = "none";
			console.log("✅ Calculator closed");
		} else console.error("❌ Calculator popup not found for closing");
	}
	function loadCalculatorValues() {
		try {
			const savedValues = JSON.parse(localStorage.getItem("calculatorValues") || "{}");
			[
				"tax-percent",
				"tracking-fee",
				"ebay-fee-percent",
				"promo-fee-percent",
				"desired-profit",
				"payment-fixed-fee"
			].forEach((fieldId) => {
				const input = document.getElementById(fieldId);
				if (input && savedValues[fieldId] !== void 0) input.value = savedValues[fieldId];
			});
		} catch (e) {
			console.error("Error loading calculator values:", e);
		}
	}
	function saveCalculatorValues() {
		try {
			const values = {};
			[
				"tax-percent",
				"tracking-fee",
				"ebay-fee-percent",
				"promo-fee-percent",
				"desired-profit",
				"payment-fixed-fee"
			].forEach((fieldId) => {
				const input = document.getElementById(fieldId);
				if (input && input.value !== "") values[fieldId] = input.value;
			});
			localStorage.setItem("calculatorValues", JSON.stringify(values));
		} catch (e) {
			console.error("Error saving calculator values:", e);
		}
	}
	function quickCalculate() {
		console.log("⚡ Quick calculating...");
		const savedValues = JSON.parse(localStorage.getItem("calculatorValues") || "{}");
		let walmartPrice = 0;
		const scrapedPrice = scrapeWalmartPrice();
		if (scrapedPrice !== "No price found") {
			walmartPrice = parseFloat(scrapedPrice);
			console.log("💰 Using scraped Walmart price for quick calc:", walmartPrice);
		} else {
			console.log("⚠️ Scrape failed, quick calc skipped (waiting for price)");
			const sellItForInput = document.getElementById("sell-it-for-input");
			if (sellItForInput && !sellItForInput.value) sellItForInput.placeholder = "No price found";
			return;
		}
		const parseVal = (val, def) => {
			const parsed = parseFloat(val);
			return isNaN(parsed) ? def : parsed;
		};
		const taxPercent = parseVal(savedValues["tax-percent"], 9);
		const trackingFee = parseVal(savedValues["tracking-fee"], .2);
		const ebayFeePercent = parseVal(savedValues["ebay-fee-percent"], 20);
		const promoFeePercent = parseVal(savedValues["promo-fee-percent"], 10);
		const desiredProfit = parseVal(savedValues["desired-profit"], 0);
		const paymentFixedFee = parseVal(savedValues["payment-fixed-fee"], .3);
		if (typeof calculateSellingPrice !== "function") {
			console.error("calculateSellingPrice is not defined");
			return;
		}
		const result = calculateSellingPrice({
			sourcePrice: walmartPrice,
			taxPercent,
			trackingFee,
			ebayFeePercent,
			promoFeePercent,
			desiredProfit,
			paymentFixedFee
		});
		if (!result) return;
		const sellItForInput = document.getElementById("sell-it-for-input") || document.querySelector("input[aria-label*=\"Sell it for\" i]") || document.querySelector(".price-field input[type=\"text\"]") || document.querySelector("input[placeholder*=\"Sell it for\" i]");
		if (sellItForInput) {
			sellItForInput.value = result.finalPrice.toFixed(2);
			sellItForInput.style.backgroundColor = "#e8f5e8";
			sellItForInput.style.borderColor = "#4caf50";
			setTimeout(() => {
				sellItForInput.style.backgroundColor = "";
				sellItForInput.style.borderColor = "";
			}, 1500);
			console.log("💰 Quick calculated price:", result.finalPrice.toFixed(2));
		} else console.error("❌ Sell it for input not found");
	}
	function calculatePrice() {
		console.log("🧮 Starting price calculation...");
		const walmartPrice = parseFloat(document.getElementById("supplier-price").value) || 0;
		const taxPercent = parseFloat(document.getElementById("tax-percent").value) || 0;
		const trackingFee = parseFloat(document.getElementById("tracking-fee").value) || 0;
		const ebayFeePercent = parseFloat(document.getElementById("ebay-fee-percent").value) || 0;
		const promoFeePercent = parseFloat(document.getElementById("promo-fee-percent").value) || 0;
		const desiredProfit = parseFloat(document.getElementById("desired-profit").value) || 0;
		const paymentFixedFee = parseFloat(document.getElementById("payment-fixed-fee").value) || 0;
		console.log("📊 Input values:", {
			walmartPrice,
			taxPercent,
			trackingFee,
			ebayFeePercent,
			promoFeePercent,
			desiredProfit,
			paymentFixedFee
		});
		if (walmartPrice <= 0) {
			const resultDiv = document.getElementById("calculator-result");
			if (resultDiv) resultDiv.style.display = "none";
			updateBreakdownDisplay(null);
			console.log("⚠️ No valid Walmart price entered yet");
			return;
		}
		if (typeof calculateSellingPrice !== "function") {
			console.error("calculateSellingPrice is not defined");
			return;
		}
		const result = calculateSellingPrice({
			sourcePrice: walmartPrice,
			taxPercent,
			trackingFee,
			ebayFeePercent,
			promoFeePercent,
			desiredProfit,
			paymentFixedFee
		});
		if (!result) return;
		const sku = document.getElementById("sku-input")?.value || "";
		let selectedTitle = "";
		const aiTitleDisplay = document.getElementById("ai-generated-title");
		const isDefaultText = (t) => t.includes("Click \"Generate\"");
		if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) selectedTitle = aiTitleDisplay.innerText.trim();
		else {
			const selectedTitleRow = document.querySelector("#snipe-title-list .title-row.selected");
			selectedTitle = selectedTitleRow ? selectedTitleRow.dataset.title : "";
		}
		const walmartLink = window.location.href;
		if (sku && selectedTitle) try {
			chrome.runtime.sendMessage({
				action: "logSheet",
				payload: {
					title: selectedTitle,
					sku,
					ebay_price: result.finalPrice.toFixed(2),
					source_price: walmartPrice.toFixed(2),
					product_url: walmartLink
				}
			});
		} catch (e) {
			console.error("Sheet logging failed:", e);
		}
		const resultDiv = document.getElementById("calculator-result");
		const priceDiv = document.getElementById("final-price");
		if (resultDiv && priceDiv) {
			priceDiv.textContent = `$${result.finalPrice.toFixed(2)}`;
			resultDiv.style.display = "block";
		}
		const sellItForInput = document.getElementById("sell-it-for-input") || document.querySelector("input[aria-label*=\"Sell it for\" i]") || document.querySelector(".price-field input[type=\"text\"]") || document.querySelector("input[placeholder*=\"Sell it for\" i]");
		if (sellItForInput) {
			sellItForInput.value = result.finalPrice.toFixed(2);
			sellItForInput.style.backgroundColor = "#e8f5e8";
			sellItForInput.style.borderColor = "#4caf50";
			setTimeout(() => {
				sellItForInput.style.backgroundColor = "";
				sellItForInput.style.borderColor = "";
			}, 1500);
		}
		updateBreakdownDisplay(result);
		saveCalculatorValues();
		console.log("💰 Price calculated:", result.finalPrice.toFixed(2));
	}
	function updateBreakdownDisplay(result) {
		const breakdownDiv = document.getElementById("calculator-breakdown");
		if (!breakdownDiv) return;
		if (!result) {
			breakdownDiv.style.display = "none";
			return;
		}
		breakdownDiv.style.display = "flex";
		const setVal = (id, text, color) => {
			const el = document.getElementById(id);
			if (el) {
				el.textContent = text;
				el.style.color = color || "";
			}
		};
		setVal("bd-source", `$${result.breakdown.sourcePrice.toFixed(2)}`);
		setVal("bd-tax", `$${result.breakdown.taxAmount.toFixed(2)}`);
		setVal("bd-tracking", `$${result.breakdown.trackingFee.toFixed(2)}`);
		setVal("bd-payment", `$${result.breakdown.paymentFixedFee.toFixed(2)}`);
		setVal("bd-ebay", `$${result.breakdown.ebayFee.toFixed(2)}`);
		setVal("bd-promo", `$${result.breakdown.promoFee.toFixed(2)}`);
		const profitColor = result.netProfit >= 0 ? "#22c55e" : "#ef4444";
		setVal("bd-profit", `$${result.netProfit.toFixed(2)}`, profitColor);
		setVal("bd-roi", `${result.roi}%`, profitColor);
		setVal("bd-margin", `${result.margin}%`, profitColor);
	}
	function addCalculatorEventListeners() {
		const popup = document.getElementById("calculator-popup");
		if (!popup) return;
		const closeBtn = document.getElementById("calculator-close-btn");
		if (closeBtn) {
			closeBtn.addEventListener("click", closeCalculator);
			console.log("✅ Calculator close button listener added");
		}
		const overlay = popup.querySelector(".calculator-overlay");
		if (overlay) {
			overlay.addEventListener("click", closeCalculator);
			console.log("✅ Calculator overlay listener added");
		}
		const calculateBtn = document.getElementById("calculate-btn");
		if (calculateBtn) {
			calculateBtn.addEventListener("click", calculatePrice);
			console.log("✅ Calculator calculate button listener added");
		}
		let calculateTimeout;
		popup.querySelectorAll("input[type=\"number\"]").forEach((input) => {
			input.addEventListener("input", () => {
				clearTimeout(calculateTimeout);
				calculateTimeout = setTimeout(() => {
					calculatePrice();
				}, 300);
			});
			input.addEventListener("input", validatePriceInput);
		});
		console.log("✅ Calculator input listeners added");
	}
	function validatePriceInput(event) {
		const input = event.target;
		const value = parseFloat(input.value);
		if (isNaN(value) || value < 0) {
			input.style.backgroundColor = "#f8d7da";
			input.style.borderColor = "#dc3545";
			input.style.color = "#721c24";
		} else {
			input.style.backgroundColor = "#d4edda";
			input.style.borderColor = "#28a745";
			input.style.color = "#155724";
		}
	}
	window.testCalculator = function() {
		console.log("🧪 Testing calculator...");
		const popup = document.getElementById("calculator-popup");
		const button = document.getElementById("calculator-btn");
		console.log("Calculator popup exists:", !!popup);
		console.log("Calculator button exists:", !!button);
		if (button) {
			console.log("🔍 Calculator button found, testing click...");
			button.click();
		} else console.error("❌ Calculator button not found");
	};
	async function getProductDataForExport() {
		let title = "No title selected";
		const aiTitleDisplay = document.getElementById("ai-generated-title");
		const isDefaultText = (text) => text.includes("Click \"Generate\"");
		if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) title = aiTitleDisplay.innerText.trim();
		else {
			const selectedRow = document.querySelector("#snipe-title-list .title-row.selected");
			if (selectedRow) title = selectedRow.dataset.title;
		}
		const sku = document.getElementById("sku-input")?.value || "No SKU";
		const priceInput = document.getElementById("sell-it-for-input") || document.querySelector(".price-field input[type=\"text\"]") || document.querySelector("input[aria-label*=\"Sell it for\" i]") || document.querySelector(".price-field input");
		const finalPriceElement = document.getElementById("final-price");
		let sellPrice = "No price";
		if (priceInput && priceInput.value && priceInput.value.trim() !== "") {
			sellPrice = priceInput.value.trim();
			console.log("✅ Found price from input field:", sellPrice);
		} else if (finalPriceElement && finalPriceElement.textContent) {
			const priceMatch = finalPriceElement.textContent.trim().match(/[\d.]+/);
			if (priceMatch) {
				sellPrice = priceMatch[0];
				console.log("✅ Found price from final-price element:", sellPrice);
			}
		} else console.warn("⚠️ No calculated price found. Please calculate price first.");
		const walmartPrice = scrapeWalmartPrice();
		const walmartLink = window.location.href;
		return {
			timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
			title,
			sku,
			sellPrice,
			walmartPrice,
			walmartLink,
			amazonPrice: walmartPrice,
			amazonLink: walmartLink
		};
	}
	function scrapeWalmartPrice() {
		console.log("🔍 Starting Walmart price scraping...");
		const containerSelectors = [
			"[data-testid=\"buy-box-container\"]",
			"[data-automation=\"buybox\"]",
			"#buy-box-container",
			"main",
			"article"
		];
		const priceSelectors = [
			"[itemprop=\"price\"]",
			".price-characteristic",
			"[data-testid=\"price\"]",
			".price-group",
			".prod-PriceHero",
			"[data-automation-id=\"product-price\"]",
			".inline-flex .f2",
			".f1.lh-title"
		];
		for (const containerSel of containerSelectors) {
			const container = document.querySelector(containerSel);
			if (container) {
				console.log(`🔍 Scoping price search inside container: "${containerSel}"`);
				const characteristicElement = container.querySelector(".price-characteristic");
				const mantissaElement = container.querySelector(".price-mantissa");
				if (characteristicElement) {
					let wholePart = characteristicElement.textContent?.replace(/[^\d]/g, "") || "";
					let decimalPart = mantissaElement?.textContent?.replace(/[^\d]/g, "") || "00";
					if (wholePart) {
						const fullPrice = parseFloat(`${wholePart}.${decimalPart}`);
						if (!isNaN(fullPrice) && fullPrice > 0) {
							console.log("✅ Scoped split price found:", fullPrice);
							return fullPrice.toFixed(2);
						}
					}
				}
				for (const selector of priceSelectors) {
					const priceElement = container.querySelector(selector);
					if (priceElement) {
						let priceText = priceElement.textContent || priceElement.innerText;
						priceText = priceText.replace(/[^\d.,]/g, "").replace(/,/g, "");
						const priceMatch = priceText.match(/(\d+\.?\d*)/);
						if (priceMatch) {
							const price = parseFloat(priceMatch[1]);
							if (!isNaN(price) && price > 0) {
								console.log(`✅ Scoped price found via "${selector}":`, price);
								return price.toFixed(2);
							}
						}
					}
				}
			}
		}
		console.log("🔄 Container search failed. Trying document-wide selectors...");
		const characteristicElement = document.querySelector(".price-characteristic");
		const mantissaElement = document.querySelector(".price-mantissa");
		if (characteristicElement) {
			let wholePart = characteristicElement.textContent?.replace(/[^\d]/g, "") || "";
			let decimalPart = mantissaElement?.textContent?.replace(/[^\d]/g, "") || "00";
			if (wholePart) {
				const fullPrice = parseFloat(`${wholePart}.${decimalPart}`);
				if (!isNaN(fullPrice) && fullPrice > 0) {
					console.log("✅ Document split price format found:", fullPrice);
					return fullPrice.toFixed(2);
				}
			}
		}
		for (let i = 0; i < priceSelectors.length; i++) {
			const selector = priceSelectors[i];
			const priceElement = document.querySelector(selector);
			if (priceElement) {
				let priceText = priceElement.textContent || priceElement.innerText;
				priceText = priceText.replace(/[^\d.,]/g, "").replace(/,/g, "");
				const priceMatch = priceText.match(/(\d+\.?\d*)/);
				if (priceMatch) {
					const price = parseFloat(priceMatch[1]);
					if (!isNaN(price) && price > 0) {
						console.log("✅ Document price scraped successfully:", price);
						return price.toFixed(2);
					}
				}
			}
			const parentContainer = priceElement?.closest(".price-group, .price-wrapper, [class*=\"price\"]");
			if (parentContainer) {
				const fullPriceText = parentContainer.textContent || parentContainer.innerText;
				for (const pattern of [
					/\$(\d+\.\d{2})/,
					/(\d+\.\d{2})/,
					/\$(\d+\.\d{1})/,
					/(\d+\.\d{1})/,
					/\$(\d+)/,
					/(\d+)/
				]) {
					const match = fullPriceText.match(pattern);
					if (match) {
						const price = parseFloat(match[1]);
						if (!isNaN(price) && price > 0) {
							console.log("✅ Document parent price found:", price);
							return price.toFixed(2);
						}
					}
				}
			}
		}
		console.log("⚠️ Could not scrape Walmart price from any selector");
		console.log("🔍 Available price elements on page:");
		document.querySelectorAll("[class*=\"price\"], [id*=\"price\"], [class*=\"cost\"], [id*=\"cost\"]").forEach((el, index) => {
			if (index < 5) console.log(`   Element ${index + 1}:`, el.className, el.id, el.textContent?.substring(0, 50));
		});
		console.log("🔄 Trying fallback price detection...");
		const allText = document.body.innerText;
		for (const pattern of [
			/\$(\d+\.\d{2})/g,
			/(\d+\.\d{2})/g,
			/\$(\d+\.\d{1})/g,
			/(\d+\.\d{1})/g,
			/\$(\d+)/g,
			/(\d+)/g
		]) {
			const matches = [...allText.matchAll(pattern)];
			if (matches.length > 0) for (const match of matches) {
				const price = parseFloat(match[1]);
				if (price > .01 && price < 1e4) {
					console.log("✅ Fallback price found:", price);
					return price.toFixed(2);
				}
			}
		}
		return "No price found";
	}
	function formatDataForCopy(data) {
		return `${data.timestamp}\t${data.title}\t${data.sku}\t${data.sellPrice}\t${data.walmartPrice}\t${data.walmartLink}`;
	}
	async function loadSKUSettings() {
		try {
			console.log("📥 Loading SKU settings...");
			const result = await chrome.storage.sync.get(["selectedSKU", "autoSkuEnabled"]);
			const selectedSKU = result.selectedSKU || "AB";
			const autoSkuEnabled = result.autoSkuEnabled !== void 0 ? result.autoSkuEnabled : true;
			console.log("📊 SKU settings loaded:", {
				selectedSKU,
				autoSkuEnabled
			});
			const skuPrefixSelect = document.getElementById("sku-prefix");
			if (skuPrefixSelect) {
				skuPrefixSelect.value = selectedSKU;
				console.log("✅ SKU prefix updated to:", selectedSKU);
			}
			if (autoSkuEnabled) {
				console.log("🔄 Auto-generating SKU...");
				await generateSKU();
			} else {
				console.log("📝 Auto SKU disabled, showing manual input");
				const skuInput = document.getElementById("sku-input");
				if (skuInput) {
					skuInput.value = selectedSKU;
					skuInput.readOnly = false;
					skuInput.placeholder = `Enter SKU (prefix: ${selectedSKU})`;
				}
			}
		} catch (error) {
			console.error("❌ Error loading SKU settings:", error);
		}
	}
	async function generateSKU() {
		try {
			console.log("🏷️ Generating SKU...");
			const result = await chrome.storage.sync.get(["selectedSKU", "autoSkuEnabled"]);
			const prefix = result.selectedSKU || "AB";
			const autoSkuEnabled = result.autoSkuEnabled !== void 0 ? result.autoSkuEnabled : true;
			console.log("📊 Using prefix:", prefix, "Auto enabled:", autoSkuEnabled);
			const generatedSku = `${prefix}${Date.now().toString().slice(-6)}`;
			console.log("✅ Generated SKU:", generatedSku);
			const skuInput = document.getElementById("sku-input");
			if (skuInput) {
				skuInput.value = generatedSku;
				skuInput.readOnly = autoSkuEnabled;
			}
			const skuPrefixSelect = document.getElementById("sku-prefix");
			if (skuPrefixSelect) skuPrefixSelect.value = prefix;
			await chrome.storage.local.set({ ebaySku: generatedSku });
			console.log("🔒 SKU saved to storage:", generatedSku);
			let selectedTitle = "";
			const aiTitleDisplay = document.getElementById("ai-generated-title");
			const isDefaultText = (t) => t.includes("Click \"Generate\"");
			if (aiTitleDisplay && !isDefaultText(aiTitleDisplay.innerText)) selectedTitle = aiTitleDisplay.innerText.trim();
			else {
				const selectedTitleRow = document.querySelector("#snipe-title-list .title-row.selected");
				selectedTitle = selectedTitleRow ? selectedTitleRow.dataset.title : "";
			}
			const priceInput = document.getElementById("sell-it-for-input");
			const ebayPrice = priceInput ? priceInput.value : "";
			const walmartPriceInput = document.getElementById("supplier-price");
			const walmartPrice = walmartPriceInput ? walmartPriceInput.value : "";
			if (selectedTitle && ebayPrice && walmartPrice) try {
				chrome.runtime.sendMessage({
					action: "SAVE_TO_SHEET",
					payload: {
						title: selectedTitle,
						sku: generatedSku,
						ebayPrice,
						walmartPrice,
						walmartUrl: window.location.href
					}
				});
			} catch (e) {
				console.error("Sheet logging failed:", e);
			}
		} catch (error) {
			console.error("❌ Error generating SKU:", error);
		}
	}
	window.forceLoadExtension = function() {
		console.log("🔧 Manually triggering extension load...");
		injectUI();
	};
	window.debugWalmartPage = function() {
		console.log("🔍 Debugging Walmart page elements...");
		console.log("🌐 URL:", window.location.href);
		console.log("🏷️ Title:", document.title);
		console.log("🛒 Domain:", window.location.hostname);
		const elements = {
			productTitle: document.querySelector("h1[itemprop=\"name\"], .prod-ProductTitle, [data-testid=\"product-title\"]"),
			productImage: document.querySelector(".prod-hero-image, [data-testid=\"hero-image\"]"),
			priceElement: document.querySelector("[itemprop=\"price\"], .price-characteristic, [data-testid=\"price\"]"),
			addToCart: document.querySelector("[data-testid=\"add-to-cart-button\"], button[data-automation-id=\"atc-button\"]"),
			productDetails: document.querySelector(".specifications-table, [data-testid=\"product-specifications\"]"),
			buyBox: document.querySelector(".prod-product-cta-add-to-cart, .add-to-cart-section"),
			itemId: document.querySelector("[data-item-id], [data-product-id]")
		};
		Object.entries(elements).forEach(([name, element]) => {
			console.log(`${name}:`, !!element, element ? element.textContent?.substring(0, 50) : "");
		});
		return elements;
	};
	function startExtension() {
		console.log("[Walmart Injector] Starting extension initialization...");
		initializeApp();
	}
	if (document.readyState === "complete") startExtension();
	else if (document.readyState === "interactive") startExtension();
	else document.addEventListener("DOMContentLoaded", startExtension);
	window.addEventListener("load", () => {
		if (!document.getElementById("snipe-root-wrapper")) {
			console.log("[Walmart Injector] Load event - attempting initialization");
			startExtension();
		}
	});
	var lastUrl = location.href;
	var urlObserver = new MutationObserver(() => {
		if (location.href !== lastUrl) {
			lastUrl = location.href;
			console.log("[Walmart Injector] URL changed, re-initializing...");
			setTimeout(startExtension, 500);
		}
	});
	if (document.body) urlObserver.observe(document.body, {
		childList: true,
		subtree: true
	});
	else document.addEventListener("DOMContentLoaded", () => {
		urlObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	});
	//#endregion
	//#region content_scripts/image_editor.js
	(() => {
		const EDITOR_FRAME_ID = "snipe-editor-iframe";
		let activeEditorFrame = null;
		let activeImageIndex = -1;
		let activeImageSrc = null;
		window.openImageEditor = function(src, index) {
			if (activeEditorFrame) {
				console.warn("Editor already open");
				return;
			}
			console.log("🚀 Opening Image Editor (Iframe Mode)...", {
				src,
				index
			});
			activeImageIndex = index;
			activeImageSrc = src;
			const frame = document.createElement("iframe");
			frame.id = EDITOR_FRAME_ID;
			frame.src = chrome.runtime.getURL("ui/editor_frame.html");
			Object.assign(frame.style, {
				position: "fixed",
				top: "0",
				left: "0",
				width: "100vw",
				height: "100vh",
				border: "none",
				zIndex: "2147483647",
				backgroundColor: "transparent",
				display: "block"
			});
			document.body.appendChild(frame);
			activeEditorFrame = frame;
			document.body.style.overflow = "hidden";
			window.addEventListener("message", handleEditorMessage);
		};
		function handleEditorMessage(event) {
			const { type, payload } = event.data;
			if (!type) return;
			console.log("[Host Bridge] Received:", type);
			switch (type) {
				case "EDITOR_READY":
					if (activeEditorFrame && activeEditorFrame.contentWindow) activeEditorFrame.contentWindow.postMessage({
						type: "INIT_IMAGE",
						payload: {
							src: activeImageSrc,
							index: activeImageIndex
						}
					}, "*");
					break;
				case "SAVE_IMAGE":
					handleSaveImage(payload.dataUrl);
					break;
				case "CLOSE_EDITOR":
					closeEditorFrame();
					break;
			}
		}
		async function handleSaveImage(dataUrl) {
			if (activeImageIndex === -1) return;
			console.log("💾 Saving image to page DOM...");
			const container = document.querySelector(`.product-image-container[data-image-index="${activeImageIndex}"]`);
			if (container) {
				const img = container.querySelector("img.product-image-1600") || container.querySelector("img");
				if (img) {
					img.src = dataUrl;
					console.log("✅ Page Image Updated");
				}
			}
			try {
				const STORAGE_KEY = "watermarkedImages";
				const result = await chrome.storage.session.get(STORAGE_KEY);
				const arr = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
				if (arr.length <= activeImageIndex) for (let i = arr.length; i <= activeImageIndex; i++) arr[i] = null;
				arr[activeImageIndex] = dataUrl;
				const totalCharCount = arr.reduce((sum, item) => sum + (item ? item.length : 0), 0);
				console.log(`📊 image_editor: Estimated storage payload size: ${(totalCharCount / 1024 / 1024).toFixed(2)} MB`);
				if (totalCharCount > 9.5 * 1024 * 1024) {
					console.error(`❌ image_editor: Payload size of ${(totalCharCount / 1024 / 1024).toFixed(2)} MB exceeds session storage quota.`);
					alert(`⚠️ Error: Storing this edited image would exceed the session storage quota (~10MB limit). Please use a smaller image or reduce quality.`);
					return;
				}
				await new Promise((resolve, reject) => {
					chrome.storage.session.set({ [STORAGE_KEY]: arr }, () => {
						if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
						else resolve();
					});
				});
				console.log("✅ Saved to Session Storage");
			} catch (e) {
				console.error("Failed to save to session storage", e);
				alert(`⚠️ Error saving edited image to session storage: ${e.message || e}`);
			}
			try {
				const p = (await chrome.storage.local.get("currentProduct")).currentProduct;
				if (p && Array.isArray(p.images) && activeImageIndex >= 0 && activeImageIndex < p.images.length) {
					const originalUrl = p.images[activeImageIndex];
					p.images[activeImageIndex] = dataUrl;
					if (Array.isArray(p.variants)) {
						let propagatedCount = 0;
						p.variants.forEach((v) => {
							if (v.img === originalUrl || v.image === originalUrl) {
								v.img = dataUrl;
								v.image = dataUrl;
								propagatedCount++;
							}
						});
						if (propagatedCount > 0) console.log(`✅ Propagated edited image to ${propagatedCount} matching variants`);
					}
					await chrome.storage.local.set({ currentProduct: p });
					console.log("✅ Edited image persisted to currentProduct.images[" + activeImageIndex + "]");
				}
			} catch (e) {
				console.error("Failed to persist edited image to currentProduct", e);
			}
			closeEditorFrame();
		}
		function closeEditorFrame() {
			if (!activeEditorFrame) return;
			console.log("🚪 Closing Editor Frame");
			window.removeEventListener("message", handleEditorMessage);
			activeEditorFrame.remove();
			activeEditorFrame = null;
			activeImageIndex = -1;
			activeImageSrc = null;
			document.body.style.overflow = "";
		}
		window.__SNIPE_OPEN_IMAGE_EDITOR__ = window.openImageEditor;
	})();
	//#endregion
	//#region common/listing-card-core.js
	(function(root) {
		"use strict";
		const MAX_SOURCE_TEXT_LENGTH = 1e3;
		const SEARCH_TARGETS = Object.freeze([
			"ebay",
			"amazon",
			"walmart",
			"aliexpress",
			"temu",
			"alibaba"
		]);
		const MARKETPLACE_HOSTS = Object.freeze({
			amazon: /^(?:[^.]+\.)?amazon\.(?:com|co\.uk|de|ca|com\.au)$/i,
			walmart: /^(?:[^.]+\.)?walmart\.(?:com|ca)$/i,
			ebay: /^(?:[^.]+\.)?ebay\.(?:com|co\.uk|de|fr|com\.au|it|es)$/i
		});
		const SEARCH_HOSTS = Object.freeze({
			ebay: "www.ebay.com",
			amazon: "www.amazon.com",
			walmart: "www.walmart.com",
			aliexpress: "www.aliexpress.com",
			temu: "www.temu.com",
			alibaba: "www.alibaba.com"
		});
		function normalizeText(value) {
			return String(value || "").slice(0, MAX_SOURCE_TEXT_LENGTH).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
		}
		function cleanSearchQuery(rawTitle) {
			const normalized = normalizeText(rawTitle);
			if (!normalized) return "";
			let cleaned = normalized.replace(/^new\s+listing\b\s*[:\-\u2013\u2014|\u2022]*/i, "").replace(/\s+(?:for\s+sale(?:\s+online)?|buy\s+it\s+now)\s*[|\u2013\u2014]\s*eBay(?:\.[a-z.]+)?\s*$/i, "").replace(/\s*[|\u2013\u2014]\s*eBay(?:\.[a-z.]+)?\s*$/i, "");
			for (let pass = 0; pass < 3; pass += 1) {
				const next = cleaned.replace(/\s+(?:[|\u2022\u00b7\u2013\u2014-])\s*(?:(?:free|fast|same[- ]day|expedited)\s+shipping|ships?\s+(?:free|fast|today)|free\s+returns?)\b.*$/i, "");
				if (next === cleaned) break;
				cleaned = next;
			}
			cleaned = cleaned.replace(/\s+(?:with\s+)?(?:free|fast)\s+shipping\s*$/i, "").replace(/[\u2605\u2606\u2665\u2764\u2713\u2714\u2705\ud83d\udd25]+/gu, " ").replace(/([!#*_~|])\1+/g, " ");
			cleaned = normalizeText(cleaned);
			return cleaned || normalized;
		}
		function encodeTitle(title) {
			return encodeURIComponent(normalizeText(title).replace(/"/g, "")).replace(/%2F/g, " ");
		}
		function buildSearchUrl(target, title) {
			if (!SEARCH_TARGETS.includes(target)) return null;
			const encoded = encodeTitle(title);
			if (!encoded) return null;
			switch (target) {
				case "ebay": return `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sop=12`;
				case "amazon": return `https://www.amazon.com/s?k=${encoded}`;
				case "walmart": return `https://www.walmart.com/search/?query=${encoded}`;
				case "aliexpress": return `https://www.aliexpress.com/w/wholesale-${encoded}.html`;
				case "temu": return `https://www.temu.com/search_result.html?search_key=${encoded}`;
				case "alibaba": return `https://www.alibaba.com/trade/search?SearchText=${encoded}`;
				default: return null;
			}
		}
		function isAllowedSearchUrl(value) {
			try {
				const url = new URL(value);
				if (url.protocol !== "https:") return false;
				return Object.values(SEARCH_HOSTS).includes(url.hostname.toLowerCase());
			} catch (_) {
				return false;
			}
		}
		function getMarketplace(hostname) {
			const host = normalizeText(hostname).toLowerCase().replace(/:\d+$/, "");
			for (const [marketplace, pattern] of Object.entries(MARKETPLACE_HOSTS)) if (pattern.test(host)) return marketplace;
			return null;
		}
		function toUrl(value) {
			try {
				return new URL(value, "https://www.ebay.com");
			} catch (_) {
				return null;
			}
		}
		function extractEbayItemId(value) {
			const url = toUrl(value);
			if (!url || getMarketplace(url.hostname) !== "ebay") return "";
			const match = /^\/itm\/(?:[^/?#]+\/)?(\d{9,15})(?:[/?#]|$)/i.exec(url.pathname);
			return match ? match[1] : "";
		}
		function isEbayItemUrl(value) {
			return Boolean(extractEbayItemId(value));
		}
		function safeQuery(doc, selector) {
			try {
				return doc?.querySelector?.(selector) || null;
			} catch (_) {
				return null;
			}
		}
		function safeQueryAll(doc, selector) {
			try {
				return Array.from(doc?.querySelectorAll?.(selector) || []);
			} catch (_) {
				return [];
			}
		}
		function nodeText(node) {
			return normalizeText(node?.textContent || node?.innerText || "");
		}
		function firstText(doc, selectors, attributes = []) {
			for (const selector of selectors) {
				const node = safeQuery(doc, selector);
				if (!node) continue;
				for (const attribute of attributes) {
					const value = normalizeText(node.getAttribute?.(attribute));
					if (value) return value;
				}
				const text = nodeText(node);
				if (text) return text;
			}
			return "";
		}
		function firstAttribute(doc, selectors, attribute) {
			for (const selector of selectors) {
				const value = normalizeText(safeQuery(doc, selector)?.getAttribute?.(attribute));
				if (value) return value;
			}
			return "";
		}
		function safeHttpUrl(value) {
			try {
				const url = new URL(normalizeText(value));
				return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
			} catch (_) {
				return "";
			}
		}
		function collectStructuredData(doc) {
			const nodes = [];
			const queue = [];
			for (const script of safeQueryAll(doc, "script[type=\"application/ld+json\"]")) try {
				queue.push(JSON.parse(script.textContent || ""));
			} catch (_) {}
			while (queue.length && nodes.length < 100) {
				const value = queue.shift();
				if (Array.isArray(value)) {
					queue.push(...value);
					continue;
				}
				if (!value || typeof value !== "object") continue;
				nodes.push(value);
				if (Array.isArray(value["@graph"])) queue.push(...value["@graph"]);
			}
			return nodes;
		}
		function hasType(node, expectedType) {
			return (Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]]).some((type) => normalizeText(type).toLowerCase() === expectedType.toLowerCase());
		}
		function getProductStructuredData(doc) {
			return collectStructuredData(doc).find((node) => hasType(node, "Product")) || null;
		}
		function firstOffer(product) {
			if (!product?.offers) return null;
			return Array.isArray(product.offers) ? product.offers[0] || null : product.offers;
		}
		function structuredName(value) {
			if (typeof value === "string") return normalizeText(value);
			return normalizeText(value?.name);
		}
		function structuredImage(value) {
			if (Array.isArray(value)) return safeHttpUrl(value[0]);
			if (typeof value === "object") return safeHttpUrl(value?.url || value?.contentUrl);
			return safeHttpUrl(value);
		}
		function conditionLabel(value) {
			const text = normalizeText(value);
			if (!text) return "";
			return normalizeText((text.split("/").filter(Boolean).pop() || text).replace(/Condition$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2"));
		}
		function readLabeledValue(doc, targetLabel) {
			const target = normalizeText(targetLabel).replace(/:$/, "").toLowerCase();
			const rows = [
				...safeQueryAll(doc, ".ux-layout-section-evo__row dl"),
				...safeQueryAll(doc, "dl.ux-labels-values"),
				...safeQueryAll(doc, ".ux-labels-values")
			];
			const seen = /* @__PURE__ */ new Set();
			for (const row of rows) {
				if (seen.has(row)) continue;
				seen.add(row);
				const labelNode = safeQuery(row, ".ux-labels-values__labels-content") || safeQuery(row, ".ux-labels-values__labels") || safeQuery(row, "dt");
				const valueNode = safeQuery(row, ".ux-labels-values__values-content") || safeQuery(row, ".ux-labels-values__values") || safeQuery(row, "dd");
				if (nodeText(labelNode).replace(/:$/, "").toLowerCase() === target) return nodeText(valueNode);
			}
			return "";
		}
		function extractEbayProduct(doc, href) {
			const product = getProductStructuredData(doc);
			const offer = firstOffer(product);
			const domTitle = firstText(doc, [
				"h1.x-item-title__mainTitle span.ux-textspans",
				"h1.x-item-title__mainTitle",
				".x-item-title__mainTitle",
				"[data-testid=\"x-item-title\"] h1",
				"h1[itemprop=\"name\"]",
				"h1#itemTitle"
			]);
			const metaTitle = firstAttribute(doc, ["meta[property=\"og:title\"]"], "content");
			const documentTitle = normalizeText(doc?.title);
			const title = domTitle || normalizeText(product?.name) || metaTitle || documentTitle;
			const domPrice = firstText(doc, [
				".x-price-primary span.ux-textspans",
				".x-price-primary",
				"[data-testid=\"x-price-primary\"]",
				"[itemprop=\"price\"]"
			], ["content"]);
			const structuredPrice = normalizeText(offer?.price || offer?.lowPrice || product?.offers?.lowPrice);
			const currency = normalizeText(offer?.priceCurrency || product?.offers?.priceCurrency) || firstAttribute(doc, ["meta[property=\"product:price:currency\"]"], "content");
			const price = domPrice || [currency, structuredPrice].filter(Boolean).join(" ");
			const domImage = firstAttribute(doc, [
				".ux-image-carousel-item.active img",
				".ux-image-carousel img[src]",
				"[data-testid=\"ux-image-carousel\"] img[src]",
				"img#icImg"
			], "src");
			const metaImage = firstAttribute(doc, ["meta[property=\"og:image\"]"], "content");
			const image = safeHttpUrl(domImage) || safeHttpUrl(metaImage) || structuredImage(product?.image);
			const condition = firstText(doc, [
				".x-item-condition-text .ux-textspans",
				".x-item-condition-text",
				"[data-testid=\"x-item-condition-text\"]"
			]) || readLabeledValue(doc, "Condition") || conditionLabel(offer?.itemCondition || product?.itemCondition);
			const seller = firstText(doc, [
				".x-sellercard-atf__info__about-seller a span",
				".x-sellercard-atf__info__about-seller a",
				".ux-seller-section__item--seller a",
				"[data-testid=\"x-sellercard-atf\"] a[href*=\"/str/\"]"
			]) || structuredName(offer?.seller);
			const brand = readLabeledValue(doc, "Brand") || structuredName(product?.brand);
			return {
				supplier: "ebay",
				productId: extractEbayItemId(href),
				idLabel: "Item ID",
				title,
				searchQuery: cleanSearchQuery(title),
				price,
				currency,
				image,
				condition,
				seller,
				brand,
				url: normalizeText(href)
			};
		}
		function productFingerprint(data) {
			return [
				data?.productId,
				data?.searchQuery || data?.title,
				data?.price,
				data?.condition,
				data?.seller,
				data?.brand,
				data?.image
			].map(normalizeText).join("");
		}
		root.SSListingCardCore = Object.freeze({
			SEARCH_TARGETS,
			buildSearchUrl,
			cleanSearchQuery,
			encodeTitle,
			extractEbayItemId,
			extractEbayProduct,
			getMarketplace,
			isAllowedSearchUrl,
			isEbayItemUrl,
			normalizeText,
			productFingerprint
		});
	})(window);
	//#endregion
	//#region content_scripts/listing_card_injector.js
	(function() {
		"use strict";
		if (window.__SB1_LISTING_CARD_INIT__) return;
		window.__SB1_LISTING_CARD_INIT__ = true;
		const CardCore = window.SSListingCardCore;
		if (!CardCore) {
			console.error("[SellerSuit] Listing card core is unavailable; skipping card injection.");
			return;
		}
		const SVG = {
			ebay: `<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0.359 21.68880147788684 251.28199999999998 282.31119852211316" class="sb1c-svg-icon sb1c-svg-ebay"><path d="M152.338 157.13a70.327 70.327 0 1 0-53.8 1.662l6.788-17.937a51.149 51.149 0 1 1 39.128-1.209z" fill="#414141"/><path d="M.359 98.405h57.11V304h-39.11c-9.941 0-18-8.059-18-18z" fill="#ea323c"/><path d="M251.641 98.405h-57.109V304h39.109c9.941 0 18-8.059 18-18z" fill="#88b621"/><path d="M194.531 98.405H126V304h68.531z" fill="#f5ae03"/><path d="M126 98.405H57.468V304H126z" fill="#0064d1"/></svg>`,
			walmart: `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" id="walmart" x="0" y="0" style="enable-background:new 0 0 532.262 600" version="1.1" viewBox="0 0 532.262 600" class="sb1c-svg-icon sb1c-svg-walmart"><g><path d="M375.663 273.363c12.505-2.575 123.146-53.269 133.021-58.97 22.547-13.017 30.271-41.847 17.254-64.393s-41.847-30.271-64.393-17.254c-9.876 5.702-109.099 76.172-117.581 85.715-9.721 10.937-11.402 26.579-4.211 39.033C346.945 269.949 361.331 276.314 375.663 273.363zM508.685 385.607c-9.876-5.702-120.516-56.396-133.021-58.97-14.332-2.951-28.719 3.415-35.909 15.87-7.191 12.455-5.51 28.097 4.211 39.033 8.482 9.542 107.705 80.013 117.581 85.715 22.546 13.017 51.376 5.292 64.393-17.254S531.231 398.624 508.685 385.607zM266.131 385.012c-14.382 0-27.088 9.276-31.698 23.164-4.023 12.117-15.441 133.282-15.441 144.685 0 26.034 21.105 47.139 47.139 47.139 26.034 0 47.139-21.105 47.139-47.139 0-11.403-11.418-132.568-15.441-144.685C293.219 394.288 280.513 385.012 266.131 385.012zM156.599 326.637c-12.505 2.575-123.146 53.269-133.021 58.97C1.031 398.624-6.694 427.454 6.323 450c13.017 22.546 41.847 30.271 64.393 17.254 9.876-5.702 109.098-76.172 117.58-85.715 9.722-10.937 11.402-26.579 4.211-39.033S170.931 323.686 156.599 326.637zM70.717 132.746C48.171 119.729 19.341 127.454 6.323 150c-13.017 22.546-5.292 51.376 17.254 64.393 9.876 5.702 120.517 56.396 133.021 58.97 14.332 2.951 28.719-3.415 35.91-15.87 7.191-12.455 5.51-28.096-4.211-39.033C179.815 208.918 80.592 138.447 70.717 132.746zM266.131 0c-26.035 0-47.139 21.105-47.139 47.139 0 11.403 11.418 132.568 15.441 144.685 4.611 13.888 17.317 23.164 31.698 23.164s27.088-9.276 31.698-23.164c4.023-12.117 15.441-133.282 15.441-144.685C313.27 21.105 292.165 0 266.131 0z" style="fill:#ffc220"/></g></svg>`,
			amazon: `<svg width="24" height="24" viewBox="0 0 122.879 111.709" class="sb1c-svg-icon sb1c-svg-amazon" xml:space="preserve"><g><path fill="#000" d="M33.848,54.85c0-5.139,1.266-9.533,3.798-13.182c2.532-3.649,5.995-6.404,10.389-8.266 c4.021-1.713,8.974-2.941,14.858-3.687c2.01-0.223,5.287-0.521,9.83-0.894v-1.899c0-4.766-0.521-7.968-1.564-9.607 c-1.564-2.235-4.021-3.351-7.373-3.351h-0.893c-2.458,0.223-4.581,1.005-6.368,2.345c-1.787,1.341-2.942,3.202-3.463,5.586 c-0.298,1.489-1.042,2.345-2.234,2.569l-12.847-1.564c-1.266-0.298-1.899-0.968-1.899-2.011c0-0.223,0.037-0.484,0.111-0.781 c1.266-6.628,4.375-11.543,9.328-14.746C50.473,2.161,56.264,0.373,62.893,0h2.793c8.488,0,15.117,2.197,19.885,6.591 c0.746,0.748,1.438,1.55,2.066,2.401c0.631,0.856,1.135,1.62,1.506,2.29c0.373,0.67,0.709,1.639,1.006,2.904 c0.299,1.267,0.521,2.142,0.672,2.625c0.148,0.484,0.26,1.527,0.334,3.129c0.074,1.601,0.111,2.55,0.111,2.848v27.034 c0,1.936,0.279,3.705,0.838,5.306c0.559,1.602,1.1,2.756,1.619,3.463c0.521,0.707,1.379,1.844,2.57,3.406 c0.447,0.672,0.67,1.268,0.67,1.789c0,0.596-0.297,1.115-0.895,1.563c-6.18,5.363-9.531,8.268-10.053,8.715 c-0.893,0.67-1.973,0.744-3.24,0.223c-1.041-0.895-1.953-1.75-2.736-2.57c-0.781-0.818-1.34-1.414-1.676-1.787 c-0.334-0.371-0.875-1.098-1.619-2.178s-1.268-1.807-1.564-2.178c-4.17,4.543-8.266,7.373-12.287,8.49 c-2.533,0.744-5.661,1.117-9.384,1.117c-5.735,0-10.445-1.77-14.131-5.307C35.691,66.336,33.848,61.328,33.848,54.85L33.848,54.85z M53.062,52.615c0,2.905,0.727,5.232,2.178,6.982c1.453,1.75,3.407,2.625,5.865,2.625c0.224,0,0.54-0.037,0.95-0.111 c0.408-0.076,0.688-0.113,0.838-0.113c3.127-0.818,5.547-2.828,7.26-6.031c0.82-1.415,1.434-2.96,1.844-4.636 c0.41-1.675,0.633-3.035,0.67-4.078c0.037-1.042,0.057-2.755,0.057-5.138v-2.793c-4.32,0-7.596,0.298-9.83,0.894 C56.338,42.077,53.062,46.21,53.062,52.615L53.062,52.615z"/><path fill="#FF9900" d="M99.979,88.586c0.15-0.299,0.373-0.596,0.672-0.895c1.861-1.266,3.648-2.121,5.361-2.568 c2.83-0.744,5.586-1.154,8.266-1.229c0.746-0.076,1.453-0.037,2.123,0.111c3.352,0.297,5.361,0.857,6.033,1.676 c0.297,0.447,0.445,1.117,0.445,2.01v0.783c0,2.605-0.707,5.678-2.121,9.215c-1.416,3.537-3.389,6.387-5.922,8.547 c-0.371,0.297-0.707,0.445-1.004,0.445c-0.15,0-0.299-0.037-0.447-0.111c-0.447-0.223-0.559-0.633-0.336-1.229 c2.756-6.479,4.133-10.984,4.133-13.518c0-0.818-0.148-1.414-0.445-1.787c-0.746-0.893-2.83-1.34-6.256-1.34 c-1.268,0-2.756,0.074-4.469,0.223c-1.861,0.225-3.574,0.447-5.139,0.672c-0.447,0-0.744-0.076-0.895-0.225 c-0.148-0.148-0.186-0.297-0.111-0.447C99.867,88.846,99.904,88.734,99.979,88.586L99.979,88.586z M0.223,86.688 c0.373-0.596,0.968-0.633,1.788-0.113c18.618,10.799,38.875,16.199,60.769,16.199c14.598,0,29.008-2.719,43.232-8.156 c0.371-0.148,0.912-0.371,1.619-0.67c0.709-0.297,1.211-0.521,1.508-0.67c1.117-0.447,1.992-0.223,2.625,0.67 c0.635,0.895,0.43,1.713-0.613,2.457c-1.342,0.969-3.055,2.086-5.139,3.352c-6.404,3.799-13.555,6.74-21.449,8.826 c-7.893,2.086-15.602,3.127-23.123,3.127c-11.618,0-22.603-2.029-32.954-6.088C18.134,101.563,8.862,95.846,0.67,88.475 C0.223,88.102,0,87.729,0,87.357C0,87.133,0.074,86.91,0.223,86.688L0.223,86.688z"/></g></svg>`,
			aliexpress: `<svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="sb1c-svg-icon sb1c-svg-aliexpress"><path d="M6 118.468C6 56.356 56.356 6 118.468 6H393.53C455.643 6 506 56.356 506 118.468V393.53C505.999 455.643 455.643 506 393.53 506H118.468C56.356 505.999 6 455.643 6 393.53V118.468z" fill="#f90" fill-rule="nonzero"/><path d="M6 159.843c0-50.206 40.7-90.906 90.912-90.906h318.18c50.207 0 90.907 40.7 90.907 90.906V393.53C505.999 455.643 455.643 506 393.53 506H118.468C56.356 505.999 6 455.643 6 393.53V159.843z" fill="#e43225" fill-rule="nonzero"/><path d="M145.28 149.78c1.888 7.7.826 16.013 2.676 23.838 6.469-4.731 10.775-12.543 9.894-20.68-.132-14.563-16.513-25.976-30.22-21.076-8.618 2.463-14.993 10.2-16.437 18.938-1.725 10.006 4.282 20.237 13.22 24.812-.882-8.619-2.957-17.706-.638-26.137 3.537-9.194 18.23-9.007 21.506.306zm255.056 10.438c3.144-11.3-3.693-24.4-14.9-28.018-10.774-4.232-24.112 1.156-28.862 11.656-5.294 9.719-2.094 23.55 7.588 29.244 1.912-7.8.5-16.163 2.768-23.744 3.619-9.056 18.131-8.794 21.431.387 2.1 8.207.2 16.825-.593 25.106 6.575-2.03 10.675-8.312 12.562-14.606l.006-.025z" fill="#b32100" fill-rule="nonzero"/><path d="M366.962 149.35c-2.282 7.662-.87 15.95-2.77 23.75-5.637 33.862-28.312 64.13-59.012 79.3a109.319 109.319 0 01-98.506-.126c-30.418-15.13-52.912-45.143-58.693-78.643-1.85-7.838-.8-16.063-2.681-23.838-3.263-9.237-17.963-9.506-21.507-.312-2.306 8.512-.23 17.531.644 26.137 6.463 41.875 34.481 79.475 72.437 98.138a133.42 133.42 0 0056.032 13.8 133.357 133.357 0 0056.612-11.138c41.05-17.725 71.737-57.312 78.3-101.6.793-8.281 2.693-16.906.587-25.106-3.312-9.181-17.812-9.431-21.437-.381l-.006.019zM164.893 391.061v-56.324h33.294v7.062h-26.4v17.319h23.712v7.062h-23.712v17.656h28.25v7.063h-35.144v.162zM235.018 391.061L223.587 376.1l-11.438 14.962h-8.068l15.637-20.006-16.481-20.68h9.081l11.269 15.468 11.431-15.469h8.913l-15.638 20.681 14.794 20.006h-8.069zM254.18 385.011v27.744h-6.893v-41.531c0-10.594 8.069-21.862 20.681-21.862 12.781 0 22.362 8.075 22.362 21.356 0 12.95-9.75 21.856-20.85 21.856-5.38 0-12.612-2.35-15.3-7.563zm28.92-14.293c0-9.081-5.882-14.463-16.307-13.956-5.044.168-12.781 3.868-12.106 16.812.169 4.206 4.537 12.106 14.125 12.106 8.237 0 14.287-4.706 14.287-14.962zM296.218 350.374h6.894v4.369c3.362-3.869 8.575-5.213 14.125-5.213v7.4c-.838-.168-9.082-1.175-14.125 9.582v24.718h-6.894v-40.856zM319.087 370.718c0-11.769 8.406-21.356 20.012-21.356 14.456 0 19.838 9.587 19.838 21.862v3.363h-32.282c.507 7.73 7.4 11.768 13.788 11.6 4.706-.17 7.9-1.513 11.262-4.876l4.544 4.707c-4.206 4.037-9.587 6.725-16.144 6.725-12.275-.169-21.018-9.244-21.018-22.025zm19.506-14.463c-6.556 0-11.6 5.719-11.938 11.938h25.05c0-6.05-4.368-11.938-13.112-11.938zM362.468 385.349l5.05-4.544c-.169 0 2.519 2.694 2.856 2.863 1.175 1.006 2.35 1.681 3.869 2.018 4.368 1.175 12.275.838 12.943-5.212.338-3.363-2.18-5.213-5.043-6.394-3.7-1.343-7.731-1.85-11.431-3.531-4.2-1.85-6.894-5.044-6.894-9.75 0-12.275 17.487-14.294 25.387-8.575.338.338 4.2 3.869 4.038 3.869l-5.044 4.031c-2.525-3.025-4.881-4.537-10.263-4.537-2.687 0-6.387 1.175-7.056 4.037-1.012 4.031 3.532 5.544 6.556 6.388 4.038 1.006 8.407 1.68 11.938 3.868 4.875 3.025 6.056 9.581 4.206 14.625-2.019 5.55-8.075 7.738-13.456 7.906-6.387.332-11.937-1.68-16.475-6.225-.337 0-1.181-.837-1.181-.837zM397.949 385.349l5.044-4.544c-.17 0 2.525 2.694 2.862 2.863 1.175 1.006 2.35 1.681 3.863 2.018 4.375 1.175 12.275.838 12.95-5.212.337-3.363-2.188-5.213-5.044-6.394-3.7-1.343-7.738-1.85-11.438-3.531-4.2-1.85-6.893-5.044-6.893-9.75 0-12.275 17.487-14.294 25.393-8.575.338.338 4.2 3.869 4.032 3.869l-5.044 4.031c-2.519-3.025-4.875-4.537-10.256-4.537-2.688 0-6.388 1.175-7.063 4.037-1.006 4.031 3.531 5.544 6.563 6.388 4.03 1.006 8.406 1.68 11.937 3.868 4.875 3.025 6.05 9.581 4.2 14.625-2.012 5.55-8.069 7.738-13.45 7.906-6.387.332-11.937-1.68-16.481-6.225-.331 0-1.175-.837-1.175-.837zM430.73 350.368v-4.369h-1.512v-.844h4.037V346h-1.519v4.369h-1.006zM438.293 350.368v-4.031l-1.513 4.03h-.337l-1.513-4.03v4.03h-.844v-5.212h1.35l1.344 3.532 1.344-3.532h1.344v5.213h-1.175zM118.143 391.061l-5.043-13.45H85.862l-5.044 13.45h-7.23l21.855-56.324h7.907l21.687 56.324h-6.894zm-19-48.256l-10.256 27.913h21.356l-11.1-27.913zM129.58 334.737h7.063v56.33h-7.062zM147.237 351.212h7.063v39.85h-7.063zM161.03 338.268v-.675c-5.38-.169-9.755-4.538-9.924-9.919H150.1c-.17 5.381-4.544 9.75-9.92 9.919v.675c5.376.169 9.75 4.537 9.92 9.919h1.006c.169-5.382 4.544-9.75 9.925-9.92z" fill="#fff" fill-rule="nonzero"/></svg>`,
			temu: `<svg width="24" height="24" viewBox="0 0 256 256" class="sb1c-svg-icon sb1c-svg-temu"><g fill="#f50017" fill-rule="nonzero"><g transform="scale(5.12,5.12)"><path d="M15,5c-5.514,0 -10,4.486 -10,10v20c0,5.514 4.486,10 10,10h20c5.514,0 10,-4.486 10,-10v-20c0,-5.514 -4.486,-10 -10,-10zM18.59961,15.99805l0.56836,0.00977c0.748,0.623 1.29617,1.28833 1.70117,1.98633h0.56836c0.361,-0.102 0.67527,-0.2495 0.94727,-0.4375c0.114,-0.082 0.25858,-0.1065 0.39258,-0.0625c0.134,0.044 0.2392,0.14825 0.2832,0.28125c0.049,0.124 0.08008,0.21875 0.08008,0.21875c-0.003,0.191 -0.06964,0.3095 -0.18164,0.4375c-0.212,0.257 -0.25252,0.61511 -0.10352,0.91211c0.071,0.163 0.15338,0.34267 0.23438,0.51367c0.176,-0.025 0.36172,0.01672 0.51172,0.13672c0.29,0.231 0.33747,0.65531 0.10547,0.94531c-0.001,0 -1.11569,1.41339 -3.05469,1.40039c-0.008,0 -0.01544,-0.00095 -0.02344,-0.00195c-1.911,-0.082 -3.00781,-1.38281 -3.00781,-1.38281c-0.241,-0.282 -0.20778,-0.70627 0.07422,-0.94727c0.228,-0.195 0.54511,-0.20178 0.78711,-0.05078l0.40039,-1.39453c0,0 -0.10709,0.07206 -0.24609,0.16406c-0.353,0.235 -0.82205,0.18862 -1.12305,-0.10937c-0.041,-0.041 -0.083,-0.08205 -0.125,-0.12305c-0.306,-0.302 -0.35428,-0.77877 -0.11328,-1.13477c0.288,-0.406 0.66522,-0.84233 1.32422,-1.36133zM34.53516,16h3.90234c0.575,0 1.05709,0.43763 1.12109,1.01563c0.121,1.106 0.31455,2.86275 0.43555,3.96875c0.029,0.258 -0.05361,0.51794 -0.22461,0.71094c-0.171,0.194 -0.41488,0.30469 -0.67187,0.30469h-5.19531c-0.256,0 -0.49892,-0.11073 -0.66992,-0.30273c-0.171,-0.192 -0.25356,-0.44903 -0.22656,-0.70703c0.113,-1.102 0.29225,-2.8588 0.40625,-3.9668c0.06,-0.582 0.54505,-1.02344 1.12305,-1.02344zM30.02148,16.00195c0.562,-0.019 0.98087,0.45994 1.29688,0.83594c0.209,0.282 0.23912,0.6587 0.07813,0.9707c-0.015,0.029 -0.02892,0.05884 -0.04492,0.08984c-0.267,0.516 -0.40625,1.08892 -0.40625,1.66992v2.39648h-0.61719c0,-0.001 0.007,-1.49489 0,-2.08789c-0.006,-0.593 -0.30664,-0.5957 -0.30664,-0.5957c0,0 -0.79053,2.46859 -2.76953,2.68359c-0.943,0.102 -1.75652,-0.02764 -2.35352,-0.18164c-0.179,-0.057 -0.3035,-0.2202 -0.3125,-0.4082c-0.009,-0.188 0.09848,-0.36155 0.27148,-0.43555c0.789,-0.342 1.76172,-0.76367 1.76172,-0.76367l0.61523,0.29883c1.334,-0.272 1.84766,-1.78906 1.84766,-1.78906c0,0 -0.00055,-2.65259 0.93945,-2.68359zM10.43945,16.00781c0.791,-0.048 1.25203,0.11652 1.83203,0.60352c0.544,-0.428 0.99328,-0.65352 1.86328,-0.60352c0.068,0.754 -0.09824,1.45238 -0.61524,2.10938c0.77,1.267 1.19844,2.19363 1.52344,3.01562c0,0 -0.84048,1.26708 -2.77148,1.20508c-1.931,-0.062 -2.77148,-1.20508 -2.77148,-1.20508c0.528,-1.402 1.04564,-2.33563 1.55664,-3.01562c-0.451,-0.564 -0.58619,-1.27938 -0.61719,-2.10938zM35.2207,17.33789c-0.04214,-0.00716 -0.08661,-0.00684 -0.13086,0.00391c-0.177,0.043 -0.28614,0.22139 -0.24414,0.40039c0,0 0.12842,0.55505 0.48242,0.99805c0.262,0.328 0.6393,0.5918 1.1543,0.5918c0.515,0 0.8923,-0.2638 1.1543,-0.5918c0.354,-0.443 0.48438,-0.99805 0.48438,-0.99805c0.042,-0.179 -0.06714,-0.35839 -0.24414,-0.40039c-0.177,-0.042 -0.35448,0.06905 -0.39648,0.24805c0,0 -0.09547,0.40547 -0.35547,0.73047c-0.147,0.184 -0.35358,0.3457 -0.64258,0.3457c-0.289,0 -0.49363,-0.1607 -0.64062,-0.3457c-0.26,-0.325 -0.35547,-0.73047 -0.35547,-0.73047c-0.0315,-0.13425 -0.1392,-0.23048 -0.26562,-0.25195zM20.58594,20.26563c-0.355,-0.022 -0.68541,0.22228 -0.94141,0.48828c0.291,0.123 0.63406,0.22124 1.03906,0.24023c0.326,-0.001 0.61423,-0.06234 0.86523,-0.15234c-0.179,-0.238 -0.49689,-0.54717 -0.96289,-0.57617zM10,25h5c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-1.5v5c0,0.553 -0.447,1 -1,1c-0.553,0 -1,-0.447 -1,-1v-5h-1.5c-0.553,0 -1,-0.447 -1,-1c0,-0.553 0.447,-1 1,-1zM18,25h4c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-3v1h2.97461c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-2.97461v1h3c0.553,0 1,0.447 1,1c0,0.553 -0.447,1 -1,1h-4c-0.553,0 -1,-0.447 -1,-1v-6c0,-0.553 0.447,-1 1,-1zM31.00586,25c0.10369,0.00066 0.20805,0.01653 0.31055,0.05078c0.409,0.137 0.68359,0.51822 0.68359,0.94922v6c0,0.553 -0.447,1 -1,1c-0.553,0 -1,-0.447 -1,-1v-3l-1.19922,1.59961c-0.188,0.252 -0.48383,0.39939 -0.79883,0.40039h-0.00195c-0.313,0 -0.60883,-0.14648 -0.79883,-0.39648l-1.21484,-1.60742l0.01367,3c0.002,0.552 -0.44214,1.00386 -0.99414,1.00586h-0.00586c-0.551,0 -0.998,-0.44409 -1,-0.99609l-0.02539,-6c-0.002,-0.43 0.27069,-0.81317 0.67969,-0.95117c0.406,-0.137 0.85519,-0.00125 1.11719,0.34375l2.22461,2.94141l2.20313,-2.93945c0.1935,-0.25875 0.49558,-0.40236 0.80664,-0.40039zM34,25h0.00391c0.553,0.002 0.99809,0.45191 0.99609,1.00391l-0.01562,3.47656c-0.002,0.406 0.15541,0.78822 0.44141,1.07422c0.282,0.283 0.67131,0.44531 1.07031,0.44531c0.829,0 1.50391,-0.67395 1.50391,-1.50195v-3.49805c0,-0.553 0.447,-1 1,-1c0.553,0 1,0.447 1,1v3.49805c0,1.931 -1.57095,3.50195 -3.50195,3.50195c-0.94,0 -1.82328,-0.3672 -2.48828,-1.0332c-0.664,-0.667 -1.02744,-1.55314 -1.02344,-2.49414l0.01367,-3.47656c0.002,-0.551 0.449,-0.99609 1,-0.99609z"></path></g></g></svg>`,
			alibaba: `<svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="sb1c-svg-icon sb1c-svg-alibaba"><path d="M506 116v280c0 60.71-49.29 110-110 110H116C55.29 506 6 456.71 6 396V116C6 55.289 55.29 6 116 6h280c60.71 0 110 49.289 110 110z" fill="#ff5a00"/><path d="M310.05 143.5h15.694c22.062 1.25 45.487 5.35 63.056 19.794 14.031 11.362 19.975 30.787 16.531 48.287-2.644 13.057-8.662 25.094-15.144 36.6-13.143 22.775-29.3 43.563-44.674 64.838-2.75 3.519-4.907 7.825-4.625 12.406.25 3.631 3.03 6.575 6.293 7.869 6.319 2.569 13.313 2.062 19.957 1.694 20.993-2.2 41.225-8.57 61.25-14.957 1.525-.95 2.03.6 2.612 1.713-21.275 14.187-44.169 26.018-68.237 34.725-13.313 4.462-27.388 8.7-41.575 7.037-7.457-.744-14.932-5.187-17.27-12.618-2.893-9.675-1.83-20.394 2.357-29.538 6.369-14.281 16.25-26.55 25.625-38.938 15.538-20.368 31.575-40.624 43.775-63.262 4.031-8.031 8.331-17.781 4.331-26.644-3.775-8.175-11.968-12.987-19.818-16.618-13.932-6.232-28.794-9.982-43.444-14.144a575.641 575.641 0 00-6.6 4.394c5.094 3.887 10.187 7.78 15.231 11.737-19.281 3.475-38.494 7.363-57.475 12.2-28.912 7.175-57.131 16.781-85.094 26.969 2.732 5.437 5.438 10.9 8.032 16.412-6.32 6.988-12.594 14.05-18.913 21.044 15.188 4.538 31.55 5.163 47.038 1.731 13.243-2.962 25.693-9.306 35.812-18.356-2.756-3.425-6.231-6.181-9.981-8.45 12.294.256 23.475 10.975 23.5 23.406-2.406.013-4.8.032-7.175.044a49.042 49.042 0 00-2.181-7.894c-13.957 12.619-31.988 20.513-50.67 22.55-16.455 1.9-33.287-.368-48.774-6.156 1.044 9.581 2.087 19.119 3.056 28.7-8.794 3.425-16.969 8.381-24.281 14.356-5.813 5.069-11.575 10.9-13.794 18.494-2.131 6.688 1.338 14.281 7.194 17.869 7.106 4.4 15.394 6.437 23.594 7.619 10.806 1.412 21.73 1.293 32.587.53 21.319-1.574 42.388-5.58 63.125-10.6 2.063-.837 3.038 2.57.925 3.1-16.55 8.52-33.862 15.695-51.919 20.326-16.968 4.375-34.443 6.619-51.943 7.219-17.85-.55-36.807-4-50.95-15.694C86.58 344.775 81.044 331.256 81 317.856v-.718c.35-14.17 5.138-27.87 12.038-40.138 9.075-17.319 20.256-33.569 33.475-47.987 22.843-25.163 51.5-44.632 82.312-58.732 31.919-14.468 66.088-24.862 101.225-26.781z" fill="#fff" fill-rule="nonzero"/></svg>`,
			copy: `<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 467 512.22" class="sb1c-copy-svg"><path fill-rule="nonzero" d="M131.07 372.11c.37 1 .57 2.08.57 3.2 0 1.13-.2 2.21-.57 3.21v75.91c0 10.74 4.41 20.53 11.5 27.62s16.87 11.49 27.62 11.49h239.02c10.75 0 20.53-4.4 27.62-11.49s11.49-16.88 11.49-27.62V152.42c0-10.55-4.21-20.15-11.02-27.18l-.47-.43c-7.09-7.09-16.87-11.5-27.62-11.5H170.19c-10.75 0-20.53 4.41-27.62 11.5s-11.5 16.87-11.5 27.61v219.69zm-18.67 12.54H57.23c-15.82 0-30.1-6.58-40.45-17.11C6.41 356.97 0 342.4 0 326.52V57.79c0-15.86 6.5-30.3 16.97-40.78l.04-.04C27.51 6.49 41.94 0 57.79 0h243.63c15.87 0 30.3 6.51 40.77 16.98l.03.03c10.48 10.48 16.99 24.93 16.99 40.78v36.85h50c15.9 0 30.36 6.5 40.82 16.96l.54.58c10.15 10.44 16.43 24.66 16.43 40.24v302.01c0 15.9-6.5 30.36-16.96 40.82-10.47 10.47-24.93 16.97-40.83 16.97H170.19c-15.9 0-30.35-6.5-40.82-16.97-10.47-10.46-16.97-24.92-16.97-40.82v-69.78zM340.54 94.64V57.79c0-10.74-4.41-20.53-11.5-27.63-7.09-7.08-16.86-11.48-27.62-11.48H57.79c-10.78 0-20.56 4.38-27.62 11.45l-.04.04c-7.06 7.06-11.45 16.84-11.45 27.62v268.73c0 10.86 4.34 20.79 11.38 27.97 6.95 7.07 16.54 11.49 27.17 11.49h55.17V152.42c0-15.9 6.5-30.35 16.97-40.82 10.47-10.47 24.92-16.96 40.82-16.96h170.35z"/></svg>`,
			ok: `<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" xml:space="preserve" class="sb1c-status-svg sb1c-svg-ok"><g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)"><path d="M 89.122 3.486 L 89.122 3.486 c -2.222 -3.736 -7.485 -4.118 -10.224 -0.742 L 33.202 59.083 c -1.118 1.378 -3.245 1.303 -4.262 -0.151 L 17.987 43.291 c -3.726 -5.322 -11.485 -5.665 -15.666 -0.693 l 0 0 c -2.883 3.428 -3.102 8.366 -0.533 12.036 L 24.206 86.65 c 2.729 3.897 8.503 3.89 11.222 -0.014 l 6.435 -9.239 L 88.87 10.265 C 90.28 8.251 90.378 5.598 89.122 3.486 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(6,188,66); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round" /></g></svg>`,
			error: `<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" baseProfile="basic" class="sb1c-status-svg sb1c-svg-error"><circle cx="8" cy="8" r="8" fill="#fe3155"/><polygon fill="#fff" points="11.536,10.121 9.414,8 11.536,5.879 10.121,4.464 8,6.586 5.879,4.464 4.464,5.879 6.586,8 4.464,10.121 5.879,11.536 8,9.414 10.121,11.536"/></svg>`,
			spinner: `<svg width="12" height="12" class="sb1c-spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#0071dc" stroke-width="5" stroke-dasharray="90, 150" stroke-dashoffset="-35"></circle></svg>`
		};
		function debounce(fn, ms) {
			let t;
			return function(...args) {
				clearTimeout(t);
				t = setTimeout(() => fn.apply(this, args), ms);
			};
		}
		function safeText(el) {
			return el ? (el.textContent || el.innerText || "").trim() : "";
		}
		function escHtml(s) {
			return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
		function buildEbayUrl(title) {
			return CardCore.buildSearchUrl("ebay", title);
		}
		function buildWalmartUrl(title) {
			return CardCore.buildSearchUrl("walmart", title);
		}
		function buildAliUrl(title) {
			return CardCore.buildSearchUrl("aliexpress", title);
		}
		function buildTemuUrl(title) {
			return CardCore.buildSearchUrl("temu", title);
		}
		function buildAlibabaUrl(title) {
			return CardCore.buildSearchUrl("alibaba", title);
		}
		function getSupplierKey() {
			return CardCore.getMarketplace(location.hostname);
		}
		function getQid() {
			const m = /[?&]qid=(\d+)/.exec(location.search);
			return m ? m[1] : "";
		}
		function readUpcFromDom(root) {
			const entries = (root || document).querySelectorAll(".prodDetSectionEntry");
			for (let i = 0; i < entries.length; i++) {
				const labelEl = entries[i].querySelector("th") || entries[i].querySelector(".prodDetSectionLabel");
				const valEl = entries[i].querySelector(".prodDetAttrValue") || entries[i].querySelector("td");
				if (labelEl && valEl && labelEl.textContent.trim().toLowerCase() === "upc") {
					const v = valEl.textContent.trim().split(/\s+/)[0];
					if (/^\d{6,14}$/.test(v)) return v;
				}
			}
			const rows = (root || document).querySelectorAll("tr");
			for (let i = 0; i < rows.length; i++) {
				const cells = rows[i].querySelectorAll("td, th");
				if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === "upc") {
					const v = cells[1].textContent.trim().split(/\s+/)[0];
					if (/^\d{6,14}$/.test(v)) return v;
				}
			}
			return "";
		}
		function readBrandFromDom(root) {
			const doc = root || document;
			const BRAND_LABELS = [
				"brand",
				"marke",
				"marque",
				"marka",
				"marca",
				"marchio",
				"merk"
			];
			const entries = doc.querySelectorAll(".prodDetSectionEntry");
			for (let i = 0; i < entries.length; i++) {
				const labelEl = entries[i].querySelector("th") || entries[i].querySelector(".prodDetSectionLabel");
				const valEl = entries[i].querySelector(".prodDetAttrValue") || entries[i].querySelector("td");
				if (labelEl && valEl && BRAND_LABELS.includes(labelEl.textContent.trim().toLowerCase())) {
					const v = valEl.textContent.trim();
					if (v && v.toLowerCase() !== "does not apply") return v;
				}
			}
			const poBrand = doc.querySelector(".po-brand .a-span9, .po-brand td:last-child");
			if (poBrand) {
				const t = safeText(poBrand);
				if (t) return t;
			}
			const byline = doc.querySelector("#bylineInfo");
			if (byline) {
				const full = safeText(byline);
				const storeMatch = full.match(/visit the (.+?) store/i);
				if (storeMatch) return storeMatch[1].trim();
				const brandMatch = full.match(/brand[:\s]+(.+)/i);
				if (brandMatch) return brandMatch[1].split("\n")[0].trim();
				const byMatch = full.match(/^by\s+(.+)/i);
				if (byMatch) return byMatch[1].trim();
			}
			const brandEl = doc.querySelector("#brand");
			if (brandEl) {
				const t = safeText(brandEl);
				if (t) return t;
			}
			return "";
		}
		function drainFetchQueue() {
			while (_fetchActive < FETCH_CONCURRENCY && _fetchQueue.length) {
				const { url, onResult } = _fetchQueue.shift();
				_fetchActive++;
				fetch(url, {
					credentials: "include",
					signal: _fetchAbortCtrl.signal
				}).then(function(r) {
					return r.ok ? r.text() : null;
				}).then(function(html) {
					if (html) onResult(html);
				}).catch(function() {}).finally(function() {
					_fetchActive--;
					drainFetchQueue();
				});
			}
		}
		function queuedFetch(url, onResult) {
			if (!url) return;
			_fetchQueue.push({
				url,
				onResult
			});
			drainFetchQueue();
		}
		function fetchAmazonQty(asin, wrapperEl) {
			if (!asin) return;
			queuedFetch("/gp/product/ajax/aodAjaxMain/ref=dp_aod_NEW_mbc?asin=" + asin + "&m=&qid=" + getQid() + "&smid=&sourcecustomerorglistid=&sourcecustomerorglistitemid=&sr=&pc=dp", function(html) {
				if (!document.contains(wrapperEl)) return;
				const doc = new DOMParser().parseFromString(html, "text/html");
				function sellerQty(offerEl) {
					const opts = offerEl.querySelectorAll("[id^=\"aod-offer-qty-component-\"] .aod-qty-option");
					return opts.length === 0 ? 1 : opts.length;
				}
				let totalQty = 0, sellerCount = 0;
				const pinned = doc.querySelector("#aod-pinned-offer");
				if (pinned) {
					totalQty += sellerQty(pinned);
					sellerCount++;
				}
				doc.querySelectorAll("#aod-offer-list #aod-offer").forEach(function(o) {
					totalQty += sellerQty(o);
					sellerCount++;
				});
				if (totalQty <= 0) return;
				const display = String(totalQty) + (sellerCount > 9 ? "+" : "");
				const qtyEl = wrapperEl.querySelector(".sb1c-qty-val");
				if (qtyEl) {
					qtyEl.textContent = display;
					qtyEl.style.fontStyle = "normal";
					qtyEl.style.color = "#000";
				}
			});
		}
		function updateCardLinks(wrapperEl, title) {
			if (!title) return;
			wrapperEl.querySelectorAll("a.sb1c-link-a").forEach(function(a) {
				const svg = a.querySelector("svg");
				if (!svg) return;
				const classes = svg.className.baseVal || svg.className || "";
				let newHref = "#";
				let btnTitle = "";
				if (classes.includes("sb1c-svg-ebay")) {
					newHref = buildEbayUrl(title);
					btnTitle = "Search on eBay";
				} else if (classes.includes("sb1c-svg-walmart")) {
					newHref = buildWalmartUrl(title);
					btnTitle = "Search on Walmart";
				} else if (classes.includes("sb1c-svg-amazon")) {
					newHref = CardCore.buildSearchUrl("amazon", title);
					btnTitle = "Search on Amazon";
				} else if (classes.includes("sb1c-svg-aliexpress")) {
					newHref = buildAliUrl(title);
					btnTitle = "Search on AliExpress";
				} else if (classes.includes("sb1c-svg-temu")) {
					newHref = buildTemuUrl(title);
					btnTitle = "Search on Temu";
				} else if (classes.includes("sb1c-svg-alibaba")) {
					newHref = buildAlibabaUrl(title);
					btnTitle = "Search on Alibaba";
				}
				if (newHref !== "#") {
					a.setAttribute("href", newHref);
					a.setAttribute("title", btnTitle);
				}
			});
		}
		function fetchProductPageData(url, asin, supplier, wrapperEl, data) {
			const fetchUrl = url || (asin ? "https://www.amazon.com/dp/" + asin : null);
			if (!fetchUrl) return;
			queuedFetch(fetchUrl, function(html) {
				if (!document.contains(wrapperEl)) return;
				const doc = new DOMParser().parseFromString(html, "text/html");
				let upc = "", brand = "", detailTitle = "";
				if (supplier === "amazon") {
					upc = readUpcFromDom(doc);
					brand = readBrandFromDom(doc);
					detailTitle = safeText(doc.querySelector("#productTitle"));
				} else {
					const gtinEl = doc.querySelector("[itemprop=\"gtin13\"]");
					if (gtinEl) upc = (gtinEl.getAttribute("content") || gtinEl.textContent).trim();
					if (!upc) doc.querySelectorAll("tr, [data-testid=\"product-spec-row\"]").forEach(function(row) {
						if (upc) return;
						const cells = row.querySelectorAll("td, th, span");
						if (cells.length >= 2) {
							const label = cells[0].textContent.trim().toLowerCase();
							if (label === "upc" || label === "gtin") upc = cells[1].textContent.trim().split(/\s+/)[0];
						}
					});
					const wmBrand = doc.querySelector("[itemprop=\"brand\"] [itemprop=\"name\"], .prod-brandName");
					if (wmBrand) brand = safeText(wmBrand);
					detailTitle = safeText(doc.querySelector("[itemprop=\"name\"][data-testid], h1.prod-ProductTitle, [data-testid=\"product-title\"], h1"));
				}
				if (data) {
					if (upc) data.upc = upc;
					if (brand) data.brand = brand;
					if (detailTitle) {
						data.title = detailTitle;
						updateCardLinks(wrapperEl, detailTitle);
					}
				}
				const upcEl = wrapperEl.querySelector(".sb1c-upc-val");
				const upcRow = wrapperEl.querySelector(".sb1c-upc-row");
				if (upcEl) if (upc && /^\d{6,14}$/.test(upc)) {
					upcEl.textContent = upc;
					upcEl.style.fontStyle = "normal";
					upcEl.style.color = "#000";
					const copyBtn = upcEl.closest(".sb1c-row") && upcEl.closest(".sb1c-row").querySelector(".sb1c-copy-btn");
					if (copyBtn) {
						copyBtn.dataset.copy = upc;
						copyBtn.style.opacity = "1";
					}
				} else {
					const row = upcRow || upcEl.closest(".sb1c-row");
					if (row) row.style.display = "none";
				}
				if (brand) {
					const brandVal = wrapperEl.querySelector(".sb1c-brand-val");
					const brandRow = wrapperEl.querySelector(".sb1c-brand-row");
					if (brandVal) {
						brandVal.textContent = brand;
						if (brandRow) brandRow.style.display = "";
					}
				}
			});
		}
		const SUPPLIERS = {
			amazon: {
				marketplace: "amazon",
				matchListingPage() {
					const p = location.pathname, q = location.search;
					return /^\/s(\/|$|\?)/.test(p) || /^\/b(\/|$|\?)/.test(p) || /gp\/browse/.test(p) || /\/stores\//.test(p) || /\/Best-Sellers-/.test(p) || q.includes("&k=") || q.includes("?k=");
				},
				matchDetailPage() {
					return /\/dp\/[A-Z0-9]{10}/i.test(location.pathname) || /\/gp\/product\/[A-Z0-9]{10}/i.test(location.pathname) || !!document.querySelector("#productTitle");
				},
				findContainers() {
					const items = document.querySelectorAll("[data-component-type=\"s-search-result\"][data-asin]:not([data-asin=\"\"]),[data-component-type=\"sp-sponsored-result\"][data-asin]:not([data-asin=\"\"])");
					if (items.length) return items;
					return document.querySelectorAll(".s-result-list > [data-asin]:not([data-asin=\"\"]),.s-search-results > [data-asin]:not([data-asin=\"\"])");
				},
				extract(el) {
					const asin = el.dataset.asin || "";
					const titleEl = el.querySelector("h2 a span") || el.querySelector("span.a-size-medium") || el.querySelector("span.a-size-base-plus") || el.querySelector("[data-cy=\"title-recipe-title\"]");
					const linkEl = el.querySelector("h2 a[href]") || el.querySelector("a.a-link-normal[href*=\"/dp/\"]");
					let title = safeText(titleEl);
					if (!title && linkEl) title = safeText(linkEl);
					const imgEl = el.querySelector("img.s-image");
					const rawHref = linkEl ? linkEl.getAttribute("href") : "";
					const url = rawHref.startsWith("http") ? rawHref.split("?")[0] : rawHref ? "https://www.amazon.com" + rawHref.split("?")[0] : "https://www.amazon.com/dp/" + asin;
					const prime = !!(el.querySelector(".a-icon-prime") || el.querySelector("[aria-label=\"Amazon Prime\"]"));
					return {
						supplier: "amazon",
						productId: asin,
						asin,
						title,
						image: imgEl ? imgEl.src : "",
						url,
						brand: "",
						prime,
						primeOrShipping: prime ? "Prime" : "",
						idLabel: "ASIN",
						upc: ""
					};
				},
				extractFromDetailPage() {
					const asin = document.querySelector("#ASIN")?.value || document.querySelector("input[name=\"ASIN\"]")?.value || document.querySelector("[data-asin]")?.dataset.asin || (/\/dp\/([A-Z0-9]{10})/i.exec(location.pathname) || [])[1] || "";
					const title = safeText(document.querySelector("#productTitle"));
					const prime = !!(document.querySelector("#desktop_buybox .a-icon-prime") || document.querySelector("#buybox .a-icon-prime") || document.querySelector(".a-icon-prime"));
					const imgEl = document.querySelector("#landingImage") || document.querySelector("#imgBlkFront");
					const brand = readBrandFromDom(document);
					const upc = readUpcFromDom(document);
					return {
						supplier: "amazon",
						productId: asin,
						asin,
						title,
						image: imgEl ? imgEl.src : "",
						url: location.href.split("?")[0],
						brand,
						prime,
						primeOrShipping: prime ? "Prime" : "",
						idLabel: "ASIN",
						upc
					};
				},
				insertCard(container, wrapper) {
					let el;
					el = container.querySelector(".s-title-instructions-style");
					if (el) {
						el.appendChild(wrapper);
						return;
					}
					el = container.querySelector("h2 > a");
					if (el?.parentElement?.parentElement) {
						el.parentElement.parentElement.appendChild(wrapper);
						return;
					}
					el = container.querySelector("div.a-section.a-spacing-none a.a-link-normal");
					if (el?.parentElement?.parentElement) {
						el.parentElement.parentElement.appendChild(wrapper);
						return;
					}
					el = container.querySelector("div.sg-row:nth-child(2)>div:nth-child(2)");
					if (el?.parentElement) {
						el.parentElement.insertBefore(wrapper, el);
						wrapper.style.paddingLeft = "12px";
						return;
					}
					el = container.querySelector("img.s-image");
					if (el?.parentNode?.parentNode?.parentNode) {
						el.parentNode.parentNode.parentNode.appendChild(wrapper);
						return;
					}
					container.appendChild(wrapper);
				},
				insertCardOnDetailPage(wrapper) {
					function insertAfter(anchor) {
						if (!anchor || !anchor.parentNode) return false;
						anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
						return true;
					}
					const titleSection = document.querySelector("#titleSection");
					if (titleSection && insertAfter(titleSection.parentElement || titleSection)) return;
					if (insertAfter(document.querySelector("#productTitle"))) return;
					const fb = document.querySelector("#feature-bullets");
					if (fb?.parentNode) {
						fb.parentNode.insertBefore(wrapper, fb);
						return;
					}
					const cc = document.querySelector("#centerCol");
					if (cc) cc.insertBefore(wrapper, cc.firstChild);
				}
			},
			walmart: {
				marketplace: "walmart",
				matchListingPage() {
					const p = location.pathname;
					return /^\/search(\/|$|\?)/.test(p) || /^\/browse(\/|$)/.test(p) || /^\/cp\//.test(p) || location.search.includes("?q=") || location.search.includes("&q=");
				},
				matchDetailPage() {
					return /^\/ip\//.test(location.pathname) || !!document.querySelector("[itemprop=\"name\"][data-testid], h1.prod-ProductTitle, [data-testid=\"product-title\"]");
				},
				findContainers() {
					const byItemId = document.querySelectorAll("[data-item-id]");
					if (byItemId.length) return byItemId;
					return document.querySelectorAll("[data-testid=\"list-view\"] > div, [data-testid=\"search-result-listview-item\"]");
				},
				extract(el) {
					const dataId = el.dataset.itemId || "";
					const linkEl = el.querySelector("a[href*=\"/ip/\"]");
					const rawHref = linkEl ? linkEl.getAttribute("href") : "";
					const idMatch = /\/ip\/(?:[^/?#]+\/)?(\d{6,12})/.exec(rawHref);
					const productId = dataId || (idMatch ? idMatch[1] : "");
					const titleEl = el.querySelector("[data-automation-id=\"product-title\"]") || el.querySelector("[data-testid=\"product-title\"]") || el.querySelector("a[link-identifier=\"productName\"] span");
					const imgEl = el.querySelector("img[data-testid], .hover-zoom-hero-image img, img[loading=\"lazy\"]");
					const url = rawHref ? rawHref.startsWith("http") ? rawHref.split("?")[0] : "https://www.walmart.com" + rawHref.split("?")[0] : productId ? "https://www.walmart.com/ip/" + productId : "";
					const brandEl = el.querySelector("[data-automation-id=\"product-brand\"]");
					let stockQty = "";
					const fulfillEl = el.querySelector("[data-automation-id=\"fulfillment-badge\"]") || el.querySelector("[data-testid=\"product-availability\"]") || el.querySelector("[data-automation-id=\"product-stock-status\"]");
					if (fulfillEl) {
						const t = safeText(fulfillEl);
						const n = t.match(/only\s+(\d+)\s+left/i) || t.match(/(\d+)\s+left/i);
						if (n) stockQty = n[1];
						else if (/out\s+of\s+stock/i.test(t)) stockQty = "Out";
						else if (/limited/i.test(t)) stockQty = "Limited";
						else if (t) stockQty = "In Stock";
					}
					return {
						supplier: "walmart",
						productId,
						title: safeText(titleEl),
						image: imgEl ? imgEl.src : "",
						url,
						brand: safeText(brandEl),
						primeOrShipping: "",
						idLabel: "Item ID",
						stockQty,
						upc: ""
					};
				},
				extractFromDetailPage() {
					const pathMatch = /\/ip\/(?:[^/?#]+\/)?(\d{6,12})/.exec(location.pathname);
					const productId = pathMatch ? pathMatch[1] : "";
					const titleEl = document.querySelector("h1.prod-ProductTitle") || document.querySelector("[itemprop=\"name\"]") || document.querySelector("[data-testid=\"product-title\"]") || document.querySelector("h1");
					const brandEl = document.querySelector("[itemprop=\"brand\"] [itemprop=\"name\"]") || document.querySelector("[data-automation-id=\"product-brand\"]") || document.querySelector(".prod-brandName");
					const imgEl = document.querySelector("[data-testid=\"hero-image\"] img") || document.querySelector(".prod-hero-image img") || document.querySelector("[data-automation-id=\"image-section\"] img");
					let upc = "";
					const gtinEl = document.querySelector("[itemprop=\"gtin13\"]");
					if (gtinEl) upc = (gtinEl.getAttribute("content") || gtinEl.textContent).trim();
					if (!upc) document.querySelectorAll("[data-testid=\"product-spec-row\"], tr").forEach(function(row) {
						if (upc) return;
						const cells = row.querySelectorAll("td, th, span");
						if (cells.length >= 2) {
							const label = cells[0].textContent.trim().toLowerCase();
							if (label === "upc" || label === "gtin") upc = cells[1].textContent.trim().split(/\s+/)[0];
						}
					});
					let stockQty = "";
					const availEl = document.querySelector("[data-automation-id=\"fulfillment-badge\"], [data-testid=\"product-availability\"]");
					if (availEl) {
						const t = safeText(availEl);
						const n = t.match(/only\s+(\d+)\s+left/i) || t.match(/(\d+)\s+left/i);
						if (n) stockQty = n[1];
						else if (/out\s+of\s+stock/i.test(t)) stockQty = "Out";
						else if (/limited/i.test(t)) stockQty = "Limited";
						else if (t) stockQty = "In Stock";
					}
					return {
						supplier: "walmart",
						productId,
						title: safeText(titleEl),
						image: imgEl ? imgEl.src : "",
						url: location.href.split("?")[0],
						brand: safeText(brandEl),
						primeOrShipping: "",
						idLabel: "Item ID",
						stockQty,
						upc
					};
				},
				insertCard(container, wrapper) {
					const parent = container.parentNode;
					if (container.nextSibling && parent) parent.insertBefore(wrapper, container.nextSibling);
					else if (parent) parent.appendChild(wrapper);
					else container.appendChild(wrapper);
				},
				insertCardOnDetailPage(wrapper) {
					function insertAfter(anchor) {
						if (!anchor || !anchor.parentNode) return false;
						anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
						return true;
					}
					if (insertAfter(document.querySelector("div > section > [itemprop=\"name\"]"))) return;
					if (insertAfter(document.querySelector("h1.prod-ProductTitle") || document.querySelector("h1[itemprop=\"name\"]"))) return;
					const ts = document.querySelector("[data-testid=\"product-title\"], [data-automation-id=\"product-title\"]");
					if (ts) insertAfter(ts.closest("section") || ts);
				}
			},
			ebay: {
				marketplace: "ebay",
				matchListingPage() {
					const p = location.pathname;
					return p === "/" || p === "/index.html" || /^\/sch\b/i.test(p) || /^\/b\b/i.test(p) || /^\/str\b/i.test(p) || /^\/deals\b/i.test(p);
				},
				matchDetailPage() {
					return CardCore.isEbayItemUrl(location.href);
				},
				findContainers() {
					return document.querySelectorAll(".s-card, .s-item, .hl-card, .hl-item, [data-testid=\"carousel-card\"]");
				},
				extract(el) {
					const linkEl = el.querySelector(".su-card-container__header a[href*=\"/itm/\"]") || el.querySelector("a.s-item__link") || el.querySelector("a.s-card__link[href*=\"/itm/\"]") || el.querySelector("a[href*=\"/itm/\"]");
					const rawHref = linkEl ? linkEl.getAttribute("href") : "";
					const productId = CardCore.extractEbayItemId(rawHref);
					const title = safeText(el.querySelector(".s-card__title") || el.querySelector(".s-item__title") || el.querySelector(".s-item__title span") || el.querySelector(".hl-item__title") || el.querySelector(".hl-card__title") || el.querySelector("h3") || linkEl);
					const imgEl = el.querySelector("img.s-card__image, .s-item__image-img img, img.s-item__image, .s-item__image-wrapper img, img");
					const price = safeText(el.querySelector(".s-card__price") || el.querySelector(".s-item__price") || el.querySelector(".hl-item__price") || el.querySelector(".hl-card__price"));
					const seller = safeText(el.querySelector(".s-item__seller-info") || el.querySelector(".s-item__username"));
					return {
						supplier: "ebay",
						productId,
						idLabel: "Item ID",
						title,
						searchQuery: CardCore.cleanSearchQuery(title),
						image: imgEl ? imgEl.src : "",
						url: rawHref ? rawHref.split("?")[0] : "",
						price,
						seller,
						brand: "",
						condition: ""
					};
				},
				extractFromDetailPage() {
					const data = CardCore.extractEbayProduct(document, location.href);
					data._isDetailPage = true;
					return data;
				},
				insertCard(container, wrapper) {
					if (container.classList && container.classList.contains("s-card")) {
						const attrs = container.querySelector(".su-card-container__attributes");
						if (attrs && attrs.parentNode) {
							attrs.parentNode.insertBefore(wrapper, attrs);
							return;
						}
					}
					if (container.classList && container.classList.contains("s-item")) {
						const price = container.querySelector(".s-item__price");
						if (price && price.parentNode) {
							price.parentNode.insertBefore(wrapper, price);
							return;
						}
					}
					const hlTitle = container.querySelector(".hl-item__title, .hl-card__title");
					if (hlTitle && hlTitle.parentNode) {
						hlTitle.parentNode.insertBefore(wrapper, hlTitle.nextSibling);
						return;
					}
					container.appendChild(wrapper);
				},
				insertCardOnDetailPage(wrapper) {
					function insertAfter(anchor) {
						if (!anchor || !anchor.parentNode) return false;
						anchor.parentNode.insertBefore(wrapper, anchor.nextSibling);
						return true;
					}
					if (insertAfter(document.querySelector(".vim.x-item-title") || document.querySelector("[data-testid=\"x-item-title\"]") || document.querySelector(".x-item-title") || document.querySelector("h1.x-item-title__mainTitle")?.parentElement)) return;
					if (insertAfter(document.querySelector("h1.x-item-title__mainTitle") || document.querySelector("h1[itemprop=\"name\"]") || document.querySelector("h1#itemTitle"))) return;
					const buyBox = document.querySelector("[data-testid=\"x-buybox\"]") || document.querySelector(".x-buybox") || document.querySelector(".vim.x-buybox");
					if (buyBox?.parentNode) buyBox.parentNode.insertBefore(wrapper, buyBox);
				}
			}
		};
		function buildCardHTML(data) {
			const key = data.supplier;
			const title = data.searchQuery || data.title || "";
			function linkBtn(href, svgMarkup, btnTitle) {
				return "<a href=\"" + escHtml(href) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"sb1c-link-a\" title=\"" + escHtml(btnTitle) + "\" aria-label=\"" + escHtml(btnTitle) + "\"><span aria-hidden=\"true\">" + svgMarkup + "</span></a>";
			}
			const targetLabels = {
				ebay: "eBay",
				amazon: "Amazon",
				walmart: "Walmart",
				aliexpress: "AliExpress",
				temu: "Temu",
				alibaba: "Alibaba"
			};
			const searchButtons = (key === "ebay" ? CardCore.SEARCH_TARGETS : CardCore.SEARCH_TARGETS.filter((target) => target !== key)).map((target) => {
				return linkBtn(title ? CardCore.buildSearchUrl(target, title) : "#", SVG[target], "Search on " + targetLabels[target]);
			}).join("");
			function copyBtn(val) {
				return "<button type=\"button\" class=\"sb1c-copy-btn\" data-copy=\"" + escHtml(val) + "\" style=\"opacity:" + (val ? "1" : "0.3") + ";\" title=\"Copy\" aria-label=\"Copy value\">" + SVG.copy + "</button>";
			}
			function valueRow(label, value, className) {
				if (!value) return "";
				return "<div class=\"sb1c-row " + (className || "") + "\"><b>" + escHtml(label) + ":</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text\">" + escHtml(value) + "</span></span></div>";
			}
			const idRow = data.productId ? "<div class=\"sb1c-row\"><b>" + data.idLabel + ":</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text\">" + escHtml(data.productId) + "</span>" + copyBtn(data.productId) + "</span></div>" : "";
			let upcRow;
			if (data.upc && /^\d{6,14}$/.test(data.upc)) upcRow = "<div class=\"sb1c-row sb1c-upc-row\"><b>UPC:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text sb1c-upc-val\">" + escHtml(data.upc) + "</span>" + copyBtn(data.upc) + "</span></div>";
			else upcRow = "<div class=\"sb1c-row sb1c-upc-row\"><b>UPC:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text sb1c-upc-val\" style=\"font-style:italic;color:#888;\">loading…</span>" + copyBtn("") + "</span></div>";
			let qtyDisplay, qtyStyle;
			if (key === "amazon" && !data.stockQty) {
				qtyDisplay = "#";
				qtyStyle = "font-style:italic;color:#888;";
			} else {
				const v = data.stockQty || "–";
				qtyDisplay = v;
				qtyStyle = /out/i.test(v) ? "color:#d00;" : /stock|limited/i.test(v) ? "color:#007600;" : "";
			}
			const qtyRow = "<div class=\"sb1c-row\"><b>Qty:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text sb1c-qty-val\" style=\"" + qtyStyle + "\">" + escHtml(qtyDisplay) + "</span></span></div>";
			const primeRow = data.primeOrShipping ? "<div class=\"sb1c-row\"><b>Prime:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text\" style=\"color:#00558c;font-weight:600;\">✓</span></span></div>" : "";
			const brandRow = data.brand ? "<div class=\"sb1c-row sb1c-brand-row\"><b>Brand:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text sb1c-brand-val\">" + escHtml(data.brand) + "</span></span></div>" : "<div class=\"sb1c-row sb1c-brand-row\" style=\"display:none;\"><b>Brand:</b><span class=\"sb1c-val-group\"><span class=\"sb1c-value-text sb1c-brand-val\"></span></span></div>";
			const ebayDetails = key === "ebay" && data._isDetailPage ? idRow + valueRow("Price", data.price) + valueRow("Condition", data.condition) + valueRow("Seller", data.seller) + valueRow("Brand", data.brand) : "";
			const standardDetails = key === "ebay" ? "" : idRow + upcRow + qtyRow + primeRow + brandRow;
			const details = ebayDetails || standardDetails;
			const actions = key === "ebay" ? "" : "<div class=\"sb1c-btn-row\"><button type=\"button\" class=\"sb1c-action-btn sb1c-upload\" title=\"List on eBay\">List Now</button><button type=\"button\" class=\"sb1c-action-btn sb1c-plus\" title=\"Add to Bulk\">+ Bulk</button></div>";
			return "<div class=\"sb1c-card\"><div class=\"sb1c-search-bar\" role=\"group\" aria-label=\"Search this product on other marketplaces\">" + searchButtons + "</div>" + (details ? "<div class=\"sb1c-details\">" + details + "</div>" : "") + actions + "<div class=\"sb1c-status\" role=\"status\" aria-live=\"polite\" style=\"display:none;\"></div><div class=\"sb1c-footer\" style=\"display:none;\"></div></div>";
		}
		function setStatus(wrapperEl, state, msg) {
			const status = wrapperEl.querySelector(".sb1c-status");
			if (!status) return;
			if (!state && !msg) {
				status.style.display = "none";
				status.innerHTML = "";
				return;
			}
			let icon = "";
			if (state === "loading") icon = SVG.spinner;
			else if (state === "success") icon = SVG.ok;
			else if (state === "error") icon = SVG.error;
			status.className = "sb1c-status sb1c-" + (state || "info");
			status.innerHTML = icon + escHtml(msg || "");
			status.style.display = "flex";
			status.style.alignItems = "center";
		}
		async function handleUpload(wrapperEl, data) {
			const supplierKey = getSupplierKey();
			const config = supplierKey ? SUPPLIERS[supplierKey] : null;
			if (config && config.matchDetailPage && config.matchDetailPage()) {
				setStatus(wrapperEl, "loading", "Opening Sidebar…");
				try {
					chrome.storage.local.set({ autoScanOnly: true });
					chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
					setTimeout(() => {
						chrome.runtime.sendMessage({ action: "DOM_READY_AUTO_SCAN" });
					}, 100);
					setStatus(wrapperEl, "success", "Sidebar opened ✓");
				} catch (e) {
					setStatus(wrapperEl, "error", e?.message || "Failed to open sidebar");
				}
				setTimeout(() => setStatus(wrapperEl, "", ""), 3500);
			} else {
				setStatus(wrapperEl, "loading", "Navigating…");
				try {
					await new Promise((r) => chrome.storage.local.set({ autoScanActive: true }, r));
					let targetUrl = data.url || "";
					if (targetUrl) targetUrl = targetUrl.includes("#") ? targetUrl.split("#")[0] + "#sellersuit_auto_list=true" : targetUrl + "#sellersuit_auto_list=true";
					await chrome.runtime.sendMessage({
						action: "AUTO_LIST_NEW_TAB",
						url: targetUrl
					});
					setStatus(wrapperEl, "success", "Opening product page ✓");
				} catch (e) {
					setStatus(wrapperEl, "error", e?.message || "Navigation failed");
				}
				setTimeout(() => setStatus(wrapperEl, "", ""), 3500);
			}
		}
		async function handleAddToBulk(wrapperEl, data) {
			setStatus(wrapperEl, "loading", "Adding…");
			const key = data.supplier + ":" + (data.productId || data.url);
			try {
				const stored = await new Promise((r) => chrome.storage.local.get(["sb1BulkQueue"], r));
				const queue = Array.isArray(stored.sb1BulkQueue) ? stored.sb1BulkQueue : [];
				if (queue.some((item) => item._key === key)) {
					setStatus(wrapperEl, "success", "Already queued");
					setTimeout(() => setStatus(wrapperEl, "", ""), 2e3);
					return;
				}
				queue.push({
					_key: key,
					id: key,
					url: data.url,
					title: data.title || "",
					image: data.image || "",
					supplier: data.supplier,
					sourceId: data.productId || "",
					upc: data.upc || "",
					addedAt: Date.now()
				});
				await new Promise((r) => chrome.storage.local.set({ sb1BulkQueue: queue }, r));
				setStatus(wrapperEl, "success", "Added ✓ (" + queue.length + " queued)");
			} catch (e) {
				setStatus(wrapperEl, "error", "Failed to add");
			}
			setTimeout(() => setStatus(wrapperEl, "", ""), 2500);
		}
		function wireCard(wrapper, data) {
			wrapper.addEventListener("mousedown", function(e) {
				e.stopPropagation();
			}, true);
			wrapper.addEventListener("mouseup", function(e) {
				e.stopPropagation();
			}, true);
			wrapper.addEventListener("click", function(e) {
				e.stopPropagation();
				if (e.target.closest(".sb1c-upload")) {
					e.preventDefault();
					handleUpload(wrapper, data);
					return;
				}
				if (e.target.closest(".sb1c-plus")) {
					e.preventDefault();
					handleAddToBulk(wrapper, data);
					return;
				}
				const copyBtnEl = e.target.closest(".sb1c-copy-btn");
				if (copyBtnEl) {
					e.preventDefault();
					const text = copyBtnEl.dataset.copy || "";
					if (text) {
						navigator.clipboard.writeText(text).catch(() => {});
						const origHTML = copyBtnEl.innerHTML;
						copyBtnEl.innerHTML = SVG.ok;
						setTimeout(() => {
							copyBtnEl.innerHTML = origHTML;
						}, 1500);
					}
					return;
				}
				const link = e.target.closest("a.sb1c-link-a");
				if (link) {
					e.preventDefault();
					const href = link.getAttribute("href");
					if (href && href !== "#" && CardCore.isAllowedSearchUrl(href)) {
						const opened = window.open(href, "_blank", "noopener,noreferrer");
						if (opened) opened.opener = null;
					}
					return;
				}
			}, true);
		}
		const MARKER = "data-sb1-card";
		const DETAIL_MARKER = "data-sb1-detail-card";
		const DETAIL_INSTANCE = "data-sb1-detail-card-instance";
		function injectListingCardCSS() {
			if (getSupplierKey() === "ebay") return;
			if (!document.getElementById("sellersuit-listing-card-css")) {
				const cssLink = document.createElement("link");
				cssLink.id = "sellersuit-listing-card-css";
				cssLink.rel = "stylesheet";
				cssLink.href = chrome.runtime.getURL("ui/listing-card.css");
				document.head.appendChild(cssLink);
			}
		}
		function injectCard(container, config) {
			if (container.hasAttribute(MARKER)) return;
			container.setAttribute(MARKER, "1");
			const data = config.extract(container);
			if (!data.title && !data.productId) return;
			injectListingCardCSS();
			const wrapper = document.createElement("div");
			wrapper.className = "sb1c-wrapper sb1c-listing";
			wrapper.innerHTML = buildCardHTML(data);
			wireCard(wrapper, data);
			_injecting = true;
			try {
				config.insertCard(container, wrapper);
			} finally {
				_injecting = false;
			}
			if (data.supplier === "amazon") fetchAmazonQty(data.asin, wrapper);
			fetchProductPageData(data.url, data.asin, data.supplier, wrapper, data);
		}
		function scanPage(config) {
			const containers = config.findContainers();
			if (!containers || !containers.length) return;
			Array.from(containers).forEach((c) => injectCard(c, config));
		}
		function injectDetailCard(config) {
			const existing = document.querySelector(".sb1c-wrapper[data-sb1-detail-card-instance=\"1\"]");
			if (document.body.hasAttribute(DETAIL_MARKER) && existing) return;
			if (!existing) document.body.removeAttribute(DETAIL_MARKER);
			document.body.setAttribute(DETAIL_MARKER, "1");
			const data = config.extractFromDetailPage();
			if (!data.title && !data.productId) return;
			injectListingCardCSS();
			const wrapper = document.createElement("div");
			wrapper.className = "sb1c-wrapper";
			wrapper.setAttribute(DETAIL_INSTANCE, "1");
			wrapper.dataset.sb1Fingerprint = CardCore.productFingerprint(data);
			wrapper.innerHTML = buildCardHTML(data);
			wireCard(wrapper, data);
			config.insertCardOnDetailPage(wrapper);
			if (data.supplier === "amazon") fetchAmazonQty(data.asin, wrapper);
			if (!data.upc && data.supplier === "amazon") fetchProductPageData(data.url, data.asin, data.supplier, wrapper, data);
		}
		function refreshEbayDetailCard(config) {
			const existing = document.querySelector(".sb1c-wrapper[data-sb1-detail-card-instance=\"1\"]");
			if (!existing) {
				document.body.removeAttribute(DETAIL_MARKER);
				injectDetailCard(config);
				return;
			}
			const data = config.extractFromDetailPage();
			if (!data.title && !data.productId) return;
			const fingerprint = CardCore.productFingerprint(data);
			if (existing.dataset.sb1Fingerprint === fingerprint) return;
			const replacement = document.createElement("div");
			replacement.className = "sb1c-wrapper";
			replacement.setAttribute(DETAIL_INSTANCE, "1");
			replacement.dataset.sb1Fingerprint = fingerprint;
			replacement.innerHTML = buildCardHTML(data);
			wireCard(replacement, data);
			existing.replaceWith(replacement);
		}
		let _injecting = false;
		let _observer = null;
		let _resultsRoot = null;
		const FETCH_CONCURRENCY = 3;
		let _fetchActive = 0;
		const _fetchQueue = [];
		let _fetchAbortCtrl = new AbortController();
		let lastUrl = "";
		function checkUrlAndInject(config) {
			const url = location.pathname + location.search;
			if (url !== lastUrl) {
				lastUrl = url;
				_fetchAbortCtrl.abort();
				_fetchAbortCtrl = new AbortController();
				_fetchQueue.length = 0;
				_fetchActive = 0;
				if (_observer) _observer.disconnect();
				document.body.removeAttribute(DETAIL_MARKER);
				document.querySelectorAll("[data-sb1-card]").forEach((el) => el.removeAttribute(MARKER));
				document.querySelectorAll(".sb1c-wrapper").forEach((el) => el.remove());
				if (_observer && _resultsRoot) _observer.observe(_resultsRoot, {
					childList: true,
					subtree: true
				});
			}
			if (config.matchListingPage()) scanPage(config);
			else if (config.matchDetailPage && config.extractFromDetailPage && config.insertCardOnDetailPage) {
				if (config.matchDetailPage()) if (config.marketplace === "ebay" && document.body.hasAttribute(DETAIL_MARKER)) refreshEbayDetailCard(config);
				else injectDetailCard(config);
			}
		}
		function init() {
			const supplierKey = getSupplierKey();
			if (!supplierKey) return;
			const config = SUPPLIERS[supplierKey];
			if (!config) return;
			setTimeout(() => checkUrlAndInject(config), 800);
			const debouncedCheck = debounce(() => checkUrlAndInject(config), 400);
			_observer = new MutationObserver(function(mutations) {
				if (_injecting) return;
				for (const m of mutations) if (m.addedNodes.length) {
					debouncedCheck();
					return;
				}
			});
			_resultsRoot = document.querySelector("ul.srp-results, div.s-main-slot, [data-testid=\"list-view-container\"], #srp-river-results") || document.body;
			_observer.observe(_resultsRoot, {
				childList: true,
				subtree: true
			});
			window.addEventListener("popstate", debouncedCheck);
			window.addEventListener("hashchange", debouncedCheck);
		}
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
		else init();
	})();
	//#endregion
})();

//# sourceMappingURL=walmart.bundle.js.map