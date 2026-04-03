-- Add processing_step column to claims table for granular pipeline tracking
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS processing_step TEXT DEFAULT NULL;

-- Index for faster real-time queries
CREATE INDEX IF NOT EXISTS idx_claims_processing_step ON public.claims(processing_step);
