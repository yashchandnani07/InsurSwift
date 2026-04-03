-- Add error tracking fields to claims table
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS error_step TEXT DEFAULT NULL;
