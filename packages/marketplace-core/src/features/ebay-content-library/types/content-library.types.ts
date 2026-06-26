export interface MustSellItem {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  profit: number;
  sales_count: number;
  total_sold: number;
  country: string;
  category: string | null;
  ebay_url: string | null;
  is_active: boolean;
  created_at: string;
  position: number;
}

export interface ProfitableProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  shipping_cost: number;
  profit: number;
  stock: number;
  sales_count: number;
  total_sold: number;
  sku: string | null;
  tags: string[] | null;
  discount: number | null;
  country: string;
  category: string | null;
  ebay_url: string | null;
  is_active: boolean;
  created_at: string;
  position: number;
}
