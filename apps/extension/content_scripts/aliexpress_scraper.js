// aliexpress_scraper.js - public product-page data extraction for AliExpress.
// Does not bypass CAPTCHA/login walls and only reads the current page DOM/scripts.

window.SSAliExpressScraper = (() => {
  'use strict';

  const PRODUCT_PATH_RE = /\/item\/(\d+)(?:\.html)?/i;

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function uniq(list) {
    return Array.from(new Set((list || []).filter((item) => typeof item === 'string' && item.trim())));
  }

  function absoluteUrl(url) {
    const value = text(url);
    if (!value) return '';
    if (value.startsWith('//')) return `https:${value}`;
    if (/^https?:\/\//i.test(value)) return value;
    try {
      return new URL(value, window.location.href).href;
    } catch (_) {
      return value;
    }
  }

  function highResImage(url) {
    return absoluteUrl(url)
      .replace(/_(\d+x\d+|[0-9]+x[0-9]+q[0-9]+)\.(jpg|jpeg|png|webp)$/i, '.$2')
      .replace(/_(\d+x\d+)\.(jpg|jpeg|png|webp)\?.*$/i, '.$2');
  }

  function productIdFromUrl(url) {
    try {
      const parsed = new URL(url || window.location.href);
      const match = parsed.pathname.match(PRODUCT_PATH_RE);
      if (match) return match[1];
      return parsed.searchParams.get('productId') || parsed.searchParams.get('itemId') || '';
    } catch (_) {
      return '';
    }
  }

  function cleanPrice(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'object') {
      return cleanPrice(
        value.value ??
          value.amount ??
          value.minAmount ??
          value.maxAmount ??
          value.minActivityAmount ??
          value.formatedAmount
      );
    }
    const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  function currencyFrom(value, fallback = 'USD') {
    if (!value || typeof value !== 'object') return fallback;
    return (
      value.currencyCode ||
      value.currency ||
      value.currencySymbol ||
      value.code ||
      fallback
    );
  }

  function parseJsonText(raw) {
    const value = text(raw);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function readBalancedObject(scriptText, marker) {
    const start = scriptText.indexOf(marker);
    if (start < 0) return null;
    const open = scriptText.indexOf('{', start + marker.length);
    if (open < 0) return null;
    let depth = 0;
    let inString = false;
    let quote = '';
    let escaped = false;
    for (let i = open; i < scriptText.length; i++) {
      const ch = scriptText[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === quote) {
          inString = false;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
        continue;
      }
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0) {
        return scriptText.slice(open, i + 1);
      }
    }
    return null;
  }

  function collectJsonObjects(doc) {
    const out = [];
    const scripts = Array.from(doc.querySelectorAll ? doc.querySelectorAll('script') : []);
    for (const script of scripts) {
      const content = script.textContent || script.innerText || '';
      const type = script.getAttribute ? script.getAttribute('type') : '';
      if (/application\/ld\+json|application\/json/i.test(type || '')) {
        const parsed = parseJsonText(content);
        if (parsed) out.push(parsed);
      }
      for (const marker of ['window.runParams', '__INITIAL_STATE__', '_init_data_', 'data:']) {
        const objectText = readBalancedObject(content, marker);
        const parsed = objectText && parseJsonText(objectText);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  }

  function walk(root, visitor, seen = new Set()) {
    if (!root || typeof root !== 'object' || seen.has(root)) return undefined;
    seen.add(root);
    const direct = visitor(root);
    if (direct !== undefined) return direct;
    if (Array.isArray(root)) {
      for (const item of root) {
        const found = walk(item, visitor, seen);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    for (const value of Object.values(root)) {
      const found = walk(value, visitor, seen);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  function findComponent(objects, names) {
    for (const object of objects) {
      const found = walk(object, (node) => {
        for (const name of names) {
          if (node[name] && typeof node[name] === 'object') return node[name];
        }
        return undefined;
      });
      if (found) return found;
    }
    return null;
  }

  function findFirstValue(objects, keys) {
    for (const object of objects) {
      const found = walk(object, (node) => {
        for (const key of keys) {
          if (node[key] != null && node[key] !== '') return node[key];
        }
        return undefined;
      });
      if (found != null && found !== '') return found;
    }
    return null;
  }

  function meta(doc, selectors) {
    for (const selector of selectors) {
      const el = doc.querySelector ? doc.querySelector(selector) : null;
      const value = el && (el.getAttribute('content') || el.getAttribute('value'));
      if (value) return text(value);
    }
    return '';
  }

  function domText(doc, selectors) {
    for (const selector of selectors) {
      const el = doc.querySelector ? doc.querySelector(selector) : null;
      const value = el && (el.innerText || el.textContent);
      if (text(value)) return text(value);
    }
    return '';
  }

  function extractLdProduct(objects) {
    const candidates = [];
    const push = (item) => {
      if (!item || typeof item !== 'object') return;
      if (String(item['@type'] || '').toLowerCase() === 'product') candidates.push(item);
      if (Array.isArray(item['@graph'])) item['@graph'].forEach(push);
      if (Array.isArray(item)) item.forEach(push);
    };
    objects.forEach(push);
    return candidates[0] || null;
  }

  function extractImages(objects, doc) {
    const imageComponent = findComponent(objects, ['imageComponent', 'productImageComponent']);
    const images = [];
    const add = (value) => {
      if (!value) return;
      if (Array.isArray(value)) value.forEach(add);
      else if (typeof value === 'object') add(value.imgUrl || value.imageUrl || value.url || value.src);
      else images.push(highResImage(value));
    };
    if (imageComponent) {
      add(imageComponent.imagePathList);
      add(imageComponent.images);
      add(imageComponent.mainImage);
      add(imageComponent.summImagePath);
    }
    add(findFirstValue(objects, ['image', 'images', 'imagePathList']));
    add(meta(doc, ['meta[property="og:image"]', 'meta[name="twitter:image"]']));
    if (doc.querySelectorAll) {
      Array.from(doc.querySelectorAll('img')).forEach((img) => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (/alicdn|aliexpress/i.test(src)) add(src);
      });
    }
    return uniq(images);
  }

  function extractSpecs(objects, doc) {
    const specs = {};
    const specsComponent = findComponent(objects, ['specsModule', 'specsComponent', 'productPropComponent']);
    const source = specsComponent || findFirstValue(objects, ['productProperties', 'props', 'properties']);
    const addPair = (key, value) => {
      const k = text(key);
      const v = text(value);
      if (k && v && k.length < 80 && v.length < 500) specs[k] = v;
    };
    const rows = Array.isArray(source)
      ? source
      : source && typeof source === 'object'
        ? source.props || source.productProperties || source.properties || source.specs
        : null;
    if (Array.isArray(rows)) {
      rows.forEach((item) =>
        addPair(item.attrName || item.name || item.key || item.propertyName, item.attrValue || item.value || item.propertyValue)
      );
    } else if (source && typeof source === 'object') {
      Object.entries(source).forEach(([key, value]) => {
        if (typeof value === 'object') {
          addPair(value.attrName || value.name || key, value.attrValue || value.value || value.propertyValue);
        } else {
          addPair(key, value);
        }
      });
    }
    if (doc.querySelectorAll) {
      Array.from(doc.querySelectorAll('tr, li, dl div')).forEach((row) => {
        const label = row.querySelector && row.querySelector('th, dt, span:first-child');
        const value = row.querySelector && row.querySelector('td, dd, span:last-child');
        addPair(label && (label.innerText || label.textContent), value && (value.innerText || value.textContent));
      });
    }
    return specs;
  }

  function skuAmount(sku) {
    const val = sku.skuVal || sku;
    return (
      cleanPrice(val.skuAmount) ??
      cleanPrice(val.actSkuCalPrice) ??
      cleanPrice(val.discountPrice) ??
      cleanPrice(val.price) ??
      cleanPrice(sku.price)
    );
  }

  function skuQuantity(sku) {
    const val = sku.skuVal || sku;
    const raw = val.availQuantity ?? val.inventory ?? val.stock ?? sku.quantity;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  function extractVariants(objects, product) {
    const skuComponent = findComponent(objects, ['skuComponent', 'skuModule', 'skuInfo']);
    const props = skuComponent?.productSKUPropertyList || skuComponent?.skuProps || [];
    const prices = skuComponent?.skuPriceList || skuComponent?.skuList || skuComponent?.skuPaths || [];
    const lookup = new Map();

    props.forEach((prop) => {
      const label = text(prop.skuPropertyName || prop.name || prop.propertyName);
      const propId = text(prop.skuPropertyId || prop.id || prop.pid);
      const values = prop.skuPropertyValues || prop.values || prop.propertyValues || [];
      values.forEach((value) => {
        const valueId = text(value.propertyValueId || value.valueId || value.vid || value.id);
        const key = `${propId}:${valueId}`;
        lookup.set(key, {
          label,
          value: text(value.propertyValueName || value.name || value.value || value.propertyValueDisplayName),
          image: highResImage(value.skuPropertyImagePath || value.imageUrl || value.imgUrl || ''),
        });
      });
    });

    const variants = [];
    prices.forEach((sku, index) => {
      const skuAttr = text(sku.skuAttr || sku.path || sku.skuPropIds || '');
      const optionValues = {};
      const images = [];
      skuAttr.split(';').forEach((pair) => {
        const option = lookup.get(text(pair));
        if (!option || !option.label || !option.value) return;
        optionValues[option.label] = option.value;
        if (option.image) images.push(option.image);
      });
      if (!Object.keys(optionValues).length && prices.length > 1) return;
      const price = skuAmount(sku) ?? product.price ?? 0;
      variants.push({
        supplierVariantId: text(sku.skuId || sku.id || sku.skuPropIds || skuAttr || `aliexpress-${index}`),
        sourceSku: text(sku.skuId || sku.id || skuAttr || ''),
        optionValues,
        price,
        raw_supplier_price: price,
        currency: product.currency || currencyFrom(sku.skuVal || sku),
        quantity: skuQuantity(sku),
        images: uniq(images),
        finalImages: uniq(images),
        img: images[0] || product.mainImage || null,
        available: skuQuantity(sku) > 0,
      });
    });

    if (variants.length) return variants;
    return [
      {
        supplierVariantId: product.sourceId,
        sourceSku: product.sourceId,
        optionValues: {},
        price: product.price || 0,
        raw_supplier_price: product.price || 0,
        currency: product.currency || 'USD',
        quantity: 1,
        images: product.images || [],
        finalImages: product.images || [],
        img: product.mainImage || null,
        available: true,
        selectedOnly: true,
      },
    ];
  }

  function extractProductDocument(doc = document, url = window.location.href) {
    const sourceId = productIdFromUrl(url);
    if (!sourceId) throw new Error('Not an AliExpress product page');

    const objects = collectJsonObjects(doc);
    const ldProduct = extractLdProduct(objects);
    const productInfo = findComponent(objects, ['productInfoComponent', 'productInfo', 'itemModule']) || {};
    const priceComponent = findComponent(objects, ['priceComponent', 'priceModule', 'priceInfo']) || {};
    const sellerComponent = findComponent(objects, ['storeInfoComponent', 'sellerComponent', 'storeModule']) || {};
    const shippingComponent = findComponent(objects, ['shippingModule', 'shippingComponent', 'deliveryComponent']) || {};

    const title =
      text(productInfo.subject || productInfo.title || productInfo.name) ||
      text(ldProduct && ldProduct.name) ||
      meta(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      domText(doc, ['h1', '[data-pl="product-title"]']);
    if (!title) throw new Error('AliExpress product title not found');

    const price =
      cleanPrice(priceComponent.discountPrice) ??
      cleanPrice(priceComponent.origPrice) ??
      cleanPrice(priceComponent.formatedPrice) ??
      cleanPrice(ldProduct?.offers?.price) ??
      cleanPrice(meta(doc, ['meta[property="product:price:amount"]']));
    const currency =
      currencyFrom(priceComponent.discountPrice || priceComponent.origPrice || priceComponent, '') ||
      text(ldProduct?.offers?.priceCurrency) ||
      meta(doc, ['meta[property="product:price:currency"]']) ||
      'USD';
    const images = extractImages(objects, doc);
    const specs = extractSpecs(objects, doc);
    const description =
      text(productInfo.description || findFirstValue(objects, ['description'])) ||
      text(ldProduct && ldProduct.description) ||
      meta(doc, ['meta[name="description"]']);
    const seller = {
      name: text(sellerComponent.storeName || sellerComponent.sellerName || sellerComponent.name),
      url: absoluteUrl(sellerComponent.storeURL || sellerComponent.storeUrl || sellerComponent.url || ''),
    };
    const shipping = {
      text: text(
        shippingComponent.shippingText ||
          shippingComponent.deliveryProviderName ||
          shippingComponent.freightCommitDay ||
          shippingComponent.displayAmount
      ),
      raw: shippingComponent,
    };

    const product = {
      sourceId,
      productId: sourceId,
      supplier: 'aliexpress',
      title,
      price: price || 0,
      currency,
      url,
      mainImage: images[0] || null,
      images,
      description,
      specs,
      specifications: specs,
      seller,
      shipping,
      scrapedAt: Date.now(),
    };
    product.variants = extractVariants(objects, product);
    product.hasVariants = product.variants.length > 1;
    product.variantExtractionStatus = product.hasVariants ? 'complete' : 'selected-only';
    if (product.variantExtractionStatus === 'selected-only') {
      product.variantExtractionWarnings = ['Only the currently selected AliExpress variant was available.'];
    }
    return product;
  }

  async function scrapeSingleProduct() {
    const product = extractProductDocument(document, window.location.href);
    product.variants = product.variants.slice(0, 1);
    product.hasVariants = false;
    product.variantExtractionStatus = product.variantExtractionStatus || 'selected-only';
    return product;
  }

  async function scrapeProductWithVariants() {
    return extractProductDocument(document, window.location.href);
  }

  return {
    scrapeSingleProduct,
    scrapeProductWithVariants,
    extractProductDocument,
    _collectJsonObjects: collectJsonObjects,
    _productIdFromUrl: productIdFromUrl,
  };
})();
