import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Label } from "@repo/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Badge } from "@repo/ui/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@repo/api-client/supabase/client";
import DOMPurify from "dompurify";
import { Save, Key, Brain, Wand2, RefreshCw, FileText, Eye, EyeOff, FlaskConical, Loader2, Copy, Check, Zap, CheckCircle, XCircle, ShieldCheck, ClipboardList, Bot } from "lucide-react";
import AdminExtensionControl from "./AdminExtensionControl";
import AdminPromptsPage from "@/modules/content/prompts";
import AdminDescriptionConfig from "./AdminDescriptionConfig";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  inkFaint: "#b2b2b2",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  canvasNight: "#1c1c1c",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
  onDark: "#ffffff",
} as const;

interface ExtensionSettings {
  api_provider: string;
  api_key: string;
  model: string;
  title_prompt: string;
  description_prompt: string;
  enable_auto_scrape: boolean;
  scrape_delay_ms: number;
  max_titles_count: number;
}

interface TestProduct {
  title: string;
  brand: string;
  category: string;
  price: string;
  description: string;
  bulletPoints: string;
  specifications: string;
}

interface GeneratedTitle {
  rank: string;
  title: string;
}

const AI_PROVIDERS = [
  { value: 'lovable', label: 'Lovable AI (Recommended)', models: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro'] },
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-5', 'claude-3-5-haiku-20241022'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'] },
];

const DEFAULT_TITLE_PROMPT = `You are an expert eBay SEO specialist. 
Analyze the following Amazon product title and data to generate 3 unique, click-optimized eBay titles.

THE TASK:
1. Analyze the Original Amazon Title: "{title}"
2. Identify core keywords (Brand, Model, Material, Size, Color).
3. Generate 3 distinct eBay titles (under 80 characters each).
4. One title should be an optimized version of the original, the other two should focus on different high-volume keywords.

PRODUCT CONTEXT:
Original Title: {title}
Brand: {brand}
Category: {category}
Price: {price}
Bullet Points: {bulletPoints}
Specifications: {specifications}
Original Description: {description}

RESPONSE FORMAT:
Return ONLY a JSON object:
{
  "titles": [
    {"rank": "best", "title": "Most optimized primary title"},
    {"rank": "recommended", "title": "Keyword-rich secondary title"},
    {"rank": "powerful", "title": "Sales-driven tertiary title"}
  ]
}`;

const DEFAULT_DESCRIPTION_PROMPT = `Transform the following Amazon product data into a professional eBay listing description.

REQUIREMENTS:
- Remove all Amazon-specific terms (Prime, Subscribe & Save, Amazon's Choice, etc.)
- Create a compelling, professional description
- Use HTML formatting for eBay (allowed tags: <b>, <br>, <ul>, <li>, <p>)
- Include all key product features and specifications
- Add standard seller sections at the bottom

STRUCTURE YOUR RESPONSE AS:
1. Opening hook (1-2 sentences)
2. Key Features (bullet points)
3. Product Specifications
4. What's Included
5. Shipping & Handling
6. Returns Policy
7. Contact Information

PRODUCT DATA:
Title: {title}
Brand: {brand}
Category: {category}
Original Description: {description}
Bullet Points: {bulletPoints}
Features: {features}
Specifications: {specifications}
Condition: {condition}
Price: {price}

Generate the eBay description in clean HTML format. Do not include any markdown code blocks, just raw HTML.`;

const DEFAULT_SETTINGS: ExtensionSettings = {
  api_provider: 'lovable',
  api_key: '',
  model: 'google/gemini-2.5-flash',
  title_prompt: DEFAULT_TITLE_PROMPT,
  description_prompt: DEFAULT_DESCRIPTION_PROMPT,
  enable_auto_scrape: true,
  scrape_delay_ms: 1000,
  max_titles_count: 3,
};

const SAMPLE_PRODUCT: TestProduct = {
  title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium - Unlocked',
  brand: 'Apple',
  category: 'Cell Phones & Smartphones',
  price: '$1,199.00',
  description: 'The most advanced iPhone ever with A17 Pro chip, 48MP camera system, and titanium design.',
  bulletPoints: '• A17 Pro chip for incredible performance\n• 48MP Main camera with advanced features\n• Titanium design with Action button\n• All-day battery life',
  specifications: 'Display: 6.7" Super Retina XDR\nStorage: 256GB\nChip: A17 Pro\nCamera: 48MP + 12MP + 12MP',
};

/* ─── Shared inline-style factories (Supabase design tokens) ─── */
const sectionCard: React.CSSProperties = {
  background: sb.canvas,
  border: `1px solid ${sb.hairline}`,
  borderRadius: 12,
  padding: 0,
  overflow: "hidden",
};
const sectionHeader: React.CSSProperties = {
  padding: "24px 28px 16px",
  borderBottom: `1px solid ${sb.hairlineCool}`,
};
const sectionBody: React.CSSProperties = {
  padding: "24px 28px",
};
const primaryBtn: React.CSSProperties = {
  background: sb.primary,
  color: sb.onPrimary,
  borderRadius: 6,
  fontWeight: 500,
  fontSize: 14,
  border: "none",
};
const outlineBtn: React.CSSProperties = {
  background: sb.canvas,
  color: sb.ink,
  borderRadius: 6,
  fontWeight: 500,
  fontSize: 14,
  border: `1px solid ${sb.hairline}`,
};
const labelStyle: React.CSSProperties = {
  color: sb.ink,
  fontWeight: 500,
  fontSize: 14,
};
const captionStyle: React.CSSProperties = {
  color: sb.inkMute,
  fontSize: 13,
  lineHeight: 1.45,
};
const pillGreen: React.CSSProperties = {
  background: sb.primary,
  color: sb.onPrimary,
  borderRadius: 9999,
  fontWeight: 500,
  fontSize: 12,
  padding: "2px 10px",
  border: "none",
};
const pillSoft: React.CSSProperties = {
  background: sb.canvasSoft,
  color: sb.ink,
  borderRadius: 9999,
  fontWeight: 400,
  fontSize: 12,
  padding: "2px 10px",
  border: `1px solid ${sb.hairlineCool}`,
};

export default function AdminExtension() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Test feature state
  const [testProduct, setTestProduct] = useState<TestProduct>(SAMPLE_PRODUCT);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<GeneratedTitle[]>([]);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [
          'ext_ai_provider', 'ext_ai_api_key', 'ext_ai_model', 
          'ext_title_prompt', 'ext_description_prompt',
          'ext_enable_auto_scrape', 'ext_scrape_delay_ms', 'ext_max_titles_count'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap: Record<string, string> = {};
        data.forEach((item) => {
          settingsMap[item.key] = item.value || '';
        });

        setSettings({
          api_provider: settingsMap['ext_ai_provider'] || DEFAULT_SETTINGS.api_provider,
          api_key: settingsMap['ext_ai_api_key'] || '',
          model: settingsMap['ext_ai_model'] || DEFAULT_SETTINGS.model,
          title_prompt: settingsMap['ext_title_prompt'] || DEFAULT_SETTINGS.title_prompt,
          description_prompt: settingsMap['ext_description_prompt'] || DEFAULT_SETTINGS.description_prompt,
          enable_auto_scrape: settingsMap['ext_enable_auto_scrape'] === 'true',
          scrape_delay_ms: parseInt(settingsMap['ext_scrape_delay_ms']) || DEFAULT_SETTINGS.scrape_delay_ms,
          max_titles_count: parseInt(settingsMap['ext_max_titles_count']) || DEFAULT_SETTINGS.max_titles_count,
        });
      }
    } catch (error) {
      console.error('Error fetching extension settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .eq('key', key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('admin_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('admin_settings')
        .insert({ key, value });
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('ext_ai_provider', settings.api_provider),
        saveSetting('ext_ai_api_key', settings.api_key),
        saveSetting('ext_ai_model', settings.model),
        saveSetting('ext_title_prompt', settings.title_prompt),
        saveSetting('ext_description_prompt', settings.description_prompt),
        saveSetting('ext_enable_auto_scrape', settings.enable_auto_scrape.toString()),
        saveSetting('ext_scrape_delay_ms', settings.scrape_delay_ms.toString()),
        saveSetting('ext_max_titles_count', settings.max_titles_count.toString()),
      ]);
      toast.success('Extension settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save extension settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: {
          test: true,
          title: 'Apple iPhone 15 Pro Max 256GB Space Black',
          description: 'Brand new, sealed in box, unlocked',
          category: 'Cell Phones & Smartphones'
        }
      });

      if (error) throw error;
      if (data?.titles) {
        toast.success('AI connection successful! Generated test titles.');
      } else {
        toast.error('AI connection failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Failed to connect to AI service');
    } finally {
      setTesting(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!settings.api_key && settings.api_provider !== 'lovable') {
      toast.error('Please enter an API key first');
      return;
    }

    setTestingApiKey(true);
    setApiKeyStatus('idle');
    
    try {
      // Use edge function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: {
          provider: settings.api_provider,
          apiKey: settings.api_key,
          model: settings.model,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setApiKeyStatus('success');
        toast.success(`${AI_PROVIDERS.find(p => p.value === settings.api_provider)?.label} API key is valid!`);
      } else {
        throw new Error(data?.error || 'Invalid API key');
      }
    } catch (error) {
      console.error('API key test failed:', error);
      setApiKeyStatus('error');
      toast.error(`API key test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleGenerateTitles = async () => {
    setGeneratingTitles(true);
    setGeneratedTitles([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: {
          title: testProduct.title,
          brand: testProduct.brand,
          category: testProduct.category,
          price: testProduct.price,
          description: testProduct.description,
          bulletPoints: testProduct.bulletPoints,
          specifications: testProduct.specifications,
        }
      });

      if (error) throw error;
      if (data?.titles) {
        setGeneratedTitles(data.titles);
        toast.success('Titles generated successfully!');
      } else {
        toast.error('Failed to generate titles');
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error('Failed to generate titles');
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleGenerateDescription = async () => {
    setGeneratingDescription(true);
    setGeneratedDescription('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          title: testProduct.title,
          brand: testProduct.brand,
          category: testProduct.category,
          price: testProduct.price,
          description: testProduct.description,
          bulletPoints: testProduct.bulletPoints,
          specifications: testProduct.specifications,
          condition: 'New',
          features: testProduct.bulletPoints,
        }
      });

      if (error) throw error;
      if (data?.description) {
        setGeneratedDescription(data.description);
        toast.success('Description generated successfully!');
      } else {
        toast.error('Failed to generate description');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error('Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const getModelsForProvider = () => {
    const provider = AI_PROVIDERS.find(p => p.value === settings.api_provider);
    return provider?.models || [];
  };

  const handleProviderChange = (value: string) => {
    const provider = AI_PROVIDERS.find(p => p.value === value);
    setSettings({
      ...settings,
      api_provider: value,
      model: provider?.models[0] || '',
    });
  };

  const getRankBadge = (rank: string): React.CSSProperties => {
    switch (rank) {
      case 'best': return { ...pillGreen };
      case 'recommended': return { ...pillSoft, background: "#e0f2fe", color: "#0369a1" };
      case 'powerful': return { ...pillSoft, background: "#f3e8ff", color: "#7c3aed" };
      default: return pillSoft;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{ borderColor: sb.hairline, borderBottomColor: sb.primary }} className="animate-spin rounded-full h-8 w-8 border-2"></div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif", width: "100%" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: sb.primary,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <Key style={{ width: 22, height: 22, color: sb.onPrimary }} />
        </div>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 500, lineHeight: 1.2,
            letterSpacing: -0.42, color: sb.ink, margin: 0,
          }}>eBay Extension</h1>
          <p style={{ ...captionStyle, marginTop: 2 }}>Configure API keys, prompts, and behavior for the Chrome extension</p>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <Tabs defaultValue="api" className="space-y-6">
        <TabsList
          className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
          style={{
            width: "100%",
            height: "auto",
            background: sb.canvasSoft,
            border: `1px solid ${sb.hairlineCool}`,
            borderRadius: 8,
            padding: 4,
            gap: 4,
          }}
        >
          {[
            { value: "api",    icon: Key,         label: "API Config" },
            { value: "title-prompt",  icon: Wand2,       label: "Title Prompt" },
            { value: "test",          icon: FlaskConical,label: "Test" },
            { value: "control",       icon: ShieldCheck, label: "Control" },
            { value: "prompts",       icon: Bot,         label: "Prompts" },
            { value: "desc-config",   icon: ClipboardList, label: "Desc Config" },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-1.5 data-[state=active]:shadow-sm py-2"
              style={{ borderRadius: 6, fontSize: 13, fontWeight: 500 }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════ API Config Tab ═══════════ */}
        <TabsContent value="api" className="space-y-0">
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Brain style={{ width: 20, height: 20, color: sb.primary }} />
                <h2 style={{ fontSize: 18, fontWeight: 500, color: sb.ink, margin: 0 }}>AI Provider Settings</h2>
              </div>
              <p style={{ ...captionStyle, marginTop: 6 }}>Configure AI provider and credentials for the Chrome extension</p>
            </div>
            <div style={sectionBody}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider" style={labelStyle}>AI Provider</Label>
                  <Select
                    value={settings.api_provider}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger style={{ borderRadius: 6, borderColor: sb.hairline }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            {provider.label}
                            {provider.value === 'lovable' && (
                              <span style={pillGreen}>Free</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p style={captionStyle}>
                    {settings.api_provider === 'lovable'
                      ? 'Uses built-in Lovable AI — no API key required'
                      : 'External provider requires API key'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" style={labelStyle}>AI Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings({ ...settings, model: value })}
                  >
                    <SelectTrigger style={{ borderRadius: 6, borderColor: sb.hairline }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider().map((model) => (
                        <SelectItem key={model} value={model}>
                          <span style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace", fontSize: 13 }}>{model}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {settings.api_provider !== 'lovable' && (
                <div className="space-y-3" style={{ marginTop: 24 }}>
                  <Label htmlFor="api_key" style={labelStyle}>API Key</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="api_key"
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.api_key}
                        onChange={(e) => {
                          setSettings({ ...settings, api_key: e.target.value });
                          setApiKeyStatus('idle');
                        }}
                        placeholder="Enter your API key…"
                        style={{
                          borderRadius: 6,
                          borderColor: apiKeyStatus === 'success' ? sb.primary : apiKeyStatus === 'error' ? '#ff2201' : sb.hairline,
                          paddingRight: 40,
                          fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
                          fontSize: 13,
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleTestApiKey}
                      disabled={testingApiKey || !settings.api_key}
                      className="w-full sm:w-auto"
                      style={{
                        ...outlineBtn,
                        minWidth: 140,
                        ...(apiKeyStatus === 'success' ? { borderColor: sb.primary, color: sb.primaryDeep } : {}),
                        ...(apiKeyStatus === 'error' ? { borderColor: '#ff2201', color: '#ff2201' } : {}),
                      }}
                    >
                      {testingApiKey ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing…</>
                      ) : apiKeyStatus === 'success' ? (
                        <><CheckCircle className="h-4 w-4 mr-2" />Valid</>
                      ) : apiKeyStatus === 'error' ? (
                        <><XCircle className="h-4 w-4 mr-2" />Invalid</>
                      ) : (
                        <><Zap className="h-4 w-4 mr-2" />Test API Key</>
                      )}
                    </Button>
                  </div>
                  <p style={captionStyle}>
                    Your API key is encrypted and stored securely. Test it before saving to verify it works.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3" style={{ marginTop: 28 }}>
                <Button onClick={handleSave} disabled={saving} style={primaryBtn} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving…' : 'Save Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing} style={outlineBtn} className="w-full sm:w-auto">
                  <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing…' : 'Test Connection'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════ Title Prompt Tab ═══════════ */}
        <TabsContent value="title-prompt" className="space-y-0">
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Wand2 style={{ width: 20, height: 20, color: sb.primary }} />
                <h2 style={{ fontSize: 18, fontWeight: 500, color: sb.ink, margin: 0 }}>Title Generation Prompt</h2>
              </div>
              <p style={{ ...captionStyle, marginTop: 6 }}>Customize the prompt used by the extension to generate product titles</p>
            </div>
            <div style={sectionBody}>
              <div className="space-y-2">
                <Label htmlFor="title-prompt" style={labelStyle}>Prompt Template</Label>
                <Textarea
                  id="title-prompt"
                  value={settings.title_prompt}
                  onChange={(e) => setSettings({ ...settings, title_prompt: e.target.value })}
                  rows={16}
                  style={{
                    fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace",
                    fontSize: 14, lineHeight: 1.5,
                    borderRadius: 6, borderColor: sb.hairline,
                    background: sb.canvasSoft,
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {['{title}', '{description}', '{category}', '{price}', '{brand}', '{specifications}', '{bulletPoints}'].map(v => (
                    <span key={v} style={pillSoft}>{v}</span>
                  ))}
                </div>
                <p style={captionStyle}>Use placeholders above to insert product data into your prompt</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3" style={{ marginTop: 24 }}>
                <Button onClick={handleSave} disabled={saving} style={primaryBtn} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving…' : 'Save Prompt'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSettings({ ...settings, title_prompt: DEFAULT_TITLE_PROMPT })}
                  style={outlineBtn}
                  className="w-full sm:w-auto"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>


        {/* ═══════════ Test Tab ═══════════ */}
        <TabsContent value="test" className="space-y-0">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sample Product Input */}
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FlaskConical style={{ width: 20, height: 20, color: sb.primary }} />
                  <h2 style={{ fontSize: 18, fontWeight: 500, color: sb.ink, margin: 0 }}>Sample Product Data</h2>
                </div>
                <p style={{ ...captionStyle, marginTop: 6 }}>Enter product data to test title and description generation</p>
              </div>
              <div style={sectionBody}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-title" style={labelStyle}>Product Title</Label>
                    <Input
                      id="test-title"
                      value={testProduct.title}
                      onChange={(e) => setTestProduct({ ...testProduct, title: e.target.value })}
                      style={{ borderRadius: 6, borderColor: sb.hairline }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-brand" style={labelStyle}>Brand</Label>
                      <Input
                        id="test-brand"
                        value={testProduct.brand}
                        onChange={(e) => setTestProduct({ ...testProduct, brand: e.target.value })}
                        style={{ borderRadius: 6, borderColor: sb.hairline }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="test-price" style={labelStyle}>Price</Label>
                      <Input
                        id="test-price"
                        value={testProduct.price}
                        onChange={(e) => setTestProduct({ ...testProduct, price: e.target.value })}
                        style={{ borderRadius: 6, borderColor: sb.hairline }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-category" style={labelStyle}>Category</Label>
                    <Input
                      id="test-category"
                      value={testProduct.category}
                      onChange={(e) => setTestProduct({ ...testProduct, category: e.target.value })}
                      style={{ borderRadius: 6, borderColor: sb.hairline }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-description" style={labelStyle}>Description</Label>
                    <Textarea
                      id="test-description"
                      value={testProduct.description}
                      onChange={(e) => setTestProduct({ ...testProduct, description: e.target.value })}
                      rows={3}
                      style={{ borderRadius: 6, borderColor: sb.hairline }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-bullets" style={labelStyle}>Bullet Points</Label>
                    <Textarea
                      id="test-bullets"
                      value={testProduct.bulletPoints}
                      onChange={(e) => setTestProduct({ ...testProduct, bulletPoints: e.target.value })}
                      rows={4}
                      style={{ borderRadius: 6, borderColor: sb.hairline }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-specs" style={labelStyle}>Specifications</Label>
                    <Textarea
                      id="test-specs"
                      value={testProduct.specifications}
                      onChange={(e) => setTestProduct({ ...testProduct, specifications: e.target.value })}
                      rows={4}
                      style={{ borderRadius: 6, borderColor: sb.hairline }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button onClick={handleGenerateTitles} disabled={generatingTitles} style={primaryBtn} className="w-full sm:w-auto">
                      {generatingTitles ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      Generate Titles
                    </Button>
                    <Button variant="outline" onClick={handleGenerateDescription} disabled={generatingDescription} style={outlineBtn} className="w-full sm:w-auto">
                      {generatingDescription ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Generate Description
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestProduct(SAMPLE_PRODUCT)}
                    style={{ color: sb.inkMute, fontSize: 13 }}
                  >
                    Reset to Sample Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Generated Results */}
            <div className="space-y-6">
              {/* Generated Titles */}
              <div style={sectionCard}>
                <div style={sectionHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Wand2 style={{ width: 20, height: 20, color: sb.primary }} />
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: sb.ink, margin: 0 }}>Generated Titles</h2>
                  </div>
                </div>
                <div style={sectionBody}>
                  {generatedTitles.length > 0 ? (
                    <div className="space-y-3">
                      {generatedTitles.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 group"
                          style={{
                            padding: "12px 16px",
                            background: sb.canvasSoft,
                            borderRadius: 8,
                            border: `1px solid ${sb.hairlineCool}`,
                          }}
                        >
                          <span style={getRankBadge(item.rank)}>{item.rank}</span>
                          <p className="flex-1" style={{ fontSize: 14, color: sb.ink, margin: 0 }}>{item.title}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(item.title, index)}
                          >
                            {copiedIndex === index ? (
                              <Check style={{ width: 16, height: 16, color: sb.primary }} />
                            ) : (
                              <Copy style={{ width: 16, height: 16, color: sb.inkMute }} />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32" style={{ color: sb.inkFaint }}>
                      <p>Click "Generate Titles" to see results</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Description */}
              <div style={sectionCard}>
                <div style={sectionHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText style={{ width: 20, height: 20, color: sb.primary }} />
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: sb.ink, margin: 0 }}>Generated Description</h2>
                  </div>
                </div>
                <div style={sectionBody}>
                  {generatedDescription ? (
                    <div className="space-y-3">
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert overflow-auto max-h-96"
                        style={{
                          padding: 16,
                          background: sb.canvasNight,
                          color: sb.onDark,
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedDescription) }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedDescription, -1)}
                        style={outlineBtn}
                      >
                        {copiedIndex === -1 ? (
                          <Check style={{ width: 16, height: 16, color: sb.primary, marginRight: 8 }} />
                        ) : (
                          <Copy style={{ width: 16, height: 16, marginRight: 8 }} />
                        )}
                        Copy HTML
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32" style={{ color: sb.inkFaint }}>
                      <p>Click "Generate Description" to see results</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════ Embedded Sub-pages ═══════════ */}
        <TabsContent value="control" className="space-y-6">
          <AdminExtensionControl hideHeader />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <AdminPromptsPage />
        </TabsContent>

        <TabsContent value="desc-config" className="space-y-6">
          <AdminDescriptionConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
