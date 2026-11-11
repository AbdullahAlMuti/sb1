// title-quality.js — eBay title rules, checked live in the editor.
//
// Pure (no DOM, no chrome.*). The editor shows the character count and these
// tips under the title as the seller types, and the uploader uses
// trimToLimit() so an over-long title is never cut mid-phrase.
//
// The rules encode eBay's title guidance plus this product's own policy:
// 80 characters, describe the item (brand · product · key attributes · size),
// no promotional wording, no shouting, no keyword stuffing, no supplier names.

(function (root) {
  'use strict';

  const MAX = 80;
  const SHORT = 40;

  const SUPPLIERS = ['amazon', 'walmart', 'aliexpress', 'alibaba', 'temu', 'prime'];
  const PROMO = [
    'free shipping', 'fast shipping', 'free delivery', 'best seller', 'best price', 'hot sale',
    'on sale', 'sale', 'best', 'cheap', 'cheapest', 'wow', 'look', 'l@@k', 'must have', 'amazing',
    'new arrival', 'limited time', '100%', 'guaranteed', 'top rated', '#1',
  ];
  const CONNECTORS = ['and', 'with', 'for', 'of', 'the', 'a', 'an', 'in', 'on', 'to', 'by', 'or', '&'];

  function _words(t) {
    return String(t || '').split(/\s+/).filter(Boolean);
  }

  function _escape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function _found(text, phrases) {
    const lower = ' ' + String(text).toLowerCase() + ' ';
    return phrases.filter(p => new RegExp(`(^|[^a-z0-9])${_escape(p)}([^a-z0-9]|$)`, 'i').test(lower));
  }

  /**
   * @param {string} title
   * @returns {{ length:number, max:number, counter:string, level:'ok'|'warn'|'over',
   *            tips:Array<{key:string, level:'warn'|'block', message:string}> }}
   */
  function check(title) {
    const text = String(title || '').replace(/\s+/g, ' ').trim();
    const length = text.length;
    const tips = [];
    const add = (key, level, message) => tips.push({ key, level, message });

    if (!text) {
      add('empty', 'block', 'Add a title — eBay requires one.');
      return { length: 0, max: MAX, counter: `0 / ${MAX}`, level: 'over', tips };
    }

    if (length > MAX) {
      add('length', 'block', `${length - MAX} characters over eBay's ${MAX}-character limit — it will be cut.`);
    }

    const suppliers = _found(text, SUPPLIERS);
    if (suppliers.length) {
      add('supplier', 'block', `Remove the supplier name (${suppliers.join(', ')}) — buyers should not see where you source.`);
    }

    // Longest phrases first so "free shipping" is reported instead of "free".
    const promo = _found(text, PROMO).sort((a, b) => b.length - a.length)
      .filter((p, i, all) => !all.slice(0, i).some(longer => longer.includes(p)));
    if (promo.length) {
      add('promo', 'warn', `Promotional wording (${promo.join(', ')}) does not help search and breaks eBay's title guidance.`);
    }

    const words = _words(text);
    const letters = words.filter(w => /[a-zA-Z]{5,}/.test(w));
    const shouted = letters.filter(w => w === w.toUpperCase() && /[A-Z]{5,}/.test(w));
    if (letters.length >= 3 && shouted.length / letters.length > 0.5) {
      add('caps', 'warn', 'Avoid ALL CAPS — use Title Case.');
    }

    if (/([!*~@#^=_])\1{1,}|[!]{1}\s*[!]/.test(text) || /[*~^]{1}/.test(text)) {
      add('symbols', 'warn', 'Remove decorative symbols (!!!, ***, ~) — they waste characters.');
    }

    const counts = {};
    words.forEach(w => {
      const k = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (k.length >= 4) counts[k] = (counts[k] || 0) + 1;
    });
    const repeated = Object.keys(counts).filter(k => counts[k] >= 3);
    if (repeated.length) {
      add('repeat', 'warn', `"${repeated[0]}" appears ${counts[repeated[0]]} times — repeating a word does not improve ranking.`);
    }

    const last = (words[words.length - 1] || '').toLowerCase().replace(/[^a-z&]/g, '');
    if (CONNECTORS.includes(last) || /[,\-–—/]$/.test(text)) {
      add('dangling', 'warn', 'The title ends mid-phrase — finish it or trim the last word.');
    }

    if (length < SHORT && length <= MAX) {
      add('short', 'warn', `Only ${length} characters — add brand, key feature, size or colour (aim for 60–${MAX}).`);
    }

    const level = tips.some(t => t.level === 'block') ? 'over' : (tips.length ? 'warn' : 'ok');
    return { length, max: MAX, counter: `${length} / ${MAX}`, level, tips };
  }

  /** Cut to eBay's limit at a word boundary, never leaving a dangling connector or punctuation. */
  function trimToLimit(title, max) {
    const limit = max || MAX;
    let t = String(title || '').replace(/\s+/g, ' ').trim();
    if (t.length <= limit) return t;
    t = t.slice(0, limit + 1);
    const cut = t.lastIndexOf(' ');
    t = (cut > limit * 0.5 ? t.slice(0, cut) : t.slice(0, limit)).trim();
    for (let guard = 0; guard < 6; guard++) {
      const before = t;
      t = t.replace(/[\s,;:\-–—/&|]+$/, '');
      const m = t.match(/\s(\S+)$/);
      if (m && CONNECTORS.includes(m[1].toLowerCase())) t = t.slice(0, m.index);
      if (t === before) break;
    }
    return t.trim();
  }

  const api = { check, trimToLimit, MAX };
  root.SSTitleQuality = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
