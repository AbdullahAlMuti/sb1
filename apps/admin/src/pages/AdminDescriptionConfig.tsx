import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Label } from "@repo/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Switch } from "@repo/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@repo/api-client/supabase/client";
import { PageHeader } from "@/core/ui/PageHeader";
import {
  ClipboardList,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown, 
  HelpCircle, 
  FileText, 
  Settings, 
  ShieldAlert, 
  Eye,
  RefreshCw,
  Info
} from "lucide-react";

interface SectionConfig {
  key: string;
  type: 'opening' | 'features' | 'specifications' | 'whats_included' | 'condition' | 'shipping' | 'returns' | 'contact' | 'custom';
  enabled: boolean;
  order: number;
  title: string;
  ai_guidance: string | null;
  static_html: string | null;
}

interface ExclusionRules {
  strip_supplier_names: boolean;
  supplier_names: string[];
  strip_product_ids: boolean;
  strip_prices: boolean;
  strip_urls: boolean;
  strip_images: boolean;
  blocked_terms: string[];
  banned_claim_phrases: string[];
  vero_brands: string[];
}

export default function AdminDescriptionConfig() {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRules>({
    strip_supplier_names: true,
    supplier_names: [],
    strip_product_ids: true,
    strip_prices: true,
    strip_urls: true,
    strip_images: true,
    blocked_terms: [],
    banned_claim_phrases: [],
    vero_brands: []
  });
  const [promptSkeleton, setPromptSkeleton] = useState("");
  const [outputFormat, setOutputFormat] = useState("html_ebay_safe");
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Exclusions text inputs (comma/newline separated for UI editing)
  const [supplierNamesText, setSupplierNamesText] = useState("");
  const [blockedTermsText, setBlockedTermsText] = useState("");
  const [bannedClaimsText, setBannedClaimsText] = useState("");
  const [veroBrandsText, setVeroBrandsText] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("description_config")
        .select("*")
        .eq("scope", "global")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Sort sections by order
        const sortedSections = Array.isArray(data.sections)
          ? [...data.sections].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          : [];

        setSections(sortedSections);
        setExclusionRules(data.exclusion_rules || {});
        setPromptSkeleton(data.prompt_skeleton || "");
        setOutputFormat(data.output_format || "html_ebay_safe");
        setVersion(data.version || 1);

        // Populate text areas
        const rules = data.exclusion_rules || {};
        setSupplierNamesText((rules.supplier_names || []).join("\n"));
        setBlockedTermsText((rules.blocked_terms || []).join("\n"));
        setBannedClaimsText((rules.banned_claim_phrases || []).join("\n"));
        setVeroBrandsText((rules.vero_brands || []).join("\n"));
      } else {
        toast.info("No configuration found. A default seed configuration will be created on save.");
      }
    } catch (err: any) {
      console.error("Error fetching description config:", err);
      toast.error(err.message || "Failed to load description configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Parse arrays from text inputs
      const parseTextArray = (text: string) => 
        text
          .split(/[\n,]/)
          .map(t => t.trim())
          .filter(t => t.length > 0);

      const updatedExclusions: ExclusionRules = {
        ...exclusionRules,
        supplier_names: parseTextArray(supplierNamesText),
        blocked_terms: parseTextArray(blockedTermsText),
        banned_claim_phrases: parseTextArray(bannedClaimsText),
        vero_brands: parseTextArray(veroBrandsText)
      };

      // Ensure sections have sequential ordering
      const normalizedSections = sections.map((sec, idx) => ({
        ...sec,
        order: idx + 1
      }));

      const { error } = await (supabase as any)
        .from("description_config")
        .upsert({
          scope: "global",
          version: version + 1,
          sections: normalizedSections,
          exclusion_rules: updatedExclusions,
          prompt_skeleton: promptSkeleton,
          output_format: outputFormat,
          updated_at: new Date().toISOString()
        }, { onConflict: "scope" });

      if (error) throw error;

      toast.success("Description configuration saved successfully!");
      setVersion(prev => prev + 1);
      setSections(normalizedSections);
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  // Reordering sections
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Recalculate order field
    const reordered = newSections.map((sec, idx) => ({
      ...sec,
      order: idx + 1
    }));

    setSections(reordered);
  };

  const deleteSection = (index: number) => {
    const newSections = sections.filter((_, idx) => idx !== index);
    const reordered = newSections.map((sec, idx) => ({
      ...sec,
      order: idx + 1
    }));
    setSections(reordered);
  };

  const addSection = () => {
    const newSection: SectionConfig = {
      key: `custom_section_${Date.now()}`,
      type: "custom",
      enabled: true,
      order: sections.length + 1,
      title: "New Section",
      ai_guidance: "AI prompt guidance for this section...",
      static_html: null
    };
    setSections([...sections, newSection]);
  };

  const updateSectionField = (index: number, field: keyof SectionConfig, value: any) => {
    const updated = [...sections];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setSections(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <RefreshCw className="animate-spin h-8 w-8 text-primary" />
        <p className="text-muted-foreground text-sm">Loading description config...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Description Config"
        description="Centrally control the structure, prompt templates, and sanitization rules for all generated eBay descriptions."
        icon={ClipboardList}
        actions={
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-orange-200 text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400">
            Version {version}
          </Badge>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="shadow-md bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="animate-spin h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </div>
      }
      />

      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg border border-border">
          <TabsTrigger value="sections" className="rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" /> Section Structure
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Exclusion Rules & Prompt
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Section Structure */}
        <TabsContent value="sections" className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="bg-muted/40 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold">Listing Sections Layout</CardTitle>
                  <CardDescription>
                    Add, reorder, and configure standard & dynamic sections. AI-driven sections will request content from the LLM, while static sections render fixed HTML directly.
                  </CardDescription>
                </div>
                <Button 
                  onClick={addSection}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 bg-white hover:bg-orange-50 border-orange-200 text-orange-600 font-medium"
                >
                  <Plus className="h-4 w-4" /> Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {sections.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No sections configured. Click "Add Section" to create one.
                  </div>
                ) : (
                  sections.map((section, idx) => {
                    const isStatic = ['shipping', 'returns', 'contact'].includes(section.type);
                    const requiresAi = !isStatic || section.type === 'custom';
                    
                    return (
                      <div key={section.key} className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-start group hover:bg-muted/10 transition-colors">
                        {/* Drag/Order actions */}
                        <div className="flex md:flex-col gap-1 items-center justify-center shrink-0 self-center md:self-start">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, 'up')}
                            className="h-8 w-8 text-muted-foreground hover:text-orange-500"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                            {idx + 1}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={idx === sections.length - 1}
                            onClick={() => moveSection(idx, 'down')}
                            className="h-8 w-8 text-muted-foreground hover:text-orange-500"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Configuration fields */}
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground">Section Title</Label>
                              <Input 
                                value={section.title}
                                onChange={(e) => updateSectionField(idx, 'title', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground">Unique Key (JSON Identifier)</Label>
                              <Input 
                                value={section.key}
                                onChange={(e) => updateSectionField(idx, 'key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                disabled={['title', 'opening', 'features', 'specifications'].includes(section.key)}
                                className="mt-1 font-mono text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
                              <Select
                                value={section.type}
                                onValueChange={(value: any) => updateSectionField(idx, 'type', value)}
                                disabled={['title', 'opening', 'features', 'specifications'].includes(section.key)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="opening">Opening Paragraph</SelectItem>
                                  <SelectItem value="features">Features List</SelectItem>
                                  <SelectItem value="specifications">Specs Table</SelectItem>
                                  <SelectItem value="whats_included">What's Included</SelectItem>
                                  <SelectItem value="condition">Condition Note</SelectItem>
                                  <SelectItem value="shipping">Shipping Info</SelectItem>
                                  <SelectItem value="returns">Returns Policy</SelectItem>
                                  <SelectItem value="contact">Contact Details</SelectItem>
                                  <SelectItem value="custom">Custom (Admin Defined)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Dynamic fields based on type */}
                          {requiresAi && (
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                AI Copywriting Guidance 
                                <span title="Directs the AI on what parameters/tone/content to construct for this section">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-pointer" />
                                </span>
                              </Label>
                              <Textarea
                                value={section.ai_guidance || ""}
                                onChange={(e) => updateSectionField(idx, 'ai_guidance', e.target.value)}
                                placeholder="Explain to the AI how it should format or write this section..."
                                rows={2}
                                className="mt-1 text-sm resize-none"
                              />
                            </div>
                          )}

                          {isStatic && (
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground">Static HTML Content</Label>
                              <Textarea
                                value={section.static_html || ""}
                                onChange={(e) => updateSectionField(idx, 'static_html', e.target.value)}
                                placeholder="<p>Enter HTML to render directly...</p>"
                                rows={3}
                                className="mt-1 font-mono text-xs resize-none"
                              />
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex md:flex-col gap-4 items-center justify-between shrink-0 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-border">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={section.enabled}
                              onCheckedChange={(checked) => updateSectionField(idx, 'enabled', checked)}
                              id={`enabled-${section.key}`}
                            />
                            <Label htmlFor={`enabled-${section.key}`} className="text-xs font-medium cursor-pointer">
                              {section.enabled ? "Active" : "Disabled"}
                            </Label>
                          </div>
                          
                          {!['title', 'opening', 'features', 'specifications'].includes(section.key) && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteSection(idx)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50/50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Exclusions & Prompt Settings */}
        <TabsContent value="exclusions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Exclusion Toggles & String Arrays */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Sanitization Rules</CardTitle>
                  <CardDescription>Control filters applied post-generation to remove unwanted phrases and supplier trace elements.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Strip Supplier Names</Label>
                        <p className="text-xs text-muted-foreground">Remove mention of Amazon, Walmart, etc.</p>
                      </div>
                      <Switch 
                        checked={exclusionRules.strip_supplier_names}
                        onCheckedChange={(checked) => setExclusionRules({ ...exclusionRules, strip_supplier_names: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Strip Product IDs</Label>
                        <p className="text-xs text-muted-foreground">Strip ASINs, UPCs, EANs, and ISBN numbers.</p>
                      </div>
                      <Switch 
                        checked={exclusionRules.strip_product_ids}
                        onCheckedChange={(checked) => setExclusionRules({ ...exclusionRules, strip_product_ids: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Strip Prices</Label>
                        <p className="text-xs text-muted-foreground">Strip dollar/pound/euro figures from the copy.</p>
                      </div>
                      <Switch 
                        checked={exclusionRules.strip_prices}
                        onCheckedChange={(checked) => setExclusionRules({ ...exclusionRules, strip_prices: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Strip Links / URLs</Label>
                        <p className="text-xs text-muted-foreground">Strip HTTP/HTTPS URLs (strictly required by eBay).</p>
                      </div>
                      <Switch 
                        checked={exclusionRules.strip_urls}
                        onCheckedChange={(checked) => setExclusionRules({ ...exclusionRules, strip_urls: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 md:col-span-2">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Strip Images</Label>
                        <p className="text-xs text-muted-foreground">Ensure no third-party images or tags are embedded.</p>
                      </div>
                      <Switch 
                        checked={exclusionRules.strip_images}
                        onCheckedChange={(checked) => setExclusionRules({ ...exclusionRules, strip_images: checked })}
                      />
                    </div>
                  </div>

                  {/* List Exclusions text boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Supplier Names to Strip</Label>
                      <CardDescription className="text-xs">One per line. Cleaned case-insensitively.</CardDescription>
                      <Textarea 
                        value={supplierNamesText}
                        onChange={(e) => setSupplierNamesText(e.target.value)}
                        placeholder="Amazon&#10;Walmart&#10;AliExpress"
                        rows={4}
                        className="font-mono text-sm resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Blocked Terms / Forbidden Words</Label>
                      <CardDescription className="text-xs">Strict keyword matches stripped from final text.</CardDescription>
                      <Textarea 
                        value={blockedTermsText}
                        onChange={(e) => setBlockedTermsText(e.target.value)}
                        placeholder="Prime&#10;Subscribe & Save&#10;Amazon's Choice&#10;Sold by&#10;Fulfilled by"
                        rows={4}
                        className="font-mono text-sm resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Banned Claims / Policy Phrases</Label>
                      <CardDescription className="text-xs">Phrases violating eBay policy or causing issues.</CardDescription>
                      <Textarea 
                        value={bannedClaimsText}
                        onChange={(e) => setBannedClaimsText(e.target.value)}
                        placeholder="lifetime warranty&#10;100% satisfaction guaranteed&#10;guaranteed shipping"
                        rows={4}
                        className="font-mono text-sm resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">VeRO Brand Protection List</Label>
                      <CardDescription className="text-xs">Brands matching eBay's Verified Rights Owner list.</CardDescription>
                      <Textarea 
                        value={veroBrandsText}
                        onChange={(e) => setVeroBrandsText(e.target.value)}
                        placeholder="Apple&#10;Nike&#10;Adidas&#10;Sony"
                        rows={4}
                        className="font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Skeleton Card */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Prompt Skeleton</CardTitle>
                  <CardDescription>The outer system wrapper prompt used to query the AI LLM.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="output_format" className="text-sm font-semibold">Output Format</Label>
                      <Select value={outputFormat} onValueChange={(val) => setOutputFormat(val)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Output format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="html_ebay_safe">HTML (eBay Compliant)</SelectItem>
                          <SelectItem value="plaintext">Plain Text Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Prompt Template</Label>
                    <Textarea 
                      value={promptSkeleton}
                      onChange={(e) => setPromptSkeleton(e.target.value)}
                      rows={15}
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Variable Cheat Sheet sidebar */}
            <div className="space-y-6">
              <Card className="border border-border/80 shadow-sm bg-muted/20 sticky top-6">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-orange-500" /> Prompt Variable Guide
                  </CardTitle>
                  <CardDescription>Available parameters that will be interpolated dynamically by the Edge Function renderer.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Dynamic Layout Variables</h4>
                    <ul className="space-y-2">
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{sections_guidance}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">List of active sections and their respective AI guidance instructions.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{blocked_terms}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Combined array of blocked words and supplier names to instruct AI to exclude.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{banned_claim_phrases}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">List of policy claim phrases forbidden in listing.</p>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Source Product Fields</h4>
                    <ul className="space-y-2">
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{title}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Supplier original product title.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{brand}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Brand name extracted from source page.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{category}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Source page breadcrumb categories.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{description}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Supplier original description text.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{bulletPoints}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Bullet points / features list.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{features}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Extracted key features list.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{specifications}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Technical specifications mapping.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{price}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Original price of the product.</p>
                      </li>
                      <li>
                        <Badge variant="outline" className="font-mono text-[10px]">{"{condition}"}</Badge>
                        <p className="text-muted-foreground mt-0.5">Product condition (New/Used/Refurbished).</p>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
