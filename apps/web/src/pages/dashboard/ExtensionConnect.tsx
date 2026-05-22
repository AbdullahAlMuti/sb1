import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Copy, 
  Check, 
  Chrome, 
  Key, 
  AlertCircle,
  Download,
  Loader2,
  Package,
  Link as LinkIcon,
  Smartphone,
  ChevronDown,
  ShieldAlert,
  Info
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/ui/accordion";
import { supabase } from "@repo/api-client/supabase/client";
import { toast } from "@repo/ui/hooks/use-toast";
import { downloadExtensionZip } from "@/utils/extensionDownloader";

export default function ExtensionConnect() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const isConnectRequest = searchParams.get("connect") === "true";
  const requestBrowser = searchParams.get("browser") || "Unknown Browser";
  const requestVersion = searchParams.get("version") || "Unknown Version";

  const [isDownloading, setIsDownloading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [legacyToken, setLegacyToken] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Feature Flags
  const [flags, setFlags] = useState({
    extension_new_auth_enabled: false,
    extension_legacy_fallback_enabled: true,
    extension_pairing_fallback_enabled: true,
    extension_auto_connect_enabled: false,
    extension_bootstrap_v2_enabled: false,
  });
  const [flagsLoading, setFlagsLoading] = useState(true);

  useEffect(() => {
    fetchFeatureFlags();
    fetchLegacyToken();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      // Try to fetch from app_feature_flags if available
      const { data, error } = await supabase.from("app_feature_flags" as any).select("key, enabled");
      if (!error && data) {
        const newFlags = { ...flags };
        (data as any[]).forEach(flag => {
          if (flag.key in newFlags) {
            newFlags[flag.key as keyof typeof flags] = flag.enabled;
          }
        });
        setFlags(newFlags);
      }
    } catch (e) {
      console.warn("Could not fetch feature flags, using safe defaults", e);
    } finally {
      setFlagsLoading(false);
    }
  };

  const fetchLegacyToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setLegacyToken(session.access_token);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      toast({
        title: "Extension Downloaded!",
        description: "Extract the zip file and follow the setup instructions.",
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

  const handleAutoConnect = async () => {
    if (!requestId) return;
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://ojxzssooylmydystjvdo.supabase.co/functions/v1/extension-connect-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve connection");
      }
      
      toast({
        title: "Connection Approved!",
        description: "You can now return to the extension.",
      });
      
      // Optionally redirect or clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err.message || "Could not approve the connection request.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePairingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pairingCode.length !== 6) {
      toast({ title: "Invalid Code", description: "Pairing code must be 6 digits.", variant: "destructive" });
      return;
    }
    
    setIsPairing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://ojxzssooylmydystjvdo.supabase.co/functions/v1/extension-pairing-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ pairingCode })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve pairing");
      }
      
      toast({
        title: "Pairing Successful!",
        description: "Your device is now securely paired.",
      });
      setPairingCode("");
    } catch (err: any) {
      toast({
        title: "Pairing Failed",
        description: err.message || "Could not approve the pairing code.",
        variant: "destructive",
      });
    } finally {
      setIsPairing(false);
    }
  };

  const copyLegacyToken = async () => {
    await navigator.clipboard.writeText(legacyToken);
    setCopied(true);
    toast({
      title: "Token Copied",
      description: "Paste this into your extension's console.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const legacyExtensionCode = `// Run this in your extension's background console to set the token:
chrome.storage.local.set({ saasToken: "${legacyToken}" }, () => {
  console.log('✅ Token saved! Extension authenticated.');
});`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Connect Chrome Extension</h1>
        <p className="text-muted-foreground">Connect your extension to your SellerSuit account securely.</p>
      </div>

      {/* Feature Flags Loading State */}
      {flagsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Alert if new auth is globally disabled */}
          {!flags.extension_new_auth_enabled && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Setup Ready / Backend Prepared</h3>
                <p className="text-xs mt-1">The new secure authentication backend is prepared but currently disabled in production. You can still use the legacy connection method.</p>
              </div>
            </div>
          )}

          {/* Download Extension Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Install Extension
                </CardTitle>
                <CardDescription>
                  Get the SellerSuit Chrome extension to automate your workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloading}
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                >
                  {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  Download Extension (ZIP)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Install the extension, open it, and click "Continue with SellerSuit".
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Primary Connect Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Extension Connect
                </CardTitle>
                <CardDescription>
                  Approve connection requests initiated from your browser extension
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isConnectRequest && requestId ? (
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">New Device Request</h4>
                        <p className="text-xs text-muted-foreground">Approve this extension to access your account</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-background rounded p-2 border">
                        <span className="text-muted-foreground block mb-1">Browser</span>
                        <span className="font-medium">{requestBrowser}</span>
                      </div>
                      <div className="bg-background rounded p-2 border">
                        <span className="text-muted-foreground block mb-1">Extension Version</span>
                        <span className="font-medium">{requestVersion}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleAutoConnect} 
                      disabled={isConnecting || !flags.extension_new_auth_enabled}
                    >
                      {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Approve Connection
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Chrome className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No pending connection requests.</p>
                    <p className="text-xs mt-1">Open the extension and click "Continue with SellerSuit" to start.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pairing Fallback Card */}
          {flags.extension_pairing_fallback_enabled && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Pairing Code
                  </CardTitle>
                  <CardDescription>
                    Enter the 6-digit code displayed in your extension to manually pair your device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePairingSubmit} className="flex gap-3">
                    <Input 
                      placeholder="e.g. 123456" 
                      maxLength={6}
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
                      className="text-lg tracking-widest font-mono uppercase max-w-[200px]"
                    />
                    <Button type="submit" disabled={isPairing || pairingCode.length !== 6 || !flags.extension_new_auth_enabled}>
                      {isPairing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Pairing"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Connected Devices Placeholder */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5" />
                  Connected Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                  Connected devices will appear here after full extension integration.
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Troubleshooting Accordion */}
          <Accordion type="single" collapsible className="w-full bg-card border rounded-lg overflow-hidden">
            <AccordionItem value="troubleshooting" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Troubleshooting & Help</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 mt-2">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Extension not detected?</strong> Ensure the extension is fully installed and enabled in chrome://extensions.</p>
                    <p><strong>Using a different Chrome profile?</strong> The extension must be installed in the same Chrome profile you are using to browse this dashboard.</p>
                    <p><strong>Still having issues?</strong> Try the pairing code fallback above, or contact our support team.</p>
                  </div>

                  {flags.extension_legacy_fallback_enabled && (
                    <div className="mt-6 border border-destructive/20 rounded-lg overflow-hidden">
                      <div className="bg-destructive/5 p-3 border-b border-destructive/10 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">Emergency legacy setup — temporary</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground font-medium">
                          WARNING: This method is less secure and will be deprecated soon. Only use this if instructed by support.
                        </p>
                        <div className="space-y-2">
                          <Label className="text-xs">Quick Setup Code</Label>
                          <div className="relative">
                            <pre className="p-3 bg-muted rounded border text-xs overflow-x-auto whitespace-pre-wrap">
                              {legacyExtensionCode}
                            </pre>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute top-1.5 right-1.5 h-7"
                              onClick={() => {
                                navigator.clipboard.writeText(legacyExtensionCode);
                                toast({ title: "Legacy code copied!" });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Open your extension's service worker console and paste this code.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
}
