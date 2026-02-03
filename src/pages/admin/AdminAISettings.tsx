import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Key, Brain, Wand2, RefreshCw, FileText } from "lucide-react";

interface AISettings {
  provider: string;
  openai_api_key: string;
  model: string;
  title_prompt: string;
  description_prompt: string;
}

const AVAILABLE_MODELS = [
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-5',
  'gpt-4o-mini',
  'gpt-4o',
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

const DEFAULT_SETTINGS: AISettings = {
  provider: 'lovable',
  openai_api_key: '',
  model: 'gpt-5-nano',
  title_prompt: DEFAULT_TITLE_PROMPT,
  description_prompt: DEFAULT_DESCRIPTION_PROMPT,
};

export default function AdminAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['ext_ai_provider', 'ext_ai_api_key', 'ext_ai_model', 'ext_title_prompt', 'ext_description_prompt']);

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap: Record<string, string> = {};
        data.forEach((item) => {
          settingsMap[item.key] = item.value || '';
        });

        setSettings({
          provider: settingsMap['ext_ai_provider'] || DEFAULT_SETTINGS.provider,
          openai_api_key: settingsMap['ext_ai_api_key'] || '',
          model: settingsMap['ext_ai_model'] || DEFAULT_SETTINGS.model,
          title_prompt: settingsMap['ext_title_prompt'] || DEFAULT_SETTINGS.title_prompt,
          description_prompt: settingsMap['ext_description_prompt'] || DEFAULT_SETTINGS.description_prompt,
        });
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
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
        saveSetting('ext_ai_provider', settings.provider),
        saveSetting('ext_ai_api_key', settings.openai_api_key),
        saveSetting('ext_ai_model', settings.model),
        saveSetting('ext_title_prompt', settings.title_prompt),
        saveSetting('ext_description_prompt', settings.description_prompt),
      ]);
      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save AI settings');
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
      if (data?.success && data?.titles) {
        toast.success(`AI connection successful! Provider: ${data.provider}, Model: ${data.model}`);
      } else if (data?.error) {
        toast.error(data.error);
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

  const hasApiKey = settings.openai_api_key && settings.openai_api_key.startsWith('sk-') && settings.openai_api_key.length > 20;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Settings</h1>
        <p className="text-muted-foreground">Configure AI provider, model, and prompts for content generation</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API Config
          </TabsTrigger>
          <TabsTrigger value="title-prompt" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Title Prompt
          </TabsTrigger>
          <TabsTrigger value="description-prompt" className="gap-2">
            <FileText className="h-4 w-4" />
            Description Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                OpenAI API Configuration
              </CardTitle>
              <CardDescription>
                Configure your OpenAI API key to use GPT-5 Nano for AI generation.
                {!hasApiKey && " Without an API key, the system will use Lovable AI Gateway as fallback."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select
                    value={settings.provider}
                    onValueChange={(value) => setSettings({ ...settings, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lovable">
                        <div className="flex items-center gap-2">
                          Lovable AI Gateway
                          <Badge variant="secondary" className="ml-1">Default</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">
                        Direct OpenAI API
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {settings.provider === 'openai'
                      ? 'Uses your OpenAI API key for direct calls (requires valid API key below)'
                      : 'Uses Lovable AI Gateway (may have rate limits)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai_api_key" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    OpenAI API Key
                  </Label>
                  <Input
                    id="openai_api_key"
                    type="password"
                    value={settings.openai_api_key}
                    onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                    placeholder="sk-..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {hasApiKey ? (
                      <span className="text-primary">✓ API key configured - using direct OpenAI calls</span>
                    ) : (
                      <span className="text-destructive">No API key - using Lovable AI Gateway (may have rate limits)</span>
                    )}
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
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          <div className="flex items-center gap-2">
                            {model}
                            {model === 'gpt-5-nano' && (
                              <Badge variant="secondary" className="ml-1">Recommended</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    GPT-5 Nano is the fastest and most cost-effective option
                  </p>
                </div>
              </div>

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

        <TabsContent value="title-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Title Generation Prompt
              </CardTitle>
              <CardDescription>
                Customize the prompt used to generate AI product titles
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

        <TabsContent value="description-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description Generation Prompt
              </CardTitle>
              <CardDescription>
                Customize the prompt used to generate eBay product descriptions from Amazon data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description-prompt">Prompt Template</Label>
                <Textarea
                  id="description-prompt"
                  value={settings.description_prompt}
                  onChange={(e) => setSettings({ ...settings, description_prompt: e.target.value })}
                  rows={20}
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{'{title}'}</Badge>
                  <Badge variant="outline">{'{description}'}</Badge>
                  <Badge variant="outline">{'{brand}'}</Badge>
                  <Badge variant="outline">{'{category}'}</Badge>
                  <Badge variant="outline">{'{bulletPoints}'}</Badge>
                  <Badge variant="outline">{'{features}'}</Badge>
                  <Badge variant="outline">{'{specifications}'}</Badge>
                  <Badge variant="outline">{'{condition}'}</Badge>
                  <Badge variant="outline">{'{price}'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use placeholders above to insert Amazon product data into your prompt
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Prompt'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSettings({ ...settings, description_prompt: DEFAULT_DESCRIPTION_PROMPT })}
                >
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
