# Edge Functions & email

Tenga sends email through the official [Resend Node.js SDK](https://resend.com/docs/send-with-nodejs) via one Edge Function: **`send-email`**.

## Deploy without CLI (Supabase Dashboard)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Edge Functions**.
2. Click **Deploy a new function** (or edit an existing one).
3. **Function name:** `send-email` (must match exactly — the app calls this name).
4. Copy the entire contents of **`supabase/functions/send-email/index.ts`** into the editor.
5. Deploy.
6. Confirm secrets exist under **Project Settings → Edge Functions → Secrets**:
   - `RESEND_API_KEY` (often set automatically by the Resend integration)
   - `TRANSACTIONAL_FROM_EMAIL` = `Tenga Virtual Mall <info@tengavm.co.zw>`
   - Optional: `PROMO_FROM_EMAIL` = same address, `SITE_URL`

No Supabase CLI required. The file is self-contained (uses `https://esm.sh/resend@4` — no `_shared` imports).

### Request format

Every call sends JSON with an **`action`** field:

| `action` | Used when |
|----------|-----------|
| `shop-confirmation` | Open Shop form submitted |
| `order-confirmation` | Checkout completed |
| `shop-approved` | Admin approves a shop |
| `promotional-email` | Seller sends promo to followers/customers |
| `admin-promo-store-owners` | Admin emails store owners |

Example body: `{ "action": "order-confirmation", "email": "...", "orderNumber": "...", ... }`

---

## Quick setup (transactional + promotional)

### 1. Resend

1. Sign up at [resend.com](https://resend.com).
2. Create an **API key** (starts with `re_`).
3. **Verify** `tengavm.co.zw` at [resend.com/domains](https://resend.com/domains) so `info@tengavm.co.zw` can send. Default sender: `Tenga Virtual Mall <info@tengavm.co.zw>`.
4. For testing without your domain, use Resend test inboxes such as `delivered@resend.dev` as recipients (see [Resend test addresses](https://resend.com/docs)).

### 2. Shared email helper

All functions use `supabase/functions/_shared/resend.ts`:

- `getResend()` — `new Resend(Deno.env.get("RESEND_API_KEY"))`
- `sendEmail()` — `resend.emails.send()` with `{ data, error }` handling and optional `idempotencyKey`
- `sendBatchEmails()` — `resend.batch.send()` for promotional mail

### 3. Supabase secrets

Dashboard → **Project Settings** → **Edge Functions** → **Secrets**:

| Secret | Required | Example |
|--------|----------|---------|
| `RESEND_API_KEY` | Yes | `re_...` |
| `TRANSACTIONAL_FROM_EMAIL` | Recommended | `Tenga Virtual Mall <info@tengavm.co.zw>` |
| `PROMO_FROM_EMAIL` | Optional (promos) | `Tenga Virtual Mall <info@tengavm.co.zw>` |
| `SITE_URL` | Recommended | `https://your-production-domain.com` (used in shop-approved emails) |

`TRANSACTIONAL_FROM_EMAIL` is used for order confirmations, shop applications, and approvals.  
`PROMO_FROM_EMAIL` is used for seller/admin promotional sends (falls back to transactional/default).

### 4. Deploy with CLI (optional)

If the CLI works for you, deploy only the unified function:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-email
```

Project ref: Dashboard → Project Settings → General.

Older per-action functions (`send-shop-confirmation`, etc.) are optional; the app uses **`send-email`** only.

### 5. Auth emails (sign-up, password reset)

**Sign-up and password-reset emails are sent by Supabase Auth**, not `send-email`. Resend Edge Function secrets do **not** affect them until you wire SMTP below.

If users do not receive confirmation mail, check in order:

1. **Confirm email is on** — Dashboard → **Authentication** → **Providers** → Email → enable **Confirm email**.
2. **Custom SMTP (recommended)** — **Authentication** → **SMTP Settings** → enable custom SMTP with [Resend SMTP](https://resend.com/docs/send-with-smtp) (host `smtp.resend.com`, port `465` or `587`, user `resend`, password = your `re_` API key). Set sender to a verified address on your domain (e.g. `info@tengavm.co.zw`).
3. **URL Configuration** — **Authentication** → **URL Configuration**:
   - **Site URL:** `https://tengavm.co.zw`
   - **Redirect URLs:** `https://tengavm.co.zw/auth`, `https://tengavm.co.zw/**`, and `http://localhost:8080/**`
   - Sign-up uses `emailRedirectTo` → `https://tengavm.co.zw/auth` (must match an allowed redirect exactly or via wildcard).
4. **Auth logs** — Dashboard → **Authentication** → **Logs** for send failures.
5. **Spam / rate limits** — Supabase’s built-in mailer is rate-limited and often lands in spam; custom SMTP fixes most production issues.

The app can **resend** verification from the sign-up form (“Resend verification email”), which calls `supabase.auth.resend({ type: 'signup', ... })`.

---

## Transactional emails (automatic)

| Function | When it runs | Recipient |
|----------|----------------|-----------|
| `send-shop-confirmation` | User submits **Open Shop** | Shop contact email |
| `send-order-confirmation` | User completes **checkout** (logged in) | Customer email |
| `send-shop-approved` | Admin **approves** a shop | Shop contact email (or owner account email) |

All require the caller to be signed in (admin for shop-approved). They need `RESEND_API_KEY` on the server.

---

## send-shop-confirmation

Sends “We received your shop application” after Open Shop submit.

**Body:** `{ "email": "...", "shopName": "..." }`

```bash
npx supabase functions deploy send-shop-confirmation
```

---

## send-order-confirmation

Sends order receipt after checkout.

**Body:**

```json
{
  "email": "customer@example.com",
  "customerName": "Jane Doe",
  "orderNumber": "TNG-ABC123",
  "shippingMethod": "standard",
  "total": 49.99,
  "items": [{ "name": "Product", "qty": 1, "price": 44.0 }]
}
```

```bash
npx supabase functions deploy send-order-confirmation
```

---

## send-shop-approved

Sends “Your shop is live” when an admin approves a pending shop.

**Body:** `{ "shop_id": "<uuid>" }` (admin only)

```bash
npx supabase functions deploy send-shop-approved
```

Set `SITE_URL` so the email can include a link to `/shop/:slug`.

---

## send-promotional-email

Sends promotional emails to a shop’s followers and/or past customers. Only the shop owner can call this function.

### Body (JSON)

- `shop_id` (required) – UUID of the shop.
- `subject` (required) – Email subject.
- `body` (required) – Message body (plain text or HTML).
- `audience` (optional) – `"followers"`, `"customers"`, or both in an array. Default: `["followers"]`.

### Recipients

- **Followers**: users in `shop_followers` for this shop; emails are resolved via Auth Admin.
- **Past customers**: distinct `customer_email` from `orders` for this shop.

### Deploy

```bash
npx supabase functions deploy send-promotional-email
```

Optional: `PROMO_FROM_EMAIL` (defaults to `Tenga Virtual Mall <info@tengavm.co.zw>`).

---

## send-admin-promo-to-store-owners

Admin-only. Sends a promotional or announcement email to **store owners**. Optionally filter by **pricing tier** (Starter, Growth, Enterprise).

### Body (JSON)

- `subject` (required) – Email subject.
- `body` (required) – Message body (plain text or HTML).
- `tier` (optional) – `"all"` (default), `"starter"`, `"growth"`, or `"enterprise"`.

Uses `RESEND_API_KEY` and optional `PROMO_FROM_EMAIL`.

```bash
npx supabase functions deploy send-admin-promo-to-store-owners
```
