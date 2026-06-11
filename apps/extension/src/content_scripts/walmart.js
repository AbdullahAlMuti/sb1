// src/content_scripts/walmart.js — Vite entry for the Walmart content script bundle.
//
// Imports every file from the Walmart document_idle content_scripts block in the
// exact order they appear in the manifest. Each file writes to window.SS* globals;
// the IIFE output format preserves that pattern unchanged.
//
// Output: build/walmart.bundle.js — replaces 20 manifest entries with one file.

// ── Common utilities ──────────────────────────────────────────────────────────
import '../../common/config.js';
import '../../common/panel-extended.js';
import '../../common/pricing-engine.js';
import '../../common/sku-engine.js';
import '../../common/variation-normalizer.js';
import '../../common/performance.js';
import '../../common/storage.js';
import '../../common/ui.js';
import '../../common/analytics.js';
import '../../common/undo-manager.js';
import '../../common/editor-tools.js';
import '../../common/image-renderer.js';
import '../../ui/calculator.js';

// ── Image pipeline ────────────────────────────────────────────────────────────
import '../../common/images/core/image-schema.js';
import '../../common/images/core/image-normalizer.js';
import '../../common/images/core/image-deduper.js';
import '../../common/images/core/image-validator.js';
import '../../common/images/core/image-cache.js';
import '../../common/images/core/extraction-engine.js';
import '../../common/images/adapters/walmart.image-adapter.js';

// ── Scraper ───────────────────────────────────────────────────────────────────
import '../../content_scripts/walmart-variant-scraper.js';

// ── Supplier plugin system ────────────────────────────────────────────────────
import '../../suppliers/core/supplier-adapter.js';
import '../../suppliers/core/registry.js';
import '../../suppliers/walmart/adapter.js';

// ── Injectors ─────────────────────────────────────────────────────────────────
import '../../content_scripts/walmart_injector.js';
import '../../content_scripts/image_editor.js';
