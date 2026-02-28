-- Add JSONB column to store KYC/bank details collected during onboarding
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS kyc_data JSONB;

COMMENT ON COLUMN hr_profiles.kyc_data IS 'KYC and bank details: {aadhaar, pan, bank_name, account_no, ifsc}';
