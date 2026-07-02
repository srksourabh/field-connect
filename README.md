# Field Connect

Field Connect is the white-label HR and field workforce product powered by UDS.

It is cloned from the production UDS HR system into a separate codebase, GitHub repo, and Supabase database so the existing UDS production process stays untouched.

## Current White-Label Assets

- GitHub repo: https://github.com/srksourabh/field-connect
- Local folder: `C:\Users\soura\Dropbox\AI\Projects\field-connect`
- Supabase project: `Field Connect`
- Supabase project ref: `iefwhxxhrycaalhxkfgp`
- Supabase URL: `https://iefwhxxhrycaalhxkfgp.supabase.co`

## What This Product Includes

- Mobile-first employee attendance and punch in/out
- GPS field tracking
- Leave management and leave policies
- Company, department, and designation master data
- Employee onboarding
- Admin reports
- HR inbox
- Payroll settings, salary components, payroll runs, and payslips

## White-Label Operating Model

The database keeps the existing `project_id` field for compatibility, but the UI labels that master data area as Companies. Admins can create companies and policies from:

- `Dashboard -> Manage Organisation -> Companies`
- `Dashboard -> Manage Organisation -> Leave Policies`
- `Dashboard -> Payroll -> Company Settings`

## Environment

Create `.env.local` from `.env.example`.

`SUPABASE_SERVICE_ROLE_KEY` must be taken from the new Field Connect Supabase dashboard before admin APIs are deployed.

## Development

```bash
npm install
npm run build
npm run dev
```

## Production Isolation

Do not reuse the old UDS HR Supabase project, Vercel project, or environment variables for Field Connect. The current production UDS HR repo remains `srksourabh/uds-hr`.
