-- ============================================================
-- InsureSwift Full Schema Migration
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'claimant');

DROP TYPE IF EXISTS public.policy_type CASCADE;
CREATE TYPE public.policy_type AS ENUM ('motor', 'health', 'property');

DROP TYPE IF EXISTS public.claim_status CASCADE;
CREATE TYPE public.claim_status AS ENUM ('SUBMITTED', 'PROCESSING', 'APPROVED', 'REJECTED', 'ESCALATED', 'PENDING_REVIEW');

DROP TYPE IF EXISTS public.policy_status CASCADE;
CREATE TYPE public.policy_status AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'INACTIVE');

-- 2. CORE TABLES

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'claimant',
  lic_id TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- policies (insurance product templates)
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  policy_type public.policy_type NOT NULL,
  coverage_amount NUMERIC(12,2) NOT NULL,
  premium_annual NUMERIC(10,2) NOT NULL,
  max_claims INT NOT NULL DEFAULT 3,
  deductible NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.policy_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_policies (assignments: which user holds which policy)
CREATE TABLE IF NOT EXISTS public.user_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vehicle_or_asset TEXT,
  assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, policy_id)
);

-- claims
CREATE TABLE IF NOT EXISTS public.claims (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  policy_number TEXT NOT NULL,
  policy_type public.policy_type NOT NULL,
  claim_type TEXT NOT NULL,
  claimed_amount NUMERIC(12,2) NOT NULL,
  status public.claim_status NOT NULL DEFAULT 'SUBMITTED',
  fraud_score NUMERIC(4,3),
  confidence_score NUMERIC(4,3),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  incident_date DATE NOT NULL,
  location TEXT,
  description TEXT,
  rules_triggered TEXT[] DEFAULT '{}',
  rules_failed TEXT[] DEFAULT '{}',
  escalation_reason TEXT,
  damage_photo TEXT,
  ocr_extracted JSONB DEFAULT '{}',
  documents_uploaded TEXT[] DEFAULT '{}',
  processing_time_sec INT,
  decided_by TEXT,
  adjuster_note TEXT,
  adjuster_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  policy_type public.policy_type NOT NULL,
  claim_type TEXT NOT NULL,
  claimed_amount NUMERIC(12,2) NOT NULL,
  decision public.claim_status NOT NULL,
  decided_by TEXT NOT NULL,
  adjuster_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  fraud_score NUMERIC(4,3),
  confidence_score NUMERIC(4,3),
  rules_triggered TEXT[] DEFAULT '{}',
  rules_failed TEXT[] DEFAULT '{}',
  processing_time_sec INT,
  rejection_reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_policies_user_id ON public.user_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_policies_policy_id ON public.user_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_submitted_at ON public.claims(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_claim_id ON public.audit_log(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp DESC);

-- 4. FUNCTIONS (must be before RLS policies)

-- Auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, lic_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'claimant')::public.user_role,
    NEW.raw_user_meta_data->>'lic_id',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Check if current user is admin (reads from auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
  );
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: users manage own, admins see all
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admins_read_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_read_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- policies: admins manage, all authenticated can read active
DROP POLICY IF EXISTS "all_read_active_policies" ON public.policies;
CREATE POLICY "all_read_active_policies"
ON public.policies FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admins_manage_policies" ON public.policies;
CREATE POLICY "admins_manage_policies"
ON public.policies FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- user_policies: users see own, admins see all
DROP POLICY IF EXISTS "users_see_own_user_policies" ON public.user_policies;
CREATE POLICY "users_see_own_user_policies"
ON public.user_policies FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admins_manage_user_policies" ON public.user_policies;
CREATE POLICY "admins_manage_user_policies"
ON public.user_policies FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- claims: users see own, admins see all
DROP POLICY IF EXISTS "users_see_own_claims" ON public.claims;
CREATE POLICY "users_see_own_claims"
ON public.claims FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_claims" ON public.claims;
CREATE POLICY "users_insert_own_claims"
ON public.claims FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_update_claims" ON public.claims;
CREATE POLICY "admins_update_claims"
ON public.claims FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- audit_log: admins only
DROP POLICY IF EXISTS "admins_read_audit_log" ON public.audit_log;
CREATE POLICY "admins_read_audit_log"
ON public.audit_log FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "admins_insert_audit_log" ON public.audit_log;
CREATE POLICY "admins_insert_audit_log"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_claims_updated_at ON public.claims;
CREATE TRIGGER set_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_policies_updated_at ON public.policies;
CREATE TRIGGER set_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. SEED DATA
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  claimant_uuid UUID := gen_random_uuid();
  pol_mtr_uuid UUID := gen_random_uuid();
  pol_hlt_uuid UUID := gen_random_uuid();
  pol_prp_uuid UUID := gen_random_uuid();
  pol_mtr2_uuid UUID := gen_random_uuid();
  pol_hlt2_uuid UUID := gen_random_uuid();
  up_mtr_uuid UUID := gen_random_uuid();
  up_hlt_uuid UUID := gen_random_uuid();
  up_prp_uuid UUID := gen_random_uuid();
BEGIN
  -- Create admin auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@insureswift.com', crypt('Admin@123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Arvind Kumar', 'role', 'admin', 'lic_id', 'LIC-ADM-001'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[], 'role', 'admin'),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Create claimant auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    claimant_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'rahul@example.com', crypt('Rahul@123', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Rahul Mehta', 'role', 'claimant'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (id) DO NOTHING;

  -- Seed policies
  INSERT INTO public.policies (id, policy_number, name, policy_type, coverage_amount, premium_annual, max_claims, deductible, status, created_by)
  VALUES
    (pol_mtr_uuid, 'LIC-MTR-00291', 'Motor Comprehensive Plus', 'motor', 500000, 12400, 3, 5000, 'ACTIVE', admin_uuid),
    (pol_hlt_uuid, 'LIC-HLT-00184', 'Health Family Floater', 'health', 500000, 18200, 3, 2000, 'ACTIVE', admin_uuid),
    (pol_prp_uuid, 'LIC-PRP-00047', 'Property Shield', 'property', 2500000, 9800, 2, 10000, 'ACTIVE', admin_uuid),
    (pol_mtr2_uuid, 'LIC-MTR-00150', 'Motor Third Party', 'motor', 200000, 5200, 2, 3000, 'INACTIVE', admin_uuid),
    (pol_hlt2_uuid, 'LIC-HLT-00099', 'Health Individual Basic', 'health', 300000, 8900, 2, 1500, 'ACTIVE', admin_uuid)
  ON CONFLICT (id) DO NOTHING;

  -- Assign policies to claimant
  INSERT INTO public.user_policies (id, user_id, policy_id, policy_number, start_date, end_date, vehicle_or_asset, assigned_by)
  VALUES
    (up_mtr_uuid, claimant_uuid, pol_mtr_uuid, 'LIC-MTR-00291', '2026-03-15', '2027-03-14', 'Honda City – HR26DK4421', admin_uuid),
    (up_hlt_uuid, claimant_uuid, pol_hlt_uuid, 'LIC-HLT-00184', '2025-06-01', '2026-05-31', 'Family Floater – 4 Members', admin_uuid),
    (up_prp_uuid, claimant_uuid, pol_prp_uuid, 'LIC-PRP-00047', '2025-01-10', '2026-01-09', 'Flat 4B, Sector 21, Gurgaon', admin_uuid)
  ON CONFLICT (user_id, policy_id) DO NOTHING;

  -- Seed claims
  INSERT INTO public.claims (
    id, user_id, policy_id, policy_number, policy_type, claim_type,
    claimed_amount, status, fraud_score, confidence_score,
    submitted_at, decided_at, incident_date, location, description,
    rules_triggered, rules_failed, escalation_reason, damage_photo,
    ocr_extracted, documents_uploaded, processing_time_sec, decided_by, adjuster_note
  ) VALUES
  (
    'CLM-2026-0481', claimant_uuid, pol_mtr_uuid, 'LIC-MTR-00291', 'motor', 'vehicle_damage',
    485000, 'ESCALATED', 0.74, 0.52,
    '2026-04-03T08:14:22Z', null, '2026-04-01', 'NH-48, Gurgaon',
    'Vehicle hit by a truck while parked on the service road. Front bumper, hood, and left fender completely damaged.',
    ARRAY['policy_active','claim_type_covered','docs_present'],
    ARRAY['amount_near_limit'],
    'Claimed amount (Rs.4.85L) is 97% of coverage limit. Fraud score 0.74 exceeds threshold. Policy age only 18 days.',
    'https://img.rocket.new/generatedImages/rocket_gen_img_1da807495-1772179850346.png',
    '{"rc_book":{"vehicle_number":"HR26DK4421","owner_name":"Rahul Mehta"},"fir_copy":{"fir_number":"FIR/2026/GGN/0041","date":"2026-04-01"}}'::jsonb,
    ARRAY['rc_book','fir_copy','repair_estimate','driving_license'],
    34, 'AI Pipeline', null
  ),
  (
    'CLM-2026-0479', claimant_uuid, pol_hlt_uuid, 'LIC-HLT-00184', 'health', 'medical',
    145000, 'ESCALATED', 0.61, 0.58,
    '2026-04-03T07:42:10Z', null, '2026-03-28', 'Apollo Hospital, Chennai',
    'Emergency appendectomy surgery. Patient admitted on 28th March, discharged on 31st March.',
    ARRAY['policy_active','claim_type_covered'],
    ARRAY['docs_incomplete'],
    'Discharge summary missing. Claims this year: 2 (at limit). Fraud score 0.61.',
    'https://img.rocket.new/generatedImages/rocket_gen_img_15e8f6721-1766826533888.png',
    '{"hospital_bill":{"hospital_name":"Apollo Hospitals","patient_name":"Rahul Mehta","total_amount":"145000"}}'::jsonb,
    ARRAY['hospital_bill','prescription'],
    28, 'AI Pipeline', null
  ),
  (
    'CLM-2026-0474', claimant_uuid, pol_hlt_uuid, 'LIC-HLT-00184', 'health', 'medical',
    52000, 'APPROVED', 0.12, 0.91,
    '2026-04-02T11:20:44Z', '2026-04-02T11:21:18Z', '2026-04-01', 'Manipal Hospital, Bangalore',
    'Dengue fever hospitalization. 4-day admission, blood transfusion required.',
    ARRAY['policy_active','claim_type_covered','docs_present','amount_within_limit'],
    ARRAY[]::TEXT[],
    null,
    'https://img.rocket.new/generatedImages/rocket_gen_img_147917cfe-1772226087437.png',
    '{"hospital_bill":{"hospital_name":"Manipal Hospital","patient_name":"Rahul Mehta","total_amount":"52000"}}'::jsonb,
    ARRAY['hospital_bill','discharge_summary','prescription'],
    22, 'AI Pipeline (STP)', null
  ),
  (
    'CLM-2026-0472', claimant_uuid, pol_mtr_uuid, 'LIC-MTR-00291', 'motor', 'vehicle_damage',
    320000, 'APPROVED', 0.18, 0.88,
    '2026-04-02T09:05:11Z', '2026-04-02T09:05:52Z', '2026-04-01', 'Ahmedabad-Mumbai Expressway',
    'Tyre burst at high speed caused vehicle to skid and hit median. Airbags deployed.',
    ARRAY['policy_active','claim_type_covered','docs_present','amount_within_limit'],
    ARRAY[]::TEXT[],
    null,
    'https://img.rocket.new/generatedImages/rocket_gen_img_1e5487311-1775244102105.png',
    '{"rc_book":{"vehicle_number":"GJ01KX8823","owner_name":"Rahul Mehta"}}'::jsonb,
    ARRAY['rc_book','fir_copy','repair_estimate','driving_license'],
    19, 'AI Pipeline (STP)', null
  ),
  (
    'CLM-2026-0470', claimant_uuid, pol_mtr_uuid, 'LIC-MTR-00291', 'motor', 'vehicle_damage',
    190000, 'REJECTED', 0.85, 0.21,
    '2026-04-01T14:55:30Z', '2026-04-01T14:56:04Z', '2026-01-10', 'Mysore Road, Bangalore',
    'Flood damage to vehicle parked in basement.',
    ARRAY[]::TEXT[],
    ARRAY['incident_age_hard','policy_expired'],
    null,
    'https://img.rocket.new/generatedImages/rocket_gen_img_144e750fa-1771857144897.png',
    '{}'::jsonb,
    ARRAY['rc_book'],
    8, 'AI Pipeline (Hard Reject)', 'Policy expired. Incident occurred 83 days before submission.'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Seed audit_log for decided claims
  INSERT INTO public.audit_log (
    claim_id, claimant_name, claimant_email, policy_type, claim_type,
    claimed_amount, decision, decided_by, fraud_score, confidence_score,
    rules_triggered, rules_failed, processing_time_sec, rejection_reason, timestamp
  ) VALUES
  (
    'CLM-2026-0474', 'Rahul Mehta', 'rahul@example.com', 'health', 'medical',
    52000, 'APPROVED', 'AI Pipeline (STP)', 0.12, 0.91,
    ARRAY['policy_active','claim_type_covered','docs_present','amount_within_limit'],
    ARRAY[]::TEXT[], 22, null, '2026-04-02T11:21:18Z'
  ),
  (
    'CLM-2026-0472', 'Rahul Mehta', 'rahul@example.com', 'motor', 'vehicle_damage',
    320000, 'APPROVED', 'AI Pipeline (STP)', 0.18, 0.88,
    ARRAY['policy_active','claim_type_covered','docs_present','amount_within_limit'],
    ARRAY[]::TEXT[], 19, null, '2026-04-02T09:05:52Z'
  ),
  (
    'CLM-2026-0470', 'Rahul Mehta', 'rahul@example.com', 'motor', 'vehicle_damage',
    190000, 'REJECTED', 'AI Pipeline (Hard Reject)', 0.85, 0.21,
    ARRAY[]::TEXT[], ARRAY['incident_age_hard','policy_expired'],
    8, 'Policy expired. Incident occurred 83 days before submission.', '2026-04-01T14:56:04Z'
  )
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data error: %', SQLERRM;
END $$;
