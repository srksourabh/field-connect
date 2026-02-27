-- Privilege leave disabled by default (0 days). Admin enables per-employee.
ALTER TABLE hr_leave_balances ALTER COLUMN privilege_leave_total SET DEFAULT 0;

-- Set all existing balances to 0 privilege leave (unless already manually set)
UPDATE hr_leave_balances SET privilege_leave_total = 0 WHERE privilege_leave_total = 15;
