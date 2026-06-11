/**
 * Unified Tenga email Edge Function — deploy via Supabase Dashboard (no CLI required).
 *
 * Dashboard: Edge Functions → New function → Name: `send-email` → paste this file.
 * Secrets: RESEND_API_KEY, TRANSACTIONAL_FROM_EMAIL, PROMO_FROM_EMAIL (optional), SITE_URL (optional)
 *
 * Request body must include `action`:
 * - shop-confirmation
 * - order-confirmation
 * - shop-approved
 * - promotional-email
 * - admin-promo-store-owners
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 100;
const DEFAULT_FROM_EMAIL = "Tenga Virtual Mall <info@tengavm.co.zw>";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

function transactionalFrom(): string {
  return (
    Deno.env.get("TRANSACTIONAL_FROM_EMAIL") ||
    Deno.env.get("FROM_EMAIL") ||
    Deno.env.get("PROMO_FROM_EMAIL") ||
    DEFAULT_FROM_EMAIL
  );
}

function promoFrom(): string {
  return (
    Deno.env.get("PROMO_FROM_EMAIL") ||
    Deno.env.get("FROM_EMAIL") ||
    DEFAULT_FROM_EMAIL
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

function wrapInTengaTemplate(contentHtml: string, title: string): string {
  const logoUrl = "https://uzfuxidboklnyssgovmm.supabase.co/storage/v1/object/public/uploads/product-images/1779197398413-k1vh3m74bg9.png";
  
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            color: #1e293b;
          }
          .wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #f1f5f9;
          }
          .header {
            background-color: #ffffff;
            padding: 32px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
          }
          .logo {
            height: 52px;
            width: auto;
            display: inline-block;
          }
          .content {
            padding: 32px;
            line-height: 1.6;
            font-size: 15px;
          }
          .footer {
            background-color: #0f172a;
            padding: 32px;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
          }
          .footer a {
            color: #f97316;
            text-decoration: none;
          }
          .footer-divider {
            margin: 16px 0;
            border-top: 1px solid #334155;
          }
          .btn-primary {
            display: inline-block;
            background-color: #f97316;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 16px 0;
            text-align: center;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            text-align: left;
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
            padding-bottom: 8px;
            border-bottom: 2px solid #f1f5f9;
          }
          .table td {
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          .total-box {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
            border: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-title {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
          }
          .total-value {
            font-size: 18px;
            color: #0f172a;
            font-weight: 700;
          }
          .accent-badge {
            display: inline-block;
            background-color: rgba(249, 115, 22, 0.08);
            color: #f97316;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-bottom: 12px;
          }
          .headline {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          .details-list {
            padding-left: 20px;
            color: #475569;
            margin: 16px 0;
          }
          .details-list li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <table style="margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="${logoUrl}" alt="Tenga Logo" class="logo" style="height: 52px; display: block;" />
                  </td>
                  <td style="vertical-align: middle; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 26px; font-weight: 800; line-height: 1.1; color: #0f172a; letter-spacing: 0.5px; margin: 0;">
                      TENGA
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #f97316; letter-spacing: 3px; margin-top: 4px; text-transform: uppercase; line-height: 1; margin-bottom: 0;">
                      VIRTUAL MALL
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <div class="content">
              ${contentHtml}
            </div>
            <div class="footer">
              <p style="margin: 0 0 8px;"><strong>Tenga Virtual Mall</strong></p>
              <p style="margin: 0 0 16px;">Zimbabwe's Premium Virtual Shopping Experience</p>
              <div class="footer-divider"></div>
              <p style="margin: 0;">This is an automated transactional message. Please do not reply directly to this email.</p>
              <p style="margin: 8px 0 0;">&copy; ${new Date().getFullYear()} Tenga Virtual Mall. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured" };

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
    ...(params.tags ? { tags: params.tags } : {}),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? "" };
}

async function sendBatchEmails(params: {
  from: string;
  subject: string;
  html: string;
  recipients: string[];
  idempotencyKeyPrefix: string;
}): Promise<{ ok: true; sent: number } | { ok: false; error: string; sent: number }> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured", sent: 0 };

  let sent = 0;
  const { recipients, from, subject, html, idempotencyKeyPrefix } = params;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((to, idx) => ({
      from,
      to: [to],
      subject,
      html,
      idempotencyKey: `${idempotencyKeyPrefix}/${i + idx}/${to}`,
    }));

    const { data, error } = await resend.batch.send(payload);
    if (error) return { ok: false, error: error.message, sent };
    sent += Array.isArray(data) ? data.length : chunk.length;
  }

  return { ok: true, sent };
}

type AuthContext = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  authHeader: string;
  user: { id: string } | null;
};

function getAuthEnv() {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
    supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  };
}

/** Service role (e.g. iVeri webhook) or signed-in user. */
async function requireUserOrService(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getAuthEnv();
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token && token === supabaseServiceKey) {
    return { supabaseUrl, supabaseAnonKey, supabaseServiceKey, authHeader, user: null };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey, authHeader, user };
}

async function requireUser(req: Request): Promise<AuthContext | Response> {
  const auth = await requireUserOrService(req);
  if (auth instanceof Response) return auth;
  if (!auth.user) return jsonResponse({ error: "Unauthorized" }, 401);
  return auth;
}

async function requireAdmin(ctx: AuthContext): Promise<Response | null> {
  if (!ctx.user) return jsonResponse({ error: "Forbidden: admin only" }, 403);
  const supabaseAdmin = createClient(ctx.supabaseUrl, ctx.supabaseServiceKey);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return jsonResponse({ error: "Forbidden: admin only" }, 403);
  }
  return null;
}

type OrderItem = { name: string; qty: number; price: number };

async function handleShopConfirmation(ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  if (!ctx.user) return jsonResponse({ error: "Unauthorized" }, 401);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";

  if (!email || !isValidEmail(email)) return jsonResponse({ error: "Valid email is required" }, 400);
  if (!shopName) return jsonResponse({ error: "shopName is required" }, 400);

  const safeShop = escapeHtml(shopName);

  const result = await sendEmail({
    from: transactionalFrom(),
    to: email,
    subject: `We received your shop application — ${shopName}`,
    html: wrapInTengaTemplate(`
      <span class="accent-badge">Shop Application</span>
      <h2 class="headline">Thanks for applying on Tenga</h2>
      <p>We received your application for <strong>${safeShop}</strong>.</p>
      <p>Our dedicated onboarding team reviews new shops within 24 hours. We'll email you the moment <strong>${safeShop}</strong> is approved and live on our marketplace!</p>
      <p style="color: #64748b; margin-top: 24px; font-size: 14px;">If you have any questions, feel free to reply to this message. — The Tenga team</p>
    `, `We received your shop application — ${shopName}`),
    idempotencyKey: `shop-application/${ctx.user.id}/${encodeURIComponent(shopName)}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "shop_application" },
    ],
  });

  if (!result.ok) return jsonResponse({ error: "Resend error", details: result.error }, 502);
  return jsonResponse({ sent: true, id: result.id });
}

async function handleOrderConfirmation(ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "Customer";
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const rawShipping = typeof body.shippingMethod === "string" ? body.shippingMethod.trim() : "";
  const shippingMethod = rawShipping ? rawShipping.charAt(0).toUpperCase() + rawShipping.slice(1) : "";
  const total = Number(body.total);
  const itemsRaw = Array.isArray(body.items) ? body.items : [];

  if (!email || !isValidEmail(email)) return jsonResponse({ error: "Valid email is required" }, 400);
  if (!orderNumber) return jsonResponse({ error: "orderNumber is required" }, 400);
  if (!Number.isFinite(total) || total < 0) return jsonResponse({ error: "total is required" }, 400);

  const items: OrderItem[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== "object") continue;
    const name = typeof (row as OrderItem).name === "string" ? (row as OrderItem).name.trim() : "";
    const qty = Number((row as OrderItem).qty);
    const price = Number((row as OrderItem).price);
    if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price)) continue;
    items.push({ name, qty, price });
  }
  if (items.length === 0) return jsonResponse({ error: "At least one order item is required" }, 400);

  const rowsHtml = items
    .map((item) => {
      const lineTotal = (item.price * item.qty).toFixed(2);
      return `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.qty}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">$${lineTotal}</td>
      </tr>`;
    })
    .join("");

  const shippingLine = shippingMethod
    ? `<p style="margin: 0 0 16px;">Shipping: <strong>${escapeHtml(shippingMethod)}</strong></p>`
    : "";

  // 1. Send the standard receipt to the customer
  const customerHtml = wrapInTengaTemplate(`
    <span class="accent-badge">Order Confirmed</span>
    <h2 class="headline">Thank you for your order!</h2>
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Your order on Tenga is confirmed! Your order number is <strong>${escapeHtml(orderNumber)}</strong>.</p>
    ${shippingLine}
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tr>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 14px; color: #64748b; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Order Total
        </td>
        <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; text-align: right; font-size: 18px; color: #0f172a; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          $${total.toFixed(2)}
        </td>
      </tr>
    </table>
    <p style="color: #64748b; margin-top: 24px; font-size: 14px;">We'll notify you as soon as your items ship! — The Tenga team</p>
  `, `Order confirmed — ${orderNumber}`);

  const customerResult = await sendEmail({
    from: transactionalFrom(),
    to: email,
    subject: `Order confirmed — ${orderNumber}`,
    html: customerHtml,
    idempotencyKey: `order-confirmation/${orderNumber}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "order_confirmation" },
    ],
  });

  if (!customerResult.ok) {
    console.error("Failed to send customer order confirmation:", customerResult.error);
  }

  // 2. Query DB to resolve Store Owner email and Master Admin emails
  try {
    const supabaseAdmin = createClient(ctx.supabaseUrl, ctx.supabaseServiceKey);
    
    // Look up shop owner
    const { data: orderData } = await supabaseAdmin
      .from("orders")
      .select("shop_id")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderData?.shop_id) {
      const { data: shopData } = await supabaseAdmin
        .from("shops")
        .select("name, contact_email, owner_id")
        .eq("id", orderData.shop_id)
        .maybeSingle();

      if (shopData) {
        const shopName = shopData.name || "your shop";
        let ownerEmail = "";
        let ownerName = "Store Owner";

        if (shopData.contact_email && isValidEmail(shopData.contact_email.trim())) {
          ownerEmail = shopData.contact_email.trim();
        }

        if (shopData.owner_id) {
          const { data: profileData } = await supabaseAdmin
            .from("profiles")
            .select("full_name, username")
            .eq("id", shopData.owner_id)
            .maybeSingle();
          
          if (profileData) {
            ownerName = profileData.full_name || profileData.username || "Store Owner";
          }

          if (!ownerEmail) {
            const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(shopData.owner_id);
            if (ownerUser?.user?.email && isValidEmail(ownerUser.user.email)) {
              ownerEmail = ownerUser.user.email;
            }
          }
        }

        // Send new order notification to the Store Owner
        if (ownerEmail) {
          const ownerHtml = wrapInTengaTemplate(`
            <span class="accent-badge">New Sale Alert</span>
            <h2 class="headline">You've received a new order!</h2>
            <p>Hi ${escapeHtml(ownerName)},</p>
            <p>Great news! You have received a new order for <strong>${escapeHtml(shopName)}</strong> on Tenga Virtual Mall!</p>
            <p><strong>Customer & Shipping info:</strong></p>
            <ul class="details-list">
              <li><strong>Customer Name:</strong> ${escapeHtml(customerName)}</li>
              <li><strong>Customer Email:</strong> ${escapeHtml(email)}</li>
              <li><strong>Shipping Method:</strong> ${escapeHtml(shippingMethod || "Standard")}</li>
              <li><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</li>
            </ul>
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 14px; color: #64748b; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Total Payout
                </td>
                <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; text-align: right; font-size: 18px; color: #0f172a; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  $${total.toFixed(2)}
                </td>
              </tr>
            </table>
            <p style="color: #64748b; margin-top: 24px; font-size: 14px;">Please prepare this order for shipping/handling as soon as possible. — The Tenga team</p>
          `, `[Tenga Vendor] New Order Received #${orderNumber}`);

          await sendEmail({
            from: transactionalFrom(),
            to: ownerEmail,
            subject: `[Tenga Vendor] New Order Received #${orderNumber}`,
            html: ownerHtml,
            idempotencyKey: `order-confirmation-owner/${orderNumber}`,
            tags: [
              { name: "category", value: "transactional" },
              { name: "type", value: "order_confirmation_owner" },
            ],
          });
        }
      }
    }

    // Look up Master Admins registered in database
    const adminEmails: string[] = [];
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminProfiles) {
      for (const admin of adminProfiles) {
        const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(admin.id);
        const aEmail = adminUser?.user?.email;
        if (aEmail && isValidEmail(aEmail.trim()) && !adminEmails.includes(aEmail.trim())) {
          adminEmails.push(aEmail.trim());
        }
      }
    }

    // Also include MASTER_ADMIN_EMAIL or sender email fallback
    const envAdminEmail = Deno.env.get("MASTER_ADMIN_EMAIL");
    if (envAdminEmail && isValidEmail(envAdminEmail.trim()) && !adminEmails.includes(envAdminEmail.trim())) {
      adminEmails.push(envAdminEmail.trim());
    }

    // Send notifications to all Admins
    for (const adminEmail of adminEmails) {
      const adminHtml = wrapInTengaTemplate(`
        <span class="accent-badge" style="background-color: rgba(15, 23, 42, 0.08); color: #0f172a;">Platform Admin Notification</span>
        <h2 class="headline">Order Notification Report</h2>
        <p>Dear Administrator,</p>
        <p>A new order has been placed and confirmed on Tenga Virtual Mall.</p>
        <p><strong>Order Summary:</strong></p>
        <ul class="details-list">
          <li><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</li>
          <li><strong>Customer Name:</strong> ${escapeHtml(customerName)}</li>
          <li><strong>Customer Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Total Amount:</strong> $${total.toFixed(2)}</li>
        </ul>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p style="color: #64748b; margin-top: 24px; font-size: 14px;">This is an automated system monitor report. — Tenga Virtual Mall</p>
      `, `[Tenga Admin] Order Notification Report #${orderNumber}`);

      await sendEmail({
        from: transactionalFrom(),
        to: adminEmail,
        subject: `[Tenga Admin] Order Notification Report #${orderNumber}`,
        html: adminHtml,
        idempotencyKey: `order-confirmation-admin/${adminEmail}/${orderNumber}`,
        tags: [
          { name: "category", value: "transactional" },
          { name: "type", value: "order_confirmation_admin" },
        ],
      });
    }
  } catch (dbErr) {
    console.error("Failed to fetch shop/owner/admin details for notification routing:", dbErr);
  }

  return jsonResponse({ sent: true, id: customerResult.id || "success" });
}

async function handleShopApproved(ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const forbidden = await requireAdmin(ctx);
  if (forbidden) return forbidden;

  const shopId = (body.shop_id ?? body.shopId) as string | undefined;
  if (!shopId || typeof shopId !== "string") return jsonResponse({ error: "shop_id is required" }, 400);

  const supabaseAdmin = createClient(ctx.supabaseUrl, ctx.supabaseServiceKey);
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, name, slug, contact_email, owner_id")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop) return jsonResponse({ error: "Shop not found" }, 404);

  let toEmail = typeof shop.contact_email === "string" ? shop.contact_email.trim() : "";
  if (!toEmail || !isValidEmail(toEmail)) {
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(shop.owner_id);
    toEmail = owner?.user?.email?.trim() ?? "";
  }
  if (!toEmail || !isValidEmail(toEmail)) {
    return jsonResponse({ error: "No valid email for this shop owner" }, 400);
  }

  const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || "").replace(/\/$/, "");
  const shopLink = siteUrl && shop.slug ? `${siteUrl}/shop/${shop.slug}` : null;
  const safeName = escapeHtml(shop.name);
  const linkBlock = shopLink
    ? `<p><a href="${shopLink}" style="color: #1e3a5f;">View your live shop</a></p>`
    : `<p>Sign in to your seller dashboard to manage products and orders.</p>`;

  const html = wrapInTengaTemplate(`
    <span class="accent-badge">Verification Approved</span>
    <h2 class="headline">Your shop is live on Tenga!</h2>
    <p>Great news — <strong>${safeName}</strong> has been approved and is now officially live for customers on Tenga Virtual Mall!</p>
    <div style="margin: 24px 0; text-align: center;">
      ${shopLink ? `<a href="${shopLink}" class="btn-primary">View Your Live Shop</a>` : `<a href="${siteUrl}/seller-dashboard" class="btn-primary">Go to Seller Dashboard</a>`}
    </div>
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you for partnering with us. We are excited to support your business journey! — The Tenga team</p>
  `, `${shop.name} is now live on Tenga`);

  const result = await sendEmail({
    from: transactionalFrom(),
    to: toEmail,
    subject: `${shop.name} is now live on Tenga`,
    html,
    idempotencyKey: `shop-approved/${shopId}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "shop_approved" },
    ],
  });

  if (!result.ok) return jsonResponse({ error: "Resend error", details: result.error }, 502);
  return jsonResponse({ sent: true, to: toEmail, id: result.id });
}

async function handlePromotionalEmail(ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const shopId = (body.shop_id ?? body.shopId) as string | undefined;
  const subject = body.subject;
  const messageBody = body.body ?? body.html ?? body.text ?? "";
  const audience = body.audience ?? ["followers"];

  if (!shopId || typeof shopId !== "string") return jsonResponse({ error: "Missing shop_id in body" }, 400);
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    return jsonResponse({ error: "Subject is required" }, 400);
  }
  if (typeof messageBody !== "string" || !messageBody.trim()) {
    return jsonResponse({ error: "Message body is required" }, 400);
  }

  const audiences = Array.isArray(audience) ? audience : [audience];
  const wantFollowers = audiences.some((a: string) => String(a).toLowerCase() === "followers");
  const wantCustomers = audiences.some((a: string) => String(a).toLowerCase() === "customers");
  if (!wantFollowers && !wantCustomers) {
    return jsonResponse({ error: "audience must include 'followers' and/or 'customers'" }, 400);
  }

  const supabaseAdmin = createClient(ctx.supabaseUrl, ctx.supabaseServiceKey);
  const { data: shop } = await supabaseAdmin
    .from("shops")
    .select("id, owner_id, name")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop || shop.owner_id !== ctx.user.id) {
    return jsonResponse({ error: "Shop not found or you are not the owner" }, 403);
  }

  const emailsSet = new Set<string>();

  if (wantFollowers) {
    const { data: followers } = await supabaseAdmin
      .from("shop_followers")
      .select("user_id")
      .eq("shop_id", shopId);
    const userIds = [...new Set((followers ?? []).map((r: { user_id: string }) => r.user_id))];
    for (const uid of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.data?.user?.email;
      if (email && isValidEmail(email)) emailsSet.add(email);
    }
  }

  if (wantCustomers) {
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("customer_email")
      .eq("shop_id", shopId)
      .not("customer_email", "is", null);
    for (const row of orders ?? []) {
      const email = (row as { customer_email: string | null }).customer_email;
      if (email && typeof email === "string" && isValidEmail(email)) emailsSet.add(email);
    }
  }

  const emails = [...emailsSet];
  if (emails.length === 0) {
    return jsonResponse({ sent: 0, message: "No recipients found for the selected audience(s)." });
  }

  const html = wrapInTengaTemplate(`
    <span class="accent-badge">Store Announcement</span>
    <h2 class="headline">${escapeHtml(subject.trim())}</h2>
    ${String(messageBody).includes("<") ? String(messageBody) : `<p>${String(messageBody).replace(/\n/g, "<br/>")}</p>`}
  `, subject.trim());

  const batchResult = await sendBatchEmails({
    from: promoFrom(),
    subject: subject.trim(),
    html,
    recipients: emails,
    idempotencyKeyPrefix: `seller-promo/${shopId}`,
  });

  if (!batchResult.ok) {
    return jsonResponse({ error: "Resend error", details: batchResult.error, sent: batchResult.sent }, 502);
  }

  return jsonResponse({
    sent: batchResult.sent,
    message: `Promotional email sent to ${batchResult.sent} recipient(s).`,
  });
}

async function handleAdminPromo(ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const forbidden = await requireAdmin(ctx);
  if (forbidden) return forbidden;

  const subject = body.subject;
  const messageBody = body.body ?? body.html ?? body.text ?? "";
  const tier = (body.tier ?? body.pricing_tier ?? "all").toString().toLowerCase();

  if (!subject || typeof subject !== "string" || !subject.trim()) {
    return jsonResponse({ error: "Subject is required" }, 400);
  }
  if (typeof messageBody !== "string" || !messageBody.trim()) {
    return jsonResponse({ error: "Message body is required" }, 400);
  }

  const supabaseAdmin = createClient(ctx.supabaseUrl, ctx.supabaseServiceKey);
  let query = supabaseAdmin.from("shops").select("owner_id");
  if (tier !== "all") query = query.eq("pricing_tier", tier);
  const { data: shops } = await query;

  const ownerIds = [...new Set((shops ?? []).map((r: { owner_id: string }) => r.owner_id))];
  const emailsSet = new Set<string>();
  for (const uid of ownerIds) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
    const email = u?.data?.user?.email;
    if (email && isValidEmail(email)) emailsSet.add(email);
  }

  const emails = [...emailsSet];
  if (emails.length === 0) {
    return jsonResponse({ sent: 0, message: "No store owners found for the selected tier." });
  }

  const html = wrapInTengaTemplate(`
    <span class="accent-badge" style="background-color: rgba(15, 23, 42, 0.08); color: #0f172a;">Platform Announcement</span>
    <h2 class="headline">${escapeHtml(subject.trim())}</h2>
    ${String(messageBody).includes("<") ? String(messageBody) : `<p>${String(messageBody).replace(/\n/g, "<br/>")}</p>`}
  `, subject.trim());

  const batchResult = await sendBatchEmails({
    from: promoFrom(),
    subject: subject.trim(),
    html,
    recipients: emails,
    idempotencyKeyPrefix: `admin-promo-store-owners/${tier}`,
  });

  if (!batchResult.ok) {
    return jsonResponse({ error: "Resend error", details: batchResult.error, sent: batchResult.sent }, 502);
  }

  return jsonResponse({
    sent: batchResult.sent,
    message: `Email sent to ${batchResult.sent} store owner(s).`,
  });
}

async function handleWelcomeNewsletter(_ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "Shopper";

  if (!email || !isValidEmail(email)) return jsonResponse({ error: "Valid email is required" }, 400);

  const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || "https://tengavm.co.zw").replace(/\/$/, "");

  const html = wrapInTengaTemplate(`
    <span class="accent-badge">Welcome Offer</span>
    <h2 class="headline">Welcome to Tenga!</h2>
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Thank you for joining Zimbabwe's premium virtual shopping experience! We are absolutely thrilled to have you as part of our exclusive community.</p>
    <p>As a warm welcome, here is your <strong>20% discount code</strong> for your first purchase:</p>
    
    <div style="margin: 24px 0; text-align: center;">
      <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #f97316; border-radius: 8px; padding: 12px 28px; font-family: monospace; font-size: 22px; font-weight: 700; color: #f97316; letter-spacing: 2px;">
        WELCOME20
      </div>
    </div>

    <p>Simply enter this code at checkout to claim your 20% discount.</p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${siteUrl}" class="btn-primary">Start Shopping Now</a>
    </div>
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This offer is valid for a limited time only. If you need any assistance, our help center is always here for you. — The Tenga team</p>
  `, "Welcome to Tenga Virtual Mall! — 20% Off");

  const result = await sendEmail({
    from: transactionalFrom(),
    to: email,
    subject: "Welcome to Tenga! Claim your 20% discount",
    html,
    idempotencyKey: `welcome-newsletter/${email}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "welcome_newsletter" },
    ],
  });

  if (!result.ok) return jsonResponse({ error: "Resend error", details: result.error }, 502);
  return jsonResponse({ sent: true, id: result.id });
}

const ACTIONS = new Set([
  "shop-confirmation",
  "order-confirmation",
  "shop-approved",
  "promotional-email",
  "admin-promo-store-owners",
  "welcome-newsletter",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (!getResend()) {
    return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!action || !ACTIONS.has(action)) {
      return jsonResponse({
        error: "Missing or invalid action",
        validActions: [...ACTIONS],
      }, 400);
    }

    const auth =
      action === "order-confirmation"
        ? await requireUserOrService(req)
        : await requireUser(req);
    if (auth instanceof Response) return auth;

    switch (action) {
      case "shop-confirmation":
        return await handleShopConfirmation(auth, body);
      case "order-confirmation":
        return await handleOrderConfirmation(auth, body);
      case "shop-approved":
        return await handleShopApproved(auth, body);
      case "promotional-email":
        return await handlePromotionalEmail(auth, body);
      case "admin-promo-store-owners":
        return await handleAdminPromo(auth, body);
      case "welcome-newsletter":
        return await handleWelcomeNewsletter(auth, body);
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
