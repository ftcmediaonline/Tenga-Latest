-- RPC: set shop name (only callable by is_dev, for dev panel)
CREATE OR REPLACE FUNCTION public.set_shop_name(p_shop_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_dev boolean;
BEGIN
  SELECT COALESCE(is_dev, false) INTO caller_is_dev FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  IF caller_is_dev IS NOT TRUE THEN
    SELECT COALESCE(is_dev, false) INTO caller_is_dev FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  END IF;
  IF caller_is_dev IS NOT TRUE THEN
    RAISE EXCEPTION 'Only dev users can edit shop names.';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Shop name cannot be empty.';
  END IF;

  UPDATE public.shops SET name = trim(p_name) WHERE id = p_shop_id;
END;
$$;
