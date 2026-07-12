# PROGRESS

This file records every change made to the repository by date, author, files changed, and a short description.

Format:

- Date (ISO) | Author | Files changed | Short description

Entries:

- 2026-07-06T00:00:00Z | assistant | supabase/migrations/006_add_saudi_fields.sql | Added migration to create Saudi-specific fields and tables (Qiwa contracts, GOSI history, iqama/work-permit tracking) and payroll informational columns.
- 2026-07-06T00:00:00Z | assistant | src/lib/payroll-saudi.ts | Added Saudi payroll helper with `calcEndOfServiceBenefit` and `calcGosiContribution`.
- 2026-07-06T00:00:00Z | assistant | tests/payroll-saudi.test.ts | Added unit tests for ESB and GOSI helper functions.
- 2026-07-06T00:00:00Z | assistant | src/app/api/admin/payroll/route.ts | Integrated Saudi payroll helper into payroll run; upserts `gosi_*` and `esb_amount` informational fields.
- 2026-07-06T00:00:00Z | assistant | src/app/api/admin/payroll/wps-export/route.ts | Added WPS/Mudad export skeleton (CSV generator for payroll rows).
- 2026-07-06T00:00:00Z | assistant | (manage_todo_list) | Updated project todo list to track Saudi migration and Phase 1 steps.
- 2026-07-06T00:00:00Z | assistant | PROGRESS.md, scripts/record_change.js | Added progress file and a small change-recorder script (this entry).

How this file is maintained

- The assistant will append a new line for every change it makes during this project.
- You can manually append entries following the same format.
- A small helper script `scripts/record_change.js` is provided to append entries from the command line:

  node scripts/record_change.js "Short description" "file1,file2" "author name"

Example:

  node scripts/record_change.js "Add new API route" "src/app/api/new/route.ts" "Sourabh"

Notes

- Times should be recorded in ISO 8601 (UTC) to avoid ambiguity.
- Keep entries concise. For long explanations link to a PR or docs page.
