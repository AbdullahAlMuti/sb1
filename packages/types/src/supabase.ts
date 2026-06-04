export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      amazon_settings: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          marketplace: string
          refresh_token: string
          update_frequency_hours: number
          updated_at: string
        }
        Insert: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          marketplace?: string
          refresh_token?: string
          update_frequency_hours?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          marketplace?: string
          refresh_token?: string
          update_frequency_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      auto_orders: {
        Row: {
          amazon_asin: string | null
          amazon_order_id: string | null
          amazon_url: string | null
          buyer_address: Json | null
          buyer_name: string | null
          created_at: string | null
          details: Json | null
          ebay_order_id: string | null
          ebay_sku: string | null
          error_message: string | null
          id: string
          item_price: number | null
          listing_id: string | null
          profit: number | null
          risk_score: number | null
          shipping_cost: number | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amazon_asin?: string | null
          amazon_order_id?: string | null
          amazon_url?: string | null
          buyer_address?: Json | null
          buyer_name?: string | null
          created_at?: string | null
          details?: Json | null
          ebay_order_id?: string | null
          ebay_sku?: string | null
          error_message?: string | null
          id?: string
          item_price?: number | null
          listing_id?: string | null
          profit?: number | null
          risk_score?: number | null
          shipping_cost?: number | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          amazon_asin?: string | null
          amazon_order_id?: string | null
          amazon_url?: string | null
          buyer_address?: Json | null
          buyer_name?: string | null
          created_at?: string | null
          details?: Json | null
          ebay_order_id?: string | null
          ebay_sku?: string | null
          error_message?: string | null
          id?: string
          item_price?: number | null
          listing_id?: string | null
          profit?: number | null
          risk_score?: number | null
          shipping_cost?: number | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      best_selling_items: {
        Row: {
          category: string | null
          country: string
          created_at: string
          created_by: string | null
          ebay_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          sales_count: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          sales_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          sales_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_generation_settings: {
        Row: {
          affiliate_tag: string | null
          auto_generate_enabled: boolean | null
          auto_publish_enabled: boolean | null
          content_style: string | null
          created_at: string
          custom_prompt: string | null
          default_destination_id: string | null
          id: string
          include_price_history: boolean | null
          include_pros_cons: boolean | null
          include_specifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_tag?: string | null
          auto_generate_enabled?: boolean | null
          auto_publish_enabled?: boolean | null
          content_style?: string | null
          created_at?: string
          custom_prompt?: string | null
          default_destination_id?: string | null
          id?: string
          include_price_history?: boolean | null
          include_pros_cons?: boolean | null
          include_specifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_tag?: string | null
          auto_generate_enabled?: boolean | null
          auto_publish_enabled?: boolean | null
          content_style?: string | null
          created_at?: string
          custom_prompt?: string | null
          default_destination_id?: string | null
          id?: string
          include_price_history?: boolean | null
          include_pros_cons?: boolean | null
          include_specifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_settings_default_destination_id_fkey"
            columns: ["default_destination_id"]
            isOneToOne: false
            referencedRelation: "publishing_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          affiliate_link: string | null
          amazon_asin: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          generation_mode: string | null
          id: string
          listing_id: string | null
          meta_description: string | null
          product_price: number | null
          product_title: string | null
          published_at: string | null
          published_to: string | null
          published_url: string | null
          seo_keywords: string[] | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_link?: string | null
          amazon_asin?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_mode?: string | null
          id?: string
          listing_id?: string | null
          meta_description?: string | null
          product_price?: number | null
          product_title?: string | null
          published_at?: string | null
          published_to?: string | null
          published_url?: string | null
          seo_keywords?: string[] | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_link?: string | null
          amazon_asin?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          generation_mode?: string | null
          id?: string
          listing_id?: string | null
          meta_description?: string | null
          product_price?: number | null
          product_title?: string | null
          published_at?: string | null
          published_to?: string | null
          published_url?: string | null
          seo_keywords?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_settings: {
        Row: {
          created_at: string
          desired_profit_percent: number
          ebay_fee_percent: number
          id: string
          promotional_fee_percent: number
          tax_percent: number
          tracking_fee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desired_profit_percent?: number
          ebay_fee_percent?: number
          id?: string
          promotional_fee_percent?: number
          tax_percent?: number
          tracking_fee?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          desired_profit_percent?: number
          ebay_fee_percent?: number
          id?: string
          promotional_fee_percent?: number
          tax_percent?: number
          tracking_fee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          stripe_session_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          id?: string
          stripe_session_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          stripe_session_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          is_one_time_per_user: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          is_one_time_per_user?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          is_one_time_per_user?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ebay_orders: {
        Row: {
          ad_fee: number | null
          add_fee: number | null
          amazon_price: number | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_username: string | null
          buyer_zip: string | null
          created_at: string
          currency: string | null
          custom_label: string | null
          date_paid: string | null
          date_sold: string | null
          deleted_at: string | null
          delivery_date: string | null
          discount_info: string | null
          ebay_order_id: string
          id: string
          item_image_url: string | null
          item_number: string | null
          item_title: string | null
          line_items: Json | null
          net_profit: number | null
          order_date: string | null
          order_status: string | null
          platform: string | null
          quantity: number | null
          sales_record_number: number | null
          ship_by_date: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          sold_via: string | null
          subtotal: number | null
          synced_at: string | null
          total_amount: number | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_fee?: number | null
          add_fee?: number | null
          amazon_price?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_username?: string | null
          buyer_zip?: string | null
          created_at?: string
          currency?: string | null
          custom_label?: string | null
          date_paid?: string | null
          date_sold?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          discount_info?: string | null
          ebay_order_id: string
          id?: string
          item_image_url?: string | null
          item_number?: string | null
          item_title?: string | null
          line_items?: Json | null
          net_profit?: number | null
          order_date?: string | null
          order_status?: string | null
          platform?: string | null
          quantity?: number | null
          sales_record_number?: number | null
          ship_by_date?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          sold_via?: string | null
          subtotal?: number | null
          synced_at?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_fee?: number | null
          add_fee?: number | null
          amazon_price?: number | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_username?: string | null
          buyer_zip?: string | null
          created_at?: string
          currency?: string | null
          custom_label?: string | null
          date_paid?: string | null
          date_sold?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          discount_info?: string | null
          ebay_order_id?: string
          id?: string
          item_image_url?: string | null
          item_number?: string | null
          item_title?: string | null
          line_items?: Json | null
          net_profit?: number | null
          order_date?: string | null
          order_status?: string | null
          platform?: string | null
          quantity?: number | null
          sales_record_number?: number | null
          ship_by_date?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          sold_via?: string | null
          subtotal?: number | null
          synced_at?: string | null
          total_amount?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      extension_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_name: string | null
          extension_id: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          extension_id: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          extension_id?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          listing_id: string | null
          message: string | null
          new_value: string | null
          old_value: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          new_value?: string | null
          old_value?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          new_value?: string | null
          old_value?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          listing_id: string | null
          new_price: number | null
          new_stock: number | null
          old_price: number | null
          old_stock: number | null
          status: string
          sync_type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          listing_id?: string | null
          new_price?: number | null
          new_stock?: number | null
          old_price?: number | null
          old_stock?: number | null
          status?: string
          sync_type: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          listing_id?: string | null
          new_price?: number | null
          new_stock?: number | null
          old_price?: number | null
          old_stock?: number | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sync_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_variations: {
        Row: {
          amazon_price: number | null
          attributes: Json
          created_at: string
          ebay_price: number | null
          id: string
          image_url: string | null
          listing_id: string
          price: number | null
          quantity: number | null
          sku: string | null
          sort_order: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amazon_price?: number | null
          attributes?: Json
          created_at?: string
          ebay_price?: number | null
          id?: string
          image_url?: string | null
          listing_id: string
          price?: number | null
          quantity?: number | null
          sku?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amazon_price?: number | null
          attributes?: Json
          created_at?: string
          ebay_price?: number | null
          id?: string
          image_url?: string | null
          listing_id?: string
          price?: number | null
          quantity?: number | null
          sku?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_variations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          amazon_asin: string | null
          amazon_data: Json | null
          amazon_price: number | null
          amazon_stock_quantity: number | null
          amazon_stock_status: string | null
          amazon_url: string | null
          auto_order_enabled: boolean | null
          created_at: string | null
          ebay_data: Json | null
          ebay_item_id: string | null
          ebay_price: number | null
          has_variations: boolean | null
          id: string
          inventory_last_updated: string | null
          inventory_status: string | null
          last_checked: string | null
          price_last_updated: string | null
          pricing_rule: Json | null
          sku: string | null
          status: string | null
          sync_error: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          variation_count: number | null
        }
        Insert: {
          amazon_asin?: string | null
          amazon_data?: Json | null
          amazon_price?: number | null
          amazon_stock_quantity?: number | null
          amazon_stock_status?: string | null
          amazon_url?: string | null
          auto_order_enabled?: boolean | null
          created_at?: string | null
          ebay_data?: Json | null
          ebay_item_id?: string | null
          ebay_price?: number | null
          has_variations?: boolean | null
          id?: string
          inventory_last_updated?: string | null
          inventory_status?: string | null
          last_checked?: string | null
          price_last_updated?: string | null
          pricing_rule?: Json | null
          sku?: string | null
          status?: string | null
          sync_error?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          variation_count?: number | null
        }
        Update: {
          amazon_asin?: string | null
          amazon_data?: Json | null
          amazon_price?: number | null
          amazon_stock_quantity?: number | null
          amazon_stock_status?: string | null
          amazon_url?: string | null
          auto_order_enabled?: boolean | null
          created_at?: string | null
          ebay_data?: Json | null
          ebay_item_id?: string | null
          ebay_price?: number | null
          has_variations?: boolean | null
          id?: string
          inventory_last_updated?: string | null
          inventory_status?: string | null
          last_checked?: string | null
          price_last_updated?: string | null
          pricing_rule?: Json | null
          sku?: string | null
          status?: string | null
          sync_error?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          variation_count?: number | null
        }
        Relationships: []
      }
      must_sell_items: {
        Row: {
          category: string | null
          country: string
          created_at: string
          created_by: string | null
          ebay_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          position: number | null
          price: number
          profit: number
          sales_count: number
          title: string
          total_sold: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number | null
          price?: number
          profit?: number
          sales_count?: number
          title: string
          total_sold?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number | null
          price?: number
          profit?: number
          sales_count?: number
          title?: string
          total_sold?: number
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          priority: number
          starts_at: string | null
          target_audience: string
          target_plan_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string | null
          target_audience?: string
          target_plan_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string | null
          target_audience?: string
          target_plan_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_target_plan_id_fkey"
            columns: ["target_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          email_sent_to: string | null
          error_message: string | null
          id: string
          listing_id: string | null
          message: string
          notification_type: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          listing_id?: string | null
          message: string
          notification_type: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent_to?: string | null
          error_message?: string | null
          id?: string
          listing_id?: string | null
          message?: string
          notification_type?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean
          id: string
          notification_email: string | null
          notify_low_stock: boolean
          notify_out_of_stock: boolean
          notify_price_decrease: boolean
          notify_price_increase: boolean
          price_change_threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          notification_email?: string | null
          notify_low_stock?: boolean
          notify_out_of_stock?: boolean
          notify_price_decrease?: boolean
          notify_price_increase?: boolean
          price_change_threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          notification_email?: string | null
          notify_low_stock?: boolean
          notify_out_of_stock?: boolean
          notify_price_decrease?: boolean
          notify_price_increase?: boolean
          price_change_threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_enrichments: {
        Row: {
          amazon_refund: boolean
          amazon_refund_amount: number | null
          created_at: string
          ebay_order_row_id: string
          ebay_refund: boolean
          ebay_refund_amount: number | null
          id: string
          sent_message: boolean
          sent_message_at: string | null
          supplier_arriving_date: string | null
          supplier_cost: number | null
          supplier_order_date: string | null
          supplier_order_number: string | null
          tracking: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amazon_refund?: boolean
          amazon_refund_amount?: number | null
          created_at?: string
          ebay_order_row_id: string
          ebay_refund?: boolean
          ebay_refund_amount?: number | null
          id?: string
          sent_message?: boolean
          sent_message_at?: string | null
          supplier_arriving_date?: string | null
          supplier_cost?: number | null
          supplier_order_date?: string | null
          supplier_order_number?: string | null
          tracking?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amazon_refund?: boolean
          amazon_refund_amount?: number | null
          created_at?: string
          ebay_order_row_id?: string
          ebay_refund?: boolean
          ebay_refund_amount?: number | null
          id?: string
          sent_message?: boolean
          sent_message_at?: string | null
          supplier_arriving_date?: string | null
          supplier_cost?: number | null
          supplier_order_date?: string | null
          supplier_order_number?: string | null
          tracking?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_enrichments_ebay_order_row_id_fkey"
            columns: ["ebay_order_row_id"]
            isOneToOne: true
            referencedRelation: "ebay_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          orders_used_after: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          orders_used_after: number
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          orders_used_after?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          auto_orders_enabled: boolean | null
          created_at: string | null
          credits_per_month: number | null
          display_name: string
          duration_months: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          is_trial: boolean | null
          max_auto_orders: number | null
          max_listings: number | null
          max_seo_descriptions: number | null
          max_seo_titles: number | null
          name: string
          order_reset_frequency: string | null
          price_monthly: number | null
          price_yearly: number | null
          seo_enabled: boolean | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          trial_duration_days: number | null
          updated_at: string | null
        }
        Insert: {
          auto_orders_enabled?: boolean | null
          created_at?: string | null
          credits_per_month?: number | null
          display_name: string
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_trial?: boolean | null
          max_auto_orders?: number | null
          max_listings?: number | null
          max_seo_descriptions?: number | null
          max_seo_titles?: number | null
          name: string
          order_reset_frequency?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          seo_enabled?: boolean | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          trial_duration_days?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_orders_enabled?: boolean | null
          created_at?: string | null
          credits_per_month?: number | null
          display_name?: string
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_trial?: boolean | null
          max_auto_orders?: number | null
          max_listings?: number | null
          max_seo_descriptions?: number | null
          max_seo_titles?: number | null
          name?: string
          order_reset_frequency?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          seo_enabled?: boolean | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          trial_duration_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credits: number | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          plan_id: string | null
          settings: Json | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credits?: number | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          plan_id?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          plan_id?: string | null
          settings?: Json | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profitable_product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          product_id?: string
        }
        Relationships: []
      }
      profitable_products: {
        Row: {
          category: string | null
          country: string
          created_at: string
          description: string | null
          discount: number | null
          ebay_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          position: number | null
          price: number
          profit: number
          sales_count: number
          shipping_cost: number
          sku: string | null
          stock: number
          tags: string[] | null
          title: string
          total_sold: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          country?: string
          created_at?: string
          description?: string | null
          discount?: number | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number | null
          price?: number
          profit?: number
          sales_count?: number
          shipping_cost?: number
          sku?: string | null
          stock?: number
          tags?: string[] | null
          title: string
          total_sold?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          country?: string
          created_at?: string
          description?: string | null
          discount?: number | null
          ebay_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number | null
          price?: number
          profit?: number
          sales_count?: number
          shipping_cost?: number
          sku?: string | null
          stock?: number
          tags?: string[] | null
          title?: string
          total_sold?: number
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          prompt_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          prompt_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          prompt_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      publishing_destinations: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          destination_type: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          settings: Json | null
          site_url: string | null
          updated_at: string
          user_id: string
          username: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          destination_type: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          settings?: Json | null
          site_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          destination_type?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          settings?: Json | null
          site_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      shopify_page_settings: {
        Row: {
          content_editable: boolean
          icon_name: string | null
          id: string
          is_visible: boolean
          name: string
          page_key: string
          page_type: string
          plan_access: string
          route: string
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          usage_limit: string
        }
        Insert: {
          content_editable?: boolean
          icon_name?: string | null
          id?: string
          is_visible?: boolean
          name: string
          page_key: string
          page_type?: string
          plan_access?: string
          route: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          usage_limit?: string
        }
        Update: {
          content_editable?: boolean
          icon_name?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          page_key?: string
          page_type?: string
          plan_access?: string
          route?: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          usage_limit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_page_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_design_events: {
        Row: {
          created_at: string
          design_id: string
          event_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          design_id: string
          event_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          design_id?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_design_events_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "store_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_designs: {
        Row: {
          access_level: string
          allowed_plans: string[]
          category: string | null
          compare_at_price: number | null
          created_at: string
          created_by: string | null
          currency: string
          demo_url: string | null
          description: string | null
          gallery_images: string[]
          id: string
          is_featured: boolean
          is_free: boolean
          is_premium: boolean
          is_published: boolean
          is_trending: boolean
          is_visible: boolean
          metadata: Json
          niche: string | null
          preview_image: string | null
          price: number
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number
          status: string
          tags: string[]
          template_url: string | null
          thumbnail_image: string | null
          title: string
          updated_at: string
          updated_by: string | null
          upgrade_message: string | null
        }
        Insert: {
          access_level?: string
          allowed_plans?: string[]
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          demo_url?: string | null
          description?: string | null
          gallery_images?: string[]
          id?: string
          is_featured?: boolean
          is_free?: boolean
          is_premium?: boolean
          is_published?: boolean
          is_trending?: boolean
          is_visible?: boolean
          metadata?: Json
          niche?: string | null
          preview_image?: string | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          status?: string
          tags?: string[]
          template_url?: string | null
          thumbnail_image?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          upgrade_message?: string | null
        }
        Update: {
          access_level?: string
          allowed_plans?: string[]
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          demo_url?: string | null
          description?: string | null
          gallery_images?: string[]
          id?: string
          is_featured?: boolean
          is_free?: boolean
          is_premium?: boolean
          is_published?: boolean
          is_trending?: boolean
          is_visible?: boolean
          metadata?: Json
          niche?: string | null
          preview_image?: string | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          status?: string
          tags?: string[]
          template_url?: string | null
          thumbnail_image?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          upgrade_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_designs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_designs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          action: string
          created_at: string | null
          credits_used: number | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          credits_used?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          credits_used?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          admin_override_limits: Json | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string | null
          credits_used: number | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_blocked: boolean | null
          orders_used: number | null
          plan_id: string
          seo_descriptions_used: number | null
          seo_titles_used: number | null
          status: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_override_limits?: Json | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          credits_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_blocked?: boolean | null
          orders_used?: number | null
          plan_id: string
          seo_descriptions_used?: number | null
          seo_titles_used?: number | null
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_override_limits?: Json | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          credits_used?: number | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_blocked?: boolean | null
          orders_used?: number | null
          plan_id?: string
          seo_descriptions_used?: number | null
          seo_titles_used?: number | null
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ebay_orders_view: {
        Row: {
          Buyer: string | null
          "Date Paid": string | null
          "Net Profit": number | null
          "Order Number": string | null
          Quantity: number | null
          "Sale No": number | null
          "Ship By Date": string | null
          Shipping: number | null
          SKU: string | null
          Transaction: number | null
        }
        Insert: {
          Buyer?: string | null
          "Date Paid"?: string | null
          "Net Profit"?: number | null
          "Order Number"?: string | null
          Quantity?: number | null
          "Sale No"?: number | null
          "Ship By Date"?: string | null
          Shipping?: number | null
          SKU?: string | null
          Transaction?: number | null
        }
        Update: {
          Buyer?: string | null
          "Date Paid"?: string | null
          "Net Profit"?: number | null
          "Order Number"?: string | null
          Quantity?: number | null
          "Sale No"?: number | null
          "Ship By Date"?: string | null
          Shipping?: number | null
          SKU?: string | null
          Transaction?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_subscription_expired: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_user_blocked: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
