-- Add 'wfh' (Work From Home) to leave request type enum
-- WFH does not consume leave balance — it's an approval-only request

ALTER TABLE hr_leave_requests
  DROP CONSTRAINT IF EXISTS hr_leave_requests_type_check;

ALTER TABLE hr_leave_requests
  ADD CONSTRAINT hr_leave_requests_type_check
  CHECK (type IN ('sick', 'casual', 'compoff', 'privilege', 'wfh'));
