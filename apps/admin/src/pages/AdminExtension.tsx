import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  Save, Key, Brain, Wand2, RefreshCw, FileText, Puzzle, Eye, EyeOff,
  FlaskConical, Loader2, Copy, Check, Zap, CheckCircle, XCircle,
  ShieldCheck, ClipboardList,
} from "lucide-react";
import AdminExtensionControl from "./AdminExtensionControl";
import AdminDescriptionConfig from "./AdminDescriptionConfig";

interface ExtensionSettings {
  api_provider: string;
  api_key: string;
  model: string;
  title_prompt: string;
  title_count: number;
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

const DEFAULT_SETTINGS: ExtensionSettings = {
  api_provider: 'lovable',
  api_key: '',
  model: 'google/gemini-2.5-flash',
  title_prompt: DEFAULT_TITLE_PROMPT,
  title_count: 3,
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

const VALID_TABS = [
  "api-config", "title-prompt", "test",
  "extension-control", "description-config",
] as const;
type TabValue = typeof VALID_TABS[number];

export default function AdminExtension() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabValue =
    (VALID_TABS as readonly string[]).includes(rawTab ?? "")
      ? (rawTab as TabValue)
      : "api-config";

  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);

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
          'ext_title_prompt', 'ext_title_count',
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
          title_count: parseInt(settingsMap['ext_title_count']) || DEFAULT_SETTINGS.title_count,
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
        saveSetting('ext_title_count', settings.title_count.toString()),
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

  const getRankBadgeColor = (rank: string) => {
    switch (rank) {
      case 'best': return 'bg-green-500 text-white';
      case 'recommended': return 'bg-blue-500 text-white';
      case 'powerful': return 'bg-purple-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <Puzzle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Manage Extension</h1>
          <p className="text-muted-foreground">Configure API keys and prompts for the Chrome extension</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })}
        className="space-y-6"
      >
        {/* Responsive tab bar: scrolls horizontally on narrow screens */}
        <div className="overflow-x-auto pb-px">
          <TabsList className="inline-flex h-auto min-w-max flex-nowrap gap-0 bg-muted p-1 rounded-lg">
            <TabsTrigger value="api-config" className="gap-2 whitespace-nowrap">
              <Key className="h-4 w-4" />
              API Config
            </TabsTrigger>
            <TabsTrigger value="title-prompt" className="gap-2 whitespace-nowrap">
              <Wand2 className="h-4 w-4" />
              Title Prompt
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2 whitespace-nowrap">
              <FlaskConical className="h-4 w-4" />
              Test
            </TabsTrigger>
            {/* Divider between setup tabs and integrated feature tabs */}
            <div className="mx-1 my-1 w-px self-stretch bg-border" aria-hidden />
            <TabsTrigger value="extension-control" className="gap-2 whitespace-nowrap">
              <ShieldCheck className="h-4 w-4" />
              Extension Control
            </TabsTrigger>
            <TabsTrigger value="description-config" className="gap-2 whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              Description Config
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── API Config ──────────────────────────────────────────────────────── */}
        <TabsContent value="api-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Provider Settings
              </CardTitle>
              <CardDescription>
                Configure AI provider and credentials for the Chrome extension
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select
                    value={settings.api_provider}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-center gap-2">
                            {provider.label}
                            {provider.value === 'lovable' && (
                              <Badge variant="secondary" className="ml-1">Free</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {settings.api_provider === 'lovable'
                      ? 'Uses built-in Lovable AI - no API key required'
                      : 'External provider requires API key'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={settings.model}
                    onValueChange={(value) => setSettings({ ...settings, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsForProvider().map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {settings.api_provider !== 'lovable' && (
                <div className="space-y-3">
                  <Label htmlFor="api_key">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="api_key"
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.api_key}
                        onChange={(e) => {
                          setSettings({ ...settings, api_key: e.target.value });
                          setApiKeyStatus('idle');
                        }}
                        placeholder="Enter your API key..."
                        className={`pr-10 ${apiKeyStatus === 'success' ? 'border-green-500' : apiKeyStatus === 'error' ? 'border-red-500' : ''}`}
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
                      className={`min-w-[140px] ${apiKeyStatus === 'success' ? 'border-green-500 text-green-600' : apiKeyStatus === 'error' ? 'border-red-500 text-red-600' : ''}`}
                    >
                      {testingApiKey ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                      ) : apiKeyStatus === 'success' ? (
                        <><CheckCircle className="h-4 w-4 mr-2" />Valid</>
                      ) : apiKeyStatus === 'error' ? (
                        <><XCircle className="h-4 w-4 mr-2" />Invalid</>
                      ) : (
                        <><Zap className="h-4 w-4 mr-2" />Test API Key</>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and stored securely. Test it before saving to verify it works.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Title Prompt ─────────────────────────────────────────────────────── */}
        <TabsContent value="title-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Title Generation Prompt
              </CardTitle>
              <CardDescription>
                Customize the prompt used by the extension to generate product titles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title-prompt">Prompt Template</Label>
                <Textarea
                  id="title-prompt"
                  value={settings.title_prompt}
                  onChange={(e) => setSettings({ ...settings, title_prompt: e.target.value })}
                  rows={16}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{'{title}'}</Badge>
                  <Badge variant="outline">{'{description}'}</Badge>
                  <Badge variant="outline">{'{category}'}</Badge>
                  <Badge variant="outline">{'{price}'}</Badge>
                  <Badge variant="outline">{'{brand}'}</Badge>
                  <Badge variant="outline">{'{specifications}'}</Badge>
                  <Badge variant="outline">{'{bulletPoints}'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use placeholders above to insert product data into your prompt
                </p>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="title_count">Titles to Generate</Label>
                <Input
                  id="title_count"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.title_count}
                  onChange={(e) => setSettings({ ...settings, title_count: parseInt(e.target.value) || 3 })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of title variations the AI returns (1-10)
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Prompt'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSettings({ ...settings, title_prompt: DEFAULT_TITLE_PROMPT })}
                >
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Test ─────────────────────────────────────────────────────────────── */}
        <TabsContent value="test" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Sample Product Data
                </CardTitle>
                <CardDescription>
                  Enter product data to test title and description generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-title">Product Title</Label>
                  <Input
                    id="test-title"
                    value={testProduct.title}
                    onChange={(e) => setTestProduct({ ...testProduct, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-brand">Brand</Label>
                    <Input
                      id="test-brand"
                      value={testProduct.brand}
                      onChange={(e) => setTestProduct({ ...testProduct, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-price">Price</Label>
                    <Input
                      id="test-price"
                      value={testProduct.price}
                      onChange={(e) => setTestProduct({ ...testProduct, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-category">Category</Label>
                  <Input
                    id="test-category"
                    value={testProduct.category}
                    onChange={(e) => setTestProduct({ ...testProduct, category: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-description">Description</Label>
                  <Textarea
                    id="test-description"
                    value={testProduct.description}
                    onChange={(e) => setTestProduct({ ...testProduct, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-bullets">Bullet Points</Label>
                  <Textarea
                    id="test-bullets"
                    value={testProduct.bulletPoints}
                    onChange={(e) => setTestProduct({ ...testProduct, bulletPoints: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-specs">Specifications</Label>
                  <Textarea
                    id="test-specs"
                    value={testProduct.specifications}
                    onChange={(e) => setTestProduct({ ...testProduct, specifications: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleGenerateTitles} disabled={generatingTitles}>
                    {generatingTitles ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Generate Titles
                  </Button>
                  <Button variant="outline" onClick={handleGenerateDescription} disabled={generatingDescription}>
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
                  className="text-muted-foreground"
                >
                  Reset to Sample Data
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Generated Titles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedTitles.length > 0 ? (
                    <div className="space-y-3">
                      {generatedTitles.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group"
                        >
                          <Badge className={getRankBadgeColor(item.rank)}>
                            {item.rank}
                          </Badge>
                          <p className="flex-1 text-sm">{item.title}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(item.title, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <p>Click "Generate Titles" to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generated Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedDescription ? (
                    <div className="space-y-3">
                      <div
                        className="p-4 bg-muted/50 rounded-lg text-sm prose prose-sm max-w-none dark:prose-invert overflow-auto max-h-96"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedDescription) }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedDescription, -1)}
                      >
                        {copiedIndex === -1 ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy HTML
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <p>Click "Generate Description" to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Extension Control ─────────────────────────────────────────────────── */}
        <TabsContent value="extension-control" className="space-y-6">
          <AdminExtensionControl />
        </TabsContent>

        {/* ── Description Config ────────────────────────────────────────────────── */}
        <TabsContent value="description-config" className="space-y-6">
          <AdminDescriptionConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
