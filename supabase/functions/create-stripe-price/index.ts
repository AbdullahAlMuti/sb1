import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const { planName, priceAmount, productName } = await req.json();

    console.log(`[CREATE-STRIPE-PRICE] Creating price for ${planName}: $${priceAmount}`);

    // Create a product first
    const product = await stripe.products.create({
      name: productName || `${planName} Plan`,
      description: `${planName} plan - 14-day trial`,
    });

    console.log(`[CREATE-STRIPE-PRICE] Product created: ${product.id}`);

    // Create a recurring monthly price (required for subscription checkout)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceAmount * 100), // Convert to cents
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });
    console.log(`[CREATE-STRIPE-PRICE] Price created: ${price.id}`);

    // Update the database with the new price ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("plans")
      .update({ stripe_price_id_monthly: price.id })
      .eq("name", planName);

    if (updateError) {
      console.error(`[CREATE-STRIPE-PRICE] Database update error:`, updateError);
      throw updateError;
    }

    console.log(`[CREATE-STRIPE-PRICE] Database updated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        productId: product.id,
        priceId: price.id,
        message: `Stripe price created and linked to ${planName} plan`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(`[CREATE-STRIPE-PRICE] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
