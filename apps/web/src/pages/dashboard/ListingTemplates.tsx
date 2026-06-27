import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Eye, Check, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { toast } from 'sonner';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { 
  getListingTemplates, 
  getSelectedListingTemplateId, 
  selectListingTemplate,
  ListingTemplate 
} from '@/utils/listingTemplates';

export default function ListingTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ListingTemplate | null>(null);

  useEffect(() => {
    // Load available templates
    setTemplates(getListingTemplates());
    
    // Load currently selected template
    const activeId = getSelectedListingTemplateId();
    setSelectedId(activeId);
    
    // Attempt to fetch selection from database if user is logged in
    if (user) {
      fetchSelectedTemplateFromDb();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSelectedTemplateFromDb = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data?.settings) {
        const settings = data.settings as Record<string, any>;
        if (settings.selected_listing_template_id) {
          setSelectedId(settings.selected_listing_template_id);
          // Sync back to localStorage if different
          if (localStorage.getItem('selected_listing_template_id') !== settings.selected_listing_template_id) {
            localStorage.setItem('selected_listing_template_id', settings.selected_listing_template_id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching template from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    if (templateId === selectedId) return;

    setSelectingId(templateId);
    try {
      // 1. Update local state and localStorage
      selectListingTemplate(templateId);
      setSelectedId(templateId);

      // 2. Sync to Supabase if user is logged in
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();

        const currentSettings = (profile?.settings as Record<string, any>) || {};
        const updatedSettings = {
          ...currentSettings,
          selected_listing_template_id: templateId
        };

        const { error } = await supabase
          .from('profiles')
          .update({ settings: updatedSettings })
          .eq('id', user.id);

        if (error) throw error;
      }

      toast.success('Listing template updated successfully!');
    } catch (err: any) {
      console.error('Error saving template selection:', err);
      toast.error('Failed to save template selection to database, but it is active locally.');
    } finally {
      setSelectingId(null);
    }
  };

  const getDummyPreviewData = (templateHtml: string) => {
    return templateHtml
      .replace(/{title}/g, 'Premium Wireless Noise-Cancelling Headphones')
      .replace(/{description}/g, 'Experience music like never before with industry-leading active noise cancellation, extraordinary sound performance, and up to 40 hours of battery life. Ergonomically designed with memory foam earcups for all-day comfort.')
      .replace(/{features}/g, '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;"><li><strong>Industry-Leading ANC:</strong> Block external sounds with advanced hybrid active noise cancelling technology.</li><li><strong>High-Fidelity Sound:</strong> Custom drivers deliver deep bass and crystal-clear highs.</li><li><strong>40-Hour Battery Life:</strong> Fast charging capability gives 5 hours of playback with just a 10-minute charge.</li><li><strong>Crystal Clear Calls:</strong> 4 beamforming microphones with wind-noise reduction.</li></ul>')
      .replace(/{specifications}/g, '<table style="width: 100%; border-collapse: collapse; font-size: 14px;"><tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>Brand</strong></td><td style="padding: 8px; border: 1px solid #ddd;">SoundAura</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Model</strong></td><td style="padding: 8px; border: 1px solid #ddd;">ANC-300X</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Connectivity</strong></td><td style="padding: 8px; border: 1px solid #ddd;">Bluetooth 5.2, 3.5mm Aux</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Weight</strong></td><td style="padding: 8px; border: 1px solid #ddd;">250g</td></tr></table>');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Listing Template</h1>
        <p className="text-muted-foreground mt-1">
          Choose a description template for your eBay listings.
        </p>
      </motion.div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          const isSelecting = selectingId === template.id;
          
          return (
            <Card 
              key={template.id} 
              className={`flex flex-col border border-border/50 bg-card/60 backdrop-blur-md transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold truncate">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {template.description}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={isSelected ? "default" : "secondary"}
                    className={isSelected ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"}
                  >
                    {isSelected ? 'Active' : template.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 pb-4">
                {/* Visual Representation of the template layout */}
                <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-4 h-40 flex flex-col justify-between select-none pointer-events-none opacity-80">
                  {/* Mock Header Block */}
                  <div className="h-3 bg-blue-400 dark:bg-blue-600 rounded-full w-2/3 mx-auto mb-3" />
                  
                  {/* Mock Description Block */}
                  <div className="space-y-2 flex-1 mt-2">
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                  </div>
                  
                  {/* Mock Policy Footer Blocks */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded p-1 flex items-center justify-center">
                      <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-4/5" />
                    </div>
                    <div className="h-6 bg-slate-200/50 dark:bg-slate-800/50 rounded p-1 flex items-center justify-center">
                      <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-4/5" />
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="grid grid-cols-2 gap-3 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPreviewTemplate(template)}
                  className="w-full flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                
                <Button 
                  size="sm" 
                  onClick={() => handleSelectTemplate(template.id)}
                  disabled={isSelected || isSelecting || template.status !== 'Available'}
                  className={`w-full flex items-center gap-2 ${
                    isSelected 
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white cursor-default' 
                      : ''
                  }`}
                >
                  {isSelecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : isSelected ? (
                    <>
                      <Check className="h-4 w-4" />
                      Active
                    </>
                  ) : (
                    'Use Template'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {/* Coming Soon template place-holder card */}
        <Card className="flex flex-col border border-dashed border-border/70 bg-card/20 backdrop-blur-sm opacity-60">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-muted-foreground">
                  Bold Modern Template
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  A high-converting listing template featuring accent color blocks.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pb-4 flex items-center justify-center">
            <div className="text-center text-muted-foreground py-6">
              <LayoutTemplate className="h-8 w-8 mx-auto stroke-1 mb-2 opacity-55" />
              <p className="text-xs">More premium templates are being designed.</p>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button variant="ghost" disabled className="w-full text-xs">
              Not Available
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 mt-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">About eBay Templates</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Listing templates determine the visual style of your eBay description sections when listing new items.
              Your selected template is automatically applied during the description generation flow inside the SellerSuit Chrome Extension.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Preview: {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              This is how your listing will render on eBay using mock product details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-100 dark:bg-slate-950 rounded-xl border border-border/40 min-h-[300px]">
            {previewTemplate && (
              <div 
                className="bg-white p-4 rounded-lg shadow-sm"
                dangerouslySetInnerHTML={{ __html: getDummyPreviewData(previewTemplate.htmlContent) }} 
              />
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close Preview
            </Button>
            {previewTemplate && selectedId !== previewTemplate.id && (
              <Button 
                onClick={() => {
                  handleSelectTemplate(previewTemplate.id);
                  setPreviewTemplate(null);
                }}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Use This Template
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
