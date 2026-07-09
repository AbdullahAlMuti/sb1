import { resolveExtensionCors } from "../_shared/cors.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6'
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts'


serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'extension-config:ip',
      key: getClientIp(req),
      limit: 120,
      windowSeconds: 60,
    })
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders)

    // Fetch feature flags from app_feature_flags
    const { data: flagsData, error } = await supabase
      .from('app_feature_flags')
      .select('key, enabled')

    if (error) {
      console.error('Error fetching feature flags:', error)
      throw error
    }

    // Convert array of {key, enabled} into an object map
    const flags: Record<string, boolean> = {}
    if (flagsData) {
      for (const row of flagsData) {
        flags[row.key] = row.enabled
      }
    }

    // Default safe response
    const responseConfig = {
      extension_new_auth_enabled: flags?.extension_new_auth_enabled ?? false,
      extension_legacy_fallback_enabled: flags?.extension_legacy_fallback_enabled ?? true,
      extension_pairing_fallback_enabled: flags?.extension_pairing_fallback_enabled ?? true,
      extension_auto_connect_enabled: flags?.extension_auto_connect_enabled ?? false,
      extension_bootstrap_v2_enabled: flags?.extension_bootstrap_v2_enabled ?? false,
      
      // Additional safe config
      minimum_extension_version: '1.0.0',
      latest_extension_version: '1.0.0',
      support_url: 'https://sellersuit.com/support',
      dashboard_connect_url: 'https://sellersuit.com/dashboard/settings/extension',
      pairing_poll_interval_ms: 2000,
      config_cache_ttl_seconds: 300
    }

    return new Response(
      JSON.stringify(responseConfig),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Short TTL (5 minutes) for controlled rollout
        },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        extension_new_auth_enabled: false,
        extension_legacy_fallback_enabled: true,
        extension_pairing_fallback_enabled: true,
        extension_auto_connect_enabled: false,
        extension_bootstrap_v2_enabled: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})
