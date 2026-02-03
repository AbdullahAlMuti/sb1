import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Sparkles, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  content: string;
  prompt_type: string;
}

interface GeneratedTitle {
  api: string;
  titles: string[];
  success: boolean;
  error?: string;
}

interface TitleGeneratorProps {
  productInfo?: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    keywords?: string[];
  };
  onSelectTitle?: (title: string) => void;
}

const AVAILABLE_APIS = [
  { id: 'gemini', name: 'Gemini', color: 'bg-blue-500' },
  { id: 'deepseek', name: 'Deepseek', color: 'bg-purple-500' },
  { id: 'openai', name: 'OpenAI', color: 'bg-green-500' },
];

export default function TitleGenerator({ productInfo, onSelectTitle }: TitleGeneratorProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedApis, setSelectedApis] = useState<string[]>(['gemini', 'deepseek']);
  const [results, setResults] = useState<GeneratedTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);
  
  const [productInput, setProductInput] = useState({
    title: productInfo?.title || '',
    description: productInfo?.description || '',
    keywords: productInfo?.keywords?.join(', ') || '',
    category: productInfo?.category || '',
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (productInfo) {
      setProductInput({
        title: productInfo.title || '',
        description: productInfo.description || '',
        keywords: productInfo.keywords?.join(', ') || '',
        category: productInfo.category || '',
      });
    }
  }, [productInfo]);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('prompt_type', 'title')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
      
      // Auto-select default prompt
      const defaultPrompt = data?.find(p => p.is_default);
      if (defaultPrompt) {
        setSelectedPromptId(defaultPrompt.id);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const handleApiToggle = (apiId: string) => {
    setSelectedApis(prev => 
      prev.includes(apiId)
        ? prev.filter(id => id !== apiId)
        : [...prev, apiId]
    );
  };

  const generateTitles = async () => {
    if (authLoading) return;

    // Refresh session before making the request (auto-verification like description generator)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      toast.error('Session expired. Please sign in again.');
      navigate('/auth');
      return;
    }

    if (selectedApis.length === 0) {
      toast.error('Please select at least one API');
      return;
    }

    if (!productInput.title && !productInput.description) {
      toast.error('Please provide product title or description');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: {
          productInfo: {
            title: productInput.title,
            description: productInput.description,
            keywords: productInput.keywords.split(',').map(k => k.trim()).filter(Boolean),
            category: productInput.category,
          },
          promptId: selectedPromptId || undefined,
          customPrompt: customPrompt || undefined,
          apis: selectedApis,
        },
      });

      if (error) {
        // When not authenticated, Supabase will send anon credentials which backend rejects.
        if (error.message?.toLowerCase().includes('unauthorized') || error.message?.includes('401')) {
          toast.error('Session expired. Please sign in again.');
          navigate('/auth');
          return;
        }
        throw error;
      }

      if (data?.success) {
        setResults(data.results);
        toast.success('Titles generated successfully');
      } else {
        const msg = data?.error || 'Failed to generate titles';
        if (String(msg).toLowerCase().includes('unauthorized')) {
          toast.error('Session expired. Please sign in again.');
          navigate('/auth');
          return;
        }
        toast.error(msg);
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error('Failed to generate titles');
    } finally {
      setLoading(false);
    }
  };

  const copyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    setCopiedTitle(title);
    toast.success('Title copied to clipboard');
    setTimeout(() => setCopiedTitle(null), 2000);
  };

  const selectTitle = (title: string) => {
    if (onSelectTitle) {
      onSelectTitle(title);
      toast.success('Title selected');
    } else {
      copyTitle(title);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Title Generator
        </CardTitle>
        <CardDescription>
          Generate SEO-optimized titles using multiple AI models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Product Title</Label>
            <Input
              value={productInput.title}
              onChange={(e) => setProductInput({ ...productInput, title: e.target.value })}
              placeholder="Enter product title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={productInput.category}
              onChange={(e) => setProductInput({ ...productInput, category: e.target.value })}
              placeholder="e.g., Electronics, Clothing..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keywords (comma-separated)</Label>
          <Input
            value={productInput.keywords}
            onChange={(e) => setProductInput({ ...productInput, keywords: e.target.value })}
            placeholder="e.g., wireless, bluetooth, premium..."
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={productInput.description}
            onChange={(e) => setProductInput({ ...productInput, description: e.target.value })}
            placeholder="Brief product description..."
            rows={3}
          />
        </div>

        {/* Prompt Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Prompt Template</Label>
            <Select value={selectedPromptId || "custom"} onValueChange={(val) => setSelectedPromptId(val === "custom" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a prompt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Use custom prompt</SelectItem>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Or Custom Prompt</Label>
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter custom prompt..."
              disabled={!!selectedPromptId}
            />
          </div>
        </div>

        {/* API Selection */}
        <div className="space-y-2">
          <Label>Select AI APIs</Label>
          <div className="flex flex-wrap gap-4">
            {AVAILABLE_APIS.map((api) => (
              <div key={api.id} className="flex items-center space-x-2">
                <Checkbox
                  id={api.id}
                  checked={selectedApis.includes(api.id)}
                  onCheckedChange={() => handleApiToggle(api.id)}
                />
                <label
                  htmlFor={api.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {api.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={generateTitles} disabled={loading} className="w-full">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Titles
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Generated Titles</h3>
            {results.map((result) => (
              <div key={result.api} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={AVAILABLE_APIS.find(a => a.id === result.api)?.color}>
                    {AVAILABLE_APIS.find(a => a.id === result.api)?.name}
                  </Badge>
                  {!result.success && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}
                </div>
                
                {result.success ? (
                  <div className="space-y-2">
                    {result.titles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg group"
                      >
                        <span className="text-sm flex-1 mr-4">{title}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyTitle(title)}
                          >
                            {copiedTitle === title ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {onSelectTitle && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => selectTitle(title)}
                            >
                              Use This
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
