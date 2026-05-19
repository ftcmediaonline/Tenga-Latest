import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  escapeHtml,
  isValidEmail,
  jsonResponse,
  sendEmail,
  transactionalFrom,
} from "../_shared/resend.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await supabaseAuth.auth.getUser();
    if (!caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const shopId = body?.shop_id ?? body?.shopId;
    if (!shopId || typeof shopId !== "string") {
      return jsonResponse({ error: "shop_id is required" }, 400);
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, name, slug, contact_email, owner_id")
      .eq("id", shopId)
      .maybeSingle();

    if (!shop) {
      return jsonResponse({ error: "Shop not found" }, 404);
    }

    let toEmail = typeof shop.contact_email === "string" ? shop.contact_email.trim() : "";
    if (!toEmail || !isValidEmail(toEmail)) {
      const { data: owner } = await supabaseAdmin.auth.admin.getUserById(shop.owner_id);
      toEmail = owner?.user?.email?.trim() ?? "";
    }

    if (!toEmail || !isValidEmail(toEmail)) {
      return jsonResponse({ error: "No valid email for this shop owner" }, 400);
    }

    const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || "").replace(/\/$/, "");
    const shopLink = siteUrl && shop.slug
      ? `${siteUrl}/shop/${shop.slug}`
      : null;

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

    const sendResult = await sendEmail({
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

    if (!sendResult.ok) {
      return jsonResponse({ error: "Resend error", details: sendResult.error }, 502);
    }

    return jsonResponse({ sent: true, to: toEmail, id: sendResult.id });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
