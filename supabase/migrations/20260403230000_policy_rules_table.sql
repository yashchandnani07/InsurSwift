-- Migration: Add policy_rules table for Dynamic Policy Engine
-- Admin can edit Markdown rules that are injected directly into Gemini prompts

CREATE TABLE IF NOT EXISTS public.policy_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_type text NOT NULL CHECK (policy_type IN ('motor', 'health', 'property', 'global')),
  title text NOT NULL,
  markdown_content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Unique constraint: one rule set per policy type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policy_rules_policy_type_key'
  ) THEN
    ALTER TABLE public.policy_rules ADD CONSTRAINT policy_rules_policy_type_key UNIQUE (policy_type);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;

-- Admins can read/write; claimants can only read active rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'policy_rules' AND policyname = 'policy_rules_admin_all') THEN
    CREATE POLICY policy_rules_admin_all ON public.policy_rules
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'policy_rules' AND policyname = 'policy_rules_read_active') THEN
    CREATE POLICY policy_rules_read_active ON public.policy_rules
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Index for fast lookup by type
CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON public.policy_rules (policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_rules_active ON public.policy_rules (is_active);
