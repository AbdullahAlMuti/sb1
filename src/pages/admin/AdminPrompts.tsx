import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Save, X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Prompt {
  id: string;
  name: string;
  content: string;
  prompt_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const PROMPT_TYPES = [
  { value: 'title', label: 'Title Generation' },
  { value: 'description', label: 'Description Generation' },
  { value: 'seo', label: 'SEO Optimization' },
];

export default function AdminPrompts() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    prompt_type: 'title',
    is_default: false,
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('prompts')
          .update({
            name: formData.name,
            content: formData.content,
            prompt_type: formData.prompt_type,
            is_default: formData.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Prompt updated successfully');
      } else {
        const { error } = await supabase
          .from('prompts')
          .insert({
            name: formData.name,
            content: formData.content,
            prompt_type: formData.prompt_type,
            is_default: formData.is_default,
            user_id: user?.id,
          });

        if (error) throw error;
        toast.success('Prompt created successfully');
      }

      resetForm();
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt');
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setFormData({
      name: prompt.name,
      content: prompt.content,
      prompt_type: prompt.prompt_type,
      is_default: prompt.is_default || false,
    });
    setEditingId(prompt.id);
    setShowNew(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Prompt deleted successfully');
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      prompt_type: 'title',
      is_default: false,
    });
    setEditingId(null);
    setShowNew(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Prompts</h1>
          <p className="text-muted-foreground">Manage prompts for AI title and description generation</p>
        </div>
        {!showNew && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
        )}
      </div>

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Prompt' : 'Create New Prompt'}</CardTitle>
            <CardDescription>
              Define a prompt template for AI-powered content generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Electronics Title Generator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Prompt Type</Label>
                <Select
                  value={formData.prompt_type}
                  onValueChange={(value) => setFormData({ ...formData, prompt_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Prompt Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your prompt template here. Use {title}, {description}, {keywords}, {category} as placeholders..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {'{title}'}, {'{description}'}, {'{keywords}'}, {'{category}'}, {'{price}'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label htmlFor="is_default">Set as default for this type</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prompts created yet</p>
              <Button variant="link" onClick={() => setShowNew(true)}>
                Create your first prompt
              </Button>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      {prompt.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    <Badge variant="outline">
                      {PROMPT_TYPES.find(t => t.value === prompt.prompt_type)?.label || prompt.prompt_type}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(prompt)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(prompt.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {prompt.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
