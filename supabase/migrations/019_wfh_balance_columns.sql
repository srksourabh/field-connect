-- Add WFH (Work From Home) balance columns to hr_leave_balances
-- 10 days per year, tracked like casual leave

ALTER TABLE hr_leave_balances
  ADD COLUMN IF NOT EXISTS wfh_total integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS wfh_used integer NOT NULL DEFAULT 0;
