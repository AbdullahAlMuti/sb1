import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Terminal, AlertTriangle, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DeveloperSettings() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem("SB_URL_OVERRIDE");
    const savedKey = localStorage.getItem("SB_KEY_OVERRIDE");
    if (savedUrl) setUrl(savedUrl);
    if (savedKey) setKey(savedKey);
    setIsLocalMode(!!savedUrl || !!savedKey);
  }, []);

  const handleSave = () => {
    if (!url && !key) {
      handleClear();
      return;
    }
    
    localStorage.setItem("SB_URL_OVERRIDE", url);
    localStorage.setItem("SB_KEY_OVERRIDE", key);
    toast.success("Local Supabase overrides saved. Reloading page...");
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleClear = () => {
    localStorage.removeItem("SB_URL_OVERRIDE");
    localStorage.removeItem("SB_KEY_OVERRIDE");
    setUrl("");
    setKey("");
    setIsLocalMode(false);
    toast.info("Overrides cleared. Reverting to default Supabase. Reloading...");
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className={`border-amber-500/20 shadow-lg transition-all ${isLocalMode ? 'bg-amber-500/5 ring-1 ring-amber-500/30' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-amber-500" />
            Localhost Debug Mode
          </CardTitle>
          <CardDescription>
            Override Supabase credentials for local backend development and testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLocalMode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 text-sm mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Warning:</strong> You are using custom Supabase credentials. 
                This will prevent connection to the production database.
              </span>
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="local-url">Supabase Local URL</Label>
              <Input
                id="local-url"
                placeholder="http://127.0.0.1:54321"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-key">Supabase Anon/Public Key</Label>
              <Input
                id="local-key"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button 
              onClick={handleSave} 
              variant="hero" 
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white border-none"
            >
              <Save className="h-4 w-4 mr-2" />
              Enable Local Mode
            </Button>
            {isLocalMode && (
              <Button 
                onClick={handleClear} 
                variant="outline" 
                size="sm"
                className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            )}
          </div>
          
          <p className="text-[10px] text-muted-foreground italic">
            Note: Page will automatically reload after saving to apply changes.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
