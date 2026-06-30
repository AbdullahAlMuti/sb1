// suppliers/index.js — Vite entry point for the supplier plugin bundle.
//
// Imports all supplier modules in manifest load order. Each module writes to
// window.SS* for content script compatibility (existing global pattern preserved).
// Output: build/suppliers.bundle.js — an IIFE that replaces the separate
// manifest entries with one file. Also loaded by sidepanel/side-panel.html
// so the side panel can match URLs via SSSupplierRegistry. No behavior change.

import './core/supplier-adapter.js';
import './core/registry.js';
import './amazon/adapter.js';
import './walmart/adapter.js';
import './aliexpress/domains.generated.js';
import './aliexpress/adapter.js';
