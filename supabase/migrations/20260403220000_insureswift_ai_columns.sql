-- ============================================================
-- InsureSwift: Add AI analysis columns to claims table
-- + Fix RLS so service-role API route can update claims
-- ============================================================

-- 1. Add missing AI result columns to claims
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS gemini_summary TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost_inr NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  ADD COLUMN IF NOT EXISTS gemini_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS stp_status TEXT DEFAULT 'Manual';

-- 2. Fix RLS: allow the service-role (used by /api/analyze-claim) to update claims
--    The service-role bypasses RLS by default when using the service key,
--    but we also need to allow claimant-owned rows to be updated by the pipeline.
--    We add a policy that allows updates when the row's user_id matches the caller
--    OR when the caller is an admin.  The server-side route uses service_role which
--    bypasses RLS entirely, so this is a belt-and-suspenders fix for anon-key fallback.

DROP POLICY IF EXISTS "service_update_claims" ON public.claims;
CREATE POLICY "service_update_claims"
ON public.claims FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 3. Index for faster admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_claims_status_submitted ON public.claims(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_fraud_score ON public.claims(fraud_score);
