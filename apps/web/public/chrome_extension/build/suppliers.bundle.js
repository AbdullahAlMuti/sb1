(function() {
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
	//#region suppliers/amazon/adapter.js
	window.SSAmazonAdapter = (() => {
		"use strict";
		const HOST_RE = /(^|\.)amazon\.(com|co\.uk|de|ca|com\.au)$/i;
		function matchUrl(url) {
			try {
				return HOST_RE.test(new URL(url).hostname);
			} catch (_) {
				return false;
			}
		}
		function _usableResult(r, needVariants) {
			if (!r || !r.title) return false;
			if (needVariants && (!Array.isArray(r.variants) || r.variants.length === 0)) return false;
			return true;
		}
		async function scrapeProduct(opts) {
			const v2 = window.SsAmazonScraperV2;
			if (v2) try {
				const r = await v2.scrapeSingleProduct(opts);
				if (_usableResult(r, false)) return r;
				console.warn("[SSAmazonAdapter] v2 single result unusable — falling back to v1");
			} catch (e) {
				if (/CAPTCHA/i.test(e?.message || "")) throw e;
				console.warn("[SSAmazonAdapter] v2 scrapeSingleProduct failed, using v1:", e?.message || e);
			}
			const s = window.SsAmazonVariantScraper;
			if (!s) throw new Error("SsAmazonVariantScraper not loaded");
			return s.scrapeSingleProduct(opts);
		}
		async function scrapeVariants(opts) {
			const v2 = window.SsAmazonScraperV2;
			if (v2) try {
				const r = await v2.scrapeProductWithVariants(opts);
				if (_usableResult(r, true)) return r;
				console.warn("[SSAmazonAdapter] v2 variants result unusable — falling back to v1");
			} catch (e) {
				if (/CAPTCHA|low on quantity/i.test(e?.message || "")) throw e;
				console.warn("[SSAmazonAdapter] v2 scrapeProductWithVariants failed, using v1:", e?.message || e);
			}
			const s = window.SsAmazonVariantScraper;
			if (!s) throw new Error("SsAmazonVariantScraper not loaded");
			return s.scrapeProductWithVariants(opts);
		}
		/**
		* Raw scraper output → universal NormalizedProduct. Pure. The only transform:
		* derive sourceId (parentAsin → asin) and set supplier. Everything else passes
		* through unchanged so no scrape behavior is altered.
		* @param {object} raw scraper output ({ asin, parentAsin, marketplace:'amazon', ... })
		* @returns {object} normalized product
		*/
		function normalize(raw) {
			raw = raw || {};
			const sourceId = raw.sourceId || raw.parentAsin || raw.asin || "";
			const product = {
				...raw,
				sourceId,
				supplier: raw.marketplace || raw.supplier || "amazon",
				images: Array.isArray(raw.images) ? raw.images : [],
				variants: Array.isArray(raw.variants) ? raw.variants : [],
				asin: raw.asin || null,
				parentAsin: raw.parentAsin || raw.asin || null
			};
			return window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeProduct(product, {
				dedupe: true,
				dropInvalid: true
			}) : product;
		}
		return {
			supplierId: "amazon",
			displayName: "Amazon",
			idLabel: "ASIN",
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
	if (typeof window.SSSupplierRegistry !== "undefined") window.SSSupplierRegistry.register(window.SSAmazonAdapter);
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
})();

//# sourceMappingURL=suppliers.bundle.js.map