// src/content_scripts/aliexpress.js - Vite entry for AliExpress content script.

import '../../common/config.js';
import '../../common/html-sanitizer.js'; // exposes window.SSSanitizer before any HTML preview (W5)
import '../../common/panel-extended.js';
import '../../common/listing-draft.js';
import '../../suppliers/core/pricing-core.js'; // SSPricingCore — canonical integer-cent engine
import '../../common/pricing-apply.js';        // SSPricingApply — applies synced dashboard rules
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

import '../../common/images/core/image-schema.js';
import '../../common/images/core/image-normalizer.js';
import '../../common/images/core/image-deduper.js';
import '../../common/images/core/image-validator.js';
import '../../common/images/core/image-cache.js';
import '../../common/images/core/extraction-engine.js';
import '../../common/images/fallback/modal-click-extractor.js';

import '../../content_scripts/aliexpress_scraper.js';
import '../../suppliers/core/supplier-adapter.js';
import '../../suppliers/core/registry.js';
import '../../suppliers/aliexpress/domains.generated.js';
import '../../suppliers/aliexpress/adapter.js';

import '../../content_scripts/aliexpress_injector.js';
import '../../content_scripts/image_editor.js';
import '../../common/listing-card-core.js';
import '../../content_scripts/listing_card_injector.js';
