CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anonymous) to submit contact inquiries
CREATE POLICY "Anyone can submit contact inquiries"
  ON public.contact_inquiries FOR INSERT
  WITH CHECK (true);

-- Allow admins and devs to view, update, delete inquiries
CREATE POLICY "Admins and devs can select inquiries"
  ON public.contact_inquiries FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'dev') OR public.get_my_is_dev() = true);

CREATE POLICY "Admins and devs can update inquiries"
  ON public.contact_inquiries FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'dev') OR public.get_my_is_dev() = true)
  WITH CHECK (true);

CREATE POLICY "Admins and devs can delete inquiries"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'dev') OR public.get_my_is_dev() = true);
