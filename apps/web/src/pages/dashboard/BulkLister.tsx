import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Loader2, Clock, XCircle, ExternalLink, FileText, Play, Pause,
  Square, RefreshCw, Check, AlertCircle, Pencil, Trash2, Layers, Link2,
  PackageOpen, Chrome, SkipForward, UploadCloud,
} from 'lucide-react';
import { Card } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { toast } from '@repo/ui/hooks/use-toast';
import type { Database } from '@repo/types/supabase';

type BulkItemRow = Database['public']['Tables']['bulk_job_items']['Row'];
type ItemStatus = 'queued' | 'scraping' | 'uploading' | 'listed' | 'failed' | 'skipped';
type ItemSource = 'paste' | 'csv' | 'extension';

interface DraftOverrides {
  title?: string;
  price?: number;
  sku?: string;
}

interface Activity {
  id: string;
  time: string;
  type: 'info' | 'success' | 'processing' | 'queued' | 'failed';
  text: string;
  subtext: string;
}

interface ParsedLink {
  url: string;
  supplier: 'amazon' | 'walmart';
  supplierItemId: string;
  overrides?: DraftOverrides;
  /** display snapshot (extension inbox) — not an override */
  title?: string;
  image?: string;
}

const PENDING_STATUSES: ItemStatus[] = ['queued', 'scraping', 'uploading'];

/** Parse + canonicalize one supplier URL. Returns null when unsupported. */
function parseSupplierUrl(raw: string): ParsedLink | null {
  const input = raw.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  if (/(^|\.)amazon\.(com|co\.uk|de|ca|com\.au)$/.test(host)) {
    const m = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (!m) return null;
    const asin = m[1].toUpperCase();
    // canonical form keeps the marketplace host but drops tracking junk
    return { url: `https://${host}/dp/${asin}`, supplier: 'amazon', supplierItemId: asin };
  }

  if (/(^|\.)walmart\.(com|ca)$/.test(host)) {
    const m = url.pathname.match(/\/ip\/(?:[^/]+\/)?(\d+)/);
    if (!m) return null;
    return { url: `https://${host}${url.pathname}`, supplier: 'walmart', supplierItemId: m[1] };
  }

  return null;
}

/** Minimal CSV parser: header row with `url` (+ optional title/price/sku) or bare URL lines. */
function parseCsv(text: string): { links: ParsedLink[]; rejected: number } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { links: [], rejected: 0 };

  const splitRow = (line: string) =>
    line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));

  const header = splitRow(lines[0]).map(h => h.toLowerCase());
  const urlCol = header.findIndex(h => h === 'url' || h === 'link' || h === 'supplier_url');
  const hasHeader = urlCol >= 0;
  const titleCol = hasHeader ? header.findIndex(h => h === 'title') : -1;
  const priceCol = hasHeader ? header.findIndex(h => h === 'price' || h === 'ebay_price') : -1;
  const skuCol = hasHeader ? header.findIndex(h => h === 'sku') : -1;

  const rows = hasHeader ? lines.slice(1) : lines;
  const links: ParsedLink[] = [];
  let rejected = 0;

  for (const line of rows) {
    const cells = splitRow(line);
    const rawUrl = hasHeader ? cells[urlCol] : cells[0];
    const parsed = parseSupplierUrl(rawUrl || '');
    if (!parsed) { rejected++; continue; }
    const overrides: DraftOverrides = {};
    if (titleCol >= 0 && cells[titleCol]) overrides.title = cells[titleCol];
    if (priceCol >= 0 && cells[priceCol]) {
      const p = parseFloat(cells[priceCol].replace(/[^\d.]/g, ''));
      if (!isNaN(p) && p > 0) overrides.price = p;
    }
    if (skuCol >= 0 && cells[skuCol]) overrides.sku = cells[skuCol];
    if (Object.keys(overrides).length > 0) parsed.overrides = overrides;
    links.push(parsed);
  }
  return { links, rejected };
}

const STATUS_META: Record<ItemStatus, { label: string; cls: string }> = {
  queued:    { label: 'Queued',    cls: 'bg-muted text-muted-foreground border-border' },
  scraping:  { label: 'Scraping',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  uploading: { label: 'Uploading', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  listed:    { label: 'Listed',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:    { label: 'Failed',    cls: 'bg-red-50 text-red-700 border-red-200' },
  skipped:   { label: 'Skipped',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const SOURCE_LABEL: Record<ItemSource, string> = {
  paste: 'Pasted', csv: 'CSV', extension: 'Extension',
};

/* ── module cache for tab switching ── */
let cachedUserId: string | null = null;
let cachedItems: BulkItemRow[] | null = null;

export default function BulkLister() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  // Reset cache if the user switches accounts / logs out
  if (user && cachedUserId !== user.id) {
    cachedUserId = user.id;
    cachedItems = null;
  }

  const [items, setItems] = useState<BulkItemRow[]>(cachedItems || []);
  const [loading, setLoading] = useState(!cachedItems);
  const [isRunning, setIsRunning] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [intervalInput, setIntervalInput] = useState('60');
  const [useAiTitle, setUseAiTitle] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editItem, setEditItem] = useState<BulkItemRow | null>(null);
  const [editForm, setEditForm] = useState<DraftOverrides>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<BulkItemRow[]>([]);
  itemsRef.current = items;

  const pushActivity = useCallback((type: Activity['type'], text: string, subtext = '') => {
    setActivities(prev => [{
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type, text, subtext,
    }, ...prev].slice(0, 60));
  }, []);

  /* ── DB load ─────────────────────────────────────────── */
  const loadItems = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('bulk_job_items')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      toast({ title: 'Failed to load bulk queue', description: error.message, variant: 'destructive' });
    } else {
      setItems(data ?? []);
      cachedItems = data ?? [];
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  /* ── DB helpers ──────────────────────────────────────── */
  const patchItemDb = useCallback(async (id: string, patch: Partial<BulkItemRow>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } as BulkItemRow : it)));
    const { error } = await supabase.from('bulk_job_items').update(patch).eq('id', id);
    if (error) console.warn('[BulkLister] DB patch failed:', error.message);
  }, []);

  const insertLinks = useCallback(async (links: ParsedLink[], source: ItemSource) => {
    if (!userId || links.length === 0) return 0;
    const existingPending = new Set(
      itemsRef.current
        .filter(it => PENDING_STATUSES.includes(it.status as ItemStatus))
        .map(it => it.supplier_url),
    );
    const seen = new Set<string>();
    const fresh = links.filter(l => {
      if (existingPending.has(l.url) || seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });
    if (fresh.length === 0) {
      toast({ title: 'Nothing added', description: 'Those links are already in the queue.' });
      return 0;
    }
    const basePos = itemsRef.current.length;
    const rows = fresh.map((l, i) => ({
      user_id: userId,
      supplier: l.supplier,
      supplier_url: l.url,
      supplier_item_id: l.supplierItemId,
      source,
      status: 'queued',
      draft_overrides: (l.overrides ?? {}) as never,
      title: l.title ?? null,
      image_url: l.image ?? null,
      position: basePos + i,
    }));
    const { data, error } = await supabase.from('bulk_job_items').insert(rows).select('*');
    if (error) {
      // unique partial index race (same URL pending) — reload to converge
      await loadItems();
      if (!error.message.includes('duplicate')) {
        toast({ title: 'Could not add items', description: error.message, variant: 'destructive' });
      }
      return 0;
    }
    setItems(prev => [...prev, ...(data ?? [])]);
    pushActivity('queued', `Added ${data?.length ?? 0} item(s) to queue`, SOURCE_LABEL[source]);
    return data?.length ?? 0;
  }, [userId, loadItems, pushActivity]);

  /* ── Extension bridge ────────────────────────────────── */
  const post = (msg: Record<string, unknown>) => window.postMessage(msg, window.location.origin);

  // Pull inbox + worker state once the extension answers
  const requestSync = useCallback(() => {
    post({ type: 'GET_BULK_STATE' });
    post({ type: 'GET_BULK_INBOX' });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      const data = event.data;

      if (data.type === 'SELLERSUIT_EXTENSION_READY' || data.type === 'SELLERSUIT_EXTENSION_PONG') {
        setExtensionConnected(prev => {
          if (!prev) requestSync();
          return true;
        });
      }

      if (data.type === 'BULK_JOB_PROGRESS_UPDATE' && data.payload?.itemId) {
        const p = data.payload;
        setIsRunning(!!p.isRunning);
        const patch: Partial<BulkItemRow> = { status: p.status, error: p.error ?? null };
        if (p.title) patch.title = p.title;
        if (p.image) patch.image_url = p.image;
        if (p.supplier) patch.supplier = p.supplier;
        if (p.supplierId) patch.supplier_item_id = p.supplierId;
        if (p.ebayPrice != null) patch.ebay_price = p.ebayPrice;
        if (p.supplierPrice != null) patch.supplier_price = p.supplierPrice;
        if (p.sku) patch.sku = p.sku;
        if (p.variationCount != null) patch.variation_count = p.variationCount;
        if (p.listingId) patch.listing_id = p.listingId;
        const known = itemsRef.current.find(it => it.id === p.itemId);
        // de-dupe: bridge forwards progress twice; skip no-op updates
        if (known && known.status === p.status && (known.error ?? null) === (p.error ?? null) && known.title === (p.title ?? known.title)) return;
        await patchItemDb(p.itemId, patch);
        const label = known?.title || p.title || known?.supplier_url || p.itemId;
        if (p.status === 'listed') pushActivity('success', 'Listed on eBay', label);
        else if (p.status === 'failed') pushActivity('failed', p.error || 'Failed', label);
        else if (p.status === 'skipped') pushActivity('info', p.error || 'Skipped', label);
        else pushActivity('processing', STATUS_META[p.status as ItemStatus]?.label ?? p.status, label);
      }

      if (data.type === 'BULK_JOB_FINISHED') {
        setIsRunning(false);
        pushActivity('success', 'Job finished', 'All items processed');
      }

      if (data.type === 'BULK_JOB_PAUSED') {
        setIsRunning(false);
        pushActivity('failed', 'Job paused', data.payload?.reason || '');
        toast({ title: 'Bulk job paused', description: data.payload?.reason || 'The worker paused the job.', variant: 'destructive' });
      }

      if (data.type === 'BULK_JOB_ERROR') {
        setIsRunning(false);
        toast({ title: 'Bulk job error', description: String(data.error || 'Unknown error'), variant: 'destructive' });
      }

      if (data.type === 'BULK_JOB_STATE' && data.payload) {
        const s = data.payload;
        if (s.active) {
          setIsRunning(!!s.isRunning);
          // merge worker truth into local + DB (covers updates missed while the page was closed)
          for (const wi of s.items ?? []) {
            const local = itemsRef.current.find(it => it.id === wi.id);
            if (local && local.status !== wi.status) {
              await patchItemDb(wi.id, {
                status: wi.status,
                error: wi.error ?? null,
                title: wi.title ?? local.title,
                image_url: wi.image ?? local.image_url,
                ebay_price: wi.ebayPrice ?? local.ebay_price,
                supplier_price: wi.supplierPrice ?? local.supplier_price,
                sku: wi.sku ?? local.sku,
                variation_count: wi.variationCount ?? local.variation_count,
                listing_id: wi.listingId ?? local.listing_id,
              });
            }
          }
        }
      }

      if (data.type === 'BULK_INBOX' && Array.isArray(data.items) && data.items.length > 0) {
        const links: ParsedLink[] = [];
        for (const inboxItem of data.items) {
          const parsed = parseSupplierUrl(inboxItem.url || '');
          if (parsed) {
            if (typeof inboxItem.title === 'string') parsed.title = inboxItem.title.slice(0, 200);
            if (typeof inboxItem.image === 'string' && inboxItem.image.startsWith('http')) parsed.image = inboxItem.image;
            links.push(parsed);
          }
        }
        const added = await insertLinks(links, 'extension');
        post({ type: 'CLEAR_BULK_INBOX', ids: data.items.map((i: { id: string }) => i.id) });
        if (added > 0) toast({ title: `${added} item(s) added from extension` });
      }
    };

    window.addEventListener('message', handleMessage);

    const handleReady = () => setExtensionConnected(true);
    window.addEventListener('sellersuit-extension-ready', handleReady);

    if ((window as unknown as { __SELLERSUIT_EXTENSION_INSTALLED__?: boolean }).__SELLERSUIT_EXTENSION_INSTALLED__) {
      setExtensionConnected(true);
      requestSync();
    }

    const ping = setInterval(() => {
      post({ type: 'PING_EXTENSION' });
      post({ type: 'SELLERSUIT_EXTENSION_PING' });
    }, 4000);
    post({ type: 'PING_EXTENSION' });

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('sellersuit-extension-ready', handleReady);
      clearInterval(ping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ── Derived ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const c = { total: items.length, queued: 0, processing: 0, listed: 0, failed: 0, skipped: 0 };
    for (const it of items) {
      const s = it.status as ItemStatus;
      if (s === 'queued') c.queued++;
      else if (s === 'scraping' || s === 'uploading') c.processing++;
      else if (s === 'listed') c.listed++;
      else if (s === 'failed') c.failed++;
      else if (s === 'skipped') c.skipped++;
    }
    return c;
  }, [items]);

  const activeItem = items.find(it => it.status === 'scraping' || it.status === 'uploading');
  const failedItems = items.filter(it => it.status === 'failed');
  const done = stats.listed + stats.failed + stats.skipped;
  const progressPercent = stats.total === 0 ? 0 : Math.round((done / stats.total) * 100);

  /* ── Actions ─────────────────────────────────────────── */
  const handleAddLinks = async () => {
    const lines = pasteInput.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
    const links: ParsedLink[] = [];
    let rejected = 0;
    for (const line of lines) {
      const parsed = parseSupplierUrl(line);
      if (parsed) links.push(parsed); else rejected++;
    }
    if (rejected > 0) {
      toast({ title: `${rejected} link(s) skipped`, description: 'Only Amazon and Walmart product URLs are supported.' });
    }
    await insertLinks(links, 'paste');
    setPasteInput('');
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const { links, rejected } = parseCsv(text);
    if (rejected > 0) {
      toast({ title: `${rejected} row(s) skipped`, description: 'Rows without a valid Amazon/Walmart URL were ignored.' });
    }
    await insertLinks(links, 'csv');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startJob = () => {
    if (!extensionConnected) {
      toast({ title: 'Extension not connected', description: 'Install/enable the SellerSuit extension, then refresh this page.', variant: 'destructive' });
      return;
    }
    const queued = items.filter(it => it.status === 'queued');
    if (queued.length === 0) {
      toast({ title: 'Queue is empty', description: 'Add product links first.' });
      return;
    }
    setIsRunning(true);
    pushActivity('info', `Starting job — ${queued.length} item(s)`, `Interval ${intervalInput}s`);
    post({
      type: 'START_BULK_JOB',
      payload: {
        items: queued.map(it => ({
          id: it.id,
          url: it.supplier_url,
          overrides: (it.draft_overrides ?? {}) as DraftOverrides,
          title: it.title,
          image: it.image_url,
          supplier: it.supplier,
        })),
        interval: parseInt(intervalInput, 10) || 60,
        settings: { useAiTitle },
      },
    });
  };

  const pauseJob = () => {
    setIsRunning(false);
    post({ type: 'PAUSE_BULK_JOB' });
    pushActivity('info', 'Pause requested', 'Current item will finish first');
  };

  const stopJob = () => {
    setIsRunning(false);
    post({ type: 'STOP_BULK_JOB' });
    pushActivity('info', 'Job stopped', '');
  };

  const retryItem = async (item: BulkItemRow) => {
    await patchItemDb(item.id, { status: 'queued', error: null });
    pushActivity('queued', 'Requeued for retry', item.title || item.supplier_url);
  };

  const deleteItem = async (item: BulkItemRow) => {
    if (item.status === 'scraping' || item.status === 'uploading') return;
    setItems(prev => prev.filter(it => it.id !== item.id));
    const { error } = await supabase.from('bulk_job_items').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      loadItems();
    }
  };

  const clearFinished = async () => {
    if (!userId) return;
    const finished = items.filter(it => ['listed', 'skipped'].includes(it.status));
    if (finished.length === 0) return;
    setItems(prev => prev.filter(it => !['listed', 'skipped'].includes(it.status)));
    await supabase.from('bulk_job_items').delete()
      .eq('user_id', userId)
      .in('status', ['listed', 'skipped']);
  };

  const openEdit = (item: BulkItemRow) => {
    setEditItem(item);
    setEditForm((item.draft_overrides ?? {}) as DraftOverrides);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const overrides: DraftOverrides = {};
    if (editForm.title?.trim()) overrides.title = editForm.title.trim().slice(0, 80);
    if (editForm.sku?.trim()) overrides.sku = editForm.sku.trim().slice(0, 50);
    const price = typeof editForm.price === 'string' ? parseFloat(editForm.price) : editForm.price;
    if (price && !isNaN(price) && price > 0) overrides.price = price;
    await patchItemDb(editItem.id, { draft_overrides: overrides as never });
    setEditItem(null);
    pushActivity('info', 'Item edits saved', overrides.title || editItem.supplier_url);
  };

  /* ── Render ──────────────────────────────────────────── */
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full pb-8 space-y-4 px-2 sm:px-4 md:px-6">

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Bulk Lister</h1>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground border-border'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
              {isRunning ? 'Running' : 'Idle'}
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${extensionConnected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              <Chrome className="w-3 h-3" />
              {extensionConnected ? 'Extension connected' : 'Extension offline'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-3 font-medium">
            <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded border border-border/50">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>Interval:</span>
              <input
                type="number"
                min={30}
                value={intervalInput}
                disabled={isRunning}
                onChange={e => setIntervalInput(e.target.value)}
                onBlur={e => {
                  const v = parseInt(e.target.value, 10);
                  if (isNaN(v) || v < 30) setIntervalInput('30');
                }}
                className="w-12 bg-transparent text-foreground border-b border-dashed border-muted-foreground/50 focus:border-blue-500 focus:outline-none text-center font-mono p-0 disabled:opacity-50"
              />
              <span>sec</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Switch checked={useAiTitle} onCheckedChange={setUseAiTitle} disabled={isRunning} className="scale-75" />
              <span>AI titles (uses credits)</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isRunning ? (
            <Button size="sm" variant="outline" onClick={pauseJob} className="h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex-1 sm:flex-none">
              <Pause className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Pause</span>
            </Button>
          ) : (
            <Button size="sm" onClick={startJob} disabled={stats.queued === 0 || !extensionConnected} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none">
              <Play className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">{done > 0 ? 'Resume' : 'Start'}</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={stopJob} disabled={!isRunning && stats.total === 0} className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-none">
            <Square className="w-3.5 h-3.5 sm:mr-1.5" fill="currentColor" /> <span className="hidden sm:inline">Stop</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={clearFinished} disabled={stats.listed + stats.skipped === 0} className="h-8 flex-1 sm:flex-none">
            <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Clear finished</span>
          </Button>
        </div>
      </header>

      {/* EXTENSION WARNING */}
      {!extensionConnected && (
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3 text-amber-800 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Extension not connected</h3>
            <p className="text-xs mt-1">
              The Bulk Lister uses the SellerSuit Chrome extension as its upload worker. Make sure the
              extension is installed and enabled, then <strong>refresh this page</strong>. You also need to
              be logged into eBay in this browser.
            </p>
          </div>
        </Card>
      )}

      {/* STATS */}
      <Card className="p-4 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center justify-center sm:justify-start gap-5 w-full xl:w-auto">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={radius} className="stroke-muted/30" strokeWidth="5" fill="none" />
              <circle
                cx="32" cy="32" r={radius}
                className="stroke-emerald-500 transition-all duration-700 ease-in-out"
                strokeWidth="5" fill="none" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset }}
              />
            </svg>
            <span className="absolute text-sm font-bold text-foreground">{progressPercent}%</span>
          </div>
          <div className="space-y-1 w-full max-w-[200px]">
            <div className="text-[11px] font-medium text-foreground">
              {done} / {stats.total} <span className="text-muted-foreground">processed</span>
            </div>
            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="hidden xl:block w-px h-12 bg-border"></div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
          {([
            { n: stats.listed, label: 'Listed', icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-emerald-50 text-emerald-600' },
            { n: stats.processing, label: 'Processing', icon: <RefreshCw className={`w-4 h-4 ${stats.processing > 0 ? 'animate-spin' : ''}`} />, cls: 'bg-blue-50 text-blue-600' },
            { n: stats.queued, label: 'Queued', icon: <Clock className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-600' },
            { n: stats.skipped, label: 'Skipped', icon: <SkipForward className="w-4 h-4" />, cls: 'bg-orange-50 text-orange-600' },
            { n: stats.failed, label: 'Failed', icon: <XCircle className="w-4 h-4" />, cls: 'bg-red-50 text-red-600' },
          ]).map(s => (
            <div key={s.label} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.cls}`}>{s.icon}</div>
              <div>
                <div className="text-lg font-bold leading-none text-foreground">{s.n}</div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: processing + activity */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 shadow-sm min-h-[180px] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${activeItem ? 'bg-blue-600 animate-pulse' : 'bg-muted-foreground'}`}></div>
              <h2 className="text-sm font-bold text-foreground">Currently processing</h2>
            </div>
            {activeItem ? (
              <div className="flex gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                <div className="w-16 h-16 bg-white border border-border rounded-md p-1 shrink-0 flex items-center justify-center">
                  {activeItem.image_url
                    ? <img src={activeItem.image_url} alt="" className="max-w-full max-h-full object-contain" />
                    : <PackageOpen className="w-6 h-6 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-xs leading-tight text-foreground line-clamp-2">
                    {activeItem.title || activeItem.supplier_url}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {activeItem.supplier && <Badge variant="outline" className="text-[9px] py-0 capitalize">{activeItem.supplier}</Badge>}
                    {activeItem.supplier_item_id && <span className="text-[10px] font-mono text-muted-foreground">{activeItem.supplier_item_id}</span>}
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
                    {activeItem.status === 'scraping'
                      ? <>Scraping product data… <Loader2 className="w-3 h-3 animate-spin" /></>
                      : <>Uploading to eBay… <UploadCloud className="w-3 h-3" /></>}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-6">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">{isRunning ? 'Waiting for next item…' : 'No job running'}</p>
                {!isRunning && <p className="text-xs">Add links and press Start.</p>}
              </div>
            )}
          </Card>

          <Card className="p-4 shadow-sm flex-1 flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h2 className="text-sm font-bold text-foreground">Live activity</h2>
              {isRunning && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[340px]">
              {activities.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No activity yet.</div>
              ) : activities.map(act => (
                <div key={act.id} className="flex gap-3 items-start">
                  <div className="text-[10px] text-muted-foreground font-mono w-14 shrink-0 pt-0.5">{act.time}</div>
                  <div className="shrink-0 mt-0.5">
                    {act.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      : act.type === 'failed' ? <XCircle className="w-3 h-3 text-red-600" />
                      : act.type === 'processing' ? <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                      : act.type === 'queued' ? <Clock className="w-3 h-3 text-amber-600" />
                      : <Check className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${act.type === 'success' ? 'text-emerald-700' : act.type === 'failed' ? 'text-red-700' : act.type === 'processing' ? 'text-blue-700' : 'text-foreground'}`}>{act.text}</div>
                    {act.subtext && <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[260px]">{act.subtext}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT (2 cols): inputs + queue table */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* INPUTS */}
          <Card className="p-4 shadow-sm">
            <div className="rounded-md border overflow-hidden bg-muted/10">
              <div className="flex border-b bg-muted/30">
                <button onClick={() => setActiveTab('paste')} className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 ${activeTab === 'paste' ? 'bg-background text-foreground border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Link2 className="w-3 h-3" /> Paste links
                </button>
                <button onClick={() => setActiveTab('csv')} className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 ${activeTab === 'csv' ? 'bg-background text-foreground border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`}>
                  <FileText className="w-3 h-3" /> Upload CSV
                </button>
              </div>
              <div className="p-3 bg-background">
                {activeTab === 'paste' ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea
                      value={pasteInput}
                      onChange={e => setPasteInput(e.target.value)}
                      placeholder={'Paste Amazon or Walmart product URLs — one per line…\nhttps://www.amazon.com/dp/B0…\nhttps://www.walmart.com/ip/…'}
                      className="flex-1 h-20 bg-background border rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                    />
                    <Button onClick={handleAddLinks} disabled={!pasteInput.trim()} className="h-auto sm:h-20 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      Add
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleCsvFile(f); }}
                    className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer"
                  >
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Drop a CSV here or click to browse</span>
                    <span className="text-[10px] mt-1">Columns: <code className="font-mono">url</code> (required), <code className="font-mono">title</code>, <code className="font-mono">price</code>, <code className="font-mono">sku</code> (optional overrides)</span>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Chrome className="w-3 h-3" /> Tip: on any Amazon/Walmart product page, use “+ Add to Bulk List” in the extension side panel — items appear here automatically.
            </p>
          </Card>

          {/* QUEUE TABLE */}
          <Card className="p-0 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-bold text-foreground">Queue ({stats.total})</h2>
              {failedItems.length > 0 && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => failedItems.forEach(retryItem)} disabled={isRunning}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry all failed ({failedItems.length})
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading queue…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <PackageOpen className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">Queue is empty</p>
                <p className="text-xs">Paste links, upload a CSV, or add from the extension.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="text-left font-semibold px-4 py-2">Product</th>
                      <th className="text-left font-semibold px-2 py-2">Supplier</th>
                      <th className="text-left font-semibold px-2 py-2">Status</th>
                      <th className="text-right font-semibold px-2 py-2">Cost</th>
                      <th className="text-right font-semibold px-2 py-2">eBay</th>
                      <th className="text-right font-semibold px-2 py-2">Profit</th>
                      <th className="text-center font-semibold px-2 py-2">Vars</th>
                      <th className="text-right font-semibold px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const status = item.status as ItemStatus;
                      const meta = STATUS_META[status] ?? STATUS_META.queued;
                      const overrides = (item.draft_overrides ?? {}) as DraftOverrides;
                      const hasOverrides = !!(overrides.title || overrides.price || overrides.sku);
                      const profit = item.ebay_price != null && item.supplier_price != null
                        ? item.ebay_price - item.supplier_price : null;
                      const busy = status === 'scraping' || status === 'uploading';
                      return (
                        <tr key={item.id} className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${busy ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 min-w-[220px] max-w-[340px]">
                              <div className="w-9 h-9 bg-white border rounded shrink-0 flex items-center justify-center p-0.5">
                                {item.image_url
                                  ? <img src={item.image_url} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                                  : <PackageOpen className="w-4 h-4 text-muted-foreground/40" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate flex items-center gap-1">
                                  {overrides.title || item.title || <span className="font-mono text-muted-foreground">{item.supplier_url}</span>}
                                  {hasOverrides && <Pencil className="w-2.5 h-2.5 text-blue-500 shrink-0" aria-label="Has manual edits" />}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                                  {item.supplier_item_id && <span>{item.supplier_item_id}</span>}
                                  {(overrides.sku || item.sku) && <span>SKU {overrides.sku || item.sku}</span>}
                                  <span className="uppercase">{SOURCE_LABEL[item.source as ItemSource] ?? item.source}</span>
                                </div>
                                {status === 'failed' && item.error && (
                                  <div className="text-[10px] text-red-600 mt-0.5 line-clamp-2" title={item.error}>{item.error}</div>
                                )}
                                {status === 'skipped' && item.error && (
                                  <div className="text-[10px] text-amber-600 mt-0.5 truncate" title={item.error}>{item.error}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 capitalize">{item.supplier ?? '—'}</td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${meta.cls}`}>
                              {busy && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{item.supplier_price != null ? `$${Number(item.supplier_price).toFixed(2)}` : '—'}</td>
                          <td className="px-2 py-2 text-right font-mono">
                            {overrides.price != null ? `$${Number(overrides.price).toFixed(2)}` : item.ebay_price != null ? `$${Number(item.ebay_price).toFixed(2)}` : '—'}
                          </td>
                          <td className={`px-2 py-2 text-right font-mono ${profit != null ? (profit >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                            {profit != null ? `$${profit.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {item.variation_count != null && item.variation_count > 1 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600"><Layers className="w-3 h-3" />{item.variation_count}</span>
                            ) : item.variation_count != null ? <span className="text-[10px] text-muted-foreground">single</span> : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {status === 'listed' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" title="View in Listings"
                                  onClick={() => navigate('/dashboard/listings')}>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-6 w-6" title="Open supplier page"
                                onClick={() => window.open(item.supplier_url, '_blank', 'noopener')}>
                                <Link2 className="w-3 h-3" />
                              </Button>
                              {status === 'queued' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" title="Edit before upload" onClick={() => openEdit(item)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                              {(status === 'failed' || status === 'skipped') && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" title="Retry" onClick={() => retryItem(item)}>
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                              {!busy && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" title="Remove" onClick={() => deleteItem(item)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit before upload</DialogTitle>
            <DialogDescription className="text-xs">
              Manual edits always win over scraped data. Price applies to single-variation
              products; variation prices come from your calculator settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">eBay title (max 80 chars)</Label>
              <Input value={editForm.title ?? ''} maxLength={80}
                placeholder="Leave empty to use the scraped title"
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">eBay price ($)</Label>
                <Input type="number" min={0.99} step="0.01" value={editForm.price ?? ''}
                  placeholder="Auto (calculator)"
                  onChange={e => setEditForm(f => ({ ...f, price: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">SKU</Label>
                <Input value={editForm.sku ?? ''} maxLength={50}
                  placeholder="Auto-generated"
                  onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit}>Save edits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
