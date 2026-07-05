import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Switch } from "@repo/ui/components/ui/switch";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "sonner";
import {
  REGIONS,
  SUPPLIERS,
  calculateProfitSummary,
  calculateSingleFee,
  getDefaultLogicBySupplier,
  saveCalculatorLogic,
  loadCalculatorLogic,
  EBAY_CATEGORIES,
  type FeeRow,
  type EbayCategory,
} from "../../lib/profit-calculator-utils";
import {
  TrendingUp,
  TrendingDown,
  Info,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Building,
  Settings,
  Calculator,
} from "lucide-react";

// Inline Supplier Logo Renderers for a premium aesthetic
const SupplierIcon = ({ id, className }: { id: string; className?: string }) => {
  const getLogoSrc = (supplierId: string) => {
    switch (supplierId.toLowerCase()) {
      case "amazon":
        return "/logos/amazon.ico";
      case "walmart":
        return "/logos/walmart.ico";
      case "aliexpress":
        return "/logos/aliexpress.ico";
      default:
        return "";
    }
  };

  const src = getLogoSrc(id);
  if (!src) {
    return <Building className={cn("h-4 w-4 shrink-0 text-slate-400", className)} />;
  }

  return (
    <img
      src={src}
      alt={id}
      className={cn("h-4 w-4 shrink-0 object-contain rounded-sm", className)}
      onError={(e) => {
        // Fallback to building icon if image fails to load
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
};

// Safe currency formatter helper
export function formatCurrency(value: number, currencyCode: string): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  try {
    return (
      sign +
      abs.toLocaleString("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })
    );
  } catch {
    return `${sign}${currencyCode} ${abs.toFixed(2)}`;
  }
}

const getEbayCategoryRate = (
  region: string,
  categoryId: number,
  storeType: string
): number => {
  const categories = EBAY_CATEGORIES[region] || EBAY_CATEGORIES["US"];
  const cat = categories.find((c) => c.id === categoryId) || categories[0];
  
  if (region === "US") {
    const isStarterOrNoStore = storeType === "no" || storeType === "starter";
    return isStarterOrNoStore ? (cat.starterStore ?? cat.ebayFee) : cat.ebayFee;
  }
  
  return cat.ebayFee;
};

export default function EbayProfitCalculator() {
  const { supplier: supplierParam } = useParams<{ supplier?: string }>();
  const navigate = useNavigate();

  // Validate active supplier parameter, fallback to "amazon"
  const activeSupplier = useMemo(() => {
    const found = SUPPLIERS.find((s) => s.id === supplierParam?.toLowerCase());
    return found ? found.id : "amazon";
  }, [supplierParam]);

  // Global region configuration
  const [regionId, setRegionId] = useState<string>("US");
  const activeRegion = useMemo(() => {
    return REGIONS.find((r) => r.id === regionId) || REGIONS[0];
  }, [regionId]);

  // Sidebar Input Fields
  const [productCost, setProductCost] = useState<string>("50");
  const [itemCost, setItemCost] = useState<string>("");
  const [shippingCharge, setShippingCharge] = useState<string>("0");
  const [shippingCost, setShippingCost] = useState<string>("0");
  const [otherCosts, setOtherCosts] = useState<string>("0");
  const [salesTax, setSalesTax] = useState<string>("0");
  const [salesTaxType, setSalesTaxType] = useState<"percentage" | "fixed" | "none">("none");
  const [salesTaxIncludesShipping, setSalesTaxIncludesShipping] = useState<boolean>(false);

  // eBay Specific Settings
  const [ebayStore, setEbayStore] = useState<string>("no");
  const [sellerLevel, setSellerLevel] = useState<string>("above");
  const [ebayCategory, setEbayCategory] = useState<string>("176"); // Defaults to 176 (Other) for US
  const [promotedRate, setPromotedRate] = useState<string>("0");
  const [internationalSales, setInternationalSales] = useState<boolean>(false);
  const [sellerType, setSellerType] = useState<string>("private"); // UK: business_seller adds 20% VAT

  // Custom Fee Editor Logic
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pricing Calculator states
  const [calculatorMode, setCalculatorMode] = useState<"profit" | "pricing">("profit");
  const [pricingEbayFeeType, setPricingEbayFeeType] = useState<"percentage" | "fixed">("percentage");
  const [pricingEbayFeeValue, setPricingEbayFeeValue] = useState<string>("12.9");
  const [pricingPromoFeeType, setPricingPromoFeeType] = useState<"percentage" | "fixed">("percentage");
  const [pricingPromoFeeValue, setPricingPromoFeeValue] = useState<string>("0");
  const [pricingProfitType, setPricingProfitType] = useState<"percentage" | "fixed">("percentage");
  const [pricingProfitValue, setPricingProfitValue] = useState<string>("15");

  // Helper to get required eBay fees by region (ZIK labels, no Charity Donation)
  const getRequiredEbayFees = (rId: string): FeeRow[] => {
    return [
      { id: "profit_row", name: "Profit", enabled: true, type: "percentage", value: 15.0, applyOn: "per_item" },
      { id: "ebay_fee", name: "eBay Fee", enabled: true, type: "percentage", value: 12.9, applyOn: "selling_price" },
      { id: "shipping_cost", name: "Shipping Cost", enabled: true, type: "fixed", value: 0.0, applyOn: "per_order" },
      { id: "ad_fee", name: "Ads Fee", enabled: true, type: "percentage", value: 0.0, applyOn: "selling_price" },
      { id: "buying_tax", name: "Buying Tax", enabled: true, type: "percentage", value: 8.0, applyOn: "per_item" },
      { id: "other_cost", name: "Other Fees", enabled: true, type: "fixed", value: 0.0, applyOn: "per_order" },
    ];
  };

  // Reset default category on region change
  useEffect(() => {
    if (regionId === "US") {
      setEbayCategory("176");
    } else if (regionId === "UK") {
      setEbayCategory("92");
    } else {
      setEbayCategory("176");
    }
  }, [regionId]);



  // Synchronize eBay settings changes with the eBay fee row value
  useEffect(() => {
    const fvfPercent = getEbayCategoryRate(regionId, parseInt(ebayCategory) || 176, ebayStore);
    let adjustedPercent = fvfPercent;
    if (sellerLevel === "below") {
      adjustedPercent += 6;
    } else if (sellerLevel === "high_inad") {
      adjustedPercent += 4;
    }
    if (sellerLevel === "top") {
      adjustedPercent = adjustedPercent * 0.9;
    }

    setFees((prev) =>
      prev.map((f) =>
        f.name.toLowerCase() === "ebay fee" || f.id === "final_value_fee" || f.id === "ebay_fee"
          ? { ...f, value: parseFloat(adjustedPercent.toFixed(2)) }
          : f
      )
    );
  }, [regionId, ebayCategory, ebayStore, sellerLevel]);

  // Load custom logic or defaults when region or supplier changes
  useEffect(() => {
    const stored = loadCalculatorLogic(regionId, activeSupplier);
    let baseFees: FeeRow[] = [];
    if (stored) {
      // Migrate/clean old stored fees to remove deprecated rows
      baseFees = stored.filter(
        (f) =>
          f.id !== "sales_tax" && f.name.toLowerCase() !== "sales tax" &&
          f.id !== "sold_price" && f.name.toLowerCase() !== "sold price"
      );
    } else {
      baseFees = getDefaultLogicBySupplier(activeSupplier);
    }

    if (regionId) {
      const requiredEbayFees = getRequiredEbayFees(regionId);
      
      // We want the default 5 rows to be present and ordered first!
      // Any other user-added custom fees should be appended after them.
      const finalFees: FeeRow[] = [];
      
      // 1. Add/merge the required 5 rows
      requiredEbayFees.forEach((req) => {
        const existing = baseFees.find((f) => f.id === req.id || f.name.toLowerCase() === req.name.toLowerCase());
        if (existing) {
          // Keep existing customized value/enabled state, but use the new default name/order
          finalFees.push({ ...req, value: existing.value, enabled: existing.enabled, type: existing.type, applyOn: existing.applyOn });
        } else {
          finalFees.push(req);
        }
      });
      
      // 2. Add any other custom fees that the user created
      baseFees.forEach((f) => {
        const isRequired = requiredEbayFees.some((req) => req.id === f.id || req.name.toLowerCase() === f.name.toLowerCase());
        if (!isRequired) {
          finalFees.push(f);
        }
      });
      
      setFees(finalFees);
    } else {
      setFees(baseFees);
    }
  }, [regionId, activeSupplier]);

  // Synchronize eBay setting states to dynamic fee editor values
  useEffect(() => {
    if (regionId) {
      setFees((prev) => {
        const selectedCatId = parseInt(ebayCategory) || (regionId === "US" ? 176 : 92);
        let fvfRate = getEbayCategoryRate(regionId, selectedCatId, ebayStore);

        // Seller level adjustments apply to both US and UK (per ZIK Analytics)
        if (sellerLevel === "below") {
          fvfRate += 6;
        }
        // Very High "Item Not As Described" rate (+4% penalty) — US only
        if (regionId === "US" && sellerLevel === "high_inad") {
          fvfRate += 4;
        }
        // Top Rated Plus (10% FVF discount)
        if (sellerLevel === "top") {
          fvfRate = fvfRate * 0.9;
        }

        // Dynamic fixed transaction fee:
        // - US: $0.30 if sold price <= $10, otherwise $0.40
        // - UK: £0.30 flat
        let transactionFee = 0.30;
        if (regionId === "US") {
          const cost = parseFloat(productCost) || 0;
          transactionFee = cost > 8 ? 0.40 : 0.30;
        }

        const promotedVal = parseFloat(promotedRate) || 0;

        // UK VAT: 20% when seller type is business_seller (per ZIK Analytics)
        const isUkBusiness = regionId === "UK" && sellerType === "business";

        return prev.map((fee) => {
          if (fee.id === "final_value_fee" || fee.name === "Final Value Fee") {
            return { ...fee, value: parseFloat(fvfRate.toFixed(4)) };
          }
          if (fee.id === "fixed_transaction_fee" || fee.name === "Fixed Transaction Fee") {
            return { ...fee, value: transactionFee, enabled: transactionFee > 0 };
          }
          if (fee.id === "promoted_ad_fee" || fee.name === "Promoted Ad Fee" || fee.name === "Promotion Fee") {
            return { ...fee, value: promotedVal, enabled: promotedVal > 0 };
          }
          if (fee.id === "international_fee" || fee.name === "International Fee") {
            return { ...fee, value: 1.65, enabled: internationalSales };
          }
          if (fee.id === "vat_fee" || fee.name === "VAT (Business Seller)") {
            return { ...fee, value: 20, enabled: isUkBusiness };
          }
          return fee;
        });
      });
    }
  }, [regionId, ebayStore, ebayCategory, sellerLevel, sellerType, promotedRate, internationalSales, productCost]);

  // Safe reset function
  const handleResetInputs = () => {
    setProductCost("");
    setItemCost("");
    setShippingCharge("0");
    setShippingCost("0");
    setOtherCosts("0");
    setSalesTax("0");
    setSalesTaxType("none");
    setSalesTaxIncludesShipping(false);
    setEbayStore("no");
    setSellerLevel("above");
    setEbayCategory(regionId === "US" ? "176" : "92");
    setPromotedRate("0");
    setInternationalSales(false);
    setSellerType("private");

    // Reset pricing calculator states
    setPricingEbayFeeType("percentage");
    setPricingEbayFeeValue("12.9");
    setPricingPromoFeeType("percentage");
    setPricingPromoFeeValue("0");
    setPricingProfitType("percentage");
    setPricingProfitValue("15");

    toast.info("Calculator inputs reset successfully.");
  };

  // Reset current fees logic to defaults
  const handleResetLogic = () => {
    if (regionId) {
      const requiredEbayFees = getRequiredEbayFees(regionId);
      setFees(requiredEbayFees);
    } else {
      setFees([]);
    }
    toast.success(`Reset ${activeSupplier} logic to defaults.`);
  };

  // Save current logic to local storage
  const handleSaveLogic = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveCalculatorLogic(regionId, activeSupplier, fees);
      setIsSaving(false);
      toast.success("Calculation logic saved successfully.");
    }, 600);
  };

  // Fee Manipulation Actions
  const handleToggleFee = (id: string) => {
    setFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleUpdateFeeField = (id: string, field: keyof FeeRow, value: any) => {
    setFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleDeleteFee = (id: string) => {
    setFees((prev) => prev.filter((f) => f.id !== id));
    toast.info("Fee row deleted.");
  };

  const handleDuplicateFee = (fee: FeeRow) => {
    const newFee: FeeRow = {
      ...fee,
      id: Math.random().toString(36).substring(2, 9),
      name: `${fee.name} (Copy)`,
    };
    setFees((prev) => [...prev, newFee]);
    toast.success("Fee row duplicated.");
  };

  const handleAddFeeRow = () => {
    const newFee: FeeRow = {
      id: Math.random().toString(36).substring(2, 9),
      name: "Custom Fee",
      enabled: true,
      type: "fixed",
      value: 0,
      applyOn: "selling_price",
    };
    setFees((prev) => [...prev, newFee]);
    toast.success("Custom fee row added.");
  };

  // Calculate live results by parsing from the fees table
  // Calculate recommended selling price based on Product Cost, Profit, and Fees
  const suggestedSellingPrice = useMemo(() => {
    const profitRow = fees.find((f) => f.name.toLowerCase() === "profit" || f.id === "profit_row");
    const ebayFeeRow = fees.find((f) => f.name.toLowerCase() === "ebay fee" || f.id === "ebay_fee");
    const shippingCostRow = fees.find((f) => f.name.toLowerCase() === "shipping cost" || f.id === "shipping_cost");
    const adFeeRow = fees.find((f) => f.name.toLowerCase() === "ads fee" || f.id === "ad_fee");
    const buyingTaxRow = fees.find((f) => f.name.toLowerCase() === "buying tax" || f.id === "buying_tax");
    const otherCostRow = fees.find((f) => f.name.toLowerCase() === "other cost" || f.name.toLowerCase() === "other costcost" || f.id === "other_cost" || f.name.toLowerCase() === "other fees");

    const cost = parseFloat(productCost) || 0;
    const oCost = otherCostRow?.enabled ? otherCostRow.value : 0;
    const sCost = shippingCostRow?.enabled ? shippingCostRow.value : 0;
    const bTax = buyingTaxRow?.enabled ? buyingTaxRow.value : 0;
    const bTaxType = buyingTaxRow?.enabled ? buyingTaxRow.type : "none";

    // 1. Total Sourcing Cost (cost + buying tax + other fees)
    const buyingTaxAmount = bTaxType === "percentage" ? (cost * bTax) / 100 : bTax;
    const totalSourcingCost = cost + buyingTaxAmount + oCost;

    // 2. Desired Profit Amount
    let desiredProfit = 0;
    if (profitRow?.enabled) {
      if (profitRow.type === "percentage") {
        desiredProfit = cost * (profitRow.value / 100);
      } else {
        desiredProfit = profitRow.value;
      }
    }

    // 3. Sum of fixed fees (excluding shipping_cost, other_cost, and profit which are sourcing costs/profit)
    const customFixedFeesSum = fees
      .filter(
        (f) =>
          f.enabled &&
          f.type === "fixed" &&
          f.id !== "shipping_cost" &&
          f.name.toLowerCase() !== "shipping cost" &&
          f.id !== "other_cost" &&
          f.name.toLowerCase() !== "other fees" &&
          f.name.toLowerCase() !== "profit" &&
          f.id !== "profit_row"
      )
      .reduce((sum, f) => sum + f.value, 0);
    const totalFixedFees = sCost + customFixedFeesSum;

    // 4. Sum of percentage fees (eBay Fee, Ads Fee, and any other custom percentage fees)
    const percentageFeesSum = fees
      .filter(
        (f) =>
          f.enabled &&
          f.type === "percentage" &&
          f.id !== "buying_tax" &&
          f.name.toLowerCase() !== "buying tax" &&
          f.name.toLowerCase() !== "profit" &&
          f.id !== "profit_row"
      )
      .reduce((sum, f) => sum + f.value, 0);

    // 5. Calculate final suggested selling price
    if (percentageFeesSum >= 100) return 0;
    const suggested = (totalSourcingCost + desiredProfit + totalFixedFees) / (1 - percentageFeesSum / 100);
    return parseFloat(suggested.toFixed(2));
  }, [fees, productCost]);

  // Calculate profit and ROI metrics based on inputs
  const results = useMemo(() => {
    const ebayFeeRow = fees.find((f) => f.name.toLowerCase() === "ebay fee" || f.id === "final_value_fee" || f.id === "ebay_fee");
    const buyingTaxRow = fees.find((f) => f.name.toLowerCase() === "buying tax" || f.id === "buying_tax");
    const shippingCostRow = fees.find((f) => f.name.toLowerCase() === "shipping cost" || f.id === "shipping_cost");
    const otherCostRow = fees.find((f) => f.name.toLowerCase() === "other cost" || f.name.toLowerCase() === "other costcost" || f.id === "other_cost" || f.name.toLowerCase() === "other fees");

    const sPrice = suggestedSellingPrice;
    const cost = parseFloat(productCost) || 0;
    const sCost = shippingCostRow?.enabled ? shippingCostRow.value : 0;
    const oCost = otherCostRow?.enabled ? otherCostRow.value : 0;
    const bTax = buyingTaxRow?.enabled ? buyingTaxRow.value : 0;
    const bTaxType = buyingTaxRow?.enabled ? buyingTaxRow.type : "none";

    // Sourcing Tax (buying tax) applies to Product Cost
    const buyingTaxAmount = bTaxType === "percentage" ? (cost * bTax) / 100 : bTax;
    const totalItemCost = cost + buyingTaxAmount + oCost;

    // Filter out built-in rows (except eBay fee) from general fee sum
    const calcFees = fees.filter(
      (f) =>
        f.id !== "buying_tax" && f.name.toLowerCase() !== "buying tax" &&
        f.id !== "shipping_cost" && f.name.toLowerCase() !== "shipping cost" &&
        f.id !== "other_cost" && f.name.toLowerCase() !== "other cost" && f.name.toLowerCase() !== "other fees" &&
        f.name.toLowerCase() !== "profit" && f.id !== "profit_row"
    );

    // Map eBay fee row to final_value_fee ID for internal calculateProfitSummary logic
    const finalFees = calcFees.map((f) => {
      if (f.name.toLowerCase() === "ebay fee" || f.id === "final_value_fee" || f.id === "ebay_fee") {
        return { ...f, id: "final_value_fee", name: "Final Value Fee" };
      }
      return f;
    });

    return calculateProfitSummary({
      sellingPrice: sPrice,
      shippingCharge: 0,
      itemCost: totalItemCost,
      fees: finalFees,
      shippingCost: sCost,
      otherCosts: 0,
      promotion: promotedRate,
      salesTax: 0,
      salesTaxType: "none",
      salesTaxIncludesShipping: false,
      regionId,
    });
  }, [fees, suggestedSellingPrice, productCost, promotedRate, regionId]);

  // Pricing Calculator Logic
  const pricingCalculations = useMemo(() => {
    if (calculatorMode !== "pricing") return null;

    const cost = parseFloat(itemCost) || 0;
    const ship = parseFloat(shippingCost) || 0;

    const ebType = pricingEbayFeeType;
    const ebVal = parseFloat(pricingEbayFeeValue) || 0;

    const promoType = pricingPromoFeeType;
    const promoVal = parseFloat(pricingPromoFeeValue) || 0;

    const profType = pricingProfitType;
    const profVal = parseFloat(pricingProfitValue) || 0;

    const fFixed = ebType === "fixed" ? ebVal : 0;
    const fPct = ebType === "percentage" ? ebVal : 0;

    const pFixed = promoType === "fixed" ? promoVal : 0;
    const pPct = promoType === "percentage" ? promoVal : 0;

    const prFixed = profType === "fixed" ? profVal : 0;
    const prPct = profType === "percentage" ? profVal : 0;

    const cFixed = cost + ship + fFixed + pFixed;
    const pctFees = (fPct + pPct) / 100;

    let recommendedPrice = 0;
    let calculatedEbayFee = 0;
    let calculatedPromoFee = 0;
    let calculatedProfit = 0;
    let totalCost = 0;

    if (profType === "fixed") {
      if (pctFees < 1) {
        recommendedPrice = (cFixed + prFixed) / (1 - pctFees);
        calculatedEbayFee = ebType === "percentage" ? recommendedPrice * (fPct / 100) : fFixed;
        calculatedPromoFee = promoType === "percentage" ? recommendedPrice * (pPct / 100) : pFixed;
        calculatedProfit = prFixed;
        totalCost = cost + ship + calculatedEbayFee + calculatedPromoFee;
      }
    } else {
      const K = 1 + prPct / 100;
      if (K * pctFees < 1) {
        recommendedPrice = (K * cFixed) / (1 - K * pctFees);
        calculatedEbayFee = ebType === "percentage" ? recommendedPrice * (fPct / 100) : fFixed;
        calculatedPromoFee = promoType === "percentage" ? recommendedPrice * (pPct / 100) : pFixed;
        totalCost = cost + ship + calculatedEbayFee + calculatedPromoFee;
        calculatedProfit = totalCost * (prPct / 100);
      }
    }

    return {
      productCost: cost,
      shippingCost: ship,
      calculatedEbayFee,
      calculatedPromoFee,
      calculatedProfit,
      totalCost,
      recommendedPrice,
      invalid: recommendedPrice <= 0 || isNaN(recommendedPrice) || !isFinite(recommendedPrice),
    };
  }, [
    calculatorMode,
    itemCost,
    shippingCost,
    pricingEbayFeeType,
    pricingEbayFeeValue,
    pricingPromoFeeType,
    pricingPromoFeeValue,
    pricingProfitType,
    pricingProfitValue,
  ]);

  // Validation feedback
  const validationError = useMemo(() => {
    if (calculatorMode === "profit") {
      const otherCostRow = fees.find((f) => f.name.toLowerCase() === "other cost" || f.name.toLowerCase() === "other costcost" || f.id === "other_cost" || f.name.toLowerCase() === "other fees");
      const shippingCostRow = fees.find((f) => f.name.toLowerCase() === "shipping cost" || f.id === "shipping_cost");

      if (otherCostRow && otherCostRow.value < 0) {
        return "Other Cost cannot be negative";
      }
      if (shippingCostRow && shippingCostRow.value < 0) {
        return "Shipping cost cannot be negative";
      }
    } else {
      if (itemCost !== "" && parseFloat(itemCost) < 0) {
        return "Product cost cannot be negative";
      }
      if (shippingCost !== "" && parseFloat(shippingCost) < 0) {
        return "Shipping cost cannot be negative";
      }
      if (pricingEbayFeeValue !== "" && parseFloat(pricingEbayFeeValue) < 0) {
        return "eBay fee cannot be negative";
      }
      if (pricingPromoFeeValue !== "" && parseFloat(pricingPromoFeeValue) < 0) {
        return "Promotional fee cannot be negative";
      }
      if (pricingProfitValue !== "" && parseFloat(pricingProfitValue) < 0) {
        return "Desired profit cannot be negative";
      }
      if (pricingCalculations && pricingCalculations.invalid) {
        const ebVal = parseFloat(pricingEbayFeeValue) || 0;
        const promoVal = parseFloat(pricingPromoFeeValue) || 0;
        const profVal = parseFloat(pricingProfitValue) || 0;
        if (pricingProfitType === "fixed") {
          if ((ebVal + promoVal) / 100 >= 1) {
            return "Mathematical boundary exceeded: fee percentage is 100% or higher.";
          }
        } else {
          const K = 1 + profVal / 100;
          const pctFees = ((pricingEbayFeeType === "percentage" ? ebVal : 0) + (pricingPromoFeeType === "percentage" ? promoVal : 0)) / 100;
          if (K * pctFees >= 1) {
            return "Mathematical boundary exceeded: combined fee and profit percentage is too high.";
          }
        }
        return "Mathematical boundary exceeded: invalid recommended price.";
      }
    }
    return null;
  }, [
    calculatorMode,
    suggestedSellingPrice,
    itemCost,
    shippingCost,
    pricingEbayFeeValue,
    pricingPromoFeeValue,
    pricingProfitValue,
    pricingProfitType,
    pricingEbayFeeType,
    pricingPromoFeeType,
    pricingCalculations,
  ]);

  // Handle supplier tab change via route
  const handleSupplierTabChange = (supplierId: string) => {
    navigate(`/dashboard/ebay/calculator/${supplierId}`);
  };

  // Localized Money Formatter
  const money = (v: number) => formatCurrency(v, activeRegion.currency);

  // Dynamic formula strings
  const formulaPreview = useMemo(() => {
    const rev = suggestedSellingPrice;
    const ship = parseFloat(shippingCharge) || 0;
    const gross = rev + ship;
    const fStr = fees
      .filter((f) => f.enabled)
      .map((f) => `${f.name} (${f.type === "percentage" ? `${f.value}%` : money(f.value)})`)
      .join(" + ") || "None";

    const costParts = [];
    if (parseFloat(shippingCost) > 0) costParts.push(`Shipping Cost (${money(parseFloat(shippingCost))})`);
    if (parseFloat(otherCosts) > 0) costParts.push(`Other Costs (${money(parseFloat(otherCosts))})`);
    if (results.promotionAmount > 0) costParts.push(`Promo (${money(results.promotionAmount)})`);
    if (results.salesTaxAmount > 0) costParts.push(`Tax (${money(results.salesTaxAmount)})`);
    const costStr = costParts.join(" + ") || "None";

    return {
      gross: `${money(gross)} (Rev: ${money(rev)} + Ship Chg: ${money(ship)})`,
      fees: `${money(results.totalFees)} [${fStr}]`,
      costs: `${money(results.totalCostsExcludingItemCost)} [${costStr}]`,
      breakEven: money(results.breakEvenPrice),
    };
  }, [
    suggestedSellingPrice,
    shippingCharge,
    shippingCost,
    otherCosts,
    fees,
    results,
    activeRegion,
  ]);

  // Simple CSS conic gradient or progress segments for visual profit distribution
  const chartSegments = useMemo(() => {
    if (!results.hasInput || results.grossRevenue <= 0) return null;
    const gross = results.grossRevenue;
    const actualCost = parseFloat(itemCost) > 0 ? parseFloat(itemCost) : results.breakEvenPrice;
    
    // Percentages of gross revenue
    const feePct = (results.totalFees / gross) * 100;
    const costPct = (results.totalCostsExcludingItemCost / gross) * 100;
    const itemCostPct = (actualCost / gross) * 100;
    const profitPct = (results.netProfit / gross) * 100;

    return {
      fees: Math.max(0, feePct),
      costs: Math.max(0, costPct),
      itemCost: Math.max(0, itemCostPct),
      profit: Math.max(0, profitPct),
    };
  }, [results, itemCost]);

  return (
    <div className="space-y-6 pb-12 antialiased">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Profit Calculator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimate profit, fees, break-even price, and supplier price before listing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetInputs}
            className="flex items-center gap-1.5 border-border text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Inputs
          </Button>
          <Button
            size="sm"
            onClick={handleSaveLogic}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
          >
            <Save className={cn("h-3.5 w-3.5", isSaving && "animate-spin")} />
            {isSaving ? "Saving..." : "Save Logic"}
          </Button>
        </div>
      </div>

      {/* ─── Top Control Bar ─── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-md dark:bg-card/45 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-6 flex-1">
          {/* Region Selector */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Region:
            </Label>
            <Select value={regionId} onValueChange={setRegionId}>
              <SelectTrigger className="w-[180px] h-9 text-xs border-border rounded-lg shadow-sm animate-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.name} ({r.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Cost Input */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Product Cost:
            </Label>
            <div className="relative w-[140px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                {activeRegion.symbol}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                className="pl-7 h-9 text-xs border-border rounded-lg shadow-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Marketplace Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {SUPPLIERS.map((s) => {
            const active = activeSupplier === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSupplierTabChange(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                <SupplierIcon id={s.id} />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        {/* Left Sidebar (Sticky Input Panel) */}
        <div className="lg:sticky lg:top-24 space-y-4">


          {regionId && calculatorMode === "profit" && (
            <Card className="border-border shadow-sm bg-card mt-4">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  eBay Settings ({regionId})
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure eBay store, category, and seller level.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* eBay Store */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">eBay store?</Label>
                  <Select value={ebayStore} onValueChange={setEbayStore}>
                    <SelectTrigger className="h-9 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" className="text-xs">No</SelectItem>
                      <SelectItem value="starter" className="text-xs">Starter Store</SelectItem>
                      <SelectItem value="basic" className="text-xs">Basic Store</SelectItem>
                      <SelectItem value="premium" className="text-xs">Premium Store</SelectItem>
                      <SelectItem value="anchor" className="text-xs">Anchor Store</SelectItem>
                      <SelectItem value="enterprise" className="text-xs">Enterprise Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seller Level */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Seller level</Label>
                  <Select value={sellerLevel} onValueChange={setSellerLevel}>
                    <SelectTrigger className="h-9 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above" className="text-xs">Above Standard</SelectItem>
                      <SelectItem value="top" className="text-xs">Top Rated Plus (10% FVF Disc.)</SelectItem>
                      <SelectItem value="below" className="text-xs">Below Standard (+6% FVF)</SelectItem>
                      <SelectItem value="high_inad" className="text-xs">Very High "Item Not As Described" (+4% FVF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Oversea sales? */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Oversea sales?</Label>
                  <Select
                    value={internationalSales ? "yes" : "no"}
                    onValueChange={(v) => setInternationalSales(v === "yes")}
                  >
                    <SelectTrigger className="h-9 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" className="text-xs">No</SelectItem>
                      <SelectItem value="yes" className="text-xs">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Item Category */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Item category</Label>
                  <Select value={ebayCategory} onValueChange={setEbayCategory}>
                    <SelectTrigger className="h-9 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(EBAY_CATEGORIES[regionId] || EBAY_CATEGORIES["US"]).map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                          {cat.name} ({cat.ebayFee}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>



                {/* UK Seller Type (Business / Private) */}
                {regionId === "UK" && (
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs font-semibold text-foreground">Seller Type</Label>
                    <Select value={sellerType} onValueChange={setSellerType}>
                      <SelectTrigger className="h-9 text-xs border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private" className="text-xs">Private Seller</SelectItem>
                        <SelectItem value="business" className="text-xs">Business Seller (20% VAT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* Suggested Selling Price Card */}
          <Card className="border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                Suggested Selling Price
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Price you should list at to achieve your desired profit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-3xl font-black text-foreground tracking-tight">
                {money(suggestedSellingPrice)}
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Product Cost:</span>
                  <span className="font-semibold text-foreground">{money(parseFloat(productCost) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost (excl. Profit):</span>
                  <span className="font-semibold text-foreground">{money(suggestedSellingPrice - results.netProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Desired Profit:</span>
                  <span className="font-semibold text-foreground">
                    {(() => {
                      const pRow = fees.find((f) => f.name.toLowerCase() === "profit" || f.id === "profit_row");
                      if (!pRow || !pRow.enabled) return "0.00";
                      return pRow.type === "percentage" ? `${pRow.value}%` : money(pRow.value);
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ZIK-style Your Profit Summary Card */}
          <Card className="border-border shadow-sm bg-card">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground">
                {calculatorMode === "profit" ? "Your Profit Summary" : "Your Pricing Summary"}
              </CardTitle>
              <CardDescription className="text-xs">
                {calculatorMode === "profit"
                  ? "Estimated earnings and break-even for this item."
                  : "Recommended sold price and cost breakdown."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {calculatorMode === "profit" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Net Profit */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Your Profit</span>
                    <div className={cn(
                      "text-lg font-bold mt-1",
                      results.netProfit >= 0 ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"
                    )}>
                      {money(results.netProfit)}
                      <span className="text-xs font-semibold ml-1.5 text-muted-foreground">
                        ({results.margin.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Break-Even Price */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Break-Even Price</span>
                    <div className="text-lg font-bold mt-1 text-foreground font-semibold">
                      {money(results.breakEvenPrice)}
                    </div>
                  </div>

                  {/* Total eBay Fees */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">eBay Transaction Fees</span>
                    <div className="text-lg font-bold mt-1 text-amber-500 font-semibold">
                      {money(results.totalFees)}
                      {results.grossRevenue > 0 && (
                        <span className="text-xs font-semibold ml-1.5 text-muted-foreground">
                          {((results.totalFees / results.grossRevenue) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Costs */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Cost</span>
                    <div className="text-lg font-bold mt-1 text-blue-500 font-semibold">
                      {money(results.totalCostsIncludingItemCost)}
                      {results.grossRevenue > 0 && (
                        <span className="text-xs font-semibold ml-1.5 text-muted-foreground">
                          {((results.totalCostsIncludingItemCost / results.grossRevenue) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Recommended Price */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Recommended Price</span>
                    <div className="text-lg font-bold mt-1 text-primary font-semibold">
                      {pricingCalculations ? money(pricingCalculations.recommendedPrice) : "$0.00"}
                    </div>
                  </div>

                  {/* Desired Profit */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Desired Profit</span>
                    <div className="text-lg font-bold mt-1 text-emerald-500 font-semibold">
                      {pricingCalculations ? money(pricingCalculations.calculatedProfit) : "$0.00"}
                    </div>
                  </div>

                  {/* eBay Fee */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">eBay Fee</span>
                    <div className="text-lg font-bold mt-1 text-amber-500 font-semibold">
                      {pricingCalculations ? money(pricingCalculations.calculatedEbayFee) : "$0.00"}
                    </div>
                  </div>

                  {/* Promotional Fee */}
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Promotional Fee</span>
                    <div className="text-lg font-bold mt-1 text-purple-500 font-semibold">
                      {pricingCalculations ? money(pricingCalculations.calculatedPromoFee) : "$0.00"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: Calculation Logic Editor / Pricing Breakdown */}
          {calculatorMode === "profit" ? (
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="p-4 border-b border-border/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    eBay Transaction Fees Editor ({activeSupplier.toUpperCase()} - {activeRegion.id})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Customize the eBay fee structure.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetLogic}
                    className="text-xs h-8 px-2.5 border-border text-foreground hover:bg-muted"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Defaults
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddFeeRow}
                    className="text-xs h-8 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-none"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Fee
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase">Active</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase">Fee Name</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase">Fee Type</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase">Value</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase">Apply On</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-muted-foreground uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {fees.map((fee) => (
                      <tr key={fee.id} className={cn("hover:bg-muted/20", !fee.enabled && "opacity-60")}>
                        {/* Active Toggle */}
                        <td className="py-2 px-4">
                          <Switch
                            checked={fee.enabled}
                            onCheckedChange={() => handleToggleFee(fee.id)}
                            className="scale-90"
                          />
                        </td>

                        {/* Fee Name */}
                        <td className="py-2 px-4">
                          <Input
                            type="text"
                            value={fee.name}
                            onChange={(e) => handleUpdateFeeField(fee.id, "name", e.target.value)}
                            className="h-8 text-xs border-border focus-visible:ring-ring max-w-[160px]"
                          />
                        </td>

                        {/* Fee Type */}
                        <td className="py-2 px-4">
                          <Select
                            value={fee.type}
                            onValueChange={(v) => handleUpdateFeeField(fee.id, "type", v as "percentage" | "fixed")}
                          >
                            <SelectTrigger className="h-8 text-xs border-border w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage" className="text-xs">% Percentage</SelectItem>
                              <SelectItem value="fixed" className="text-xs">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Value */}
                        <td className="py-2 px-4">
                          <div className="relative max-w-[90px]">
                            {fee.type === "fixed" && (
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                                {activeRegion.symbol}
                              </span>
                            )}
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fee.value}
                              onChange={(e) => handleUpdateFeeField(fee.id, "value", parseFloat(e.target.value) || 0)}
                              className={cn("h-8 text-xs border-border focus-visible:ring-ring", fee.type === "fixed" && "pl-5")}
                            />
                          </div>
                        </td>

                        {/* Apply On */}
                        <td className="py-2 px-4">
                          <Select
                            value={fee.applyOn}
                            onValueChange={(v) => handleUpdateFeeField(fee.id, "applyOn", v as any)}
                          >
                            <SelectTrigger className="h-8 text-xs border-border w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="selling_price" className="text-xs">Selling Price</SelectItem>
                              <SelectItem value="selling_price_shipping" className="text-xs">Selling Price + Ship Chg</SelectItem>
                              <SelectItem value="per_order" className="text-xs">Per Order</SelectItem>
                              <SelectItem value="per_item" className="text-xs">Per Item</SelectItem>
                              <SelectItem value="monthly" className="text-xs">Monthly (Fixed)</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateFee(fee)}
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted"
                              title="Duplicate Fee"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFee(fee.id)}
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted"
                              title="Delete Fee"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm bg-card">
              <CardHeader className="p-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Pricing Calculation Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Itemized recommended pricing details based on user-defined fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 max-w-xl mx-auto">
                <div className="divide-y divide-border/40 rounded-xl border border-border bg-muted/5 p-4">
                  <div className="flex justify-between py-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">Product Cost</span>
                    <span className="font-semibold text-foreground">{pricingCalculations ? money(pricingCalculations.productCost) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">Shipping Cost</span>
                    <span className="font-semibold text-foreground">{pricingCalculations ? money(pricingCalculations.shippingCost) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">eBay Fee ({pricingEbayFeeValue}{pricingEbayFeeType === "percentage" ? "%" : ""})</span>
                    <span className="font-semibold text-amber-500">{pricingCalculations ? money(pricingCalculations.calculatedEbayFee) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">Promotional Fee ({pricingPromoFeeValue}{pricingPromoFeeType === "percentage" ? "%" : ""})</span>
                    <span className="font-semibold text-purple-500">{pricingCalculations ? money(pricingCalculations.calculatedPromoFee) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-xs">
                    <span className="text-muted-foreground font-medium">Desired Profit ({pricingProfitValue}{pricingProfitType === "percentage" ? "%" : ""})</span>
                    <span className="font-semibold text-emerald-500">{pricingCalculations ? money(pricingCalculations.calculatedProfit) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between py-3.5 text-sm font-bold bg-muted/50 px-4 rounded-lg mt-3 border border-border">
                    <span className="text-foreground">Recommended Sold Price</span>
                    <span className="text-primary font-bold">{pricingCalculations ? money(pricingCalculations.recommendedPrice) : "$0.00"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section D: Formula Preview */}
          <Card className="border-border shadow-sm bg-muted/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                Live Formula Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3.5 text-xs text-muted-foreground">
              {calculatorMode === "profit" ? (
                <div className="rounded-lg bg-card p-3 border border-border font-mono text-[11px] leading-relaxed shadow-inner">
                  <div className="text-primary font-bold mb-1.5">
                    Break-Even Calculation details =
                  </div>
                  <div className="pl-4 space-y-1">
                    <div>Gross Revenue: <span className="text-foreground font-semibold">{formulaPreview.gross}</span></div>
                    <div>− Marketplace Fees: <span className="text-amber-600 dark:text-amber-400 font-semibold">{formulaPreview.fees}</span></div>
                    <div>− Costs: <span className="text-blue-600 dark:text-blue-400 font-semibold">{formulaPreview.costs}</span></div>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 text-primary font-bold flex justify-between">
                    <span>Estimated Break-Even Price:</span>
                    <span className="text-foreground">{formulaPreview.breakEven}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-card p-3 border border-border font-mono text-[11px] leading-relaxed shadow-inner">
                  <div className="text-primary font-bold mb-1.5">
                    Pricing Formula details =
                  </div>
                  <div className="pl-4 space-y-1">
                    {pricingProfitType === "fixed" ? (
                      <>
                        <div>Formula: <span className="text-foreground font-semibold">SP = (ProductCost + ShippingCost + eBayFee_fixed + PromoFee_fixed + Profit_fixed) / (1 - Fee_pcts)</span></div>
                        <div className="pt-1.5 text-[10px] text-muted-foreground">
                          SP = ({itemCost || 0} + {shippingCost || 0} + {pricingEbayFeeType === "fixed" ? pricingEbayFeeValue : 0} + {pricingPromoFeeType === "fixed" ? pricingPromoFeeValue : 0} + {pricingProfitValue}) / (1 - {((pricingEbayFeeType === "percentage" ? parseFloat(pricingEbayFeeValue) : 0) + (pricingPromoFeeType === "percentage" ? parseFloat(pricingPromoFeeValue) : 0)) / 100})
                        </div>
                      </>
                    ) : (
                      <>
                        <div>Formula: <span className="text-foreground font-semibold">SP = K * (ProductCost + ShippingCost + eBayFee_fixed + PromoFee_fixed) / (1 - K * Fee_pcts)</span></div>
                        <div className="pl-2 text-[10px] text-muted-foreground">where K = 1 + ProfitMargin / 100</div>
                        <div className="pt-1.5 text-[10px] text-muted-foreground">
                          K = {1 + (parseFloat(pricingProfitValue) || 0) / 100}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          SP = {1 + (parseFloat(pricingProfitValue) || 0) / 100} * ({itemCost || 0} + {shippingCost || 0} + {pricingEbayFeeType === "fixed" ? pricingEbayFeeValue : 0} + {pricingPromoFeeType === "fixed" ? pricingPromoFeeValue : 0}) / (1 - {1 + (parseFloat(pricingProfitValue) || 0) / 100} * {((pricingEbayFeeType === "percentage" ? parseFloat(pricingEbayFeeValue) : 0) + (pricingPromoFeeType === "percentage" ? parseFloat(pricingPromoFeeValue) : 0)) / 100})
                        </div>
                      </>
                    )}
                  </div>
                  <div className="border-t border-border mt-2 pt-2 text-primary font-bold flex justify-between">
                    <span>Recommended Sold Price:</span>
                    <span className="text-foreground">{pricingCalculations ? money(pricingCalculations.recommendedPrice) : "$0.00"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
