-- 002_payments_attachments.sql
-- Adds payments table and supporting indexes for invoice payment tracking
-- 002_payments_attachments.sql
-- Consolidated migration: create payments table and supporting indexes
-- This migration is idempotent (uses IF NOT EXISTS) and merges earlier duplicate definitions.

BEGIN;

-- Payments table: records manual and gateway payments against invoices
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount_tsh BIGINT NOT NULL,
  currency TEXT DEFAULT 'TZS',
  method TEXT, -- e.g. 'cash','mpesa','card','bank_transfer'
  reference TEXT, -- external provider/tracking id
  -- recorded_by / created_by: optional reference to admins.id (nullable)
  recorded_by INTEGER,
  -- free-form metadata (gateway payloads, fees, taxes)
  meta JSONB,
  -- canonical recorded/payment timestamp
  payment_date TIMESTAMPTZ DEFAULT now(),
  -- legacy note field
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);

COMMIT;
