import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_PANEL_ROLES = new Set(["admin", "super_admin", "moderator", "staff"]);
const USER_PANEL_ROLE_ERROR =
  "This account cannot be used from the user login panel. Please use the admin login page.";
const ADMIN_PANEL_ROLE_ERROR =
  "This account cannot be used from the admin login panel. Please use the user login page.";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, password, fullName, goal, code, loginContext } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[auth-otp] Action: ${action}, Email: ${email}`);

    // Action 0: LOGIN CONTEXT CHECK
    // Blocks wrong-panel accounts before the browser creates a Supabase session.
    if (action === "validate-login-context") {
      if (loginContext !== "user" && loginContext !== "admin") {
        return new Response(
          JSON.stringify({ error: "Invalid login context" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find user efficiently (listUsers defaults to 50 items)
      // Since we don't have an RPC, we fetch a large page. For production with thousands of users,
      // a dedicated RPC `get_user_id_by_email` would be strictly better.
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 5000
      });
      if (listError) throw listError;

      const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        // If user is still not found, we shouldn't hard-block them with 'Invalid email or password'
        // from the pre-flight check. We should let GoTrue make the final decision.
        // Return success so the frontend continues to the real signInWithPassword.
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (profile && profile.is_active === false) {
        return new Response(
          JSON.stringify({ error: "This account is inactive. Please contact support." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user.banned_until && new Date(user.banned_until) > new Date()) {
        return new Response(
          JSON.stringify({ error: "This account is currently disabled. Please contact support." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (rolesError) throw rolesError;

      const roleNames = (roles || []).map((row) => row.role as string);
      const hasAdminPanelRole = roleNames.some((role) => ADMIN_PANEL_ROLES.has(role));

      if (loginContext === "user" && hasAdminPanelRole) {
        return new Response(
          JSON.stringify({ error: USER_PANEL_ROLE_ERROR, code: "INVALID_LOGIN_PANEL" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (loginContext === "admin" && !hasAdminPanelRole) {
        return new Response(
          JSON.stringify({ error: ADMIN_PANEL_ROLE_ERROR, code: "INVALID_LOGIN_PANEL" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 1: SIGNUP (Initiates verification)
    if (action === "signup") {
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password is required for signup" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already exists
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("Error listing users:", listError);
        throw listError;
      }

      const existingUser = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      let userId: string;

      if (existingUser) {
        // If user exists and is already confirmed
        if (existingUser.email_confirmed_at) {
          return new Response(
            JSON.stringify({ error: "This email is already registered. Please log in instead." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // If user exists but is not confirmed, update password and metadata
        console.log(`Updating unconfirmed user: ${existingUser.id}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: { full_name: fullName, goal },
          }
        );
        if (updateError) throw updateError;
        userId = existingUser.id;
      } else {
        // Create a new unconfirmed user
        console.log("Creating new user");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: { full_name: fullName, goal },
        });
        if (createError) throw createError;
        userId = newUser.user.id;
      }

      // Generate a 6-digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in auth_codes
      await supabaseAdmin.from("auth_codes").delete().eq("user_id", userId);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
      
      const { error: insertError } = await supabaseAdmin.from("auth_codes").insert({
        code: otpCode,
        user_id: userId,
        expires_at: expiresAt,
        used: false,
      });

      if (insertError) {
        console.error("Error inserting code:", insertError);
        throw insertError;
      }

      // Send email via Resend
      console.log(`Sending signup code ${otpCode} to ${email}`);
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer re_VvdLEKGM_DpNQkAupQ7kC3x8HmYWyurLw",
        },
        body: JSON.stringify({
          from: "SellerSuit <onboarding@resend.dev>",
          to: [email],
          subject: "Verify your SellerSuit email address",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; background-color: #6366f1; border-radius: 12px; line-height: 48px; text-align: center; color: white; font-weight: bold; font-size: 24px;">
                  S
                </div>
                <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 8px;">Verify your email</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Use the verification code below to complete your SellerSuit signup.</p>
              </div>
              
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace;">
                  ${otpCode}
                </div>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 12px; margin-bottom: 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Code expires in 15 minutes</p>
              </div>
              
              <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center; margin: 0;">
                If you did not request this email, you can safely ignore it.
              </p>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error("Resend API error:", errText);
        
        let isSandboxError = false;
        try {
          const errJson = JSON.parse(errText);
          if (resendRes.status === 403 && (errJson.message?.includes("You can only send testing emails") || errJson.name === "validation_error")) {
            isSandboxError = true;
          }
        } catch (_) {
          if (resendRes.status === 403 && errText.includes("You can only send testing emails")) {
            isSandboxError = true;
          }
        }

        if (isSandboxError) {
          console.warn("[Sandbox fallback] Resend sandbox restriction hit. Exposing OTP code.");
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Verification code sent (Sandbox fallback)", 
              isSandbox: true, 
              otpCode: otpCode 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Failed to send email: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 2: VERIFY CODE
    if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Verification code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find user
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find matching active code
      const { data: codeRecord, error: codeError } = await supabaseAdmin
        .from("auth_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", code)
        .eq("used", false)
        .maybeSingle();

      if (codeError) {
        console.error("Code lookup error:", codeError);
        throw codeError;
      }

      if (!codeRecord) {
        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(codeRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Verification code has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await supabaseAdmin
        .from("auth_codes")
        .update({ used: true })
        .eq("code", code);

      // Confirm user's email
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      if (confirmError) throw confirmError;

      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, settings")
        .eq("id", user.id)
        .maybeSingle();

      const fullName = user.user_metadata?.full_name || email;
      const goal = user.user_metadata?.goal || null;

      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          id: user.id,
          email: email,
          full_name: fullName,
          credits: 5,
          is_active: true,
          settings: goal ? { goal } : {},
        });
      } else {
        const currentSettings = existingProfile.settings || {};
        const newSettings = goal ? { ...currentSettings, goal } : currentSettings;
        
        await supabaseAdmin
          .from("profiles")
          .update({
            settings: newSettings,
            is_active: true
          })
          .eq("id", user.id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Email verified successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 3: RESEND CODE
    if (action === "resend") {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a new code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in auth_codes
      await supabaseAdmin.from("auth_codes").delete().eq("user_id", user.id);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
      
      const { error: insertError } = await supabaseAdmin.from("auth_codes").insert({
        code: otpCode,
        user_id: user.id,
        expires_at: expiresAt,
        used: false,
      });

      if (insertError) throw insertError;

      // Send email via Resend
      console.log(`Resending signup code ${otpCode} to ${email}`);
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer re_VvdLEKGM_DpNQkAupQ7kC3x8HmYWyurLw",
        },
        body: JSON.stringify({
          from: "SellerSuit <onboarding@resend.dev>",
          to: [email],
          subject: "Verify your SellerSuit email address",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; background-color: #6366f1; border-radius: 12px; line-height: 48px; text-align: center; color: white; font-weight: bold; font-size: 24px;">
                  S
                </div>
                <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 8px;">Verify your email</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Use the verification code below to complete your SellerSuit signup.</p>
              </div>
              
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace;">
                  ${otpCode}
                </div>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 12px; margin-bottom: 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Code expires in 15 minutes</p>
              </div>
              
              <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center; margin: 0;">
                If you did not request this email, you can safely ignore it.
              </p>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error("Resend API error:", errText);
        
        let isSandboxError = false;
        try {
          const errJson = JSON.parse(errText);
          if (resendRes.status === 403 && (errJson.message?.includes("You can only send testing emails") || errJson.name === "validation_error")) {
            isSandboxError = true;
          }
        } catch (_) {
          if (resendRes.status === 403 && errText.includes("You can only send testing emails")) {
            isSandboxError = true;
          }
        }

        if (isSandboxError) {
          console.warn("[Sandbox fallback] Resend sandbox restriction hit on resend. Exposing OTP code.");
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Verification code resent (Sandbox fallback)", 
              isSandbox: true, 
              otpCode: otpCode 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        throw new Error(`Failed to send email: ${errText}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Verification code resent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[auth-otp] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
