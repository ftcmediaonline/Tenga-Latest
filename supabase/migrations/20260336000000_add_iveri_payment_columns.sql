-- Add payment tracking columns to public.orders to support iVeri payment integration
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending', -- pending, paid, failed, refunded
  ADD COLUMN IF NOT EXISTS iveri_transaction_id text,
  ADD COLUMN IF NOT EXISTS iveri_transaction_token text;

-- Add comment explaining columns
COMMENT ON COLUMN public.orders.payment_method IS 'Method used for payment: e.g. cash_on_delivery, iveri_card';
COMMENT ON COLUMN public.orders.payment_status IS 'Current state of payment: pending, paid, failed, refunded';
COMMENT ON COLUMN public.orders.iveri_transaction_id IS 'Unique transaction tracking index returned by iVeri Gateway';
COMMENT ON COLUMN public.orders.iveri_transaction_token IS 'Hashed transaction token used for validation and verification';
