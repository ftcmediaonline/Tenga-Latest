import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  escapeHtml,
  isValidEmail,
  jsonResponse,
  sendEmail,
  transactionalFrom,
} from "../_shared/resend.ts";

type OrderItem = { name: string; qty: number; price: number };

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
    const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "Customer";
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
    const shippingMethod = typeof body?.shippingMethod === "string" ? body.shippingMethod.trim() : "";
    const total = Number(body?.total);
    const itemsRaw = Array.isArray(body?.items) ? body.items : [];

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }
    if (!orderNumber) {
      return jsonResponse({ error: "orderNumber is required" }, 400);
    }
    if (!Number.isFinite(total) || total < 0) {
      return jsonResponse({ error: "total is required" }, 400);
    }

    const items: OrderItem[] = [];
    for (const row of itemsRaw) {
      if (!row || typeof row !== "object") continue;
      const name = typeof (row as OrderItem).name === "string" ? (row as OrderItem).name.trim() : "";
      const qty = Number((row as OrderItem).qty);
      const price = Number((row as OrderItem).price);
      if (!name || !Number.isFinite(qty) || qty < 1 || !Number.isFinite(price)) continue;
      items.push({ name, qty, price });
    }
    if (items.length === 0) {
      return jsonResponse({ error: "At least one order item is required" }, 400);
    }

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

    const sendResult = await sendEmail({
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

    if (!sendResult.ok) {
      return jsonResponse({ error: "Resend error", details: sendResult.error }, 502);
    }

    return jsonResponse({ sent: true, id: sendResult.id });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
