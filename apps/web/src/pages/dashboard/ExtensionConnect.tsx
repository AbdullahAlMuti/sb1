import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Copy, 
  Check, 
  Chrome, 
  Key, 
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Package
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { toast } from "@repo/ui/hooks/use-toast";
import { downloadExtensionZip } from "@/utils/extensionDownloader";

export default function ExtensionConnect() {
  const { user, profile } = useAuth();
  const [token, setToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [testResults, setTestResults] = useState<{
    authStatus: 'pending' | 'success' | 'error';
    getListings: 'pending' | 'success' | 'error';
    dashboardOverview: 'pending' | 'success' | 'error';
  }>({
    authStatus: 'pending',
    getListings: 'pending',
    dashboardOverview: 'pending',
  });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    getToken();
  }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setToken(session.access_token);
    }
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    toast({
      title: "Token Copied",
      description: "Paste this in your extension's console to authenticate",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const testEndpoints = async () => {
    setIsTesting(true);
    setTestResults({
      authStatus: 'pending',
      getListings: 'pending',
      dashboardOverview: 'pending',
    });

    const baseUrl = "https://ojxzssooylmydystjvdo.supabase.co/functions/v1";

    // Test auth-status
    try {
      const res = await fetch(`${baseUrl}/auth-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResults(prev => ({ 
        ...prev, 
        authStatus: data.success ? 'success' : 'error' 
      }));
      if (import.meta.env.DEV) console.log('[Test] auth-status:', data);
    } catch (e) {
      setTestResults(prev => ({ ...prev, authStatus: 'error' }));
      console.error('[Test] auth-status error:', e);
    }

    // Test get-listings
    try {
      const res = await fetch(`${baseUrl}/get-listings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResults(prev => ({ 
        ...prev, 
        getListings: data.success ? 'success' : 'error' 
      }));
      if (import.meta.env.DEV) console.log('[Test] get-listings:', data);
    } catch (e) {
      setTestResults(prev => ({ ...prev, getListings: 'error' }));
      console.error('[Test] get-listings error:', e);
    }

    // Test dashboard-overview
    try {
      const res = await fetch(`${baseUrl}/dashboard-overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResults(prev => ({ 
        ...prev, 
        dashboardOverview: data.success ? 'success' : 'error' 
      }));
      if (import.meta.env.DEV) console.log('[Test] dashboard-overview:', data);
    } catch (e) {
      setTestResults(prev => ({ ...prev, dashboardOverview: 'error' }));
      console.error('[Test] dashboard-overview error:', e);
    }

    setIsTesting(false);
    toast({
      title: "Tests Complete",
      description: "Check the console for detailed results",
    });
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const extensionCode = `// Run this in your extension's background console to set the token:
chrome.storage.local.set({ saasToken: "${token}" }, () => {
  if (import.meta.env.DEV) console.log('✅ Token saved! Extension authenticated.');
});`;

  // Fix for SEC-02: The above template is displayed to users — ensure the
  // console.log is always reachable when pasted in extension devtools.
  const extensionCodeFixed = `// Run this in your extension's background console to set the token:
chrome.storage.local.set({ saasToken: "${token}" }, () => {
  console.log('✅ Token saved! Extension authenticated.');
});`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      toast({
        title: "Extension Downloaded!",
        description: "Extract the zip file and follow the setup instructions below.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Extension Connect</h1>
        <p className="text-muted-foreground">Download and connect your Chrome extension</p>
      </div>

      {/* Download Extension Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Download Extension
            </CardTitle>
            <CardDescription>
              Get the SellerSuit Chrome extension to automate your dropshipping workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">AI Titles</Badge>
              <Badge variant="secondary">AI Descriptions</Badge>
              <Badge variant="secondary">Image Editor</Badge>

              <Badge variant="secondary">Inventory Sync</Badge>
            </div>
            
            <Button 
              onClick={handleDownload} 
              disabled={isDownloading}
              size="lg"
              className="w-full sm:w-auto gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparing Download...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download Extension (ZIP)
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              After downloading, extract the zip file and follow the setup instructions below.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Token Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your Auth Token
            </CardTitle>
            <CardDescription>
              Use this token to authenticate your extension with the backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
              <Badge variant="outline" className="shrink-0">
                <Shield className="h-3 w-3 mr-1" />
                JWT
              </Badge>
              <code className="text-xs text-muted-foreground truncate flex-1">
                {token ? `${token.slice(0, 50)}...` : 'Loading...'}
              </code>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={copyToken}
                disabled={!token}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Quick Setup Code</Label>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  {extensionCodeFixed}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(extensionCodeFixed);
                    toast({ title: "Code copied!" });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Open your extension's service worker console (chrome://extensions → SellerSuit → Inspect views: service worker) and paste this code.
              </p>
            </div>

            <Button onClick={getToken} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Token
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Test Endpoints */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Test API Endpoints
            </CardTitle>
            <CardDescription>
              Verify that all extension endpoints are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.authStatus)}
                  <span className="text-sm font-medium">auth-status</span>
                </div>
                <code className="text-xs text-muted-foreground">GET /functions/v1/auth-status</code>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.getListings)}
                  <span className="text-sm font-medium">get-listings</span>
                </div>
                <code className="text-xs text-muted-foreground">GET /functions/v1/get-listings</code>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.dashboardOverview)}
                  <span className="text-sm font-medium">dashboard-overview</span>
                </div>
                <code className="text-xs text-muted-foreground">GET /functions/v1/dashboard-overview</code>
              </div>
            </div>

            <Button onClick={testEndpoints} disabled={isTesting || !token}>
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Test All Endpoints
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Setup Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-5 w-5" />
              Extension Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                <span>Open Chrome and go to <code className="bg-muted px-1 rounded">chrome://extensions</code></span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                <span>Enable "Developer mode" in the top right</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                <span>Click "Load unpacked" and select your extension folder</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">4</span>
                <span>Click "Inspect views: service worker" on your extension</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">5</span>
                <span>Paste the setup code from above in the console and press Enter</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">6</span>
                <span>Reload the extension - you should now be authenticated!</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
