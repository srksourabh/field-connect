-- 015: Organisation Management — master data, leave policies
-- Creates hr_master_data (unified table for projects/departments/designations)
-- and hr_leave_policies (named leave policies assignable to employees)

-- 1. Master data table
CREATE TABLE IF NOT EXISTS hr_master_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('project', 'department', 'designation')),
  name TEXT NOT NULL,
  external_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, name)
);
ALTER TABLE hr_master_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON hr_master_data FOR ALL USING (true);

-- 2. Leave policies table
CREATE TABLE IF NOT EXISTS hr_leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sick_leave_count INTEGER NOT NULL DEFAULT 0,
  casual_leave_count INTEGER NOT NULL DEFAULT 0,
  privilege_leave_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE hr_leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON hr_leave_policies FOR ALL USING (true);

-- 3. Add leave_policy_id to profiles
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS leave_policy_id UUID REFERENCES hr_leave_policies(id);

-- 4. Seed existing data from profiles into master data
INSERT INTO hr_master_data (type, name)
  SELECT DISTINCT 'project', project_id FROM hr_profiles
  WHERE project_id IS NOT NULL AND project_id != ''
  ON CONFLICT DO NOTHING;

INSERT INTO hr_master_data (type, name)
  SELECT DISTINCT 'department', department FROM hr_profiles
  WHERE department IS NOT NULL AND department != ''
  ON CONFLICT DO NOTHING;

INSERT INTO hr_master_data (type, name)
  SELECT DISTINCT 'designation', designation FROM hr_profiles
  WHERE designation IS NOT NULL AND designation != ''
  ON CONFLICT DO NOTHING;
