import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Amazon API endpoints by marketplace
const AMAZON_ENDPOINTS = {
  NA: 'https://sellingpartnerapi-na.amazon.com',
  EU: 'https://sellingpartnerapi-eu.amazon.com',
  FE: 'https://sellingpartnerapi-fe.amazon.com',
};

interface AmazonSettings {
  id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  marketplace: string;
  update_frequency_hours: number;
  is_active: boolean;
}

interface Listing {
  id: string;
  amazon_asin: string | null;
  amazon_price: number | null;
  amazon_stock_quantity: number | null;
  user_id: string;
}

// Get Amazon access token using refresh token
async function getAmazonAccessToken(settings: AmazonSettings): Promise<string | null> {
  try {
    console.log('[Amazon API] Attempting to get access token...');
    
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.refresh_token,
        client_id: settings.client_id,
        client_secret: settings.client_secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Amazon API] Failed to get access token:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('[Amazon API] Successfully obtained access token');
    return data.access_token;
  } catch (error) {
    console.error('[Amazon API] Error getting access token:', error);
    return null;
  }
}

// Fetch product data from Amazon SP-API
async function fetchAmazonProductData(
  asin: string,
  accessToken: string,
  marketplace: string
): Promise<{ price: number | null; stockQuantity: number | null; stockStatus: string } | null> {
  try {
    const endpoint = AMAZON_ENDPOINTS[marketplace as keyof typeof AMAZON_ENDPOINTS] || AMAZON_ENDPOINTS.NA;
    
    console.log(`[Amazon API] Fetching data for ASIN: ${asin}`);
    
    // Note: This is a simplified example. Real implementation would use
    // Amazon SP-API Catalog Items API and Inventory API
    // For demo purposes, we'll simulate the response
    
    // In production, you would make actual API calls like:
    // const catalogResponse = await fetch(`${endpoint}/catalog/2022-04-01/items/${asin}`, {
    //   headers: {
    //     'Authorization': `Bearer ${accessToken}`,
    //     'x-amz-access-token': accessToken,
    //   },
    // });

    // Simulated response for demo - in production, parse actual API response
    const simulatedPrice = Math.random() * 100 + 10;
    const simulatedStock = Math.floor(Math.random() * 50);
    
    return {
      price: parseFloat(simulatedPrice.toFixed(2)),
      stockQuantity: simulatedStock,
      stockStatus: simulatedStock > 10 ? 'in_stock' : simulatedStock > 0 ? 'low_stock' : 'out_of_stock',
    };
  } catch (error) {
    console.error(`[Amazon API] Error fetching product data for ${asin}:`, error);
    return null;
  }
}

interface NotificationPayload {
  userId: string;
  listingId: string;
  listingTitle: string;
  notificationType: 'out_of_stock' | 'low_stock' | 'price_increase' | 'price_decrease';
  oldValue?: number | null;
  newValue?: number | null;
  percentageChange?: number;
}

// Send notification via the notification edge function
async function sendNotification(supabase: any, payload: NotificationPayload) {
  try {
    console.log('[Notification] Sending notification:', payload.notificationType);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-inventory-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notification] Failed to send:', errorText);
    } else {
      console.log('[Notification] Sent successfully');
    }
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
  }
}

// Main sync function - using any type for supabase client since new tables not in types yet
async function syncInventory(supabase: any, listingId?: string) {
  console.log('[Sync] Starting inventory sync...');
  
  // Get Amazon settings
  const { data: settings, error: settingsError } = await supabase
    .from('amazon_settings')
    .select('*')
    .single();

  if (settingsError || !settings) {
    console.error('[Sync] Failed to get Amazon settings:', settingsError);
    return { success: false, error: 'Amazon settings not configured' };
  }

  const typedSettings = settings as AmazonSettings;

  if (!typedSettings.is_active) {
    console.log('[Sync] Amazon sync is disabled');
    return { success: false, error: 'Amazon sync is disabled' };
  }

  // Check if credentials are still placeholder values
  if (typedSettings.client_id === 'YOUR_CLIENT_ID' || 
      typedSettings.client_secret === 'YOUR_CLIENT_SECRET' ||
      typedSettings.refresh_token === 'YOUR_REFRESH_TOKEN') {
    console.log('[Sync] Amazon credentials not configured yet');
    return { success: false, error: 'Amazon API credentials not configured. Please update in Admin Settings.' };
  }

  // Get access token
  const accessToken = await getAmazonAccessToken(typedSettings);
  if (!accessToken) {
    return { success: false, error: 'Failed to authenticate with Amazon API' };
  }

  // Get listings to sync
  let query = supabase
    .from('listings')
    .select('id, amazon_asin, amazon_price, amazon_stock_quantity, user_id')
    .not('amazon_asin', 'is', null);

  if (listingId) {
    query = query.eq('id', listingId);
  }

  const { data: listings, error: listingsError } = await query;

  if (listingsError || !listings) {
    console.error('[Sync] Failed to get listings:', listingsError);
    return { success: false, error: 'Failed to get listings' };
  }

  const typedListings = listings as Listing[];
  console.log(`[Sync] Found ${typedListings.length} listings to sync`);

  const results: any[] = [];
  
  for (let i = 0; i < typedListings.length; i++) {
    const listing = typedListings[i];
    
    if (!listing.amazon_asin) continue;

    // Rate limiting: 1 second between requests
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[Sync] Processing listing ${i + 1}/${typedListings.length}: ${listing.amazon_asin}`);

    const productData = await fetchAmazonProductData(
      listing.amazon_asin,
      accessToken,
      typedSettings.marketplace
    );

    if (productData) {
      const priceChanged = listing.amazon_price !== productData.price;
      const stockChanged = listing.amazon_stock_quantity !== productData.stockQuantity;
      const oldPrice = listing.amazon_price;
      const oldStock = listing.amazon_stock_quantity;

      // Update listing
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          amazon_price: productData.price,
          amazon_stock_quantity: productData.stockQuantity,
          amazon_stock_status: productData.stockStatus,
          price_last_updated: priceChanged ? new Date().toISOString() : undefined,
          inventory_last_updated: new Date().toISOString(),
          sync_error: null,
          status: productData.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'active',
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`[Sync] Failed to update listing ${listing.id}:`, updateError);
        results.push({ id: listing.id, success: false, error: updateError.message });
        continue;
      }

      // Log the sync
      await supabase.from('inventory_sync_logs').insert({
        listing_id: listing.id,
        sync_type: 'auto',
        old_price: listing.amazon_price,
        new_price: productData.price,
        old_stock: listing.amazon_stock_quantity,
        new_stock: productData.stockQuantity,
        status: 'success',
      });

      // Send notifications for significant changes
      // Out of stock notification
      if (productData.stockStatus === 'out_of_stock' && oldStock && oldStock > 0) {
        await sendNotification(supabase, {
          userId: listing.user_id,
          listingId: listing.id,
          listingTitle: listing.amazon_asin,
          notificationType: 'out_of_stock',
        });
      }
      // Low stock notification
      else if (productData.stockStatus === 'low_stock' && oldStock && oldStock > 10) {
        await sendNotification(supabase, {
          userId: listing.user_id,
          listingId: listing.id,
          listingTitle: listing.amazon_asin,
          notificationType: 'low_stock',
          newValue: productData.stockQuantity,
        });
      }

      // Price change notification
      if (priceChanged && oldPrice && productData.price) {
        const percentageChange = ((productData.price - oldPrice) / oldPrice) * 100;
        const notificationType = percentageChange > 0 ? 'price_increase' : 'price_decrease';
        
        await sendNotification(supabase, {
          userId: listing.user_id,
          listingId: listing.id,
          listingTitle: listing.amazon_asin,
          notificationType,
          oldValue: oldPrice,
          newValue: productData.price,
          percentageChange,
        });
      }

      results.push({
        id: listing.id,
        success: true,
        priceChanged,
        stockChanged,
        newPrice: productData.price,
        newStock: productData.stockQuantity,
        stockStatus: productData.stockStatus,
      });
    } else {
      // Mark sync error
      await supabase
        .from('listings')
        .update({ sync_error: 'Failed to fetch data from Amazon' })
        .eq('id', listing.id);

      results.push({ id: listing.id, success: false, error: 'Failed to fetch data' });
    }
  }

  // Update last sync timestamp
  await supabase
    .from('amazon_settings')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', typedSettings.id);

  console.log('[Sync] Inventory sync completed');
  return { success: true, results };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, listingId } = await req.json().catch(() => ({}));

    let result;

    switch (action) {
      case 'sync':
        result = await syncInventory(supabase, listingId);
        break;
      
      case 'sync-all':
        result = await syncInventory(supabase);
        break;
      
      case 'get-settings':
        const { data: settings, error } = await supabase
          .from('amazon_settings')
          .select('*')
          .single();
        
        if (error) {
          result = { success: false, error: error.message };
        } else {
          const typedSettings = settings as AmazonSettings;
          // Don't expose full credentials
          result = {
            success: true,
            settings: {
              ...typedSettings,
              client_id: typedSettings.client_id === 'YOUR_CLIENT_ID' ? '' : '***configured***',
              client_secret: typedSettings.client_secret === 'YOUR_CLIENT_SECRET' ? '' : '***configured***',
              refresh_token: typedSettings.refresh_token === 'YOUR_REFRESH_TOKEN' ? '' : '***configured***',
            },
          };
        }
        break;

      default:
        result = { success: false, error: 'Invalid action' };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Edge Function] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
