# Migrations

This repository includes SQL migration files under `backend/migrations/`.

To apply a migration locally against the database configured in `DATABASE_URL`, use the migration runner script:

1. Ensure `DATABASE_URL` is set in your environment (session or `.env`).

2. From the `backend/` folder run:

```powershell
# Example: apply migration 002_payments_attachments.sql
node scripts/apply_migration.js migrations/002_payments_attachments.sql
```

The script will run the SQL inside a transaction and print success or error messages.

Note: This tool executes raw SQL. Review the migration files before running and do not commit secrets.
