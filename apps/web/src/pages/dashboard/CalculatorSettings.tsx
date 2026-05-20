import { useState, useEffect } from "react";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { supabase } from "@repo/api-client/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { toast } from "sonner";
import { Calculator, Save, RotateCcw, DollarSign, Percent } from "lucide-react";

interface CalculatorSettingsData {
  tax_percent: number;
  tracking_fee: number;
  ebay_fee_percent: number;
  promotional_fee_percent: number;
  desired_profit_percent: number;
}

const defaultSettings: CalculatorSettingsData = {
  tax_percent: 9.0,
  tracking_fee: 0.20,
  ebay_fee_percent: 20.0,
  promotional_fee_percent: 10.0,
  desired_profit_percent: 15.0,
};

export default function CalculatorSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CalculatorSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [amazonPrice, setAmazonPrice] = useState<number>(5.99);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase
        .from("calculator_settings" as any)
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle() as any);

      if (error) throw error;

      if (data) {
        const settingsData = data as any;
        setSettings({
          tax_percent: Number(settingsData.tax_percent),
          tracking_fee: Number(settingsData.tracking_fee),
          ebay_fee_percent: Number(settingsData.ebay_fee_percent),
          promotional_fee_percent: Number(settingsData.promotional_fee_percent),
          desired_profit_percent: Number(settingsData.desired_profit_percent),
        });
      }
    } catch (error) {
      console.error("Error fetching calculator settings:", error);
      toast.error("Failed to load calculator settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase
        .from("calculator_settings" as any)
        .upsert({
          user_id: user.id,
          tax_percent: settings.tax_percent,
          tracking_fee: settings.tracking_fee,
          ebay_fee_percent: settings.ebay_fee_percent,
          promotional_fee_percent: settings.promotional_fee_percent,
          desired_profit_percent: settings.desired_profit_percent,
        }, {
          onConflict: 'user_id'
        }) as any);

      if (error) throw error;

      toast.success("Calculator settings saved successfully!");
    } catch (error) {
      console.error("Error saving calculator settings:", error);
      toast.error("Failed to save calculator settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast.info("Settings reset to defaults");
  };

  const updateSetting = (key: keyof CalculatorSettingsData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSettings((prev) => ({ ...prev, [key]: numValue }));
  };

  // Calculate the final eBay price based on current settings
  const calculateEbayPrice = () => {
    const taxAmount = amazonPrice * (settings.tax_percent / 100);
    const subtotal = amazonPrice + taxAmount + settings.tracking_fee;
    const totalFeePercent = settings.ebay_fee_percent + settings.promotional_fee_percent + settings.desired_profit_percent;
    const finalPrice = subtotal / (1 - totalFeePercent / 100);
    return finalPrice.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calculator Settings</h1>
        <p className="text-muted-foreground">
          Configure your default eBay price calculator values for the extension
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Default Calculator Values
            </CardTitle>
            <CardDescription>
              These values will be used as defaults in the Chrome extension calculator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_percent" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Tax %
              </Label>
              <Input
                id="tax_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.tax_percent}
                onChange={(e) => updateSetting("tax_percent", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking_fee" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Tracking Fee ($)
              </Label>
              <Input
                id="tracking_fee"
                type="number"
                step="0.01"
                min="0"
                value={settings.tracking_fee}
                onChange={(e) => updateSetting("tracking_fee", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ebay_fee_percent" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                eBay Fee %
              </Label>
              <Input
                id="ebay_fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.ebay_fee_percent}
                onChange={(e) => updateSetting("ebay_fee_percent", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotional_fee_percent" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Promotional Fee %
              </Label>
              <Input
                id="promotional_fee_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.promotional_fee_percent}
                onChange={(e) => updateSetting("promotional_fee_percent", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desired_profit_percent" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Desired Profit %
              </Label>
              <Input
                id="desired_profit_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.desired_profit_percent}
                onChange={(e) => updateSetting("desired_profit_percent", e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Preview
            </CardTitle>
            <CardDescription>
              Test your settings with a sample Amazon price
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amazon_price">Amazon Price ($)</Label>
              <Input
                id="amazon_price"
                type="number"
                step="0.01"
                min="0"
                value={amazonPrice}
                onChange={(e) => setAmazonPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amazon Price:</span>
                <span>${amazonPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({settings.tax_percent}%):</span>
                <span>+${(amazonPrice * settings.tax_percent / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tracking Fee:</span>
                <span>+${settings.tracking_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">eBay Fee ({settings.ebay_fee_percent}%):</span>
                <span className="text-muted-foreground">included</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Promotional Fee ({settings.promotional_fee_percent}%):</span>
                <span className="text-muted-foreground">included</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desired Profit ({settings.desired_profit_percent}%):</span>
                <span className="text-muted-foreground">included</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Final eBay Price:</span>
                  <span className="text-primary">${calculateEbayPrice()}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The Chrome extension will use these default values when opening the calculator.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
