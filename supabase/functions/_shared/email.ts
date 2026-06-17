// Billing transactional emails via Resend.
// buildEmailContent + formatAmount are pure — no Deno references — safe to
// import and test under Node. sendBillingEmail uses Deno.env inside its body
// and is only called from edge-function context.

export type BillingEmailType =
  | "trial_started"
  | "subscription_activated"
  | "payment_receipt"
  | "payment_failed"
  | "subscription_cancelled";

export interface BillingEmailData {
  to: string;
  type: BillingEmailType;
  userName?: string;
  planName?: string;
  /** Amount in cents (e.g. 4900 = $49.00) */
  amountCents?: number;
  currency?: string;
  /** Stripe-hosted invoice URL */
  invoiceUrl?: string;
  /** ISO date string for next renewal */
  nextBillingDate?: string;
  /** ISO date string for trial expiry */
  trialEndDate?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatAmount(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function wrap(opts: {
  preheader: string;
  accent: string;
  title: string;
  body: string;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<!--preheader-->
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
<!--wrapper-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <!--header-->
  <tr><td style="background:${opts.accent};border-radius:10px 10px 0 0;padding:28px 40px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1;">SellerSuit</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:5px;letter-spacing:0.5px;text-transform:uppercase;">eBay Dropshipping Toolkit</div>
  </td></tr>
  <!--body-->
  <tr><td style="background:#ffffff;padding:40px;border-radius:0 0 10px 10px;">
    ${opts.body}
    <!--footer-->
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
        SellerSuit &mdash; eBay dropshipping, simplified.<br/>
        <a href="${opts.appUrl}/dashboard/subscription" style="color:#7c3aed;text-decoration:none;">Manage billing</a>
        &nbsp;&middot;&nbsp;
        <a href="${opts.appUrl}/dashboard" style="color:#7c3aed;text-decoration:none;">Dashboard</a>
      </p>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, href: string, color = "#6d28d9"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
  <tr><td style="border-radius:6px;background:${color};">
    <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;line-height:1;">${label}</a>
  </td></tr>
</table>`;
}

function row(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${label}</td>
  <td style="padding:10px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
</tr>`;
}

function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8f7ff;border-radius:8px;padding:0;margin:0 0 24px;">
  <tr><td style="padding:4px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>
</table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e1b4b;line-height:1.3;">${text}</h1>`;
}

function p(text: string, style = ""): string {
  return `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.65;${style}">${text}</p>`;
}

function alert(text: string, bg = "#fef3c7", border = "#f59e0b", textColor = "#92400e"): string {
  return `<div style="background:${bg};border:1px solid ${border};border-radius:6px;padding:14px 18px;margin:0 0 24px;">
  <p style="margin:0;font-size:14px;color:${textColor};line-height:1.5;">${text}</p>
</div>`;
}

// ── Template builder (pure) ───────────────────────────────────────────────────

export function buildEmailContent(
  data: BillingEmailData,
  appUrl = "https://sellersuit.com",
): { subject: string; html: string } {
  const hi = data.userName ? `Hi ${data.userName},` : "Hi there,";
  const greet = `<p style="margin:0 0 4px;font-size:14px;color:#9ca3af;">${hi}</p>`;

  switch (data.type) {
    // ── Trial started ─────────────────────────────────────────────────────────
    case "trial_started": {
      const endStr = data.trialEndDate ? fmtDate(data.trialEndDate) : "in 7 days";
      const subject = "Your SellerSuit trial has started";
      const body = greet +
        h1("You're in. Let's make some sales. 🚀") +
        p(`Your <strong>$1 trial</strong> is now active. You have 7 full days to import Amazon products, list them on eBay, and see SellerSuit in action.`) +
        infoTable(
          row("Plan", "Trial — $1") +
          row("Access expires", endStr) +
          row("Active listings", "10") +
          row("Auto-orders", "10") +
          row("AI credits", "10"),
        ) +
        p("Open the dashboard to install the Chrome extension and import your first product:", "margin-bottom:0;") +
        btn("Go to Dashboard", `${appUrl}/dashboard`) +
        `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;text-align:center;">After your trial, upgrade to Starter ($15/mo) or Pro ($49/mo) to keep full access.</p>`;
      return {
        subject,
        html: wrap({ preheader: "Your $1 trial is live — 7 days of full access starts now.", accent: "#5b21b6", title: subject, body, appUrl }),
      };
    }

    // ── Subscription activated ────────────────────────────────────────────────
    case "subscription_activated": {
      const plan = data.planName ?? "your plan";
      const isPro = plan.toLowerCase().includes("pro");
      const isStarter = plan.toLowerCase().includes("starter");
      const listings = isPro ? "5,000" : isStarter ? "500" : "—";
      const credits = isPro ? "5,000" : isStarter ? "500" : "—";
      const subject = `Welcome to SellerSuit ${plan}`;
      const body = greet +
        h1(`You're on ${plan}. Time to scale. 🎉`) +
        p("Your subscription is active and your full monthly allowances are ready. Here's what you have access to:") +
        infoTable(
          row("Plan", plan) +
          row("Active listings", listings) +
          row("AI credits / month", credits) +
          row("Auto-orders / month", isPro ? "Unlimited" : isStarter ? "250" : "—") +
          row("Bulk lister", "✓ Included"),
        ) +
        btn("Go to Dashboard", `${appUrl}/dashboard`);
      return {
        subject,
        html: wrap({ preheader: `Your ${plan} subscription is active. Full access unlocked.`, accent: "#5b21b6", title: subject, body, appUrl }),
      };
    }

    // ── Payment receipt ───────────────────────────────────────────────────────
    case "payment_receipt": {
      const amt = data.amountCents != null
        ? formatAmount(data.amountCents, data.currency)
        : "your subscription payment";
      const plan = data.planName ?? "SellerSuit";
      const nextDate = data.nextBillingDate ? fmtDate(data.nextBillingDate) : "—";
      const subject = `Payment confirmed — ${amt} charged`;
      const invoiceLink = data.invoiceUrl
        ? `<div style="text-align:center;margin:0 0 24px;">
            <a href="${data.invoiceUrl}" style="font-size:14px;color:#6d28d9;text-decoration:none;font-weight:500;">Download invoice PDF &rarr;</a>
          </div>`
        : "";
      const body = greet +
        h1("Payment confirmed ✓") +
        p(`We successfully charged your card for your <strong>${plan}</strong> subscription. Nothing else is required — your access continues without interruption.`) +
        infoTable(
          row("Plan", plan) +
          row("Amount charged", amt) +
          row("Next billing date", nextDate),
        ) +
        invoiceLink +
        btn("View Billing", `${appUrl}/dashboard/subscription`, "#059669");
      return {
        subject,
        html: wrap({ preheader: `${amt} charged for your ${plan} plan. Thanks for subscribing.`, accent: "#059669", title: subject, body, appUrl }),
      };
    }

    // ── Payment failed ────────────────────────────────────────────────────────
    case "payment_failed": {
      const amt = data.amountCents != null
        ? formatAmount(data.amountCents, data.currency)
        : "your subscription payment";
      const subject = "Action required: your payment failed";
      const body = greet +
        h1("We couldn't process your payment") +
        p(`Our attempt to charge <strong>${amt}</strong> was unsuccessful. Please update your payment method to keep your subscription active.`) +
        alert(
          "⚠&nbsp; <strong>Update your card now</strong> to avoid losing access. Stripe will retry automatically, but your subscription will be cancelled if the payment remains unpaid.",
          "#fef2f2",
          "#fca5a5",
          "#991b1b",
        ) +
        btn("Update Payment Method", `${appUrl}/dashboard/subscription`, "#dc2626") +
        `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;text-align:center;">You can update your card anytime from the billing portal. Stripe retries failed payments automatically.</p>`;
      return {
        subject,
        html: wrap({ preheader: "Payment failed — please update your card to keep your subscription.", accent: "#dc2626", title: subject, body, appUrl }),
      };
    }

    // ── Subscription cancelled ────────────────────────────────────────────────
    case "subscription_cancelled": {
      const plan = data.planName ?? "SellerSuit";
      const subject = `Your ${plan} subscription has ended`;
      const body = greet +
        h1("Your subscription has ended") +
        p(`Your <strong>${plan}</strong> subscription has been cancelled and your access has ended. Your listing data and history are preserved — you can resubscribe at any time and pick up exactly where you left off.`) +
        infoTable(
          row("Status", "Cancelled") +
          row("Your listings &amp; data", "Preserved") +
          row("Reactivation", "Any time — no setup required"),
        ) +
        btn("Resubscribe", `${appUrl}/choose-plan`) +
        `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;text-align:center;">We&rsquo;re sorry to see you go. If something didn&rsquo;t work for you, reply to this email — we read every message.</p>`;
      return {
        subject,
        html: wrap({ preheader: `Your ${plan} subscription has been cancelled. Your data is safe.`, accent: "#374151", title: subject, body, appUrl }),
      };
    }

    default: {
      // Exhaustiveness guard — TypeScript will error if a new type is added
      // without being handled above.
      const _: never = data.type;
      void _;
      return { subject: "SellerSuit notification", html: "<p>No template defined for this event.</p>" };
    }
  }
}

// ── Resend sender (Deno-only, not unit-tested) ────────────────────────────────

export async function sendBillingEmail(
  data: BillingEmailData,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("FROM_EMAIL") ?? "billing@sellersuit.com";
  const appUrl = Deno.env.get("APP_URL") ?? "https://sellersuit.com";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured — skipping", data.type, data.to);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const { subject, html } = buildEmailContent(data, appUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [data.to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error", res.status, body);
      return { ok: false, error: body };
    }

    console.log(`[email] Sent ${data.type} → ${data.to}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] network error:", msg);
    return { ok: false, error: msg };
  }
}
