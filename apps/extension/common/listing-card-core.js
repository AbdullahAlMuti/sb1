// Shared helpers for the compact marketplace-search card.
(function (root) {
  'use strict';

  const MAX_SOURCE_TEXT_LENGTH = 1000;
  const SEARCH_TARGETS = Object.freeze([
    'ebay',
    'amazon',
    'walmart',
    'aliexpress',
    'temu',
    'alibaba',
  ]);

  const MARKETPLACE_HOSTS = Object.freeze({
    amazon: /^(?:[^.]+\.)?amazon\.(?:com|co\.uk|de|ca|com\.au)$/i,
    walmart: /^(?:[^.]+\.)?walmart\.(?:com|ca)$/i,
    ebay: /^(?:[^.]+\.)?ebay\.(?:com|co\.uk|de|fr|com\.au|it|es)$/i,
  });

  const SEARCH_HOSTS = Object.freeze({
    ebay: 'www.ebay.com',
    amazon: 'www.amazon.com',
    walmart: 'www.walmart.com',
    aliexpress: 'www.aliexpress.com',
    temu: 'www.temu.com',
    alibaba: 'www.alibaba.com',
  });

  function normalizeText(value) {
    return String(value || '')
      .slice(0, MAX_SOURCE_TEXT_LENGTH)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanSearchQuery(rawTitle) {
    const normalized = normalizeText(rawTitle);
    if (!normalized) return '';

    let cleaned = normalized
      .replace(/^new\s+listing\b\s*[:\-\u2013\u2014|\u2022]*/i, '')
      .replace(/\s+(?:for\s+sale(?:\s+online)?|buy\s+it\s+now)\s*[|\u2013\u2014]\s*eBay(?:\.[a-z.]+)?\s*$/i, '')
      .replace(/\s*[|\u2013\u2014]\s*eBay(?:\.[a-z.]+)?\s*$/i, '');

    // Remove promotional copy only when it is a clearly delimited trailing segment.
    for (let pass = 0; pass < 3; pass += 1) {
      const next = cleaned.replace(
        /\s+(?:[|\u2022\u00b7\u2013\u2014-])\s*(?:(?:free|fast|same[- ]day|expedited)\s+shipping|ships?\s+(?:free|fast|today)|free\s+returns?)\b.*$/i,
        ''
      );
      if (next === cleaned) break;
      cleaned = next;
    }

    cleaned = cleaned
      .replace(/\s+(?:with\s+)?(?:free|fast)\s+shipping\s*$/i, '')
      .replace(/[\u2605\u2606\u2665\u2764\u2713\u2714\u2705\ud83d\udd25]+/gu, ' ')
      .replace(/([!#*_~|])\1+/g, ' ');

    cleaned = normalizeText(cleaned);
    return cleaned || normalized;
  }

  // Preserve the URL shapes already used by the Amazon/Walmart card.
  function encodeTitle(title) {
    return encodeURIComponent(normalizeText(title).replace(/"/g, '')).replace(/%2F/g, ' ');
  }

  function buildSearchUrl(target, title) {
    if (!SEARCH_TARGETS.includes(target)) return null;
    const encoded = encodeTitle(title);
    if (!encoded) return null;

    switch (target) {
      case 'ebay':
        return `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sop=12`;
      case 'amazon':
        return `https://www.amazon.com/s?k=${encoded}`;
      case 'walmart':
        return `https://www.walmart.com/search/?query=${encoded}`;
      case 'aliexpress':
        return `https://www.aliexpress.com/w/wholesale-${encoded}.html`;
      case 'temu':
        return `https://www.temu.com/search_result.html?search_key=${encoded}`;
      case 'alibaba':
        return `https://www.alibaba.com/trade/search?SearchText=${encoded}`;
      default:
        return null;
    }
  }

  function isAllowedSearchUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      return Object.values(SEARCH_HOSTS).includes(url.hostname.toLowerCase());
    } catch (_) {
      return false;
    }
  }

  function getMarketplace(hostname) {
    const host = normalizeText(hostname).toLowerCase().replace(/:\d+$/, '');
    for (const [marketplace, pattern] of Object.entries(MARKETPLACE_HOSTS)) {
      if (pattern.test(host)) return marketplace;
    }
    return null;
  }

  function toUrl(value) {
    try {
      return new URL(value, 'https://www.ebay.com');
    } catch (_) {
      return null;
    }
  }

  function extractEbayItemId(value) {
    const url = toUrl(value);
    if (!url || getMarketplace(url.hostname) !== 'ebay') return '';
    const match = /^\/itm\/(?:[^/?#]+\/)?(\d{9,15})(?:[/?#]|$)/i.exec(url.pathname);
    return match ? match[1] : '';
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
    return normalizeText(node?.textContent || node?.innerText || '');
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
    return '';
  }

  function firstAttribute(doc, selectors, attribute) {
    for (const selector of selectors) {
      const value = normalizeText(safeQuery(doc, selector)?.getAttribute?.(attribute));
      if (value) return value;
    }
    return '';
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(normalizeText(value));
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function collectStructuredData(doc) {
    const nodes = [];
    const queue = [];

    for (const script of safeQueryAll(doc, 'script[type="application/ld+json"]')) {
      try {
        queue.push(JSON.parse(script.textContent || ''));
      } catch (_) {
        // Ignore malformed third-party structured data and continue with other fallbacks.
      }
    }

    while (queue.length && nodes.length < 100) {
      const value = queue.shift();
      if (Array.isArray(value)) {
        queue.push(...value);
        continue;
      }
      if (!value || typeof value !== 'object') continue;
      nodes.push(value);
      if (Array.isArray(value['@graph'])) queue.push(...value['@graph']);
    }

    return nodes;
  }

  function hasType(node, expectedType) {
    const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
    return types.some(type => normalizeText(type).toLowerCase() === expectedType.toLowerCase());
  }

  function getProductStructuredData(doc) {
    return collectStructuredData(doc).find(node => hasType(node, 'Product')) || null;
  }

  function firstOffer(product) {
    if (!product?.offers) return null;
    return Array.isArray(product.offers) ? product.offers[0] || null : product.offers;
  }

  function structuredName(value) {
    if (typeof value === 'string') return normalizeText(value);
    return normalizeText(value?.name);
  }

  function structuredImage(value) {
    if (Array.isArray(value)) return safeHttpUrl(value[0]);
    if (typeof value === 'object') return safeHttpUrl(value?.url || value?.contentUrl);
    return safeHttpUrl(value);
  }

  function conditionLabel(value) {
    const text = normalizeText(value);
    if (!text) return '';
    const tail = text.split('/').filter(Boolean).pop() || text;
    return normalizeText(tail.replace(/Condition$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  function readLabeledValue(doc, targetLabel) {
    const target = normalizeText(targetLabel).replace(/:$/, '').toLowerCase();
    const rows = [
      ...safeQueryAll(doc, '.ux-layout-section-evo__row dl'),
      ...safeQueryAll(doc, 'dl.ux-labels-values'),
      ...safeQueryAll(doc, '.ux-labels-values'),
    ];
    const seen = new Set();

    for (const row of rows) {
      if (seen.has(row)) continue;
      seen.add(row);
      const labelNode =
        safeQuery(row, '.ux-labels-values__labels-content') ||
        safeQuery(row, '.ux-labels-values__labels') ||
        safeQuery(row, 'dt');
      const valueNode =
        safeQuery(row, '.ux-labels-values__values-content') ||
        safeQuery(row, '.ux-labels-values__values') ||
        safeQuery(row, 'dd');
      const label = nodeText(labelNode).replace(/:$/, '').toLowerCase();
      if (label === target) return nodeText(valueNode);
    }
    return '';
  }

  function extractEbayProduct(doc, href) {
    const product = getProductStructuredData(doc);
    const offer = firstOffer(product);

    const domTitle = firstText(doc, [
      'h1.x-item-title__mainTitle span.ux-textspans',
      'h1.x-item-title__mainTitle',
      '.x-item-title__mainTitle',
      '[data-testid="x-item-title"] h1',
      'h1[itemprop="name"]',
      'h1#itemTitle',
    ]);
    const metaTitle = firstAttribute(doc, ['meta[property="og:title"]'], 'content');
    const documentTitle = normalizeText(doc?.title);
    const title = domTitle || normalizeText(product?.name) || metaTitle || documentTitle;

    const domPrice = firstText(
      doc,
      [
        '.x-price-primary span.ux-textspans',
        '.x-price-primary',
        '[data-testid="x-price-primary"]',
        '[itemprop="price"]',
      ],
      ['content']
    );
    const structuredPrice = normalizeText(offer?.price || offer?.lowPrice || product?.offers?.lowPrice);
    const currency =
      normalizeText(offer?.priceCurrency || product?.offers?.priceCurrency) ||
      firstAttribute(doc, ['meta[property="product:price:currency"]'], 'content');
    const price = domPrice || [currency, structuredPrice].filter(Boolean).join(' ');

    const domImage = firstAttribute(
      doc,
      [
        '.ux-image-carousel-item.active img',
        '.ux-image-carousel img[src]',
        '[data-testid="ux-image-carousel"] img[src]',
        'img#icImg',
      ],
      'src'
    );
    const metaImage = firstAttribute(doc, ['meta[property="og:image"]'], 'content');
    const image = safeHttpUrl(domImage) || safeHttpUrl(metaImage) || structuredImage(product?.image);

    const condition =
      firstText(doc, [
        '.x-item-condition-text .ux-textspans',
        '.x-item-condition-text',
        '[data-testid="x-item-condition-text"]',
      ]) ||
      readLabeledValue(doc, 'Condition') ||
      conditionLabel(offer?.itemCondition || product?.itemCondition);

    const seller =
      firstText(doc, [
        '.x-sellercard-atf__info__about-seller a span',
        '.x-sellercard-atf__info__about-seller a',
        '.ux-seller-section__item--seller a',
        '[data-testid="x-sellercard-atf"] a[href*="/str/"]',
      ]) ||
      structuredName(offer?.seller);

    const brand = readLabeledValue(doc, 'Brand') || structuredName(product?.brand);

    return {
      supplier: 'ebay',
      productId: extractEbayItemId(href),
      idLabel: 'Item ID',
      title,
      searchQuery: cleanSearchQuery(title),
      price,
      currency,
      image,
      condition,
      seller,
      brand,
      url: normalizeText(href),
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
      data?.image,
    ].map(normalizeText).join('\u001f');
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
    productFingerprint,
  });
})(window);
