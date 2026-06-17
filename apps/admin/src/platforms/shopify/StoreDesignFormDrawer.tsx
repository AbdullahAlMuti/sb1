import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@repo/ui/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/ui/tabs';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Switch } from '@repo/ui/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Badge } from '@repo/ui/components/ui/badge';
import { Loader2, UploadCloud, X, Plus, RefreshCw, Lock, Star, Flame, Globe } from 'lucide-react';
import type { StoreDesign, StoreDesignFormValues } from '@repo/types';
import { generateSlug } from './hooks/useStoreDesigns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  design?: StoreDesign | null;
  onSave: (values: StoreDesignFormValues, publish?: boolean) => Promise<void>;
  onUploadImage: (file: File, path: string) => Promise<string | null>;
  isSaving?: boolean;
}

export default function StoreDesignFormDrawer({
  isOpen,
  onClose,
  design,
  onSave,
  onUploadImage,
  isSaving = false,
}: Props) {
  const [formData, setFormData] = useState<Partial<StoreDesignFormValues>>({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    category: '',
    niche: '',
    tags: [],
    preview_image: '',
    thumbnail_image: '',
    gallery_images: [],
    demo_url: '',
    template_url: '',
    price: 0,
    compare_at_price: null,
    currency: 'USD',
    is_free: true,
    access_level: 'free',
    allowed_plans: [],
    upgrade_message: '',
    is_premium: false,
    is_featured: false,
    is_trending: false,
    is_visible: true,
    status: 'draft',
    sort_order: 0,
    seo_title: '',
    seo_description: '',
    metadata: {},
  });

  const [tagInput, setTagInput] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (design) {
      setFormData(design);
    } else {
      setFormData({
        title: '',
        slug: '',
        short_description: '',
        description: '',
        category: '',
        niche: '',
        tags: [],
        preview_image: '',
        thumbnail_image: '',
        gallery_images: [],
        demo_url: '',
        template_url: '',
        price: 0,
        compare_at_price: null,
        currency: 'USD',
        is_free: true,
        access_level: 'free',
        allowed_plans: [],
        upgrade_message: '',
        is_premium: false,
        is_featured: false,
        is_trending: false,
        is_visible: true,
        status: 'draft',
        sort_order: 0,
        seo_title: '',
        seo_description: '',
        metadata: {},
      });
    }
  }, [design, isOpen]);

  const handleChange = (field: keyof StoreDesignFormValues, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlugGenerate = () => {
    if (formData.title) {
      handleChange('slug', generateSlug(formData.title));
    }
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !formData.tags?.includes(t)) {
      handleChange('tags', [...(formData.tags || []), t]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', (formData.tags || []).filter(t => t !== tag));
  };

  const toggleAllowedPlan = (plan: string) => {
    const plans = formData.allowed_plans || [];
    if (plans.includes(plan)) {
      handleChange('allowed_plans', plans.filter(p => p !== plan));
    } else {
      handleChange('allowed_plans', [...plans, plan]);
    }
  };

  // ── Image Uploads ─────────────────────────────────────────────────────────

  const doUpload = async (file: File, type: 'thumb' | 'preview') => {
    if (!formData.slug) return alert('Please generate a slug first to organize images.');
    
    const setUploading = type === 'thumb' ? setIsUploadingThumb : setIsUploadingPreview;
    const field = type === 'thumb' ? 'thumbnail_image' : 'preview_image';
    const ext = file.name.split('.').pop() || 'png';
    const path = `previews/${formData.slug}_${type}_${Date.now()}.${ext}`;

    setUploading(true);
    const url = await onUploadImage(file, path);
    if (url) {
      handleChange(field, url);
    }
    setUploading(false);
  };

  // ── Render Helpers ────────────────────────────────────────────────────────

  const ImageUploader = ({
    label,
    url,
    isUploading,
    onRemove,
    onClick,
  }: {
    label: string;
    url?: string;
    isUploading: boolean;
    onRemove: () => void;
    onClick: () => void;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      {url ? (
        <div className="relative rounded-lg border border-border overflow-hidden group">
          <img src={url} alt={label} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="destructive" onClick={onRemove} className="h-8 text-xs">
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={onClick}
          className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground font-medium">Click to upload</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col border-l border-border bg-card">
        <SheetHeader className="px-6 py-4 border-b border-border bg-muted/20">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {design ? 'Edit Store Design' : 'Add Store Design'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Configure template details, imagery, pricing, and access rules.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="basic" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-6 h-12 gap-6 overflow-x-auto hide-scrollbar">
              <TabsTrigger value="basic" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">Basic</TabsTrigger>
              <TabsTrigger value="media" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">Media</TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">Pricing</TabsTrigger>
              <TabsTrigger value="access" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">Access</TabsTrigger>
              <TabsTrigger value="status" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">Status & Flags</TabsTrigger>
              <TabsTrigger value="seo" className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 data-[state=active]:border-primary data-[state=active]:shadow-none">SEO</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* ── Basic Tab ─────────────────────────────────────────────────── */}
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Title <span className="text-rose-500">*</span></Label>
                      <Input required className="h-9 text-xs" value={formData.title} onChange={e => handleChange('title', e.target.value)} placeholder="e.g. Be Yours" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Slug <span className="text-rose-500">*</span></Label>
                      <div className="flex gap-2">
                        <Input required className="h-9 text-xs" value={formData.slug} onChange={e => handleChange('slug', e.target.value)} placeholder="e.g. be-yours" />
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleSlugGenerate}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Short Description</Label>
                    <Input className="h-9 text-xs" value={formData.short_description || ''} onChange={e => handleChange('short_description', e.target.value)} placeholder="Appears on grid cards" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Full Description</Label>
                    <Textarea className="min-h-[100px] text-xs resize-none" value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Full template description..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Category</Label>
                      <Select value={formData.category || ''} onValueChange={v => handleChange('category', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fashion">Fashion</SelectItem>
                          <SelectItem value="Home & Kitchen">Home & Kitchen</SelectItem>
                          <SelectItem value="Beauty & Skincare">Beauty & Skincare</SelectItem>
                          <SelectItem value="Fitness">Fitness</SelectItem>
                          <SelectItem value="Pets">Pets</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Health & Wellness">Health & Wellness</SelectItem>
                          <SelectItem value="Baby">Baby</SelectItem>
                          <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Niche</Label>
                      <Input className="h-9 text-xs" value={formData.niche || ''} onChange={e => handleChange('niche', e.target.value)} placeholder="e.g. Streetwear" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(formData.tags || []).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] pr-1 bg-muted">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input className="h-9 text-xs" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="Add a tag..." />
                      <Button type="button" variant="outline" className="h-9 text-xs" onClick={handleAddTag}>Add Tag</Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display Metrics</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Score</Label>
                        <Input className="h-9 text-xs" value={formData.metadata?.conversions || ''} onChange={e => handleChange('metadata', { ...formData.metadata, conversions: e.target.value })} placeholder="e.g. 9.8/10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Revenue</Label>
                        <Input className="h-9 text-xs" value={formData.metadata?.revenue || ''} onChange={e => handleChange('metadata', { ...formData.metadata, revenue: e.target.value })} placeholder="e.g. $125k/mo" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Trend</Label>
                        <Input className="h-9 text-xs" value={formData.metadata?.trend || ''} onChange={e => handleChange('metadata', { ...formData.metadata, trend: e.target.value })} placeholder="e.g. +24%" />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Media Tab ─────────────────────────────────────────────────── */}
              <TabsContent value="media" className="mt-0 space-y-6">
                <input type="file" accept="image/webp,image/png,image/jpeg" className="hidden" ref={thumbInputRef} onChange={e => e.target.files?.[0] && doUpload(e.target.files[0], 'thumb')} />
                <input type="file" accept="image/webp,image/png,image/jpeg" className="hidden" ref={previewInputRef} onChange={e => e.target.files?.[0] && doUpload(e.target.files[0], 'preview')} />

                <div className="grid grid-cols-2 gap-4">
                  <ImageUploader label="Thumbnail (4:3) - Grid view" url={formData.thumbnail_image} isUploading={isUploadingThumb} onClick={() => thumbInputRef.current?.click()} onRemove={() => handleChange('thumbnail_image', '')} />
                  <ImageUploader label="Preview (16:9) - Detail view" url={formData.preview_image} isUploading={isUploadingPreview} onClick={() => previewInputRef.current?.click()} onRemove={() => handleChange('preview_image', '')} />
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Demo URL</Label>
                    <Input className="h-9 text-xs font-mono" value={formData.demo_url || ''} onChange={e => handleChange('demo_url', e.target.value)} placeholder="https://..." />
                    <p className="text-[10px] text-muted-foreground">Publicly accessible live preview of the store.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      Template URL
                      <Lock className="h-3 w-3 text-amber-500" />
                    </Label>
                    <Input className="h-9 text-xs font-mono" value={formData.template_url || ''} onChange={e => handleChange('template_url', e.target.value)} placeholder="Supabase path or external secure URL" />
                    <p className="text-[10px] text-muted-foreground">Protected. Only returned via edge function for authorized users.</p>
                  </div>
                </div>
              </TabsContent>

              {/* ── Pricing Tab ───────────────────────────────────────────────── */}
              <TabsContent value="pricing" className="mt-0 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Free Template</Label>
                    <p className="text-xs text-muted-foreground">Is this template free to download?</p>
                  </div>
                  <Switch checked={formData.is_free} onCheckedChange={c => {
                    handleChange('is_free', c);
                    if (c) handleChange('price', 0);
                  }} />
                </div>

                {!formData.is_free && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Price</Label>
                      <Input type="number" min="0" step="0.01" className="h-9 text-xs" value={formData.price || 0} onChange={e => handleChange('price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Compare At Price</Label>
                      <Input type="number" min="0" step="0.01" className="h-9 text-xs" value={formData.compare_at_price || ''} onChange={e => handleChange('compare_at_price', parseFloat(e.target.value) || null)} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Currency</Label>
                      <Select value={formData.currency || 'USD'} onValueChange={v => handleChange('currency', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Access Tab ────────────────────────────────────────────────── */}
              <TabsContent value="access" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Base Access Level</Label>
                  <Select value={formData.access_level} onValueChange={v => handleChange('access_level', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free (All users)</SelectItem>
                      <SelectItem value="starter">Starter Plan & Up</SelectItem>
                      <SelectItem value="growth">Pro Plan & Up</SelectItem>
                      <SelectItem value="agency">Agency / Enterprise Only</SelectItem>
                      <SelectItem value="custom">Custom (Use Allowed Plans)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Minimum plan required to download this template.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Explicitly Allowed Plans (Overrides base level)</Label>
                  <div className="flex flex-wrap gap-2">
                    {['starter', 'growth', 'agency', 'enterprise'].map(plan => (
                      <Badge
                        key={plan}
                        variant={(formData.allowed_plans || []).includes(plan) ? 'default' : 'outline'}
                        className="cursor-pointer capitalize text-xs px-3 py-1"
                        onClick={() => toggleAllowedPlan(plan)}
                      >
                        {plan === 'growth' ? 'pro' : plan}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label className="text-xs font-semibold">Custom Upgrade Message</Label>
                  <Textarea className="h-20 text-xs resize-none" value={formData.upgrade_message || ''} onChange={e => handleChange('upgrade_message', e.target.value)} placeholder="Upgrade to Pro to unlock this premium theme..." />
                  <p className="text-[10px] text-muted-foreground">Shown in the lock overlay instead of the default message.</p>
                </div>
              </TabsContent>

              {/* ── Status Tab ────────────────────────────────────────────────── */}
              <TabsContent value="status" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Status</Label>
                    <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Sort Order</Label>
                    <Input type="number" className="h-9 text-xs" value={formData.sort_order || 0} onChange={e => handleChange('sort_order', parseInt(e.target.value, 10) || 0)} />
                  </div>
                </div>

                <div className="space-y-3 border border-border rounded-lg p-1 bg-muted/10">
                  <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Show on Dashboard</Label>
                      <p className="text-xs text-muted-foreground">Visible to users</p>
                    </div>
                    <Switch checked={formData.is_visible} onCheckedChange={c => handleChange('is_visible', c)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Star className="h-4 w-4 text-violet-500 fill-violet-500" />
                      <div>
                        <Label className="text-sm font-semibold">Featured</Label>
                        <p className="text-xs text-muted-foreground">Show in featured lists</p>
                      </div>
                    </div>
                    <Switch checked={formData.is_featured} onCheckedChange={c => handleChange('is_featured', c)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                      <div>
                        <Label className="text-sm font-semibold">Trending</Label>
                        <p className="text-xs text-muted-foreground">Mark as trending</p>
                      </div>
                    </div>
                    <Switch checked={formData.is_trending} onCheckedChange={c => handleChange('is_trending', c)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="space-y-0.5 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-amber-500" />
                      <div>
                        <Label className="text-sm font-semibold">Premium Badge</Label>
                        <p className="text-xs text-muted-foreground">Add premium indicator</p>
                      </div>
                    </div>
                    <Switch checked={formData.is_premium} onCheckedChange={c => handleChange('is_premium', c)} />
                  </div>
                </div>
              </TabsContent>

              {/* ── SEO Tab ───────────────────────────────────────────────────── */}
              <TabsContent value="seo" className="mt-0 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">SEO Title</Label>
                    <span className="text-[10px] text-muted-foreground">{(formData.seo_title || '').length} / 60</span>
                  </div>
                  <Input className="h-9 text-xs" value={formData.seo_title || ''} onChange={e => handleChange('seo_title', e.target.value)} placeholder="Optimal length is 50-60 characters" maxLength={60} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">SEO Description</Label>
                    <span className="text-[10px] text-muted-foreground">{(formData.seo_description || '').length} / 160</span>
                  </div>
                  <Textarea className="h-24 text-xs resize-none" value={formData.seo_description || ''} onChange={e => handleChange('seo_description', e.target.value)} placeholder="Optimal length is 150-160 characters" maxLength={160} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/10 gap-3 sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto h-9 text-xs" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {!design || design.status === 'draft' ? (
            <Button variant="ghost" className="w-full sm:w-auto h-9 text-xs bg-muted hover:bg-muted-foreground/20" onClick={() => onSave(formData as StoreDesignFormValues, false)} disabled={isSaving || !formData.title || !formData.slug}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as Draft'}
            </Button>
          ) : null}
          <Button className="w-full sm:w-auto h-9 text-xs" onClick={() => onSave(formData as StoreDesignFormValues, true)} disabled={isSaving || !formData.title || !formData.slug}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {design?.status === 'published' ? 'Save Changes' : 'Publish Design'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
