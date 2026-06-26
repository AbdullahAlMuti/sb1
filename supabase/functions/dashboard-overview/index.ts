import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceActiveSubscription } from '../_shared/plan-middleware.ts';
import { resolveCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Support both Authorization header and x-api-key (for extension compatibility)
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');
    
    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }
    
    if (!authToken) {
      console.log('[dashboard-overview] No auth token found');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[dashboard-overview] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dashboard-overview] Fetching overview for user: ${user.id}`);

    // Enforce active subscription check
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const blockResponse = await enforceActiveSubscription(supabaseAdmin, user.id, req);
    if (blockResponse) return blockResponse;

    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all data in parallel
    const [
      listingsResult,
      activeListingsResult,
      pendingOrdersResult,
      completedOrdersResult,
      todayOrdersResult,
      alertsResult,
      profileResult,
    ] = await Promise.all([
      // Total listings
      supabase
        .from('listings')
        .select('ebay_price, amazon_price, status', { count: 'exact' })
        .eq('user_id', user.id),
      // Active listings count
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
      // Pending orders
      supabase
        .from('ebay_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('order_status', ['pending', 'awaiting payment', 'processing', 'paid', 'shipped', 'Pending', 'Awaiting Payment', 'Processing', 'Paid', 'Shipped'])
        .neq('total_amount', 0)
        .is('deleted_at', null),
      // Completed orders with profit
      supabase
        .from('ebay_orders')
        .select('net_profit, add_fee')
        .eq('user_id', user.id)
        .in('order_status', ['completed', 'Completed'])
        .neq('total_amount', 0)
        .is('deleted_at', null),
      // Today's orders
      supabase
        .from('ebay_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('order_date', today.toISOString())
        .is('deleted_at', null),
      // Unread alerts
      supabase
        .from('inventory_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'UNREAD'),
      // User profile
      supabase
        .from('profiles')
        .select('credits, plans:plan_id(credits_per_month)')
        .eq('id', user.id)
        .single(),
    ]);

    // Safely extract plan credits
    const planData = profileResult.data?.plans;
    const planCreditsPerMonth = Array.isArray(planData) 
      ? planData[0]?.credits_per_month 
      : (planData as any)?.credits_per_month;

    // Calculate totals
    const listings = listingsResult.data || [];
    const totalSourcingCost = listings.reduce((sum, l) => sum + (Number(l.amazon_price) || 0), 0);
    const totalInventoryValue = listings.reduce((sum, l) => sum + (Number(l.ebay_price) || 0), 0);
    const netProfitForecast = totalInventoryValue - totalSourcingCost;

    // Calculate total profit from completed orders
    const totalProfit = (completedOrdersResult.data || []).reduce(
      (sum, order) => sum + (Number((order as any).net_profit ?? (order as any).add_fee) || 0), 0
    );

    // Get status breakdown
    const statusBreakdown = listings.reduce((acc, l) => {
      const status = l.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      success: true,
      overview: {
        // Listing stats
        totalListings: listingsResult.count || 0,
        activeListings: activeListingsResult.count || 0,
        statusBreakdown,
        
        // Financial stats
        totalSourcingCost: Math.round(totalSourcingCost * 100) / 100,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        netProfitForecast: Math.round(netProfitForecast * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        
        // Order stats
        pendingOrders: pendingOrdersResult.count || 0,
        ordersToday: todayOrdersResult.count || 0,
        
        // Alerts
        unreadAlerts: alertsResult.count || 0,
        
        // Credits
        creditsRemaining: profileResult.data?.credits || 0,
        creditsMax: planCreditsPerMonth || 5,
      }
    };

    console.log(`[dashboard-overview] Overview generated for ${user.email}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dashboard-overview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
