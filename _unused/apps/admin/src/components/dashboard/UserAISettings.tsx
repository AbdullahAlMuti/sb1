import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Key, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Button } from '@repo/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { useToast } from '@repo/ui/hooks/use-toast';
import { supabase } from '@repo/api-client/supabase/client';

interface AISettings {
  api_key: string;
  provider: string;
  model: string;
}

const AI_PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Affordable)' },
      { id: 'gpt-4o', label: 'GPT-4o (Powerful)' },
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanced)' },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4 (Powerful)' },
    ]
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    models: [
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Powerful)' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Latest Fast)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest Powerful)' },
    ]
  },
  {
    id: 'lovable',
    label: 'Lovable AI (Free)',
    models: [
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    ]
  }
];

const DEFAULT_SETTINGS: AISettings = {
  api_key: '',
  provider: 'lovable',
  model: 'google/gemini-2.5-flash'
};

export default function UserAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      if (profile?.settings) {
        const profileSettings = profile.settings as Record<string, unknown>;
        setSettings({
          api_key: (profileSettings.ai_api_key as string) || '',
          provider: (profileSettings.ai_provider as string) || 'lovable',
          model: (profileSettings.ai_model as string) || 'google/gemini-2.5-flash'
        });
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current profile settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single();

      const currentSettings = (profile?.settings as Record<string, unknown>) || {};

      // Update with AI settings
      const updatedSettings = {
        ...currentSettings,
        ai_api_key: settings.api_key,
        ai_provider: settings.provider,
        ai_model: settings.model
      };

      const { error } = await supabase
        .from('profiles')
        .update({ settings: updatedSettings })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your AI settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (settings.provider === 'lovable') {
      setValidationStatus('valid');
      toast({
        title: 'Connection valid',
        description: 'Lovable AI is always available and ready to use.',
      });
      return;
    }

    if (!settings.api_key) {
      toast({
        title: 'API key required',
        description: 'Please enter your API key to test the connection.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setValidationStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: { 
          provider: settings.provider, 
          apiKey: settings.api_key,
          model: settings.model
        }
      });

      if (error) throw error;

      if (data?.success) {
        setValidationStatus('valid');
        toast({
          title: 'Connection successful',
          description: 'Your API key is valid and working.',
        });
      } else {
        setValidationStatus('invalid');
        toast({
          title: 'Connection failed',
          description: data?.error || 'Invalid API key. Please check and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setValidationStatus('invalid');
      toast({
        title: 'Test failed',
        description: 'Could not validate API key. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const getModelsForProvider = () => {
    const provider = AI_PROVIDERS.find(p => p.id === settings.provider);
    return provider?.models || [];
  };

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    const firstModel = provider?.models[0]?.id || '';
    setSettings(prev => ({
      ...prev,
      provider: providerId,
      model: firstModel,
      api_key: providerId === 'lovable' ? '' : prev.api_key
    }));
    setValidationStatus('idle');
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure your AI provider and model for generating descriptions and titles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {settings.provider === 'lovable' && (
              <p className="text-sm text-muted-foreground">
                Lovable AI is included free with your account. No API key required.
              </p>
            )}
          </div>

          {/* API Key Input */}
          {settings.provider !== 'lovable' && (
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={`Enter your ${AI_PROVIDERS.find(p => p.id === settings.provider)?.label} API key`}
                  value={settings.api_key}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, api_key: e.target.value }));
                    setValidationStatus('idle');
                  }}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {validationStatus === 'valid' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {validationStatus === 'invalid' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and used only for AI requests.
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {getModelsForProvider().map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || (settings.provider !== 'lovable' && !settings.api_key)}
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
