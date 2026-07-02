# Field Connect White-Label Ship Plan

## Goal

Create a standalone SaaS-ready copy of the production HR system without disturbing the live UDS HR product.

## Completed Foundation

- Separate folder: `C:\Users\soura\Dropbox\AI\Projects\field-connect`
- Separate private GitHub repo: `srksourabh/field-connect`
- Separate Supabase project/database: `Field Connect` / `iefwhxxhrycaalhxkfgp`
- Full checked-in migration chain replayed on the new database
- Fresh-project storage buckets added for avatars, leave attachments, and policy documents
- Product naming changed to Field Connect powered by UDS
- Admin organisation area labels projects as companies while preserving the existing schema field names

## SaaS Model

Use one Field Connect deployment for the operator/admin account. Each client company is created as a company record in master data, with its own:

- departments
- designations
- employees
- leave policies
- payroll settings
- HR policy documents

## Important Launch Gates

- Add the new `SUPABASE_SERVICE_ROLE_KEY` from the Field Connect Supabase dashboard to local/Vercel env.
- Create the first super admin user in the new Supabase Auth project.
- Review Supabase security advisors before selling this externally.
- Create a separate Vercel project before public launch.
- Keep UDS HR production env and deploy settings separate.

## Known Security Items From The Fresh Database

Supabase reports the inherited empty backup table `hr_profiles_backup_20260516` has RLS disabled. It contains zero rows in the new Field Connect database. Recommended next action before external launch:

```sql
ALTER TABLE public.hr_profiles_backup_20260516 ENABLE ROW LEVEL SECURITY;
```

Supabase also reports warnings inherited from the production schema around permissive master-data policies, public storage listing, and exposed security-definer helper functions. These should be hardened before onboarding outside companies.
