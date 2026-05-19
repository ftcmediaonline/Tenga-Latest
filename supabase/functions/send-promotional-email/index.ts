import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  promoFrom,
  sendBatchEmails,
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

    const body = await req.json().catch(() => ({}));
    const shopId = body?.shop_id ?? body?.shopId;
    const subject = body?.subject;
    const messageBody = body?.body ?? body?.html ?? body?.text ?? "";
    const audience = body?.audience ?? ["followers"];

    if (!shopId || typeof shopId !== "string") {
      return jsonResponse({ error: "Missing shop_id in body" }, 400);
    }
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, owner_id, name")
      .eq("id", shopId)
      .maybeSingle();
    if (!shop || shop.owner_id !== caller.id) {
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
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailsSet.add(email);
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
        if (email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailsSet.add(email);
        }
      }
    }

    const emails = [...emailsSet];
    if (emails.length === 0) {
      return jsonResponse({ sent: 0, message: "No recipients found for the selected audience(s)." });
    }

    const html = messageBody.includes("<") ? messageBody : `<p>${messageBody.replace(/\n/g, "<br/>")}</p>`;
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
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
