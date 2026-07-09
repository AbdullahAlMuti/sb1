import { resolveExtensionCors } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { checkRateLimit, getClientIp, rateLimitResponse, sha256 } from "../_shared/rate-limit.ts";


const ADMIN_PANEL_ROLES = new Set(["admin", "super_admin", "moderator", "staff"]);
type SupabaseLike = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  auth: {
    admin: {
      getUserById: (userId: string) => any;
    };
  };
};
const USER_PANEL_ROLE_ERROR =
  "This account cannot be used from the user login panel. Please use the admin login page.";
const ADMIN_PANEL_ROLE_ERROR =
  "This account cannot be used from the admin login panel. Please use the user login page.";

const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function generateOtpCode(): string {
  const otpSpace = 900_000;
  const maxUnbiased = Math.floor(0x100000000 / otpSpace) * otpSpace;
  const random = new Uint32Array(1);

  let value = 0;
  do {
    crypto.getRandomValues(random);
    value = random[0];
  } while (value >= maxUnbiased);

  return String(100_000 + (value % otpSpace));
}

async function hashOtp(userId: string, email: string, code: string): Promise<string> {
  return sha256(`auth-otp:${userId}:${email}:${code}`);
}

// O(1) indexed lookup. The previous implementation paged through
// auth.admin.listUsers (up to 20k users in memory) on every OTP request,
// which breaks past ~20k users and scans the auth table on every login.
async function findUserByEmail(supabaseAdmin: SupabaseLike, email: string) {
  // 1. Fast path: indexed lookup in public.profiles (kept in sync with auth.users).
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileErr) throw profileErr;

  if (profile?.id) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (!error && data?.user) return data.user;
  }

  // 2. Fallback: direct indexed query on auth.users via SECURITY DEFINER RPC —
  // covers users whose profile row is missing or whose email casing drifted.
  const { data: rpcUser, error: rpcErr } = await supabaseAdmin.rpc("get_auth_user_id_by_email", {
    p_email: email,
  });
  if (!rpcErr && rpcUser) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(rpcUser as string);
    if (!error && data?.user) return data.user;
  }

  return null;
}

async function enforceAuthRateLimits(supabaseAdmin: SupabaseLike, req: Request, action: string, email: string) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit(supabaseAdmin, {
    bucket: `auth-otp:${action}:ip`,
    key: ip,
    limit: action === "signup" || action === "resend" ? 20 : 60,
    windowSeconds: action === "validate-login-context" ? 300 : 900,
  });
  if (!ipLimit.allowed) return ipLimit;

  const emailLimit = await checkRateLimit(supabaseAdmin, {
    bucket: `auth-otp:${action}:email`,
    key: email,
    limit: action === "signup" || action === "resend" ? 5 : action === "verify" ? 10 : 30,
    windowSeconds: action === "validate-login-context" ? 300 : 900,
  });
  if (!emailLimit.allowed) return emailLimit;

  return emailLimit;
}

async function storeOtpCode(supabaseAdmin: SupabaseLike, userId: string, email: string, verificationCode: string) {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const codeHash = await hashOtp(userId, email, verificationCode);

  await supabaseAdmin.from("auth_codes").delete().eq("user_id", userId);
  const { error: insertError } = await supabaseAdmin.from("auth_codes").insert({
    code: codeHash,
    user_id: userId,
    expires_at: expiresAt,
    used: false,
    attempt_count: 0,
    last_attempt_at: null,
    locked_until: null,
  });

  if (insertError) throw insertError;
  return expiresAt;
}

async function sendVerificationEmail(email: string, verificationCode: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("Email service is not configured");
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "SellerSuit <support@sellersuit.com>",
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
              ${verificationCode}
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
    console.error("[auth-otp] Resend API error", { status: resendRes.status, message: errText.slice(0, 200) });
    throw new Error("Failed to send verification email");
  }
}

serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email: rawEmail, password, fullName, goal, code, loginContext, planId } = await req.json();
    const email = normalizeEmail(rawEmail);

    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    const rateLimit = await enforceAuthRateLimits(supabaseAdmin, req, String(action || "unknown"), email);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit, corsHeaders);

    const emailHash = (await sha256(`auth-otp-log:${email}`)).slice(0, 12);
    console.log(`[auth-otp] Action: ${action}, EmailHash: ${emailHash}`);

    if (action === "validate-login-context") {
      if (loginContext !== "user" && loginContext !== "admin") {
        return jsonResponse({ error: "Invalid login context" }, 400);
      }

      const user = await findUserByEmail(supabaseAdmin, email);
      if (!user) {
        return jsonResponse({ success: true });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (profile && profile.is_active === false) {
        return jsonResponse({ error: "This account is inactive. Please contact support." }, 403);
      }

      const bannedUntil = (user as typeof user & { banned_until?: string | null }).banned_until;
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        return jsonResponse({ error: "This account is currently disabled. Please contact support." }, 403);
      }

      const { data: roles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (rolesError) throw rolesError;

      const roleNames = (roles || []).map((row) => row.role as string);
      const hasAdminPanelRole = roleNames.some((role: string) => ADMIN_PANEL_ROLES.has(role));

      if (loginContext === "user" && hasAdminPanelRole) {
        return jsonResponse({ error: USER_PANEL_ROLE_ERROR, code: "INVALID_LOGIN_PANEL" }, 403);
      }

      if (loginContext === "admin" && !hasAdminPanelRole) {
        return jsonResponse({ error: ADMIN_PANEL_ROLE_ERROR, code: "INVALID_LOGIN_PANEL" }, 403);
      }

      return jsonResponse({ success: true });
    }

    if (action === "signup") {
      if (!password) {
        return jsonResponse({ error: "Password is required for signup" }, 400);
      }

      const existingUser = await findUserByEmail(supabaseAdmin, email);
      let userId: string;

      if (existingUser) {
        if (existingUser.email_confirmed_at) {
          return jsonResponse({ error: "This email is already registered. Please log in instead." }, 400);
        }

        console.log(`Updating unconfirmed user: ${existingUser.id}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, goal, pending_plan_id: planId },
          },
        );
        if (updateError) throw updateError;
        userId = existingUser.id;
      } else {
        console.log("Creating new user");
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, goal, pending_plan_id: planId },
        });
        if (createError) throw createError;
        userId = newUser.user.id;
      }

      // Upsert profile immediately on signup so it is ready when client logs in
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: insertError } = await supabaseAdmin.from("profiles").insert({
          id: userId,
          email,
          full_name: fullName || email,
          credits: 0,
          is_active: true,
          settings: goal ? { goal } : {},
          pending_plan_id: planId || null,
          payment_status: "unpaid",
          subscription_status: "inactive",
          onboarding_completed: false,
        });
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: fullName || email,
            is_active: true,
            pending_plan_id: planId || null,
            onboarding_completed: false,
          })
          .eq("id", userId);
        if (updateError) throw updateError;
      }

      return jsonResponse({ success: true, message: "Signup successful" });
    }

    if (action === "verify") {
      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return jsonResponse({ error: "Invalid verification code" }, 400);
      }

      const user = await findUserByEmail(supabaseAdmin, email);
      if (!user) {
        return jsonResponse({ error: "Invalid verification code" }, 400);
      }

      const { data: codeRecord, error: codeError } = await supabaseAdmin
        .from("auth_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("used", false)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (codeError) throw codeError;
      if (!codeRecord) {
        return jsonResponse({ error: "Invalid verification code" }, 400);
      }

      const now = new Date();
      if (codeRecord.locked_until && new Date(codeRecord.locked_until) > now) {
        return jsonResponse({ error: "Too many verification attempts. Please try again later." }, 429);
      }

      if (new Date(codeRecord.expires_at) < now) {
        await supabaseAdmin
          .from("auth_codes")
          .update({ used: true, last_attempt_at: now.toISOString() })
          .eq("user_id", user.id)
          .eq("code", codeRecord.code)
          .eq("used", false);
        return jsonResponse({ error: "Verification code has expired" }, 400);
      }

      const submittedCodeHash = await hashOtp(user.id, email, code);
      if (submittedCodeHash !== codeRecord.code) {
        const nextAttempts = Number(codeRecord.attempt_count ?? 0) + 1;
        const lockedUntil = nextAttempts >= OTP_MAX_ATTEMPTS
          ? new Date(Date.now() + OTP_LOCKOUT_MS).toISOString()
          : null;

        await supabaseAdmin
          .from("auth_codes")
          .update({
            attempt_count: nextAttempts,
            last_attempt_at: now.toISOString(),
            locked_until: lockedUntil,
          })
          .eq("user_id", user.id)
          .eq("code", codeRecord.code)
          .eq("used", false);

        return jsonResponse(
          {
            error: lockedUntil
              ? "Too many verification attempts. Please try again later."
              : "Invalid verification code",
          },
          lockedUntil ? 429 : 400,
        );
      }

      await supabaseAdmin
        .from("auth_codes")
        .update({ used: true, last_attempt_at: now.toISOString() })
        .eq("user_id", user.id)
        .eq("code", submittedCodeHash)
        .eq("used", false);

      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true },
      );
      if (confirmError) throw confirmError;

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, settings")
        .eq("id", user.id)
        .maybeSingle();

      const fullName = user.user_metadata?.full_name || email;
      const signupGoal = user.user_metadata?.goal || null;

      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          id: user.id,
          email,
          full_name: fullName,
          credits: 0,
          is_active: true,
          settings: signupGoal ? { goal: signupGoal } : {},
          pending_plan_id: user.user_metadata?.pending_plan_id || null,
          payment_status: 'unpaid',
          subscription_status: 'inactive'
        });
      } else {
        const currentSettings = existingProfile.settings || {};
        const newSettings = signupGoal ? { ...currentSettings, goal: signupGoal } : currentSettings;

        await supabaseAdmin
          .from("profiles")
          .update({
            settings: newSettings,
            is_active: true,
            pending_plan_id: user.user_metadata?.pending_plan_id || null,
          })
          .eq("id", user.id);
      }

      return jsonResponse({ success: true, message: "Email verified successfully" });
    }

    if (action === "resend") {
      const user = await findUserByEmail(supabaseAdmin, email);
      if (!user) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      const verificationCode = generateOtpCode();
      await storeOtpCode(supabaseAdmin, user.id, email, verificationCode);
      await sendVerificationEmail(email, verificationCode);

      return jsonResponse({ success: true, message: "Verification code resent successfully" });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("[auth-otp] Error:", error);
    const message = error instanceof Error ? error.message : "An internal error occurred";
    return jsonResponse({ error: message }, 500);
  }
});
