import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

function getCleanEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) return "";
  // Remove UTF-8 BOM (\uFEFF) and trim whitespace
  return value.replace(/^\uFEFF/, "").trim();
}

const NONCE_FIELD = "Lite_Merchant_Nonce";
const DEFAULT_GATEWAY_URL = "https://portal.nedsecure.co.za/Lite/Authorise.aspx";

interface CartItem {
  id: string;
  product: { id: string; name: string; price: number; images: string[] };
  shop: { id: string; name: string };
  quantity: number;
}

interface AddressForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Max 20 chars for Ecom_ConsumerOrderID / MerchantReference. */
function generateOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `TNG${t.slice(-8)}${r}`.slice(0, 20);
}

function generateCheckoutNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function gatewayOrigin(gatewayUrl: string): string {
  return new URL(gatewayUrl).origin;
}

function authoriseInfoUrl(gatewayUrl: string): string {
  return `${gatewayOrigin(gatewayUrl)}/Lite/AuthoriseInfo.aspx`;
}

function formatApplicationId(raw: string): string {
  let applicationId = raw.trim();
  if (!applicationId.startsWith("{")) applicationId = `{${applicationId}}`;
  return applicationId.toUpperCase();
}

async function generateLiteToken(
  secretKey: string,
  resource: string,
  applicationId: string,
  amountInCents: string,
  emailAddress: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const tokenString = secretKey + timestamp + resource + applicationId + amountInCents + emailAddress;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokenString));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp}:${hashHex}`;
}

/** Mandatory Lite line items; amount in cents per unit. */
function buildLineItemFields(
  items: CartItem[],
  shippingCost: number,
): { fields: Record<string, string>; totalCents: number } {
  const fields: Record<string, string> = {};
  let idx = 1;
  let totalCents = 0;

  for (const item of items) {
    const unitCents = Math.round(Number(item.product.price) * 100);
    const lineCents = unitCents * item.quantity;
    totalCents += lineCents;
    fields[`Lite_Order_LineItems_Product_${idx}`] = item.product.name.slice(0, 255);
    fields[`Lite_Order_LineItems_Quantity_${idx}`] = String(item.quantity);
    fields[`Lite_Order_LineItems_Amount_${idx}`] = String(unitCents);
    idx++;
  }

  if (shippingCost > 0) {
    const shipCents = Math.round(shippingCost * 100);
    totalCents += shipCents;
    fields[`Lite_Order_LineItems_Product_${idx}`] = "Shipping";
    fields[`Lite_Order_LineItems_Quantity_${idx}`] = "1";
    fields[`Lite_Order_LineItems_Amount_${idx}`] = String(shipCents);
  }

  return { fields, totalCents };
}

function mapPaymentStatus(rawStatus: string | undefined): string {
  if (rawStatus === "0" || rawStatus === "Success" || rawStatus === "APPROVED") return "paid";
  if (rawStatus === "255" || rawStatus === "Error") return "error";
  if (rawStatus !== undefined && rawStatus !== "") return "failed";
  return "pending";
}

async function queryAuthoriseInfo(
  gatewayUrl: string,
  applicationId: string,
  merchantTrace: string,
): Promise<{ ok: boolean; rawStatus?: string; raw?: string }> {
  const url = authoriseInfoUrl(gatewayUrl);
  const body = new URLSearchParams({
    Lite_Merchant_ApplicationId: applicationId,
    Lite_Merchant_Trace: merchantTrace,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    const statusMatch = text.match(/Lite_Payment_Card_Status[=:]\s*([^\s<&]+)/i);
    return { ok: res.ok, rawStatus: statusMatch?.[1], raw: text.slice(0, 500) };
  } catch (e) {
    console.error("[iVeri] AuthoriseInfo query failed:", e);
    return { ok: false };
  }
}

async function sendOrderConfirmationEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  supabaseServiceKey: string,
  order: { id: string; total: number; customer_email: string; customer_name: string; shipping_method: string | null },
  orderNumber: string,
) {
  const { data: itemsData } = await supabaseAdmin
    .from("order_items")
    .select("price, quantity, products(name)")
    .eq("order_id", order.id);

  const formattedItems = (itemsData || []).map((it: { products?: { name?: string }; quantity: number; price: number }) => ({
    name: it.products?.name || "Product",
    qty: it.quantity,
    price: Number(it.price),
  }));

  await supabaseAdmin.functions.invoke("send-email", {
    headers: { Authorization: `Bearer ${supabaseServiceKey}` },
    body: {
      action: "order-confirmation",
      email: order.customer_email,
      customerName: order.customer_name,
      orderNumber,
      shippingMethod: order.shipping_method,
      total: Number(order.total),
      items: formattedItems,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isWebhook = url.pathname.endsWith("/webhook") || url.searchParams.get("webhook") === "true";

  const supabaseUrl = getCleanEnv("SUPABASE_URL");
  const supabaseServiceKey = getCleanEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // --- WEBHOOK / OOB ---
    if (isWebhook && req.method === "POST") {
      let payload: Record<string, string> = {};
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) payload[key] = String(value);
      } else {
        payload = (await req.json()) as Record<string, string>;
      }

      const orderNumber =
        payload["Ecom_ConsumerOrderID"] || payload["MerchantReference"] || payload["Lite_Consumer_Order_ID"];
      const rawStatus = payload["Lite_Payment_Card_Status"] || payload["Lite_Status"];
      const transactionId = payload["Lite_TransactionIndex"] || payload["Lite_BankReference"];
      const responseToken = payload["Lite_Transaction_Token"];

      if (!orderNumber) return json({ error: "Missing order identifier" }, 400);

      const paymentStatus = mapPaymentStatus(rawStatus);

      const { data: order, error: orderLookupError } = await supabaseAdmin
        .from("orders")
        .select("id, total, customer_email, customer_name, shipping_method, payment_status")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (orderLookupError || !order) return json({ error: "Order not found" }, 404);

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: paymentStatus,
          status: paymentStatus === "paid" ? "pending" : "cancelled",
          iveri_transaction_id: transactionId,
          iveri_transaction_token: responseToken,
        })
        .eq("order_number", orderNumber);

      if (updateError) return json({ error: "Database update failed" }, 500);

      if (paymentStatus === "paid" && order.payment_status !== "paid") {
        try {
          await sendOrderConfirmationEmail(supabaseAdmin, supabaseServiceKey, order, orderNumber);
        } catch (emailErr) {
          console.error("[iVeri Webhook] Email failed:", emailErr);
        }
      }

      return json({ success: true, paymentStatus });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabaseUserClient = createClient(supabaseUrl, getCleanEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "initialize";

    const gatewayUrl = getCleanEnv("IVERI_LITE_GATEWAY_URL") || DEFAULT_GATEWAY_URL;
    const rawApplicationId = getCleanEnv("IVERI_LITE_APPLICATION_ID");
    const sharedSecret = getCleanEnv("IVERI_LITE_SHARED_SECRET");
    const applicationId = formatApplicationId(rawApplicationId || "00000000-0000-0000-0000-000000000000");

    // --- CONFIRM PAYMENT (after LiteBox / return URL) ---
    if (action === "confirm-payment") {
      const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
      const nonce = typeof body.checkoutNonce === "string" ? body.checkoutNonce.trim() : "";
      const rawStatus = String(body.litePaymentCardStatus ?? "");
      const transactionId = typeof body.transactionIndex === "string" ? body.transactionIndex : null;

      if (!orderNumber || !nonce) return json({ error: "orderNumber and checkoutNonce required" }, 400);

      const { data: orders, error: findErr } = await supabaseAdmin
        .from("orders")
        .select("id, total, customer_email, customer_name, shipping_method, payment_status, checkout_nonce, user_id")
        .eq("order_number", orderNumber)
        .eq("user_id", user.id);

      if (findErr || !orders?.length) return json({ error: "Order not found" }, 404);

      const order = orders[0];
      if (order.checkout_nonce !== nonce) {
        return json({ error: "Invalid checkout nonce" }, 403);
      }

      // Security validation: Query the iVeri gateway directly to verify payment success
      // to prevent client-side payment status spoofing.
      let paymentStatus = mapPaymentStatus(rawStatus);
      if (paymentStatus === "paid") {
        const info = await queryAuthoriseInfo(gatewayUrl, applicationId, orderNumber);
        if (info.ok && info.rawStatus) {
          paymentStatus = mapPaymentStatus(info.rawStatus);
        } else {
          console.warn(`[iVeri Security] Could not verify payment status with gateway for order ${orderNumber}. Failing safe.`);
          paymentStatus = "failed";
        }
      }

      if (paymentStatus !== "paid") {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: paymentStatus,
            status: "cancelled",
            iveri_transaction_id: transactionId,
          })
          .eq("order_number", orderNumber)
          .eq("user_id", user.id);
        return json({ success: false, paymentStatus });
      }

      const wasPaid = order.payment_status === "paid";

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "pending",
          iveri_transaction_id: transactionId,
        })
        .eq("order_number", orderNumber)
        .eq("user_id", user.id);

      if (!wasPaid) {
        try {
          await sendOrderConfirmationEmail(supabaseAdmin, supabaseServiceKey, order, orderNumber);
        } catch (e) {
          console.error("[iVeri] confirm-payment email failed:", e);
        }
      }

      return json({ success: true, paymentStatus: "paid" });
    }

    // --- VERIFY VIA AuthoriseInfo ---
    if (action === "verify-transaction") {
      const merchantTrace = typeof body.merchantTrace === "string" ? body.merchantTrace.trim() : "";
      if (!merchantTrace) return json({ error: "merchantTrace required" }, 400);

      const info = await queryAuthoriseInfo(gatewayUrl, applicationId, merchantTrace);
      const paymentStatus = mapPaymentStatus(info.rawStatus);
      return json({
        success: info.ok,
        paymentStatus,
        rawStatus: info.rawStatus ?? null,
      });
    }

    // --- INITIALIZE (default) ---
    const { items, address, shippingMethod, shippingCost } = body as {
      items: CartItem[];
      address: AddressForm;
      shippingMethod: string;
      shippingCost: number;
    };

    if (!items?.length || !address) {
      return json({ error: "Invalid payload: items and address are required" }, 400);
    }

    const { fields: lineItemFields, totalCents } = buildLineItemFields(items, Number(shippingCost) || 0);
    const amountInCents = totalCents.toString();
    const orderNumber = generateOrderNumber();
    const merchantTrace = orderNumber;
    const checkoutNonce = generateCheckoutNonce();
    const customerEmail = address.email.trim();

    const byShop = new Map<string, CartItem[]>();
    for (const item of items) {
      const sid = item.shop.id;
      if (!byShop.has(sid)) byShop.set(sid, []);
      byShop.get(sid)!.push(item);
    }

    for (const [shopId, shopItems] of byShop) {
      const orderTotalForShop = shopItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: user.id,
          shop_id: shopId,
          total: orderTotalForShop,
          status: "pending",
          order_number: orderNumber,
          customer_name: `${address.firstName} ${address.lastName}`.trim(),
          customer_email: customerEmail,
          customer_phone: address.phone,
          shipping_address: address.address,
          shipping_city: address.city,
          shipping_state: address.state,
          shipping_zip_code: address.zipCode,
          shipping_country: address.country,
          shipping_method: shippingMethod,
          payment_method: "iveri_card",
          payment_status: "pending",
          iveri_merchant_trace: merchantTrace,
          checkout_nonce: checkoutNonce,
        })
        .select("id")
        .single();

      if (orderError) {
        return json({ error: "Could not create order records", details: orderError.message }, 500);
      }

      for (const it of shopItems) {
        const { error: itemError } = await supabaseAdmin.from("order_items").insert({
          order_id: order.id,
          product_id: it.product.id,
          quantity: it.quantity,
          price: Number(it.product.price),
        });
        if (itemError) {
          return json({ error: "Could not save order item records", details: itemError.message }, 500);
        }
      }
    }

    const resourcePath = "/Lite/Authorise.aspx";
    const liteTransactionToken = await generateLiteToken(
      sharedSecret,
      resourcePath,
      applicationId,
      amountInCents,
      customerEmail,
    );

    const siteUrl = (getCleanEnv("SITE_URL") || getCleanEnv("VITE_SITE_URL") || "https://tengavm.co.zw").replace(
      /\/$/,
      "",
    );
    const returnQuery = `order=${encodeURIComponent(orderNumber)}&nonce=${encodeURIComponent(checkoutNonce)}`;
    const successUrl = `${siteUrl}/order-confirmation?status=success&${returnQuery}`;
    const failUrl = `${siteUrl}/checkout?status=failed&${returnQuery}`;

    const formFields: Record<string, string> = {
      Lite_Merchant_ApplicationId: applicationId,
      Lite_Order_Amount: amountInCents,
      Ecom_BillTo_Online_Email: customerEmail,
      Lite_Transaction_Token: liteTransactionToken,
      Ecom_ConsumerOrderID: orderNumber,
      MerchantReference: orderNumber,
      Lite_Merchant_Trace: merchantTrace,
      [NONCE_FIELD]: checkoutNonce,
      Lite_Website_Successful_Url: successUrl,
      Lite_Website_Fail_Url: failUrl,
      Lite_Website_TryLater_Url: failUrl,
      Lite_Website_Error_Url: failUrl,
      Ecom_Payment_Card_Protocols: "IVERI",
      Ecom_TransactionComplete: "False",
      ...lineItemFields,
    };

    return json({
      success: true,
      gatewayUrl,
      portalUrl: gatewayOrigin(gatewayUrl),
      formFields,
      orderNumber,
      merchantTrace,
      checkoutNonce,
      amountInCents: totalCents,
    });
  } catch (err) {
    console.error("[iVeri Gateway] Fatal:", err);
    return json({ error: "Internal Server Error", details: (err as Error).message }, 500);
  }
});
