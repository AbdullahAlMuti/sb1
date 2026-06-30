import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Percent,
  ReceiptText,
  Table2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/components/ui/accordion";
import { Button } from "@repo/ui/components/ui/button";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
  EBAY_FEE_CATEGORIES,
  MARKETPLACE_DEFAULTS,
  calculateEbayFees,
  type EbayFeesInput,
  type SalesTaxMethod,
} from "@/lib/ebayFeesCalculator";
import { SITE_URL, breadcrumbJsonLd, faqJsonLd, useSeo } from "@/lib/useSeo";

const routePath = "/resources/ebay-fees-calculator";
const pageUrl = `${SITE_URL}${routePath}`;

const faqItems = [
  {
    q: "What is an eBay final value fee?",
    a: "An eBay final value fee is the percentage fee eBay charges after an item sells. It is usually calculated from the order amount, and the exact rate can vary by marketplace, category, seller status, and optional listing upgrades.",
  },
  {
    q: "Does eBay charge fees on shipping?",
    a: "In many selling scenarios, eBay fees are based on the item price plus shipping charged to the buyer. This calculator includes the shipping charge in gross revenue before estimating final value and promoted listing fees.",
  },
  {
    q: "How do I calculate eBay profit?",
    a: "Start with the item sold price plus any shipping charge, then subtract estimated eBay fees, item cost, shipping cost, promotion fees, and other costs. The remaining amount is estimated seller profit.",
  },
  {
    q: "Does sales tax reduce my seller profit?",
    a: "Sales tax is typically charged to the buyer and handled separately from seller profit. This calculator displays sales tax for context, but does not subtract it from profit by default.",
  },
  {
    q: "What is a promoted listing fee?",
    a: "A promoted listing fee is an optional advertising cost based on the ad rate you choose. Enter your promotion percentage to estimate how much it can reduce profit on a sale.",
  },
  {
    q: "What is break-even price?",
    a: "Break-even price is the item sold price where estimated profit reaches zero after fees and costs. It helps you avoid listing products that cannot cover your expenses.",
  },
  {
    q: "Is this calculator for eBay USA?",
    a: "Yes. This page is built for eBay US sellers and uses dollar currency, US category examples, and US-focused fee table references. You can still edit the fee percentage for your exact category or account.",
  },
  {
    q: "Why is my eBay profit negative?",
    a: "Negative profit usually means fees, product cost, shipping cost, promotion cost, or other expenses are higher than the revenue from the sale. Raise the sold price, reduce costs, or lower the ad rate to test a better margin.",
  },
];

const defaultInput: EbayFeesInput = {
  marketplace: "us",
  category: "standard",
  itemSoldPrice: 39,
  itemCost: 18,
  ebayFeePercent: MARKETPLACE_DEFAULTS.us.defaultFeePercent,
  shippingCharge: 0,
  shippingCost: 5,
  promotionPercent: 2,
  otherCosts: 1,
  salesTaxMethod: "percentage",
  salesTaxAmount: 0,
};

const usFeeRows = [
  { mainCategory: "Art", subCategory: "Art NFTs", rate: "5%" },
  { mainCategory: "Art", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Books & Magazines", subCategory: "All", rate: "Portion up to $7,500: 14.95%; portion above $7,500: 2.35%" },
  {
    mainCategory: "Business & Industrial",
    subCategory: "Heavy equipment, commercial printing presses, food trucks, trailers, and carts",
    rate: "Portion up to $15,000: 3.00%; portion above $15,000: 0.50%",
  },
  { mainCategory: "Business & Industrial", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  {
    mainCategory: "Clothing, Shoes & Accessories",
    subCategory: "Men's and women's athletic shoes",
    rate: "Sold price under $149.99: 13.25%; sold price over $149.99: 8% and $0.30 per order is not charged",
  },
  {
    mainCategory: "Clothing, Shoes & Accessories",
    subCategory: "Women's bags and handbags",
    rate: "Total sale up to $2,000: 15%; total sale $2,000.01 or more: 9%",
  },
  { mainCategory: "Clothing, Shoes & Accessories", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Coins & Paper Money", subCategory: "Bullion", rate: "Total sale up to $7,500: 13.25%; total sale $7,500.01 or more: 7%" },
  { mainCategory: "Coins & Paper Money", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Collectibles", subCategory: "Emerging NFTs and non-sport trading card NFTs", rate: "5%" },
  { mainCategory: "Collectibles", subCategory: "Non-sport trading cards and everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Consumer Electronics", subCategory: "Other virtual reality accessories", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2%" },
  { mainCategory: "Consumer Electronics", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  {
    mainCategory: "Jewelry & Watches",
    subCategory: "Parts, accessories, and watches",
    rate: "Portion up to $1,000: 15%; portion over $1,000 up to $7,500: 6.5%; portion above $7,500: 3%",
  },
  { mainCategory: "Jewelry & Watches", subCategory: "Everything else", rate: "Total sale up to $5,000: 15%; total sale $5,000.01 or more: 9%" },
  { mainCategory: "Movies & TV", subCategory: "Movie NFTs", rate: "5%" },
  { mainCategory: "Movies & TV", subCategory: "Everything else", rate: "Portion up to $7,500: 14.95%; portion above $7,500: 2.35%" },
  { mainCategory: "Music", subCategory: "Music NFTs", rate: "5%" },
  { mainCategory: "Music", subCategory: "Vinyl records", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Music", subCategory: "Everything else", rate: "Portion up to $7,500: 14.95%; portion above $7,500: 2.35%" },
  { mainCategory: "Musical Instruments & Gear", subCategory: "Guitars and basses", rate: "Portion up to $7,500: 6.35%; portion above $7,500: 2.35%" },
  { mainCategory: "Musical Instruments & Gear", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Sports Mem, Cards & Fan Shop", subCategory: "Sports trading card NFTs", rate: "5%" },
  { mainCategory: "Sports Mem, Cards & Fan Shop", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Toys & Hobbies", subCategory: "Collectible card game NFTs", rate: "5%" },
  { mainCategory: "Toys & Hobbies", subCategory: "Everything else", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
  { mainCategory: "Everything else", subCategory: "All other categories", rate: "Portion up to $7,500: 13.25%; portion above $7,500: 2.35%" },
];

const usStoreFeeRows = [
  {
    mainCategory: "Common store categories",
    subCategory: "Everything else, Antiques, Baby, Crafts, Dolls & Bears, Entertainment Memorabilia, Health & Beauty, Home & Garden, Pet Supplies, Pottery & Glass, Specialty Services, Sporting Goods",
    rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%",
  },
  { mainCategory: "Art", subCategory: "Art NFTs", rate: "5%" },
  { mainCategory: "Art", subCategory: "Everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Books & Magazines", subCategory: "All", rate: "Portion up to $2,500: 14.95%; portion above $2,500: 2.35%" },
  {
    mainCategory: "Business & Industrial",
    subCategory: "Heavy equipment, commercial printing presses, food trucks, trailers, and carts",
    rate: "Portion up to $15,000: 2.50%; portion above $15,000: 0.50%",
  },
  { mainCategory: "Business & Industrial", subCategory: "Everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  {
    mainCategory: "Cameras & Photo",
    subCategory: "Selected camera parts, accessories, replacement tools, tripods, and supports",
    rate: "Portion up to $2,500: 1.352%; portion above $2,500: 2.35%",
  },
  { mainCategory: "Cameras & Photo", subCategory: "Memory cards and everything else", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
  { mainCategory: "Cell Phones & Accessories", subCategory: "Cell phone accessories", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Cell Phones & Accessories", subCategory: "Memory cards and everything else", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
  {
    mainCategory: "Clothing, Shoes & Accessories",
    subCategory: "Men's and women's athletic shoes",
    rate: "Sold price under $149.99: 12.35%; sold price over $149.99: 7% and $0.30 per order is not charged",
  },
  { mainCategory: "Clothing, Shoes & Accessories", subCategory: "Women's bags and handbags", rate: "Total sale up to $2,000: 13%; total sale $2,000.01 or more: 7%" },
  { mainCategory: "Clothing, Shoes & Accessories", subCategory: "Everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Coins & Paper Money", subCategory: "Bullion", rate: "Up to $1,500: 7.35%; $1,500.01 to $10,000: 5%; $10,000.01 or more: 4.5%" },
  { mainCategory: "Coins & Paper Money", subCategory: "Everything else", rate: "Portion up to $4,000: 9%; portion above $4,000: 2.35%" },
  { mainCategory: "Collectibles", subCategory: "Emerging NFTs and non-sport trading card NFTs", rate: "5%" },
  { mainCategory: "Collectibles", subCategory: "Non-sport trading cards and everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  {
    mainCategory: "Computers/Tablets & Networking",
    subCategory: "Accessories, cables, keyboards, power protection, and selected parts",
    rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%",
  },
  {
    mainCategory: "Computers/Tablets & Networking",
    subCategory: "CPUs, memory, motherboards, desktops, drives, laptops, monitors, printers, tablets, and readers",
    rate: "Portion up to $2,500: 7%; portion above $2,500: 2.35%",
  },
  { mainCategory: "Computers/Tablets & Networking", subCategory: "Memory card and USB adapters", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
  { mainCategory: "Consumer Electronics", subCategory: "Selected batteries, audio accessories, TV/video parts, GPS accessories, and VR parts", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Consumer Electronics", subCategory: "Everything else", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
  { mainCategory: "eBay Motors", subCategory: "Selected tires and wheels", rate: "Portion up to $1,000: 9.35%; portion above $1,000: 2.35%" },
  { mainCategory: "eBay Motors", subCategory: "Automotive tools, parts, and safety accessories", rate: "Portion up to $1,000: 11.35%; portion above $2,500: 2.35%" },
  { mainCategory: "eBay Motors", subCategory: "Parts & Accessories apparel and merchandise", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "eBay Motors", subCategory: "In-car technology, GPS, and security", rate: "Portion up to $1,000: 9%; portion above $1,000: 2.35%" },
  {
    mainCategory: "Jewelry & Watches",
    subCategory: "Parts, accessories, and watches",
    rate: "Portion up to $1,000: 12.5%; portion over $1,000 up to $5,000: 4%; portion above $5,000: 3%",
  },
  { mainCategory: "Jewelry & Watches", subCategory: "Everything else", rate: "Portion up to $5,000: 13%; portion above $5,000: 7%" },
  { mainCategory: "Movies & TV", subCategory: "Movie NFTs", rate: "5%" },
  { mainCategory: "Movies & TV", subCategory: "Everything else", rate: "Portion up to $2,500: 14.95%; portion above $2,500: 2.35%" },
  { mainCategory: "Music", subCategory: "Music NFTs", rate: "5%" },
  { mainCategory: "Music", subCategory: "Vinyl records", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Music", subCategory: "Everything else", rate: "Portion up to $2,500: 14.95%; portion above $2,500: 2.35%" },
  { mainCategory: "Musical Instruments & Gear", subCategory: "Guitars and basses", rate: "Portion up to $2,500: 6.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Musical Instruments & Gear", subCategory: "DJ equipment and pro audio equipment", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
  { mainCategory: "Musical Instruments & Gear", subCategory: "Everything else", rate: "Portion up to $2,500: 10%; portion above $2,500: 2.35%" },
  { mainCategory: "Sports Mem, Cards & Fan Shop", subCategory: "Sports trading card NFTs", rate: "5%" },
  { mainCategory: "Sports Mem, Cards & Fan Shop", subCategory: "Everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Toys & Hobbies", subCategory: "Collectible card game NFTs", rate: "5%" },
  { mainCategory: "Toys & Hobbies", subCategory: "Collectible card games and everything else", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Video Games & Consoles", subCategory: "Replacement parts, tools, accessories, and video games", rate: "Portion up to $2,500: 12.35%; portion above $2,500: 2.35%" },
  { mainCategory: "Video Games & Consoles", subCategory: "Video game consoles", rate: "Portion up to $2,500: 7%; portion above $2,500: 2.35%" },
  { mainCategory: "Video Games & Consoles", subCategory: "Everything else", rate: "Portion up to $2,500: 9%; portion above $2,500: 2.35%" },
];

function parseNumber(value: string): number {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : 0;
}

function formatMoney(value: number, currencyCode: "USD" | "GBP") {
  return new Intl.NumberFormat(currencyCode === "USD" ? "en-US" : "en-GB", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function Field({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = "0.01",
  help,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="flex min-h-11 items-center rounded-lg border border-border bg-background px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {prefix ? <span className="mr-2 text-sm font-medium text-muted-foreground">{prefix}</span> : null}
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(parseNumber(event.target.value))}
          className="w-full bg-transparent py-2 text-sm font-semibold text-foreground outline-none"
          aria-describedby={help ? `${id}-help` : undefined}
        />
        {suffix ? <span className="ml-2 text-sm font-medium text-muted-foreground">{suffix}</span> : null}
      </div>
      {help ? (
        <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

function MetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "strong" | "muted";
}) {
  const valueClass =
    tone === "strong" ? "text-base font-bold text-foreground" : tone === "muted" ? "text-muted-foreground" : "font-semibold text-foreground";

  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function FeeRateTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: { mainCategory: string; subCategory: string; rate: string }[];
}) {
  return (
    <article className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Table2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[22%] border-b border-border px-4 py-3 font-bold">
                Main Category
              </th>
              <th scope="col" className="w-[38%] border-b border-border px-4 py-3 font-bold">
                Sub Category
              </th>
              <th scope="col" className="w-[40%] border-b border-border px-4 py-3 font-bold">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.mainCategory}-${row.subCategory}-${index}`} className="odd:bg-background/40">
                <th scope="row" className="align-top border-b border-border px-4 py-4 font-semibold leading-6 text-foreground">
                  <span className="block break-words">{row.mainCategory}</span>
                </th>
                <td className="align-top border-b border-border px-4 py-4 leading-6 text-muted-foreground">
                  <span className="block break-words">{row.subCategory}</span>
                </td>
                <td className="align-top border-b border-border px-4 py-4 leading-6 font-semibold text-foreground">
                  <span className="block break-words">{row.rate}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {rows.map((row, index) => (
          <div key={`${row.mainCategory}-${row.subCategory}-mobile-${index}`} className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">{row.mainCategory}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{row.subCategory}</p>
            <p className="mt-3 rounded-lg bg-secondary/70 px-3 py-2 text-sm font-bold leading-6 text-foreground">{row.rate}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function EbayFeesCalculatorPage() {
  const [input, setInput] = useState<EbayFeesInput>(defaultInput);

  const result = useMemo(() => calculateEbayFees(input), [input]);
  const marketplace = MARKETPLACE_DEFAULTS.us;
  const categories = EBAY_FEE_CATEGORIES.us;
  const hasSoldPrice = input.itemSoldPrice > 0;
  const profitable = result.profit >= 0;

  useSeo({
    title: "eBay Fees Calculator | Calculate eBay Seller Fees & Profit",
    description:
      "Use this free eBay US fees calculator to estimate selling fees, final value fees, shipping costs, promoted listing fees, break-even price, and profit margin.",
    canonical: pageUrl,
    image: `${SITE_URL}/logo.png`,
    robots: "index,follow",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "eBay Fees Calculator",
        url: pageUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Free eBay US seller fee and profit calculator for estimating final value fees, promoted listing fees, shipping costs, break-even price, and profit margin.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "SellerSuit", url: SITE_URL },
      },
      breadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: "Resources", url: `${SITE_URL}/resources` },
        { name: "eBay Fees Calculator", url: pageUrl },
      ]),
      faqJsonLd(faqItems),
    ].filter(Boolean) as object[],
  });

  const updateInput = <K extends keyof EbayFeesInput>(key: K, value: EbayFeesInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (categoryValue: string) => {
    const category = categories.find((item) => item.value === categoryValue);
    setInput((prev) => ({
      ...prev,
      category: categoryValue,
      ebayFeePercent: category?.feePercent ?? prev.ebayFeePercent,
    }));
  };

  const money = (value: number) => formatMoney(value, result.currencyCode);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-border bg-hero-gradient pt-28">
          <div className="container px-4 pb-16 pt-10 sm:pb-20 lg:pt-16">
            <div className="grid items-end gap-10 lg:grid-cols-[1fr_0.86fr]">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  Free Seller Tool
                </div>
                <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  eBay Fees Calculator
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  Estimate eBay US selling fees, shipping costs, promoted listing fees, break-even price, and profit margin before you list.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="cta-glow">
                    <a href="#calculator">Start Calculating</a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/calculator">View Seller Tools</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Live estimate</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{money(result.profit)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      profitable ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {profitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {profitable ? "Profit estimate" : "Loss estimate"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-secondary/70 p-3">
                    <p className="text-muted-foreground">Fees</p>
                    <p className="mt-1 font-bold tabular-nums text-foreground">{money(result.totalEbayFees)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/70 p-3">
                    <p className="text-muted-foreground">Margin</p>
                    <p className="mt-1 font-bold tabular-nums text-foreground">{formatPercent(result.profitMargin)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/70 p-3">
                    <p className="text-muted-foreground">Break-even</p>
                    <p className="mt-1 font-bold tabular-nums text-foreground">{money(result.breakEvenPrice)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/70 p-3">
                    <p className="text-muted-foreground">Marketplace</p>
                    <p className="mt-1 font-bold text-foreground">{marketplace.label}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="calculator" className="scroll-mt-24 bg-secondary/20 py-16 sm:py-20">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Calculate eBay Selling Fees and Profit</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                See fees, costs, break-even price, and margin in one place.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Use editable US marketplace defaults as a planning estimate, then adjust the fee percentage for your exact category, store level, or account.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
              <form className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-label="eBay fees calculator inputs">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:col-span-2">
                    <p className="text-sm font-bold text-foreground">Marketplace: eBay United States</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      This page uses US dollar currency, US fee presets, and the US category-rate table below.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category" className="block text-sm font-semibold text-foreground">
                      Category
                    </label>
                    <select
                      id="category"
                      value={input.category}
                      onChange={(event) => handleCategoryChange(event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs leading-5 text-muted-foreground">Selecting a category updates the editable fee percentage.</p>
                  </div>

                  <Field
                    id="item-sold-price"
                    label="Item Sold Price"
                    prefix={result.currencySymbol}
                    value={input.itemSoldPrice}
                    onChange={(value) => updateInput("itemSoldPrice", value)}
                  />
                  <Field
                    id="item-cost"
                    label="Item Cost"
                    prefix={result.currencySymbol}
                    value={input.itemCost}
                    onChange={(value) => updateInput("itemCost", value)}
                  />
                  <Field
                    id="ebay-fee-percent"
                    label="eBay Fee"
                    suffix="%"
                    step="0.1"
                    value={input.ebayFeePercent}
                    onChange={(value) => updateInput("ebayFeePercent", value)}
                    help={`Fixed transaction fee: ${money(marketplace.fixedTransactionFee)}`}
                  />
                  <Field
                    id="shipping-charge"
                    label="Shipping Charge"
                    prefix={result.currencySymbol}
                    value={input.shippingCharge}
                    onChange={(value) => updateInput("shippingCharge", value)}
                  />
                  <Field
                    id="shipping-cost"
                    label="Shipping Cost"
                    prefix={result.currencySymbol}
                    value={input.shippingCost}
                    onChange={(value) => updateInput("shippingCost", value)}
                  />
                  <Field
                    id="promotion-percent"
                    label="Promotion"
                    suffix="%"
                    step="0.1"
                    value={input.promotionPercent}
                    onChange={(value) => updateInput("promotionPercent", value)}
                  />
                  <Field
                    id="other-costs"
                    label="Other Costs"
                    prefix={result.currencySymbol}
                    value={input.otherCosts}
                    onChange={(value) => updateInput("otherCosts", value)}
                  />

                  <div className="space-y-2">
                    <label htmlFor="sales-tax-method" className="block text-sm font-semibold text-foreground">
                      Sales Tax Method
                    </label>
                    <select
                      id="sales-tax-method"
                      value={input.salesTaxMethod}
                      onChange={(event) => updateInput("salesTaxMethod", event.target.value as SalesTaxMethod)}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <Field
                    id="sales-tax-amount"
                    label="Sales Tax Amount"
                    prefix={input.salesTaxMethod === "fixed" ? result.currencySymbol : undefined}
                    suffix={input.salesTaxMethod === "percentage" ? "%" : undefined}
                    step="0.1"
                    value={input.salesTaxAmount}
                    onChange={(value) => updateInput("salesTaxAmount", value)}
                    help="Displayed separately as buyer-charged tax."
                  />
                </div>
              </form>

              <div className="grid gap-6">
                <section
                  className={`rounded-lg border bg-card p-5 shadow-sm ${
                    !hasSoldPrice
                      ? "border-border"
                      : profitable
                        ? "border-success/30"
                        : "border-destructive/30"
                  }`}
                  aria-live="polite"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Your Profit</p>
                      {!hasSoldPrice ? (
                        <p className="mt-3 text-2xl font-extrabold text-foreground">Enter a sold price</p>
                      ) : (
                        <p
                          className={`mt-3 text-4xl font-extrabold tabular-nums ${
                            profitable ? "text-success" : "text-destructive"
                          }`}
                        >
                          {money(result.profit)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                        !hasSoldPrice
                          ? "bg-secondary text-muted-foreground"
                          : profitable
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {!hasSoldPrice ? (
                        <Info className="h-4 w-4" />
                      ) : profitable ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {!hasSoldPrice ? "Waiting for price" : profitable ? "Positive profit" : "Negative profit"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Total profit is gross revenue minus estimated eBay fees, item cost, shipping cost, and other costs.
                  </p>
                </section>

                <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-bold text-foreground">Profit & Fees Breakdown</h2>
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    <MetricRow label="Sold Price" value={money(input.itemSoldPrice)} tone="strong" />
                    <MetricRow label="Gross Revenue" value={money(result.grossRevenue)} />
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-foreground">eBay Transaction Fees</h3>
                  <div className="mt-2 divide-y divide-border">
                    <MetricRow label="Final Value Fee" value={money(result.finalValueFee)} />
                    <MetricRow label="Fixed Transaction Fee" value={money(result.fixedTransactionFee)} />
                    <MetricRow label="Promotion Fees" value={money(result.promotionFee)} />
                    <MetricRow label="Total eBay Fees" value={money(result.totalEbayFees)} tone="strong" />
                    <MetricRow label="Total eBay Fees %" value={formatPercent(result.totalEbayFeesPercentage)} />
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-foreground">Other Costs</h3>
                  <div className="mt-2 divide-y divide-border">
                    <MetricRow label="Item Cost" value={money(input.itemCost)} />
                    <MetricRow label="Shipping Cost" value={money(input.shippingCost)} />
                    <MetricRow label="Other Costs" value={money(input.otherCosts)} />
                    <MetricRow label="Total Cost" value={money(result.totalCosts)} tone="strong" />
                    <MetricRow label="Total Cost %" value={formatPercent(result.totalCostsPercentage)} />
                  </div>
                </section>

                <section className="rounded-lg border border-primary/20 bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-bold text-foreground">Summary</h2>
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    <MetricRow label="Break-even Price" value={money(result.breakEvenPrice)} />
                    <MetricRow label="Profit Margin" value={formatPercent(result.profitMargin)} />
                    <MetricRow label="Sales Tax" value={money(result.salesTaxDisplay)} />
                    <MetricRow label="Total Profit" value={money(result.profit)} tone="strong" />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background py-16 sm:py-20" aria-labelledby="us-fee-table-heading">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">eBay US Final Value Fee Table</p>
              <h2 id="us-fee-table-heading" className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Category fee rates for eBay US sellers
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Use these tables as a reference beside the calculator. Rates vary by category, store subscription, sale amount, and seller account details.
              </p>
            </div>

            <div className="mt-10 space-y-8">
              <FeeRateTable
                title="No store or Starter store subscriber"
                description="Common eBay US final value fee rates for sellers without a store subscription or with a Starter store subscription."
                rows={usFeeRows}
              />
              <FeeRateTable
                title="Basic, Premium, Anchor, and Enterprise store subscribers"
                description="Common eBay US final value fee rates for sellers with higher store subscription tiers."
                rows={usStoreFeeRows}
              />
            </div>

            <div className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
              <p>
                <strong className="text-foreground">International fee:</strong> international sales may include an additional 1.65% fee.
              </p>
              <p>
                <strong className="text-foreground">Promoted listings:</strong> ad rates can be set from 1% to 20% in 0.1% increments and are charged when an eligible click leads to a purchase.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-background py-16 sm:py-20">
          <div className="container px-4">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-primary">How the eBay Fees Calculator Works</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground">Built for real seller decisions, not rough guesses.</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  The calculator starts with your sold price and buyer shipping charge, estimates marketplace fees, then subtracts product and fulfillment costs. Use it before listing to check whether a product has enough room for margin.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Percent,
                    title: "What costs are included?",
                    text: "Final value fee, fixed transaction fee, promoted listing fee, item cost, shipping cost, other costs, and a separate sales tax display.",
                  },
                  {
                    icon: Table2,
                    title: "eBay US Fee Table",
                    text: "Compare non-store, Starter store, and higher store subscription category rates beside the live calculator.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Promoted Listing Fees",
                    text: "Add your promotion percentage to see how ad spend affects total eBay fees and final profit margin.",
                  },
                  {
                    icon: ReceiptText,
                    title: "Sales Tax and Seller Profit",
                    text: "Sales tax is shown separately as buyer-charged tax and is not subtracted from seller profit in this estimate.",
                  },
                ].map((item) => (
                  <article key={item.title} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                    <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20 py-16 sm:py-20">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-primary">Frequently Asked Questions</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-foreground">eBay fee calculator questions, answered.</h2>
            </div>
            <Accordion type="single" collapsible className="mx-auto mt-10 max-w-4xl rounded-lg border border-border bg-card px-4 shadow-sm">
              {faqItems.map((item, index) => (
                <AccordionItem key={item.q} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-6 text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <div className="container px-4">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-primary">Related Resources</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-foreground">More Seller Tools</h2>
              </div>
              <Button asChild variant="outline">
                <Link to="/documentation">Open documentation</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "eBay Profit Calculator",
                  text: "Estimate margins for supplier-to-eBay listings.",
                  href: "/calculator",
                },
                {
                  title: "SellerSuit Documentation",
                  text: "Learn the extension workflow, pricing tools, and listing checks.",
                  href: "/documentation",
                },
                {
                  title: "How SellerSuit Works",
                  text: "See the supplier import to eBay listing workflow.",
                  href: "/how-it-works",
                },
              ].map((resource) => (
                <Link
                  key={resource.title}
                  to={resource.href}
                  className="group rounded-lg border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{resource.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
