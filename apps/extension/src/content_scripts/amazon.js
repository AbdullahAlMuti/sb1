// src/content_scripts/amazon.js — Vite entry for the Amazon content script bundle.
//
// Imports every file from the Amazon document_idle content_scripts block in the
// exact order they appear in the manifest. Each file writes to window.SS* globals;
// the IIFE output format preserves that pattern unchanged.
//
// Output: build/amazon.bundle.js — replaces 28 manifest entries with one file.
// window.SS* globals are intact, load order is guaranteed by import order.

// ── Common utilities ──────────────────────────────────────────────────────────
import '../../common/config.js';
import '../../common/html-sanitizer.js'; // exposes window.SSSanitizer before any HTML preview (W5)
import '../../common/panel-extended.js';
import '../../common/listing-draft.js';
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
import '../../common/images/adapters/amazon.image-adapter.js';
import '../../common/images/fallback/modal-click-extractor.js';
import '../../common/amazon_image_extractor.js';
import '../../common/full_view_image_extractor.js';

// ── Scraper ───────────────────────────────────────────────────────────────────
import '../../content_scripts/amazon-variant-scraper.js';
import '../../content_scripts/amazon-scraper-v2.js';

// ── Supplier plugin system ────────────────────────────────────────────────────
import '../../suppliers/core/supplier-adapter.js';
import '../../suppliers/core/registry.js';
import '../../suppliers/amazon/adapter.js';

// ── Injectors ─────────────────────────────────────────────────────────────────
import '../../content_scripts/amazon_injector.js';
import '../../content_scripts/image_editor.js';
import '../../content_scripts/amazon_fulfiller.js';
import '../../common/listing-card-core.js';
import '../../content_scripts/listing_card_injector.js';
