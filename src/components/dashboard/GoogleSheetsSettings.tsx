import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sheet, Save, CheckCircle, AlertCircle, ExternalLink, Copy, RefreshCw, ClipboardCopy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const GOOGLE_APPS_SCRIPT_CODE = `// Google Apps Script for SellerSuit Integration
// Deploy this as a Web App with "Anyone" access
// Supports: append (legacy), upsert (recommended), delete

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { action, sheetName, rows, uniqueColumn } = data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Add headers based on first row
      if (rows && rows.length > 0) {
        const headers = Object.keys(rows[0]);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      }
    }
    
    if (action === 'append') {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const existingData = sheet.getDataRange().getValues();
      const uniqueColIndex = headers.indexOf(uniqueColumn);
      
      // Get existing unique values
      const existingIds = new Set();
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][uniqueColIndex]) {
          existingIds.add(String(existingData[i][uniqueColIndex]));
        }
      }
      
      // Filter out duplicates
      const newRows = rows.filter(row => !existingIds.has(String(row[uniqueColumn])));
      
      if (newRows.length > 0) {
        const rowData = newRows.map(row => headers.map(h => row[h] || ''));
        sheet.getRange(sheet.getLastRow() + 1, 1, rowData.length, headers.length).setValues(rowData);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        added: newRows.length,
        skipped: rows.length - newRows.length,
        message: \`Added \${newRows.length} rows, skipped \${rows.length - newRows.length} duplicates\`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'upsert') {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const existingData = sheet.getDataRange().getValues();
      const uniqueColIndex = headers.indexOf(uniqueColumn);

      // Build index of existing rows by unique id
      const rowIndexById = {};
      for (let i = 1; i < existingData.length; i++) {
        const idVal = existingData[i][uniqueColIndex];
        if (idVal) rowIndexById[String(idVal)] = i + 1; // sheet rows are 1-based
      }

      let updated = 0;
      let added = 0;

      rows.forEach((row) => {
        const id = String(row[uniqueColumn]);
        const values = headers.map(h => row[h] || '');
        const existingRow = rowIndexById[id];
        if (existingRow) {
          sheet.getRange(existingRow, 1, 1, headers.length).setValues([values]);
          updated += 1;
        } else {
          sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([values]);
          added += 1;
        }
      });

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        added,
        updated,
        skipped: 0,
        message: \`Upserted \${rows.length} rows (added \${added}, updated \${updated})\`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'delete') {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const existingData = sheet.getDataRange().getValues();
      const uniqueColIndex = headers.indexOf(uniqueColumn);

      // Find rows matching ids and delete from bottom-up
      const rowsToDelete = [];
      for (let i = 1; i < existingData.length; i++) {
        const idVal = existingData[i][uniqueColIndex];
        if (!idVal) continue;
        const idStr = String(idVal);
        const shouldDelete = rows.some(r => String(r[uniqueColumn]) === idStr);
        if (shouldDelete) rowsToDelete.push(i + 1);
      }

      rowsToDelete.sort((a, b) => b - a).forEach(r => sheet.deleteRow(r));

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        deleted: rowsToDelete.length,
        message: \`Deleted \${rowsToDelete.length} rows\`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'SellerSuit Google Sheets Integration is active'
  })).setMimeType(ContentService.MimeType.JSON);
}`;

interface GoogleSheetsSettingsData {
  google_sheets_url?: string;
  auto_sync_listings?: boolean;
  auto_sync_orders?: boolean;
}

type InvokeResult = {
  data: any;
  error: any;
};

type ConnectionDebugInfo = {
  startedAt: string;
  scriptUrl: string;
  listings?: {
    result?: InvokeResult;
    data?: unknown;
    errorMessage?: string;
  };
  orders?: {
    result?: InvokeResult;
    data?: unknown;
    errorMessage?: string;
  };
};

export default function GoogleSheetsSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [scriptUrl, setScriptUrl] = useState('');
  const [autoSyncListings, setAutoSyncListings] = useState(false);
  const [autoSyncOrders, setAutoSyncOrders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [debugInfo, setDebugInfo] = useState<ConnectionDebugInfo | null>(null);

  useEffect(() => {
    if (profile?.settings) {
      const settings = profile.settings as GoogleSheetsSettingsData;
      setScriptUrl(settings.google_sheets_url || '');
      setAutoSyncListings(settings.auto_sync_listings || false);
      setAutoSyncOrders(settings.auto_sync_orders || false);
      setIsConnected(!!settings.google_sheets_url);
    }
  }, [profile]);

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && 
             url.includes('script.google.com/macros/s/') && 
             url.includes('/exec');
    } catch {
      return false;
    }
  };

  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const testConnection = async () => {
    if (!validateUrl(scriptUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Apps Script URL",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setDebugInfo({
      startedAt: new Date().toISOString(),
      scriptUrl,
    });
    
    try {
      // Send demo data to both sheets for testing via Edge Function
      const demoListing = {
        id: `demo_${Date.now()}`,
        title: 'Demo Product - Test Entry',
        asin: 'B0DEMO123',
        ebay_item_id: '1234567890',
        source_price: 29.99,
        sell_price: 49.99,
        profit: 20.00,
        quantity: 5,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const demoOrder = {
        id: `demo_order_${Date.now()}`,
        order_id: 'ORD-DEMO-001',
        buyer_name: 'Demo Buyer',
        item_title: 'Demo Product - Test Entry',
        sale_price: 49.99,
        source_cost: 29.99,
        profit: 20.00,
        status: 'completed',
        order_date: new Date().toISOString(),
      };

      console.log('Testing Google Sheets connection with URL:', scriptUrl);

      // Test with AMZ_Listings via Edge Function proxy
      let listingsResult: InvokeResult;
      try {
        // Use underscore alias to avoid Functions gateway JWT issues with hyphenated names.
        listingsResult = await supabase.functions.invoke('google_sheets_sync', {
          body: {
            scriptUrl,
            action: 'append',
            sheetName: 'AMZ_Listings',
            rows: [demoListing],
            uniqueColumn: 'id',
          },
        });
        console.log('Listings sync result:', listingsResult);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          listings: {
            result: listingsResult as InvokeResult,
            data: (listingsResult as InvokeResult)?.data,
          },
        }));
      } catch (invokeError) {
        console.error('Edge function invoke error:', invokeError);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          listings: {
            errorMessage: invokeError instanceof Error ? invokeError.message : String(invokeError),
          },
        }));
        throw new Error('Edge Function not available. Please wait a moment and try again.');
      }

      if (listingsResult.error) {
        console.error('Listings error details:', listingsResult.error);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          listings: {
            result: listingsResult as InvokeResult,
            data: (listingsResult as InvokeResult)?.data,
            errorMessage:
              (listingsResult as any)?.error?.message || JSON.stringify((listingsResult as any)?.error),
          },
        }));
        throw new Error(listingsResult.error.message || JSON.stringify(listingsResult.error));
      }

      // Test with AMZ_Orders via Edge Function proxy
      let ordersResult: InvokeResult;
      try {
         // Use underscore alias to avoid Functions gateway JWT issues with hyphenated names.
         ordersResult = await supabase.functions.invoke('google_sheets_sync', {
          body: {
            scriptUrl,
            action: 'append',
            sheetName: 'AMZ_Orders',
            rows: [demoOrder],
            uniqueColumn: 'id',
          },
        });
        console.log('Orders sync result:', ordersResult);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          orders: {
            result: ordersResult as InvokeResult,
            data: (ordersResult as InvokeResult)?.data,
          },
        }));
      } catch (invokeError) {
        console.error('Edge function invoke error:', invokeError);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          orders: {
            errorMessage: invokeError instanceof Error ? invokeError.message : String(invokeError),
          },
        }));
        throw new Error('Edge Function not available. Please wait a moment and try again.');
      }

      if (ordersResult.error) {
        console.error('Orders error details:', ordersResult.error);
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          orders: {
            result: ordersResult as InvokeResult,
            data: (ordersResult as InvokeResult)?.data,
            errorMessage: (ordersResult as any)?.error?.message || JSON.stringify((ordersResult as any)?.error),
          },
        }));
        throw new Error(ordersResult.error.message || JSON.stringify(ordersResult.error));
      }

      // Check if both were successful
      const listingsData = listingsResult.data;
      const ordersData = ordersResult.data;

      if (listingsData?.success === false || ordersData?.success === false) {
        setDebugInfo((prev) => ({
          ...(prev ?? { startedAt: new Date().toISOString(), scriptUrl }),
          listings: {
            ...(prev?.listings ?? {}),
            data: listingsData,
          },
          orders: {
            ...(prev?.orders ?? {}),
            data: ordersData,
          },
        }));
        throw new Error(listingsData?.error || ordersData?.error || 'Sync failed');
      }

      toast({
        title: "Demo Data Sent Successfully!",
        description: `Listings: ${listingsData?.added || 1} added. Orders: ${ordersData?.added || 1} added. Check your Google Sheets!`,
      });
      setIsConnected(true);
      setTestResult('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsConnected(false);
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    if (scriptUrl && !validateUrl(scriptUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Google Apps Script URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Merge with existing settings
      const existingSettings = (profile?.settings || {}) as Record<string, unknown>;
      const newSettings: Record<string, unknown> = {
        ...existingSettings,
        google_sheets_url: scriptUrl || undefined,
        auto_sync_listings: autoSyncListings,
        auto_sync_orders: autoSyncOrders,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          settings: newSettings,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error) throw error;

      setIsConnected(!!scriptUrl);
      toast({
        title: "Settings Saved",
        description: "Google Sheets integration settings updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    toast({
      title: "Copied!",
      description: "Google Apps Script code copied to clipboard",
    });
  };

  const copyDebugReport = async () => {
    if (!debugInfo) return;
    const report = {
      type: 'google_sheets_connection_test',
      ...debugInfo,
    };
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast({
      title: 'Copied!',
      description: 'Debug report copied to clipboard',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Sheet className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Google Sheets Integration
                {isConnected && <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Automatically sync listings and orders to Google Sheets
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Instructions */}
          <Accordion type="single" collapsible>
            <AccordionItem value="setup">
              <AccordionTrigger className="text-sm">
                Setup Instructions
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open Google Sheets and create a new spreadsheet</li>
                  <li>Go to Extensions → Apps Script</li>
                  <li>Delete any existing code and paste the script below</li>
                  <li>Click Deploy → New deployment</li>
                  <li>Select "Web app" as the type</li>
                  <li>Set "Execute as" to "Me"</li>
                  <li>Set "Who has access" to "Anyone"</li>
                  <li>Click Deploy and copy the Web App URL</li>
                </ol>
                
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={copyScriptCode}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="script-url">Google Apps Script URL</Label>
            <div className="flex gap-2">
              <Input
                id="script-url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className={isConnected ? 'border-green-500/50' : ''}
              />
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting || !scriptUrl}
                className={
                  testResult === 'success' 
                    ? 'border-green-500 text-green-600' 
                    : testResult === 'failed' 
                    ? 'border-destructive text-destructive' 
                    : ''
                }
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Sent!
                  </>
                ) : testResult === 'failed' ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Failed
                  </>
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            {scriptUrl && !validateUrl(scriptUrl) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Invalid URL format
              </p>
            )}
            {testResult === 'success' && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Demo data sent to AMZ_Listings and AMZ_Orders sheets
              </p>
            )}
            {testResult === 'failed' && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Connection failed - verify your script URL and deployment settings
              </p>
            )}
          </div>

          {/* Debug Details (only shown after test) */}
          {debugInfo && (
            <Accordion type="single" collapsible>
              <AccordionItem value="debug">
                <AccordionTrigger className="text-sm">
                  Debug details (last test)
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="flex items-center justify-end">
                    <Button size="sm" variant="secondary" onClick={copyDebugReport}>
                      <ClipboardCopy className="h-3 w-3 mr-1" />
                      Copy debug report
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><span className="font-medium">Started:</span> {debugInfo.startedAt}</div>
                    <div className="break-all"><span className="font-medium">URL:</span> {debugInfo.scriptUrl}</div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium">AMZ_Listings</div>
                      {debugInfo.listings?.errorMessage && (
                        <div className="text-xs text-destructive break-words">{debugInfo.listings.errorMessage}</div>
                      )}
                      <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-64">
{JSON.stringify(
  {
    invokeError: debugInfo.listings?.errorMessage ?? null,
    invokeResult: debugInfo.listings?.result ?? null,
    data: debugInfo.listings?.data ?? null,
  },
  null,
  2
)}
                      </pre>
                    </div>

                    <div>
                      <div className="text-xs font-medium">AMZ_Orders</div>
                      {debugInfo.orders?.errorMessage && (
                        <div className="text-xs text-destructive break-words">{debugInfo.orders.errorMessage}</div>
                      )}
                      <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-64">
{JSON.stringify(
  {
    invokeError: debugInfo.orders?.errorMessage ?? null,
    invokeResult: debugInfo.orders?.result ?? null,
    data: debugInfo.orders?.data ?? null,
  },
  null,
  2
)}
                      </pre>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tip: Look for <code>data.debug.upstream_status</code> and <code>data.debug.upstream_response_text</code> in the payload.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Auto-sync toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync Listings</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync new listings to Google Sheets
                </p>
              </div>
              <Switch
                checked={autoSyncListings}
                onCheckedChange={setAutoSyncListings}
                disabled={!isConnected}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync Orders</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sync new orders to Google Sheets
                </p>
              </div>
              <Switch
                checked={autoSyncOrders}
                onCheckedChange={setAutoSyncOrders}
                disabled={!isConnected}
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={saveSettings}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>

          {/* Help Link */}
          <a
            href="https://developers.google.com/apps-script/guides/web"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Learn more about Google Apps Script Web Apps
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
}
