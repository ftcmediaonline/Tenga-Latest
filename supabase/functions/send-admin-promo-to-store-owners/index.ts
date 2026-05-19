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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return jsonResponse({ error: "Forbidden: admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const subject = body?.subject;
    const messageBody = body?.body ?? body?.html ?? body?.text ?? "";
    const tier = (body?.tier ?? body?.pricing_tier ?? "all").toString().toLowerCase();

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return jsonResponse({ error: "Subject is required" }, 400);
    }
    if (typeof messageBody !== "string" || !messageBody.trim()) {
      return jsonResponse({ error: "Message body is required" }, 400);
    }

    let query = supabaseAdmin.from("shops").select("owner_id");
    if (tier !== "all") {
      query = query.eq("pricing_tier", tier);
    }
    const { data: shops } = await query;
    const ownerIds = [...new Set((shops ?? []).map((r: { owner_id: string }) => r.owner_id))];

    const emailsSet = new Set<string>();
    for (const uid of ownerIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.data?.user?.email;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailsSet.add(email);
    }

    const emails = [...emailsSet];
    if (emails.length === 0) {
      return jsonResponse({ sent: 0, message: "No store owners found for the selected tier." });
    }

    const html = messageBody.includes("<") ? messageBody : `<p>${messageBody.replace(/\n/g, "<br/>")}</p>`;
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
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
