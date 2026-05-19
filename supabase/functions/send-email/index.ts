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
  user: { id: string };
};

async function requireUser(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey, authHeader, user };
}

async function requireAdmin(ctx: AuthContext): Promise<Response | null> {
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
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";

  if (!email || !isValidEmail(email)) return jsonResponse({ error: "Valid email is required" }, 400);
  if (!shopName) return jsonResponse({ error: "shopName is required" }, 400);

  const safeShop = escapeHtml(shopName);

  const result = await sendEmail({
    from: transactionalFrom(),
    to: email,
    subject: `We received your shop application — ${shopName}`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">Thanks for applying on Tenga</h1>
        <p>We received your application for <strong>${safeShop}</strong>.</p>
        <p>Our team usually reviews new shops within 24 hours. We'll email you when <strong>${safeShop}</strong> is approved and live.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— The Tenga team</p>
      </div>
    `,
    idempotencyKey: `shop-application/${ctx.user.id}/${encodeURIComponent(shopName)}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "shop_application" },
    ],
  });

  if (!result.ok) return jsonResponse({ error: "Resend error", details: result.error }, 502);
  return jsonResponse({ sent: true, id: result.id });
}

async function handleOrderConfirmation(_ctx: AuthContext, body: Record<string, unknown>): Promise<Response> {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "Customer";
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const shippingMethod = typeof body.shippingMethod === "string" ? body.shippingMethod.trim() : "";
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

  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">Order confirmed</h1>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Thanks for your order on Tenga. Your order number is <strong>${escapeHtml(orderNumber)}</strong>.</p>
      ${shippingLine}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="text-align: left; color: #64748b; font-size: 13px;">
            <th style="padding-bottom: 8px;">Item</th>
            <th style="padding-bottom: 8px; text-align: center;">Qty</th>
            <th style="padding-bottom: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="font-size: 18px; font-weight: 600;">Order total: $${total.toFixed(2)}</p>
      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">We'll notify you when your order ships. — The Tenga team</p>
    </div>
  `;

  const result = await sendEmail({
    from: transactionalFrom(),
    to: email,
    subject: `Order confirmed — ${orderNumber}`,
    html,
    idempotencyKey: `order-confirmation/${orderNumber}`,
    tags: [
      { name: "category", value: "transactional" },
      { name: "type", value: "order_confirmation" },
    ],
  });

  if (!result.ok) return jsonResponse({ error: "Resend error", details: result.error }, 502);
  return jsonResponse({ sent: true, id: result.id });
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

  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">Your shop is live on Tenga</h1>
      <p>Great news — <strong>${safeName}</strong> has been approved and is now visible to shoppers.</p>
      ${linkBlock}
      <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— The Tenga team</p>
    </div>
  `;

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

  const html = String(messageBody).includes("<")
    ? String(messageBody)
    : `<p>${String(messageBody).replace(/\n/g, "<br/>")}</p>`;

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

  const html = String(messageBody).includes("<")
    ? String(messageBody)
    : `<p>${String(messageBody).replace(/\n/g, "<br/>")}</p>`;

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

const ACTIONS = new Set([
  "shop-confirmation",
  "order-confirmation",
  "shop-approved",
  "promotional-email",
  "admin-promo-store-owners",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const auth = await requireUser(req);
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
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
