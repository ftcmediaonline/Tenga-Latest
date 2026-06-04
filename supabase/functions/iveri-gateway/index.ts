import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };
  shop: {
    id: string;
    name: string;
  };
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

// Generate the secure SHA-256 token for iVeri Lite
async function generateLiteToken(
  secretKey: string,
  resource: string,
  applicationId: string,
  amountInCents: string,
  emailAddress: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Formula: secretKey + time + resource + applicationId + amount + emailAddress
  const tokenString = secretKey + timestamp + resource + applicationId + amountInCents + emailAddress;

  const encoder = new TextEncoder();
  const data = encoder.encode(tokenString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Return format timestamp:hash
  return `${timestamp}:${hashHex}`;
}

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const isWebhook = url.pathname.endsWith("/webhook") || url.searchParams.get("webhook") === "true";

  // Setup Supabase Clients
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ----------------------------------------------------
    // CASE A: WEBHOOK / SILENT POST FROM IVERI
    // ----------------------------------------------------
    if (isWebhook && req.method === "POST") {
      console.log("[iVeri Webhook] Received status update from gateway");

      let payload: Record<string, string> = {};
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          payload[key] = String(value);
        }
      } else {
        payload = await req.json();
      }

      console.log("[iVeri Webhook] Parsed Payload:", JSON.stringify(payload, null, 2));

      const orderNumber = payload["Ecom_ConsumerOrderID"] || payload["MerchantReference"] || payload["Lite_Consumer_Order_ID"];
      const rawStatus = payload["Lite_Payment_Card_Status"] || payload["Lite_Status"];
      const transactionId = payload["Lite_TransactionIndex"] || payload["Lite_BankReference"];
      const responseToken = payload["Lite_Transaction_Token"];

      if (!orderNumber) {
        return new Response(JSON.stringify({ error: "Missing order identifier" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[iVeri Webhook] Processing Order: ${orderNumber} | Raw Status: ${rawStatus} | TxID: ${transactionId}`);

      // Lookup existing order
      const { data: order, error: orderLookupError } = await supabaseAdmin
        .from("orders")
        .select("id, total, customer_email, customer_name, shipping_method")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (orderLookupError || !order) {
        console.error(`[iVeri Webhook] Order not found in database: ${orderNumber}`, orderLookupError);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Map status
      let paymentStatus = "pending";
      if (rawStatus === "0" || rawStatus === "Success" || rawStatus === "APPROVED") {
        paymentStatus = "paid";
      } else if (rawStatus === "255" || rawStatus === "Error") {
        paymentStatus = "error";
      } else if (rawStatus !== undefined) {
        // Any other non-zero status code indicates declined/failed authorization
        paymentStatus = "failed";
      }

      // Update Order Table
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: paymentStatus,
          status: paymentStatus === "paid" ? "pending" : "cancelled", // pending fulfillment, or cancelled
          iveri_transaction_id: transactionId,
          iveri_transaction_token: responseToken,
        })
        .eq("order_number", orderNumber);

      if (updateError) {
        console.error("[iVeri Webhook] Failed to update order status:", updateError);
        return new Response(JSON.stringify({ error: "Database update failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[iVeri Webhook] Database updated. Order ${orderNumber} set to payment status: ${paymentStatus}`);

      // If PAID, trigger order confirmation email!
      if (paymentStatus === "paid") {
        try {
          // Fetch order items to include in the email
          const { data: itemsData } = await supabaseAdmin
            .from("order_items")
            .select("price, quantity, products(name)")
            .eq("order_id", order.id);

          const formattedItems = (itemsData || []).map((it: any) => ({
            name: it.products?.name || "Product",
            qty: it.quantity,
            price: Number(it.price),
          }));

          console.log("[iVeri Webhook] Triggering order confirmation email for", order.customer_email);

          await supabaseAdmin.functions.invoke("send-email", {
            headers: { Authorization: `Bearer ${supabaseServiceKey}` },
            body: {
              action: "order-confirmation",
              email: order.customer_email,
              customerName: order.customer_name,
              orderNumber: orderNumber,
              shippingMethod: order.shipping_method,
              total: Number(order.total),
              items: formattedItems,
            },
          });

          console.log("[iVeri Webhook] Order confirmation email dispatched successfully.");
        } catch (emailErr) {
          console.error("[iVeri Webhook] Warning: Failed to dispatch confirmation email:", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, paymentStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------
    // CASE B: INITIALIZE TRANSACTION (CALCULATE SECURE TOKEN)
    // ----------------------------------------------------
    if (req.method === "POST") {
      // Authenticate the user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUserClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { items, address, shippingMethod, shippingCost } = (await req.json()) as {
        items: CartItem[];
        address: AddressForm;
        shippingMethod: string;
        shippingCost: number;
      };

      if (!items || items.length === 0 || !address) {
        return new Response(JSON.stringify({ error: "Invalid payload: items and address are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate totals
      const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const total = subtotal + shippingCost;
      const orderNumber = `TNG-${Date.now().toString(36).toUpperCase()}`;

      // Insert Order and Order Items (grouped by shop)
      const byShop = new Map<string, CartItem[]>();
      for (const item of items) {
        const sid = item.shop.id;
        if (!byShop.has(sid)) byShop.set(sid, []);
        byShop.get(sid)!.push(item);
      }

      console.log(`[iVeri Gateway] Creating pending orders for ${user.email}. Order: ${orderNumber}`);

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
            customer_email: address.email,
            customer_phone: address.phone,
            shipping_address: address.address,
            shipping_city: address.city,
            shipping_state: address.state,
            shipping_zip_code: address.zipCode,
            shipping_country: address.country,
            shipping_method: shippingMethod,
            payment_method: "iveri_card",
            payment_status: "pending",
          })
          .select("id")
          .single();

        if (orderError) {
          console.error("[iVeri Gateway] Error inserting order:", orderError);
          return new Response(JSON.stringify({ error: "Could not create order records", details: orderError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        for (const it of shopItems) {
          const { error: itemError } = await supabaseAdmin.from("order_items").insert({
            order_id: order.id,
            product_id: it.product.id,
            quantity: it.quantity,
            price: Number(it.product.price),
          });

          if (itemError) {
            console.error("[iVeri Gateway] Error inserting order items:", itemError);
            return new Response(JSON.stringify({ error: "Could not save order item records", details: itemError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Configure iVeri values
      const rawApplicationId = Deno.env.get("IVERI_LITE_APPLICATION_ID") || "test-app-id-guid-placeholder";
      const sharedSecret = Deno.env.get("IVERI_LITE_SHARED_SECRET") || "test-shared-secret-placeholder";
      const gatewayUrl = Deno.env.get("IVERI_LITE_GATEWAY_URL") || "https://portal.host.iveri.com/Lite/Authorise.aspx";

      // Format application ID strictly according to iVeri requirements: uppercase with curly braces {GUID}
      let applicationId = rawApplicationId.trim();
      if (!applicationId.startsWith("{")) {
        applicationId = `{${applicationId}}`;
      }
      applicationId = applicationId.toUpperCase();

      // iVeri Lite expects amount in cents
      const amountInCents = Math.round(total * 100).toString();
      const customerEmail = address.email;
      const resourcePath = "/Lite/Authorise.aspx"; // Path portion of gatewayUrl

      // Generate SHA-256 secure Lite Transaction Token
      const liteTransactionToken = await generateLiteToken(
        sharedSecret,
        resourcePath,
        applicationId,
        amountInCents,
        customerEmail
      );

      console.log(`[iVeri Gateway] Generated Token: ${liteTransactionToken} for amount ${amountInCents} cents`);

      // Define standard redirection urls matching platform
      const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || "https://tengavm.co.zw").replace(/\/$/, "");
      const successUrl = `${siteUrl}/order-confirmation?status=success&order=${orderNumber}`;
      const failUrl = `${siteUrl}/checkout?status=failed&order=${orderNumber}`;

      // Package all the hidden form fields required by iVeri Lite
      const formFields = {
        Lite_Merchant_ApplicationId: applicationId,
        Lite_Order_Amount: amountInCents,
        Ecom_BillTo_Online_Email: customerEmail,
        Lite_Transaction_Token: liteTransactionToken,
        Ecom_ConsumerOrderID: orderNumber,
        MerchantReference: orderNumber,
        Lite_Website_Successful_Url: successUrl,
        Lite_Website_Fail_Url: failUrl,
        Lite_Website_TryLater_Url: failUrl,
        Lite_Website_Error_Url: failUrl,
        Ecom_Payment_Card_Protocols: "IVERI",
        Ecom_TransactionComplete: "False",
      };

      return new Response(JSON.stringify({
        success: true,
        gatewayUrl,
        formFields,
        orderNumber
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[iVeri Gateway] Fatal Error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
