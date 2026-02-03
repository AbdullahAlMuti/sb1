export type EbayOrderLike = {
  id: string;
  ebay_order_id: string;
  sales_record_number?: string | number | null;
  buyer_name: string | null;
  buyer_username: string | null;
  buyer_email: string | null;
  order_date: string | null;
  order_status: string | null;
  total_amount: number | null;
  subtotal: number | null;
  currency: string | null;
  shipping_address: any;
  line_items: any;
  synced_at: string | null;
  created_at: string;
  updated_at?: string | null;
  ship_by_date: string | null;
  date_sold: string | null;
  date_paid: string | null;
  shipping_cost: number | null;
  add_fee?: number | null;

};

export type LineItemLike = {
  title?: string;
  sku?: string;
  quantity?: number;
  item_number?: string;
};
