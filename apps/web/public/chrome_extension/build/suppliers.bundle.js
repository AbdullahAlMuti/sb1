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
	//#region suppliers/core/pricing-core.js
	window.SSPricingCore = (() => {
		"use strict";
		const VALID_ROUNDING_RULES = new Set([
			"NONE",
			"END_99",
			"END_95",
			"END_49",
			"ROUND_UP"
		]);
		/**
		* Convert a decimal price value to integer cents.
		* Throws on NaN, negative, or non-finite input.
		* @param {number|string} value  e.g. 19.99 → 1999
		* @returns {number} integer cents
		*/
		function parseToIntCents(value) {
			const n = typeof value === "string" ? parseFloat(value) : Number(value);
			if (!isFinite(n)) throw new RangeError(`parseToIntCents: non-finite value "${value}"`);
			if (n < 0) throw new RangeError(`parseToIntCents: negative value "${value}"`);
			return Math.round(n * 100);
		}
		/**
		* Convert integer cents back to a 2-decimal display string.
		* Only call at output boundaries, never during computation.
		* @param {number} cents  integer
		* @returns {string}  e.g. 1999 → "19.99"
		*/
		function centsToDisplay(cents) {
			return (cents / 100).toFixed(2);
		}
		/**
		* Apply a rounding rule to an integer-cent value.
		* Guarantee: result is always >= cents (never reduces the price).
		*
		* END_99 / END_95 / END_49:
		*   Find the smallest value >= cents whose last-two digits equal the target.
		* ROUND_UP:
		*   Ceil to the next whole unit (already-whole stays).
		* NONE:
		*   Return unchanged.
		*
		* @param {number} cents  integer >= 0
		* @param {string} rule   one of VALID_ROUNDING_RULES
		* @returns {number} integer >= cents
		*/
		function applyRoundingRule(cents, rule) {
			if (!VALID_ROUNDING_RULES.has(rule)) throw new TypeError(`Unknown rounding rule: "${rule}"`);
			if (rule === "NONE") return cents;
			if (rule === "ROUND_UP") return cents % 100 === 0 ? cents : Math.ceil(cents / 100) * 100;
			const t = {
				END_99: 99,
				END_95: 95,
				END_49: 49
			}[rule];
			const candidate = Math.floor(cents / 100) * 100 + t;
			return candidate >= cents ? candidate : candidate + 100;
		}
		/**
		* Calculate the full eBay selling-price breakdown for one product.
		*
		* Formula (additive, all in cents):
		*   baseCost      = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
		*   marketplaceFee= baseCost * marketplaceFeePercent / 100
		*   currencyBuffer= baseCost * currencyBufferPercent / 100
		*   targetProfit  = max(baseCost * profitMarginPercent / 100, minimumProfit)
		*   rawFinal      = baseCost + marketplaceFee + currencyBuffer + targetProfit
		*   finalPrice    = applyRoundingRule(rawFinal, roundingRule)
		*   realizedProfit= finalPrice - baseCost - marketplaceFee - currencyBuffer
		*
		* Note: realizedProfit >= targetProfit because rounding never goes down.
		*
		* @param {object} rule              from user_pricing_settings row
		* @param {number|string} supplierPriceDec  decimal USD (e.g. 19.99)
		* @param {number|string} shippingCostDec   decimal USD (e.g. 4.99) — 0 if free shipping
		* @returns {object} full breakdown (all price fields as display strings)
		*/
		function calculatePrice(rule, supplierPriceDec, shippingCostDec) {
			const sp = parseToIntCents(supplierPriceDec);
			const sc = parseToIntCents(shippingCostDec);
			const sb = parseToIntCents(rule.shippingBuffer ?? 0);
			const fh = parseToIntCents(rule.fixedHandlingFee ?? 0);
			const baseCost = sp + sc + sb + fh;
			if (baseCost <= 0) throw new RangeError("calculatePrice: baseCost must be positive");
			const mktFee = Math.round(baseCost * (rule.marketplaceFeePercent ?? 0) / 100);
			const fxBuf = Math.round(baseCost * (rule.currencyBufferPercent ?? 0) / 100);
			const tgtProfit = Math.max(Math.round(baseCost * (rule.profitMarginPercent ?? 0) / 100), parseToIntCents(rule.minimumProfit ?? 0));
			const rawFinal = baseCost + mktFee + fxBuf + tgtProfit;
			const finalCents = applyRoundingRule(rawFinal, rule.roundingRule ?? "NONE");
			const realizedProfit = finalCents - baseCost - mktFee - fxBuf;
			const marginPct = finalCents > 0 ? realizedProfit / finalCents * 100 : 0;
			return {
				finalPrice: centsToDisplay(finalCents),
				supplierPrice: centsToDisplay(sp),
				shippingCost: centsToDisplay(sc),
				shippingBuffer: centsToDisplay(sb),
				fixedHandlingFee: centsToDisplay(fh),
				baseCost: centsToDisplay(baseCost),
				marketplaceFee: centsToDisplay(mktFee),
				currencyBuffer: centsToDisplay(fxBuf),
				profit: centsToDisplay(realizedProfit),
				marginPercent: parseFloat(marginPct.toFixed(2)),
				roundingRule: rule.roundingRule ?? "NONE",
				supplierKey: rule.supplierKey ?? null,
				ruleVersion: rule.ruleVersion ?? null,
				breakdown: {
					spCents: sp,
					scCents: sc,
					sbCents: sb,
					fhCents: fh,
					baseCost,
					mktFee,
					fxBuf,
					tgtProfit,
					rawFinal,
					finalCents
				}
			};
		}
		return {
			parseToIntCents,
			centsToDisplay,
			applyRoundingRule,
			calculatePrice
		};
	})();
	//#endregion
	//#region suppliers/core/supplier-detector.js
	window.SSSupplierDetector = (() => {
		"use strict";
		/**
		* Detect the supplier for a given URL.
		* Delegates to SSSupplierRegistry adapters (subdomain-safe, case-insensitive).
		*
		* @param {string} url  full URL (e.g. location.href)
		* @returns {{ supplierId: string, displayName: string } | null}
		*/
		function detectSupplierFromUrl(url) {
			if (!url) return null;
			try {
				const adapter = window.SSSupplierRegistry && window.SSSupplierRegistry.match(url);
				if (!adapter) return null;
				return {
					supplierId: adapter.supplierId,
					displayName: adapter.displayName
				};
			} catch (_) {
				return null;
			}
		}
		/**
		* Convenience: detect from the current page URL.
		* Only valid in a content script or page context (not service worker).
		* @returns {{ supplierId: string, displayName: string } | null}
		*/
		function detectCurrentPage() {
			try {
				return detectSupplierFromUrl(window.location.href);
			} catch (_) {
				return null;
			}
		}
		return {
			detectSupplierFromUrl,
			detectCurrentPage
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
	//#region suppliers/aliexpress/domains.generated.js
	window.SSAliExpressDomains = {
		generatedAt: "2026-06-28T00:00:00.000Z",
		domains: [
			"aliexpress.com",
			"aliexpress.ru",
			"aliexpress.us"
		],
		imageHosts: ["*.alicdn.com"]
	};
	//#endregion
	//#region suppliers/aliexpress/adapter.js
	window.SSAliExpressAdapter = (() => {
		"use strict";
		const FALLBACK_DOMAINS = [
			"aliexpress.com",
			"aliexpress.ru",
			"aliexpress.us"
		];
		function domains() {
			const generated = window.SSAliExpressDomains && window.SSAliExpressDomains.domains;
			return Array.isArray(generated) && generated.length ? generated : FALLBACK_DOMAINS;
		}
		function hostMatchesDomain(host, domain) {
			return host === domain || host.endsWith(`.${domain}`);
		}
		function productIdFromUrl(url) {
			try {
				const parsed = new URL(url);
				const pathMatch = parsed.pathname.match(/\/item\/(\d+)(?:\.html)?/i);
				if (pathMatch) return pathMatch[1];
				return parsed.searchParams.get("productId") || parsed.searchParams.get("itemId") || "";
			} catch (_) {
				return "";
			}
		}
		function matchUrl(url) {
			try {
				const parsed = new URL(url);
				const host = parsed.hostname.toLowerCase();
				if (!domains().some((domain) => hostMatchesDomain(host, String(domain).toLowerCase()))) return false;
				return /\/item\/\d+(?:\.html)?/i.test(parsed.pathname) || !!productIdFromUrl(url);
			} catch (_) {
				return false;
			}
		}
		async function scrapeProduct(opts) {
			const scraper = window.SSAliExpressScraper;
			if (!scraper) throw new Error("SSAliExpressScraper not loaded");
			return scraper.scrapeSingleProduct(opts);
		}
		async function scrapeVariants(opts) {
			const scraper = window.SSAliExpressScraper;
			if (!scraper) throw new Error("SSAliExpressScraper not loaded");
			return scraper.scrapeProductWithVariants(opts);
		}
		function normalize(raw) {
			raw = raw || {};
			const url = raw.url || (window.location ? window.location.href : "");
			const sourceId = raw.sourceId || raw.productId || raw.itemId || productIdFromUrl(url);
			const product = {
				...raw,
				sourceId: sourceId || "",
				productId: raw.productId || sourceId || "",
				supplier: raw.supplier || "aliexpress",
				url,
				mainImage: raw.mainImage || (Array.isArray(raw.images) ? raw.images[0] : null) || null,
				images: Array.isArray(raw.images) ? raw.images : [],
				variants: Array.isArray(raw.variants) ? raw.variants : [],
				specs: raw.specs || raw.specifications || {},
				hasVariants: typeof raw.hasVariants === "boolean" ? raw.hasVariants : Array.isArray(raw.variants) && raw.variants.length > 1
			};
			return window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeProduct(product, {
				dedupe: true,
				dropInvalid: true
			}) : product;
		}
		return {
			supplierId: "aliexpress",
			displayName: "AliExpress",
			idLabel: "Product ID",
			matchUrl,
			scrapeProduct,
			scrapeVariants,
			normalize,
			validate: (p) => window.SSSupplierAdapter ? window.SSSupplierAdapter.validate(p) : {
				valid: true,
				errors: []
			},
			_domains: domains,
			_productIdFromUrl: productIdFromUrl
		};
	})();
	if (typeof window.SSSupplierRegistry !== "undefined") window.SSSupplierRegistry.register(window.SSAliExpressAdapter);
	//#endregion
})();

//# sourceMappingURL=suppliers.bundle.js.map