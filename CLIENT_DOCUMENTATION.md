# Tenga Virtual Mall — Client Overview

**Document purpose:** This document gives you a clear picture of how the Tenga app works, what has been delivered so far, and what remains to reach a full launch. It is aligned with our 30-day agile development journal.

---

## 1. How the App Works

Tenga is a **virtual mall**: one place where shoppers discover multiple shops and products, and where sellers run their own “stalls” (shops). Below is how each type of user experiences the app.

---

### Shoppers (Buyers)

| Step | What they do |
|------|-------------------------------|
| **Discover** | Land on the homepage (hero, categories, **featured shops** [curated in Dev panel], trending products). Use **Discover** and **Search** to find products and shops. On the Discover page, **Featured Brands** shows only shops approved as “featured” in the Dev panel; the product grid shows only shops/products enabled for “Discover” in the Dev panel. |
| **Browse** | Open **Shops** or **Categories**, click into a shop or product to see details, images, variants, and reviews. |
| **Save & follow** | Add products to **Wishlist** and **follow** shops they like. |
| **Cart** | Add items to the cart (with variants when available). Open the cart drawer to change quantity or remove items. |
| **Checkout** | Go to **Checkout**, enter shipping and contact details, choose shipping method and **payment method** (secure **iVeri** card/mobile pay, or **pay on delivery/pickup**). Place order and see **Order Confirmation**. |
| **Orders** | View **Order History** and order status. |
| **Account** | Sign up / sign in (**Auth**). Manage **Profile** and see **Following** (shops they follow). |

**Online payment** uses the **iVeri Lite** gateway (CBZ-hosted): shoppers can pay by card or local wallets in a secure popup. **Pay on delivery/pickup** remains available for customers who prefer cash. Order emails are sent after card payment (webhook + confirmation) or immediately for cash orders.

---

### Sellers (Vendors / Shop Owners)

| Step | What they do |
|------|-------------------------------|
| **Open a shop** | Use **Open Shop**: enter shop details, upload logo and banner, pick a category, review and submit. New shops wait for **admin approval** before going live. |
| **Seller dashboard** | Once approved, manage the shop: **Products** (add, edit, images), **Orders** (view, update status, see customer/shipping info), **Reviews** (see and reply to product reviews), and **Shop contact** (email, phone). |
| **Visibility** | Shops appear in the mall (homepage, Discover, Shops, Categories). Shoppers can follow the shop and buy products. |

Subscription billing (e.g. “rent” for the stall) and automatic commission/payout are **not yet implemented**; the app is ready for that logic to be plugged in.

---

### Admins (Tenga Team)

| Step | What they do |
|------|-------------------------------|
| **Admin dashboard** | **Performance stats at a glance** (pending shops, total shops, orders, users, revenue) between search and tabs. View **pending shops** (awaiting approval), **all shops**, **users**, **orders**, **products**, **messages**, and **promotions**. Approve or reject new shops; manage user roles; update order status and tracking; delete users/shops when needed. Toggle **trending** for products (homepage). |
| **Control** | Only users with the **admin** role can access the admin dashboard; permissions are enforced in the database (Row Level Security). **Featured shops** (which shops appear in “Featured Brands” on home and Discover) are controlled in the **Dev panel**, not Admin. |

### Dev Panel (Curation & Dev Tools)

| Step | What they do |
|------|-------------------------------|
| **Dev panel** (`/dev`) | Available to users with **dev** access (`is_dev` flag). **Discover tab:** Choose which verified shops and products appear on the **Discover** page (toggles “On Discover”). **Featured tab:** Choose which verified shops appear in the **Featured Brands** carousel on the home page and Discover page (toggles “Feature” / “Featured”). **Dev access tab:** Grant or revoke dev panel access for other users. **Database tab:** View table row counts. **Overview:** Environment info and quick links. |
| **Discover vs Featured** | **Discover** = which shops/products show in the Discover page product grid. **Featured** = which shops show in the “Featured Brands” carousel (home and Discover). Both are curated in the Dev panel. |

---

## 2. What Has Been Accomplished

The following reflects what is **built and working** in the current codebase, mapped to the 30-day plan where relevant.

---

### Week 1 — Design & Frontend Foundations ✅

| Delivered | Status |
|-----------|--------|
| **Tech stack** | Vite, TypeScript, Tailwind CSS, React, shadcn/ui — project set up with strict typing and no lint errors. |
| **UI component library** | Reusable components (buttons, cards, inputs, dialogs, tabs, etc.) used across the app. |
| **Landing page / “Mall entrance”** | Homepage with hero, category section, featured shops, trending products, and promo banner — responsive. |
| **Data–component mapping** | Clear types for Shop, Product, Cart, Category, Review, Order; frontend is wired to these. |

---

### Week 2 — Frontend Logic & Supabase Integration ✅

| Delivered | Status |
|-----------|--------|
| **Navigation & routing** | Full routing: Home, Shops, Shop by slug, Discover, Search, Product, Reviews, Categories, Trending, Checkout, Order Confirmation, Open Shop, Auth, Help, Contact, Legal pages, Seller Dashboard, Admin, Pricing, Success Stories, Wishlist, Orders, Following, Profile, 404. |
| **Supabase & auth** | Supabase project connected. **Sign up, login, logout** work; session is persisted; auth state is used across the app (e.g. cart, wishlist, protected routes). |
| **Database & security (RLS)** | Core tables and Row Level Security in place: profiles (with role), shops, products, product_images, categories, cart_items, orders, order_items, reviews, shop_followers, product_likes, seller policies, admin policies. Migrations are versioned and documented. |
| **Live data** | Product cards, shop listings, and product/shop detail pages load from Supabase (no static mock data for core flows). Loading and error handling (e.g. skeletons, toasts) in place. |
| **Vendor product uploads** | Sellers can **add products** (name, price, description, image) from the Seller Dashboard; images go to Supabase Storage; data is saved to the database. |
| **Roles** | **User**, **Seller** (shop owner), and **Admin** roles implemented in the database and used in the UI (e.g. admin dashboard, open-shop flow). |

---

### Week 3 — Monetization & Payments (Mostly done) ✅ / ⚠️

| Delivered | Status |
|-----------|--------|
| **Checkout UI** | Cart summary, shipping/contact validation, shipping method, **payment method choice** (iVeri vs pay on delivery). |
| **iVeri gateway** | `iveri-gateway` Edge Function: SHA-256 Lite token, LiteBox modal checkout, webhook updates `payment_status`, order confirmation emails. |
| **Cash on delivery** | Orders with `payment_method: cash_on_delivery`; pay when delivered or at pickup. |
| **Order management** | Orders include `payment_status` and `payment_method`; visible on **Order History** and **Seller Dashboard**. |
| **Pricing page** | Tiers and commission rates displayed; **automated subscription billing not yet live**. |
| **Commission & payout** | **Not implemented** — no server-side split or vendor payouts yet. |
| **Subscription “rent”** | **Not implemented** — recurring shop fees still to do. |

**Remaining for money:** production iVeri merchant credentials, webhook registered with iVeri, commission/payout automation, subscription billing, and live E2E payment testing.

---

### Week 4 — Polish & Launch (Partial) ⚠️

| Delivered | Status |
|-----------|--------|
| **UI polish & animations** | Framer Motion and Tailwind used for transitions and hover states; layout is responsive (including mobile menu). |
| **TypeScript & robustness** | Typed data flows; 404 and auth guards in place; form validation (e.g. Zod on checkout). |
| **Search** | Search page and query parameter (`?q=`) work; results are driven by existing Supabase data. (Advanced full-text search / typo tolerance can be added later.) |
| **SEO / meta** | Basic meta tags (title, description, OG) on the main HTML; per-store or per-product meta can be extended. |
| **Vendor onboarding** | Open Shop is a clear multi-step flow (details → branding → category → review). A separate “Quick Start” tutorial (e.g. 3-step modal) is **not** built yet. |
| **Deployment** | App can be built (`npm run build`) and served as a static frontend; production deployment (e.g. Vercel) and Supabase production mode are **environment/config** steps. |
| **E2E testing & launch** | No automated E2E suite or formal “Day 28” full-flow test documented here; manual testing is assumed. |

### Curation & Dev Tools (Post–Week 4) ✅

| Delivered | Status |
|-----------|--------|
| **Dev panel** (`/dev`) | Dev-only dashboard (users with `is_dev`): **Discover** tab toggles which shops/products appear on the Discover page; **Featured** tab toggles which shops appear in “Featured Brands” (home + Discover); **Dev access** to grant/revoke dev; **Database** table stats; **Overview** with environment and links. |
| **Discover page curation** | RPC `get_discover_shop_ids()` as single source of truth; public can read verified shops. Discover product grid shows only shops/products with “On Discover” enabled in Dev panel. |
| **Featured Brands** | Home and Discover “Featured Brands” carousel shows only shops with “Featured” toggle on in Dev panel (not “Discover”). RPC `set_shop_featured` lets devs update `is_featured` without admin role. |
| **Admin dashboard** | **Performance stats at a glance** between search bar and tab bar: Pending shops, Shops, Orders, Users, Revenue (from order totals). Featured-shop control moved to Dev panel. |

---

## 3. What Still Needs to Be Accomplished

These items are **outstanding** to reach the full vision described in the development journal.

---

### High priority (money & trust)

| # | Item | Notes |
|---|------|--------|
| 1 | **Production iVeri setup** | Live `IVERI_*` secrets in Supabase; webhook URL registered; sandbox → production cutover. |
| 2 | **Commission & payout logic** | Server-side calculation of Tenga commission and vendor share; store split amounts; work in cents. |
| 3 | **Realtime payment UI** | Optional Supabase Realtime on `payment_status` so order pages update without refresh. |
| 4 | **E2E payment testing** | Full test: card pay, webhook, email, seller sees `paid` status. |
| 5 | **Subscription billing (“rent”)** | Recurring billing for shop subscriptions (e.g. Basic/Premium) via Bank API; handle failed payments and retries; notify vendors. |

---

### Medium priority (product completeness)

| # | Item | Notes |
|---|------|--------|
| 6 | **Vendor onboarding tutorial** | In-dashboard “Quick Start” (e.g. 3-step modal) so new vendors can set up in under a few minutes. |
| 7 | **Full-text search** | Improve search with Postgres full-text (e.g. GIN index) for speed and better matching as data grows. |
| 8 | **SEO per store/product** | Dynamic meta tags (and optionally structured data) for each shop and product page for better indexing. |

---

### Before go-live

| # | Item | Notes |
|---|------|--------|
| 9 | **Production deployment** | Deploy frontend to production (e.g. Vercel), point to production Supabase, use production Bank API credentials from a secret manager. |
| 10 | **End-to-end testing** | Formal pass: “Brand signup → open shop → admin approval → add product → customer purchase → payment → confirmation” on the live stack. |
| 11 | **Launch materials** | Demo video and any marketing assets as in “Day 29” of the journal. |

---

## 4. Summary Table

| Area | Accomplished | Remaining |
|------|--------------|-----------|
| **Design & frontend** | Landing, components, routing, responsive layout, animations | Optional extra polish |
| **Auth & users** | Sign up, login, logout, roles (user/seller/admin), dev access (`is_dev`) | — |
| **Shops & products** | Open Shop, approval, product CRUD, images, categories | Vendor onboarding tutorial |
| **Shopping** | Browse, search, cart, wishlist, follow shops, checkout with iVeri + COD; Discover + Featured curation (Dev panel) | Production iVeri credentials |
| **Orders** | Order history, seller list, fulfillment status, **payment status badges** | Realtime payment updates (optional) |
| **Admin** | Performance stats at a glance, approve/reject shops, users/shops/orders/products/messages/promotions, role management, trending toggles | — |
| **Dev panel** | Discover/Featured curation, dev access management, database stats, RPCs for discover + featured | — |
| **Money** | iVeri checkout, COD, pricing page | **Commission/payout, subscription billing** |
| **Launch** | Build, preview, docs | **Deploy, E2E, launch materials** |

---

## 5. Document Control

- **Title:** Tenga Virtual Mall — Client Overview  
- **Audience:** Client / stakeholder  
- **Source:** Development journal (30-day agile) + current codebase  
- **Last updated:** Documentation updated to include Dev panel, Discover/Featured curation, admin performance stats, and clarification of what is accomplished vs. remaining.

For technical details (setup, env vars, routes, data model, Supabase), see **DOCUMENTATION.md**.
