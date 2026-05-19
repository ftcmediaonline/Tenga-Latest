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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const shopName = typeof body?.shopName === "string" ? body.shopName.trim() : "";

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }
    if (!shopName) {
      return jsonResponse({ error: "shopName is required" }, 400);
    }

    const safeShop = escapeHtml(shopName);
    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">Thanks for applying on Tenga</h1>
        <p>We received your application for <strong>${safeShop}</strong>.</p>
        <p>Our team usually reviews new shops within 24 hours. We'll email you when <strong>${safeShop}</strong> is approved and live.</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— The Tenga team</p>
      </div>
    `;

    const sendResult = await sendEmail({
      from: transactionalFrom(),
      to: email,
      subject: `We received your shop application — ${shopName}`,
      html,
      idempotencyKey: `shop-application/${user.id}/${encodeURIComponent(shopName)}`,
      tags: [
        { name: "category", value: "transactional" },
        { name: "type", value: "shop_application" },
      ],
    });

    if (!sendResult.ok) {
      return jsonResponse({ error: "Resend error", details: sendResult.error }, 502);
    }

    return jsonResponse({ sent: true, id: sendResult.id });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
