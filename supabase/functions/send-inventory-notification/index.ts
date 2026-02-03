import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  listingId: string;
  listingTitle: string;
  notificationType: 'out_of_stock' | 'low_stock' | 'price_increase' | 'price_decrease';
  oldValue?: number;
  newValue?: number;
  percentageChange?: number;
}

interface NotificationSettings {
  email_notifications_enabled: boolean;
  notify_out_of_stock: boolean;
  notify_low_stock: boolean;
  notify_price_increase: boolean;
  notify_price_decrease: boolean;
  price_change_threshold: number;
  notification_email: string | null;
}

function getEmailSubject(type: string, title: string): string {
  switch (type) {
    case 'out_of_stock':
      return `⚠️ Out of Stock Alert: ${title}`;
    case 'low_stock':
      return `📦 Low Stock Warning: ${title}`;
    case 'price_increase':
      return `📈 Price Increase Alert: ${title}`;
    case 'price_decrease':
      return `📉 Price Decrease Alert: ${title}`;
    default:
      return `Inventory Alert: ${title}`;
  }
}

function getEmailHtml(data: NotificationRequest): string {
  const { notificationType, listingTitle, oldValue, newValue, percentageChange } = data;
  
  let alertColor = '#f59e0b';
  let alertIcon = '📦';
  let alertMessage = '';
  
  switch (notificationType) {
    case 'out_of_stock':
      alertColor = '#ef4444';
      alertIcon = '⚠️';
      alertMessage = `<strong>${listingTitle}</strong> is now <span style="color: ${alertColor}; font-weight: bold;">OUT OF STOCK</span> on Amazon.`;
      break;
    case 'low_stock':
      alertColor = '#f59e0b';
      alertIcon = '📦';
      alertMessage = `<strong>${listingTitle}</strong> has <span style="color: ${alertColor}; font-weight: bold;">LOW STOCK</span> (${newValue} units remaining).`;
      break;
    case 'price_increase':
      alertColor = '#ef4444';
      alertIcon = '📈';
      alertMessage = `<strong>${listingTitle}</strong> price <span style="color: ${alertColor}; font-weight: bold;">INCREASED</span> from $${oldValue?.toFixed(2)} to $${newValue?.toFixed(2)} (${percentageChange?.toFixed(1)}% increase).`;
      break;
    case 'price_decrease':
      alertColor = '#22c55e';
      alertIcon = '📉';
      alertMessage = `<strong>${listingTitle}</strong> price <span style="color: ${alertColor}; font-weight: bold;">DECREASED</span> from $${oldValue?.toFixed(2)} to $${newValue?.toFixed(2)} (${Math.abs(percentageChange || 0).toFixed(1)}% decrease).`;
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    ${alertIcon} Inventory Alert
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <div style="background-color: #fafafa; border-left: 4px solid ${alertColor}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">
                      ${alertMessage}
                    </p>
                  </div>
                  
                  <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                    This notification was sent because your inventory monitoring detected a change that requires attention.
                  </p>
                  
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    You can manage your notification preferences in your dashboard settings.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Sent by SellerSuit Inventory Tracker
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: NotificationRequest = await req.json();
    console.log('[Notification] Processing notification request:', data);

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', data.userId)
      .maybeSingle();

    if (settingsError) {
      console.error('[Notification] Error fetching settings:', settingsError);
      throw settingsError;
    }

    const typedSettings = settings as NotificationSettings | null;

    // Check if notifications are enabled
    if (!typedSettings || !typedSettings.email_notifications_enabled) {
      console.log('[Notification] Email notifications disabled for user');
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this notification type is enabled
    const shouldNotify = 
      (data.notificationType === 'out_of_stock' && typedSettings.notify_out_of_stock) ||
      (data.notificationType === 'low_stock' && typedSettings.notify_low_stock) ||
      (data.notificationType === 'price_increase' && typedSettings.notify_price_increase) ||
      (data.notificationType === 'price_decrease' && typedSettings.notify_price_decrease);

    if (!shouldNotify) {
      console.log('[Notification] Notification type disabled:', data.notificationType);
      return new Response(
        JSON.stringify({ success: true, message: 'Notification type disabled' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For price changes, check if it exceeds threshold
    if ((data.notificationType === 'price_increase' || data.notificationType === 'price_decrease') && 
        data.percentageChange !== undefined) {
      if (Math.abs(data.percentageChange) < typedSettings.price_change_threshold) {
        console.log('[Notification] Price change below threshold:', data.percentageChange, '<', typedSettings.price_change_threshold);
        return new Response(
          JSON.stringify({ success: true, message: 'Change below threshold' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', data.userId)
      .single();

    if (profileError || !profile) {
      console.error('[Notification] Error fetching profile:', profileError);
      throw new Error('Could not fetch user profile');
    }

    const recipientEmail = typedSettings.notification_email || profile.email;
    const subject = getEmailSubject(data.notificationType, data.listingTitle);
    const html = getEmailHtml(data);

    console.log('[Notification] Sending email to:', recipientEmail);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "SellerSuit <notifications@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: html,
    });

    console.log('[Notification] Email sent:', emailResponse);

    // Log the notification
    await supabase.from('notification_logs').insert({
      user_id: data.userId,
      listing_id: data.listingId,
      notification_type: data.notificationType,
      subject: subject,
      message: `${data.notificationType}: ${data.listingTitle}`,
      email_sent_to: recipientEmail,
      status: 'sent',
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Notification] Error:", error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
