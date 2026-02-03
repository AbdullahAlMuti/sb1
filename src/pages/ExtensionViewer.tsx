import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  FileCode, 
  Settings, 
  Chrome, 
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Download,
  Loader2,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { downloadExtensionZip } from "@/utils/extensionDownloader";

const extensionStructure = {
  root: [
    { name: "manifest.json", type: "config", description: "Extension configuration" },
    { name: "background.js", type: "js", description: "Service worker for background tasks" },
    { name: "popup.html", type: "html", description: "Extension popup window" },
    { name: "popup.js", type: "js", description: "Popup logic" },
    { name: "popup.css", type: "css", description: "Popup styles" },
    { name: "options.html", type: "html", description: "Options page" },
  ],
  common: [
    { name: "analytics.js", type: "js", description: "Analytics utilities" },
    { name: "config.js", type: "js", description: "Configuration constants" },
    { name: "description-generator.js", type: "js", description: "AI description generation" },
    { name: "editor-tools.js", type: "js", description: "Image editor tools" },
    { name: "editor_core.js", type: "js", description: "Core editor functionality" },
    { name: "message-handler.js", type: "js", description: "Message handling system" },
    { name: "performance.js", type: "js", description: "Performance utilities" },
    { name: "saas_auth.js", type: "js", description: "SaaS authentication" },
    { name: "storage.js", type: "js", description: "Chrome storage utilities" },
    { name: "sync_utils.js", type: "js", description: "Sync utilities" },
    { name: "ui.js", type: "js", description: "UI utilities" },
    { name: "undo-manager.js", type: "js", description: "Undo/redo functionality" },
  ],
  content_scripts: [
    { name: "amazon_injector.js", type: "js", description: "Amazon page integration" },
    { name: "auth_sync.js", type: "js", description: "Auth synchronization" },
    { name: "auto_order_executor.js", type: "js", description: "Auto order execution" },
    { name: "dailyfindz_automator.js", type: "js", description: "DailyFindz automation" },
    { name: "description_paster.js", type: "js", description: "Description paste helper" },
    { name: "ebay_lister.js", type: "js", description: "eBay listing functionality" },
    { name: "ebay_order_scraper.js", type: "js", description: "eBay order scraping" },
    { name: "image_editor.js", type: "js", description: "Image editing on pages" },
    { name: "walmart_injector.js", type: "js", description: "Walmart page integration" },
  ],
  ui: [
    { name: "editor-popup.html", type: "html", description: "Editor popup" },
    { name: "editor-popup.css", type: "css", description: "Editor popup styles" },
    { name: "editor_frame.html", type: "html", description: "Editor iframe" },
    { name: "panel.html", type: "html", description: "Side panel" },
    { name: "panel.css", type: "css", description: "Panel styles" },
  ],
  src: [
    { name: "automation-clean.js", type: "js", description: "Clean automation scripts" },
    { name: "image-uploader.js", type: "js", description: "Image upload handling" },
    { name: "item-filler.js", type: "js", description: "Form filling utilities" },
  ],
};

const installSteps = [
  "Download the extension using the button above",
  "Extract the zip file to a folder on your computer",
  "Open Chrome and navigate to chrome://extensions",
  "Enable 'Developer mode' in the top right corner",
  "Click 'Load unpacked' button",
  "Select the 'sellersuit-extension' folder from the extracted files",
  "The extension should now appear in your extensions list",
  "Pin the extension to your toolbar for easy access",
];

export default function ExtensionViewer() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
      toast.success("Extension downloaded! Extract the zip and follow the installation instructions.");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download extension. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success("Path copied to clipboard");
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "config":
        return <Settings className="h-4 w-4 text-yellow-500" />;
      case "js":
        return <FileCode className="h-4 w-4 text-yellow-400" />;
      case "html":
        return <FileCode className="h-4 w-4 text-orange-500" />;
      case "css":
        return <FileCode className="h-4 w-4 text-blue-500" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      config: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      js: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
      html: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      css: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Chrome className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Chrome Extension</h1>
                <p className="text-sm text-muted-foreground">
                  Download and install the SellerSuit extension
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            size="lg"
            className="gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Extension
              </>
            )}
          </Button>
        </div>

        {/* Download Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">SellerSuit Chrome Extension</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Automate your Amazon to eBay dropshipping workflow with AI-powered listings, 
                  image editing, inventory sync, and more.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">AI Titles</Badge>
                  <Badge variant="secondary">AI Descriptions</Badge>
                  <Badge variant="secondary">Image Editor</Badge>
                  <Badge variant="secondary">Auto Orders</Badge>
                  <Badge variant="secondary">Inventory Sync</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="structure" className="space-y-4">
          <TabsList>
            <TabsTrigger value="structure">File Structure</TabsTrigger>
            <TabsTrigger value="install">Installation Guide</TabsTrigger>
            <TabsTrigger value="test">Test Endpoints</TabsTrigger>
          </TabsList>

          {/* File Structure Tab */}
          <TabsContent value="structure" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(extensionStructure).map(([folder, files]) => (
                <Card key={folder}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {folder === "root" ? "chrome_extension/" : `chrome_extension/${folder}/`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group"
                          >
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              <div>
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getTypeBadge(file.type)}`}
                              >
                                {file.type.toUpperCase()}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() =>
                                  copyPath(
                                    folder === "root"
                                      ? `chrome_extension/${file.name}`
                                      : `chrome_extension/${folder}/${file.name}`
                                  )
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Installation Guide Tab */}
          <TabsContent value="install">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  How to Install the Extension
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Download Button at top */}
                <div className="mb-6 p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">Step 1: Download the Extension</p>
                    <p className="text-sm text-muted-foreground">Click the button to download the extension zip file</p>
                  </div>
                  <Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download ZIP
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  {installSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{step}</p>
                      </div>
                      {index === 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText("chrome://extensions");
                            setCopiedStep(2);
                            setTimeout(() => setCopiedStep(null), 2000);
                            toast.success("URL copied!");
                          }}
                        >
                          {copiedStep === 2 ? (
                            <Check className="h-4 w-4 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          Copy URL
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Troubleshooting Section */}
                <div className="mt-6 p-4 border border-dashed rounded-lg">
                  <h4 className="font-medium mb-2">Troubleshooting</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Make sure all files are extracted to a folder</li>
                    <li>• Select the "sellersuit-extension" folder, not the zip file</li>
                    <li>• Check that manifest.json is in the root of the folder</li>
                    <li>• If you see errors, try refreshing the extension page</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Endpoints Tab */}
          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints Used by Extension</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "auth-status", method: "GET", description: "Check authentication status" },
                    { name: "get-listings", method: "GET", description: "Fetch user listings" },
                    { name: "dashboard-overview", method: "GET", description: "Get dashboard stats" },
                    { name: "generate-description", method: "POST", description: "Generate AI descriptions" },
                    { name: "sync-listing", method: "POST", description: "Sync listing data" },
                  ].map((endpoint) => (
                    <div
                      key={endpoint.name}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={endpoint.method === "GET" ? "secondary" : "default"}
                        >
                          {endpoint.method}
                        </Badge>
                        <div>
                          <p className="font-mono text-sm">/functions/v1/{endpoint.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {endpoint.description}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
