// panel-architecture.test.js — static locks for the universal-panel architecture.
// Rule: side panel = compact view, panel.html = universal extended workspace.
// Both consume normalized currentProduct state; no supplier-specific panels;
// no re-scraping on the sidebar Extend path.
// Run: node --test apps/extension/tests/panel-architecture.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');

const read = (rel) => readFileSync(join(EXT_ROOT, rel), 'utf8');

function findCssBlockEnd(src, startIndex) {
  const openIndex = src.indexOf('{', startIndex);
  assert.notEqual(openIndex, -1, 'CSS block must contain an opening brace');
  let depth = 0;
  for (let i = openIndex; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

describe('no supplier-specific panels', () => {
  test('ui/ and sidepanel/ contain no <supplier>-panel html files', () => {
    const supplierNames = [
      'amazon',
      'walmart',
      'aliexpress',
      'temu',
      'target',
      'homedepot',
      'home-depot',
    ];
    for (const dir of ['ui', 'sidepanel']) {
      const files = readdirSync(join(EXT_ROOT, dir));
      const offenders = files.filter(
        (f) => supplierNames.some((s) => f.toLowerCase().includes(s)) && f.endsWith('.html')
      );
      assert.deepEqual(offenders, [], `${dir}/ must not contain supplier-specific panel files`);
    }
  });

  test('exactly one extended workspace exists: ui/panel.html', () => {
    assert.ok(existsSync(join(EXT_ROOT, 'ui', 'panel.html')));
    assert.ok(existsSync(join(EXT_ROOT, 'sidepanel', 'side-panel.html')));
  });
});

describe('shared extended-panel logic', () => {
  test('common/panel-extended.js exists and never scrapes the page', () => {
    const src = read('common/panel-extended.js');
    assert.ok(src.includes('showSidebarExtended'), 'must export showSidebarExtended');
    assert.ok(!/scrapeAndDisplay/i.test(src), 'extended panel must not call scrape functions');
    assert.ok(
      !/document\.title/.test(src),
      'extended panel must not read supplier page DOM for data'
    );
    assert.ok(
      src.includes('currentProduct'),
      'extended panel reads normalized currentProduct state'
    );
  });

  test('both supplier bundles import panel-extended.js', () => {
    for (const entry of ['src/content_scripts/amazon.js', 'src/content_scripts/walmart.js']) {
      const src = read(entry);
      assert.ok(
        src.includes('common/panel-extended.js'),
        `${entry} must import common/panel-extended.js`
      );
    }
  });

  test('injectors define showSidebarExtended nowhere (single definition in common)', () => {
    for (const inj of [
      'content_scripts/amazon_injector.js',
      'content_scripts/walmart_injector.js',
    ]) {
      const src = read(inj);
      assert.ok(
        !/function showSidebarExtended/.test(src),
        `${inj} must not redefine showSidebarExtended`
      );
    }
  });
});

describe('sidebar Extend path never re-scrapes', () => {
  test('injectors gate scraping behind fromSidebar flag', () => {
    for (const inj of [
      'content_scripts/amazon_injector.js',
      'content_scripts/walmart_injector.js',
    ]) {
      const src = read(inj);
      assert.ok(src.includes('fromSidebar'), `${inj} injectUI must accept fromSidebar`);
      assert.ok(
        src.includes('renderGalleryFromUrls'),
        `${inj} must render stored images on Extend`
      );
      assert.ok(src.includes("'EXTEND_PANEL'"), `${inj} must handle EXTEND_PANEL`);
    }
  });
});

describe('universal panels are supplier-neutral', () => {
  test('panel.js uses registry-based supplier detection, no hardcoded URL gates', () => {
    const src = read('ui/panel.js');
    assert.ok(src.includes('isSupplierPage'), 'panel.js must use isSupplierPage helper');
    assert.ok(src.includes('SSSupplierRegistry'), 'helper must consult the supplier registry');
    // Hardcoded hosts allowed only inside the single fallback helper, not in handlers.
    const gateCount = (src.match(/tab\.url\?\.includes\('amazon/g) || []).length;
    assert.equal(gateCount, 0, 'no inline hardcoded amazon URL gates in handlers');
  });

  test('panel.html loads the suppliers bundle so the registry is available', () => {
    const src = read('ui/panel.html');
    assert.ok(src.includes('suppliers.bundle.js'), 'panel.html must load suppliers.bundle.js');
  });

  test('manifest exposes panel stylesheet for injected panel.html', () => {
    for (const name of ['manifest.json', 'manifest.dev.json', 'manifest.prod.json']) {
      const manifest = JSON.parse(read(name));
      const resources = manifest.web_accessible_resources.flatMap((entry) => entry.resources);
      assert.ok(resources.includes('ui/panel.html'), `${name} must expose panel.html`);
      assert.ok(resources.includes('ui/panel.css'), `${name} must expose panel.css`);
    }
  });

  test('panel.css keeps extended editor styles outside mobile container blocks', () => {
    const css = read('ui/panel.css');
    const mobileContainerStart = css.indexOf('@container (max-width: 420px)');
    const extendedEditorStart = css.indexOf('EXTENDED EDITOR (.ssx)');
    assert.notEqual(mobileContainerStart, -1, 'mobile container block must exist');
    assert.notEqual(extendedEditorStart, -1, 'extended editor CSS block must exist');
    const mobileContainerEnd = findCssBlockEnd(css, mobileContainerStart);
    assert.ok(mobileContainerEnd > mobileContainerStart, 'mobile container block must close');
    assert.ok(
      mobileContainerEnd < extendedEditorStart,
      'extended editor CSS must not be nested inside the 420px container block'
    );
  });

  test('standalone panel.html renders the shared extended workspace', () => {
    const html = read('ui/panel.html');
    assert.ok(
      html.includes('common/panel-extended.js'),
      'panel.html must load the shared extended-panel module'
    );
    const js = read('ui/panel.js');
    assert.ok(
      js.includes('showSidebarExtended({ force: true })'),
      'panel.js must render the extended editor from currentProduct on init'
    );
  });

  test('side panel detection is registry-based', () => {
    const src = read('sidepanel/panel-main.js');
    assert.ok(src.includes('SSSupplierRegistry'), 'side panel must consult the supplier registry');
  });

  test('panel.js generateSKU prefers supplier-neutral sourceId', () => {
    const src = read('ui/panel.js');
    assert.ok(
      /sourceId \|\| product\.asin/.test(src),
      'SKU generation must read sourceId before legacy asin'
    );
  });
});

describe('bundler keeps shared extended-panel module', () => {
  // The bundler treeshakes side-effect-free modules and scopes top-level
  // declarations per module. panel-extended.js must therefore export via
  // explicit window assignments, and built bundles must contain them —
  // otherwise the injectors' showSidebarExtended() call throws ReferenceError
  // and the extended editor renders blank.
  test('panel-extended.js exposes its API on window', () => {
    const src = read('common/panel-extended.js');
    assert.ok(src.includes('window.showSidebarExtended = showSidebarExtended'));
  });

  test('built content bundles contain the window exposure', () => {
    for (const b of ['build/amazon.bundle.js', 'build/walmart.bundle.js']) {
      if (!existsSync(join(EXT_ROOT, b))) continue; // bundle not built in this checkout
      const src = read(b);
      assert.ok(
        src.includes('window.showSidebarExtended'),
        `${b} must contain window.showSidebarExtended — bundler dropped panel-extended.js`
      );
    }
  });
});

describe('side panel structure and stale-product guard', () => {
  test('side panel has a single dynamic main action button', () => {
    const html = read('sidepanel/side-panel.html');
    assert.ok(html.includes('btn-main-action'), 'side-panel.html must keep the single main action button');
    // Legacy duplicate CTAs must stay gone
    for (const id of ['btn-start-import', 'btn-adv-upload', 'btn-adv-draft', 'btn-scan-no-product']) {
      assert.ok(!html.includes(id), `side-panel.html must not reintroduce #${id}`);
    }
  });

  test('side panel loads the freshness module', () => {
    const html = read('sidepanel/side-panel.html');
    assert.ok(html.includes('freshness.js'), 'side-panel.html must load freshness.js');
  });

  test('all upload paths run the stale-product guard', () => {
    const src = read('sidepanel/panel-main.js');
    const guards = (src.match(/await assertFreshForUpload\(\)/g) || []).length;
    assert.ok(
      guards >= 2,
      `doAdvancedUpload and doExtend must both call assertFreshForUpload (found ${guards})`
    );
  });

  test('scans stamp the source URL for the freshness fallback', () => {
    const src = read('sidepanel/panel-main.js');
    assert.ok(src.includes('_stampScan(tab.url)'), 'successful scans must stamp scannedUrl');
  });
});

describe('eBay upload stays supplier-neutral', () => {
  test('all panel surfaces converge on the import_ebay background action', () => {
    for (const f of ['sidepanel/panel-main.js', 'ui/panel.js', 'common/panel-extended.js']) {
      const src = read(f);
      assert.ok(src.includes("'import_ebay'"), `${f} must upload via import_ebay runner`);
    }
  });

  test('bulk runner reuses the single-item upload pipeline (no parallel uploader)', () => {
    const src = read('background/listing-runner.js');
    // Scrape goes through the supplier adapter seam, not the legacy flat scrape
    assert.ok(src.includes("'SCRAPE_VARIANTS'"), 'runner must scrape via the adapter SCRAPE_VARIANTS seam');
    assert.ok(!src.includes('SCRAPE_COMPLETE_PRODUCT'), 'runner must not use the legacy flat scrape');
    // Upload goes through the uploadSessionId → prelist tab flow that
    // SellerSuitUploader/ebay_prelist own — never a second eBay writer.
    assert.ok(src.includes('uploadSessionId'), 'runner must hand off via uploadSessionId entries');
    assert.ok(src.includes('/sl/prelist/suggest'), 'runner must open the eBay prelist entry page');
    assert.ok(!src.includes('runSmartEngine'), 'parallel pricing/title engine must stay deleted');
    // DB rows are written post-upload by _syncListingToDashboard → SYNC_LISTING,
    // so the runner must not call create-listing before the eBay upload.
    assert.ok(!src.includes('syncToDatabase'), 'runner must not sync to DB before upload');
  });
});
