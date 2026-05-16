-- 022: snapshot hr_profiles before bulk upload feature ships
-- Used as a restore point; drop this table once bulk upload is stable in prod
CREATE TABLE IF NOT EXISTS hr_profiles_backup_20260516 AS
  SELECT * FROM hr_profiles;
