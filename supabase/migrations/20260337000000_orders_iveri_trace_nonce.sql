-- iVeri Lite: merchant trace + checkout nonce for return-url / LiteBox verification
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS iveri_merchant_trace text,
  ADD COLUMN IF NOT EXISTS checkout_nonce text;

COMMENT ON COLUMN public.orders.iveri_merchant_trace IS 'Lite_Merchant_Trace sent to iVeri (query status / reconciliation)';
COMMENT ON COLUMN public.orders.checkout_nonce IS 'Random per-checkout nonce (Tenga_Checkout_Nonce) for return URL validation';
