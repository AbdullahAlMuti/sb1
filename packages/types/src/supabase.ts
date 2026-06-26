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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          device_id: string | null
          id: string
          message: string | null
          metadata: Json
          resolved_at: string | null
          severity: string
          status: string
          title: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_feature_flags: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          rollout_percentage: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          rollout_percentage?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          rollout_percentage?: number
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
          attempt_count: number
          code: string
          created_at: string | null
          expires_at: string
          last_attempt_at: string | null
          locked_until: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          code: string
          created_at?: string | null
          expires_at: string
          last_attempt_at?: string | null
          locked_until?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          code?: string
          created_at?: string | null
          expires_at?: string
          last_attempt_at?: string | null
          locked_until?: string | null
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
      bulk_job_items: {
        Row: {
          created_at: string
          draft_overrides: Json
          ebay_price: number | null
          error: string | null
          id: string
          image_url: string | null
          listing_id: string | null
          position: number
          sku: string | null
          source: string
          status: string
          supplier: string | null
          supplier_item_id: string | null
          supplier_price: number | null
          supplier_url: string
          title: string | null
          updated_at: string
          user_id: string
          variation_count: number | null
        }
        Insert: {
          created_at?: string
          draft_overrides?: Json
          ebay_price?: number | null
          error?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          position?: number
          sku?: string | null
          source?: string
          status?: string
          supplier?: string | null
          supplier_item_id?: string | null
          supplier_price?: number | null
          supplier_url: string
          title?: string | null
          updated_at?: string
          user_id: string
          variation_count?: number | null
        }
        Update: {
          created_at?: string
          draft_overrides?: Json
          ebay_price?: number | null
          error?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          position?: number
          sku?: string | null
          source?: string
          status?: string
          supplier?: string | null
          supplier_item_id?: string | null
          supplier_price?: number | null
          supplier_url?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          variation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_job_items_listing_id_fkey"
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
      checkout_sessions: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          metadata: Json | null
          selected_plan_id: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          selected_plan_id?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          selected_plan_id?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      ebay_connections: {
        Row: {
          access_token_expires_at: string | null
          created_at: string
          ebay_user_id: string | null
          ebay_username: string | null
          id: string
          last_error: string | null
          last_verified_at: string | null
          metadata: Json
          scopes: string[]
          seller_profile_id: string | null
          status: string
          token_storage_status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token_expires_at?: string | null
          created_at?: string
          ebay_user_id?: string | null
          ebay_username?: string | null
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          metadata?: Json
          scopes?: string[]
          seller_profile_id?: string | null
          status?: string
          token_storage_status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token_expires_at?: string | null
          created_at?: string
          ebay_user_id?: string | null
          ebay_username?: string | null
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          metadata?: Json
          scopes?: string[]
          seller_profile_id?: string | null
          status?: string
          token_storage_status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebay_connections_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebay_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebay_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      extension_activity_logs: {
        Row: {
          created_at: string
          device_id: string | null
          event_type: string
          feature_key: string | null
          id: string
          ip_address: string | null
          metadata: Json
          request_id: string | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_type: string
          feature_key?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          request_id?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_type?: string
          feature_key?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          request_id?: string | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_activity_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "extension_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_devices: {
        Row: {
          browser: string | null
          browser_version: string | null
          created_at: string
          device_name: string | null
          extension_version: string | null
          first_seen_at: string
          id: string
          install_id_hash: string
          last_seen_at: string | null
          legacy_auth_detected: boolean
          legacy_user_id: string | null
          metadata: Json
          migration_status: string
          os: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          trust_score: number
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          device_name?: string | null
          extension_version?: string | null
          first_seen_at?: string
          id?: string
          install_id_hash: string
          last_seen_at?: string | null
          legacy_auth_detected?: boolean
          legacy_user_id?: string | null
          metadata?: Json
          migration_status?: string
          os?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          device_name?: string | null
          extension_version?: string | null
          first_seen_at?: string
          id?: string
          install_id_hash?: string
          last_seen_at?: string | null
          legacy_auth_detected?: boolean
          legacy_user_id?: string | null
          metadata?: Json
          migration_status?: string
          os?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_devices_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_devices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_error_logs: {
        Row: {
          created_at: string
          device_id: string | null
          error_class: string
          error_code: string | null
          feature_key: string | null
          id: string
          message: string | null
          metadata: Json
          recoverable: boolean
          session_id: string | null
          stack: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          error_class?: string
          error_code?: string | null
          feature_key?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          recoverable?: boolean
          session_id?: string | null
          stack?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          error_class?: string
          error_code?: string | null
          feature_key?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          recoverable?: boolean
          session_id?: string | null
          stack?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_error_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_error_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "extension_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_error_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          device_id: string | null
          error_class: string | null
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          result: Json
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_class?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          result?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_class?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          result?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_jobs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_migrations: {
        Row: {
          completed_at: string | null
          created_at: string
          device_id: string | null
          error_message: string | null
          id: string
          legacy_storage_backup_created: boolean
          migration_key: string
          source_version: string | null
          started_at: string | null
          status: string
          target_version: string | null
          telemetry: Json
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          legacy_storage_backup_created?: boolean
          migration_key: string
          source_version?: string | null
          started_at?: string | null
          status?: string
          target_version?: string | null
          telemetry?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          id?: string
          legacy_storage_backup_created?: boolean
          migration_key?: string
          source_version?: string | null
          started_at?: string | null
          status?: string
          target_version?: string | null
          telemetry?: Json
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_migrations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_migrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_migrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_pairing_codes: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          approved_workspace_id: string | null
          browser: string | null
          client_secret_hash: string | null
          code_hash: string | null
          connect_token_hash: string | null
          created_at: string
          device_id: string | null
          device_name: string | null
          expires_at: string
          extension_version: string | null
          flow_type: string
          id: string
          install_id_hash: string
          metadata: Json
          status: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          approved_workspace_id?: string | null
          browser?: string | null
          client_secret_hash?: string | null
          code_hash?: string | null
          connect_token_hash?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          expires_at: string
          extension_version?: string | null
          flow_type?: string
          id?: string
          install_id_hash: string
          metadata?: Json
          status?: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          approved_workspace_id?: string | null
          browser?: string | null
          client_secret_hash?: string | null
          code_hash?: string | null
          connect_token_hash?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          expires_at?: string
          extension_version?: string | null
          flow_type?: string
          id?: string
          install_id_hash?: string
          metadata?: Json
          status?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_pairing_codes_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_pairing_codes_approved_workspace_id_fkey"
            columns: ["approved_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_pairing_codes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_session_grants: {
        Row: {
          created_at: string
          device_id: string
          expires_at: string
          grant_token_hash: string
          id: string
          metadata: Json
          request_id: string | null
          status: string
          used_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          expires_at: string
          grant_token_hash: string
          id?: string
          metadata?: Json
          request_id?: string | null
          status?: string
          used_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          expires_at?: string
          grant_token_hash?: string
          id?: string
          metadata?: Json
          request_id?: string | null
          status?: string
          used_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_session_grants_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_session_grants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "extension_pairing_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_session_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_session_grants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_session_refresh_tokens: {
        Row: {
          created_at: string
          device_id: string
          expires_at: string
          id: string
          parent_token_id: string | null
          replaced_by_token_id: string | null
          replay_detected_at: string | null
          revoked_at: string | null
          session_id: string
          token_family_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          expires_at: string
          id?: string
          parent_token_id?: string | null
          replaced_by_token_id?: string | null
          replay_detected_at?: string | null
          revoked_at?: string | null
          session_id: string
          token_family_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          expires_at?: string
          id?: string
          parent_token_id?: string | null
          replaced_by_token_id?: string | null
          replay_detected_at?: string | null
          revoked_at?: string | null
          session_id?: string
          token_family_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_session_refresh_tokens_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_session_refresh_tokens_parent_token_id_fkey"
            columns: ["parent_token_id"]
            isOneToOne: false
            referencedRelation: "extension_session_refresh_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_session_refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "extension_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_sessions: {
        Row: {
          access_token_expires_at: string | null
          access_token_hash: string | null
          browser: string | null
          created_at: string | null
          current_refresh_token_id: string | null
          device_id: string | null
          device_name: string | null
          extension_id: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen: string | null
          last_seen_at: string | null
          metadata: Json
          refresh_token_family_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_token_expires_at?: string | null
          access_token_hash?: string | null
          browser?: string | null
          created_at?: string | null
          current_refresh_token_id?: string | null
          device_id?: string | null
          device_name?: string | null
          extension_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          last_seen_at?: string | null
          metadata?: Json
          refresh_token_family_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_token_expires_at?: string | null
          access_token_hash?: string | null
          browser?: string | null
          created_at?: string | null
          current_refresh_token_id?: string | null
          device_id?: string | null
          device_name?: string | null
          extension_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen?: string | null
          last_seen_at?: string | null
          metadata?: Json
          refresh_token_family_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_sessions_current_refresh_token_fk"
            columns: ["current_refresh_token_id"]
            isOneToOne: false
            referencedRelation: "extension_session_refresh_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_entitlements: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limits: Json
          plan_id: string | null
          requirements: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limits?: Json
          plan_id?: string | null
          requirements?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limits?: Json
          plan_id?: string | null
          requirements?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          feature_key: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          expires_at?: string | null
          feature_key: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_key?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      function_rate_limits: {
        Row: {
          bucket: string
          created_at: string
          expires_at: string
          id: string
          request_count: number
          subject_hash: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          created_at?: string
          expires_at: string
          id?: string
          request_count?: number
          subject_hash: string
          updated_at?: string
          window_start: string
        }
        Update: {
          bucket?: string
          created_at?: string
          expires_at?: string
          id?: string
          request_count?: number
          subject_hash?: string
          updated_at?: string
          window_start?: string
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
          currency: string
          ebay_price: number | null
          ebay_sku_encoded: string | null
          final_price: number
          id: string
          image_url: string | null
          listing_id: string
          parent_asin: string | null
          price: number | null
          quantity: number | null
          raw_supplier_price: number | null
          sku: string | null
          sort_order: number | null
          status: string
          stock_quantity: number
          updated_at: string
          user_id: string | null
          variant_asin: string | null
        }
        Insert: {
          amazon_price?: number | null
          attributes?: Json
          created_at?: string
          currency?: string
          ebay_price?: number | null
          ebay_sku_encoded?: string | null
          final_price?: number
          id?: string
          image_url?: string | null
          listing_id: string
          parent_asin?: string | null
          price?: number | null
          quantity?: number | null
          raw_supplier_price?: number | null
          sku?: string | null
          sort_order?: number | null
          status?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string | null
          variant_asin?: string | null
        }
        Update: {
          amazon_price?: number | null
          attributes?: Json
          created_at?: string
          currency?: string
          ebay_price?: number | null
          ebay_sku_encoded?: string | null
          final_price?: number
          id?: string
          image_url?: string | null
          listing_id?: string
          parent_asin?: string | null
          price?: number | null
          quantity?: number | null
          raw_supplier_price?: number | null
          sku?: string | null
          sort_order?: number | null
          status?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string | null
          variant_asin?: string | null
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
          description_source: string | null
          ebay_data: Json | null
          ebay_item_id: string | null
          ebay_price: number | null
          has_variations: boolean | null
          id: string
          inventory_last_updated: string | null
          inventory_status: string | null
          last_checked: string | null
          price_high: number | null
          price_last_updated: string | null
          price_low: number | null
          price_source: string | null
          pricing_rule: Json | null
          sku: string | null
          sku_source: string | null
          status: string | null
          sync_error: string | null
          title: string | null
          title_source: string | null
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
          description_source?: string | null
          ebay_data?: Json | null
          ebay_item_id?: string | null
          ebay_price?: number | null
          has_variations?: boolean | null
          id?: string
          inventory_last_updated?: string | null
          inventory_status?: string | null
          last_checked?: string | null
          price_high?: number | null
          price_last_updated?: string | null
          price_low?: number | null
          price_source?: string | null
          pricing_rule?: Json | null
          sku?: string | null
          sku_source?: string | null
          status?: string | null
          sync_error?: string | null
          title?: string | null
          title_source?: string | null
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
          description_source?: string | null
          ebay_data?: Json | null
          ebay_item_id?: string | null
          ebay_price?: number | null
          has_variations?: boolean | null
          id?: string
          inventory_last_updated?: string | null
          inventory_status?: string | null
          last_checked?: string | null
          price_high?: number | null
          price_last_updated?: string | null
          price_low?: number | null
          price_source?: string | null
          pricing_rule?: Json | null
          sku?: string | null
          sku_source?: string | null
          status?: string | null
          sync_error?: string | null
          title?: string | null
          title_source?: string | null
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
      plan_features: {
        Row: {
          created_at: string | null
          description: string | null
          display_value: string | null
          group_name: string
          id: string
          included: boolean
          is_highlighted: boolean | null
          plan_id: string
          sort_order: number | null
          title: string
          tooltip: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_value?: string | null
          group_name: string
          id?: string
          included?: boolean
          is_highlighted?: boolean | null
          plan_id: string
          sort_order?: number | null
          title: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_value?: string | null
          group_name?: string
          id?: string
          included?: boolean
          is_highlighted?: boolean | null
          plan_id?: string
          sort_order?: number | null
          title?: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          amount: number
          compare_at_amount: number | null
          created_at: string | null
          currency: string
          id: string
          interval: string
          is_active: boolean | null
          plan_id: string
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          compare_at_amount?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          interval: string
          is_active?: boolean | null
          plan_id: string
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          compare_at_amount?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          interval?: string
          is_active?: boolean | null
          plan_id?: string
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          archived_at: string | null
          auto_orders_enabled: boolean | null
          badge_text: string | null
          best_for: string | null
          created_at: string | null
          credits_per_month: number | null
          cta_text: string | null
          display_name: string
          duration_months: number | null
          feature_flags: Json
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          is_public: boolean | null
          is_recommended: boolean | null
          is_trial: boolean | null
          long_description: string | null
          max_auto_orders: number | null
          max_listings: number | null
          max_seo_descriptions: number | null
          max_seo_titles: number | null
          metadata: Json | null
          name: string
          order_reset_frequency: string | null
          price_monthly: number | null
          price_yearly: number | null
          seo_enabled: boolean | null
          short_description: string | null
          slug: string | null
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_one_time: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          trial_duration_days: number | null
          trial_requires_card: boolean | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          auto_orders_enabled?: boolean | null
          badge_text?: string | null
          best_for?: string | null
          created_at?: string | null
          credits_per_month?: number | null
          cta_text?: string | null
          display_name: string
          duration_months?: number | null
          feature_flags?: Json
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          is_recommended?: boolean | null
          is_trial?: boolean | null
          long_description?: string | null
          max_auto_orders?: number | null
          max_listings?: number | null
          max_seo_descriptions?: number | null
          max_seo_titles?: number | null
          metadata?: Json | null
          name: string
          order_reset_frequency?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          seo_enabled?: boolean | null
          short_description?: string | null
          slug?: string | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_one_time?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_duration_days?: number | null
          trial_requires_card?: boolean | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          auto_orders_enabled?: boolean | null
          badge_text?: string | null
          best_for?: string | null
          created_at?: string | null
          credits_per_month?: number | null
          cta_text?: string | null
          display_name?: string
          duration_months?: number | null
          feature_flags?: Json
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_public?: boolean | null
          is_recommended?: boolean | null
          is_trial?: boolean | null
          long_description?: string | null
          max_auto_orders?: number | null
          max_listings?: number | null
          max_seo_descriptions?: number | null
          max_seo_titles?: number | null
          metadata?: Json | null
          name?: string
          order_reset_frequency?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          seo_enabled?: boolean | null
          short_description?: string | null
          slug?: string | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_one_time?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          trial_duration_days?: number | null
          trial_requires_card?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          active_sessions_count: number | null
          admin_notes: string | null
          api_key_enabled: boolean | null
          avatar_url: string | null
          created_at: string | null
          credits: number | null
          default_workspace_id: string | null
          ebay_connected: boolean | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          mfa_enabled: boolean | null
          onboarding_completed: boolean | null
          onboarding_status: string | null
          plan_id: string | null
          platform_access: string[] | null
          settings: Json | null
          shopify_connected: boolean | null
          stripe_customer_id: string | null
          trial_used_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          active_sessions_count?: number | null
          admin_notes?: string | null
          api_key_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          credits?: number | null
          default_workspace_id?: string | null
          ebay_connected?: boolean | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          mfa_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_status?: string | null
          plan_id?: string | null
          platform_access?: string[] | null
          settings?: Json | null
          shopify_connected?: boolean | null
          stripe_customer_id?: string | null
          trial_used_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          active_sessions_count?: number | null
          admin_notes?: string | null
          api_key_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          credits?: number | null
          default_workspace_id?: string | null
          ebay_connected?: boolean | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          mfa_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_status?: string | null
          plan_id?: string | null
          platform_access?: string[] | null
          settings?: Json | null
          shopify_connected?: boolean | null
          stripe_customer_id?: string | null
          trial_used_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
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
      seller_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          health_score: number
          id: string
          metadata: Json
          provider: string
          seller_identifier: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          health_score?: number
          id?: string
          metadata?: Json
          provider: string
          seller_identifier?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          health_score?: number
          id?: string
          metadata?: Json
          provider?: string
          seller_identifier?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      support_notes: {
        Row: {
          created_at: string
          created_by: string | null
          device_id: string | null
          id: string
          note: string
          user_id: string | null
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          note: string
          user_id?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          note?: string
          user_id?: string | null
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_notes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "extension_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      vero_brands: {
        Row: {
          active: boolean
          aliases: string[]
          brand: string
          category: string | null
          created_at: string
          id: string
          risk: string
          source: string | null
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          brand: string
          category?: string | null
          created_at?: string
          id?: string
          risk?: string
          source?: string | null
        }
        Update: {
          active?: boolean
          aliases?: string[]
          brand?: string
          category?: string | null
          created_at?: string
          id?: string
          risk?: string
          source?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          name: string
          owner_user_id: string
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          owner_user_id: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          owner_user_id?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      check_user_exists: { Args: { lookup_email: string }; Returns: boolean }
      create_listing_with_variations: {
        Args: { p_listing: Json; p_user_id: string; p_variations: Json }
        Returns: Json
      }
      get_auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_goal: { Args: { lookup_email: string }; Returns: string }
      get_user_plan_name: { Args: { check_user_id: string }; Returns: string }
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
      list_user_listings: {
        Args: {
          p_cursor_created?: string
          p_cursor_id?: string
          p_limit?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          amazon_asin: string | null
          amazon_data: Json | null
          amazon_price: number | null
          amazon_stock_quantity: number | null
          amazon_stock_status: string | null
          amazon_url: string | null
          auto_order_enabled: boolean | null
          created_at: string | null
          description_source: string | null
          ebay_data: Json | null
          ebay_item_id: string | null
          ebay_price: number | null
          has_variations: boolean | null
          id: string
          inventory_last_updated: string | null
          inventory_status: string | null
          last_checked: string | null
          price_high: number | null
          price_last_updated: string | null
          price_low: number | null
          price_source: string | null
          pricing_rule: Json | null
          sku: string | null
          sku_source: string | null
          status: string | null
          sync_error: string | null
          title: string | null
          title_source: string | null
          updated_at: string | null
          user_id: string
          variation_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
