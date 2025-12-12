-- 001_create_tables.sql
-- Creates core tables for Hunter Autoworks invoicing system

BEGIN;

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE items_services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit_price_tsh BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_status TEXT DEFAULT 'not_sent',
  issue_date DATE,
  due_date DATE,
  total_amount_tsh BIGINT DEFAULT 0,
  deposit_requested BOOLEAN DEFAULT false,
  payment_method TEXT,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items_services(id),
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price_tsh BIGINT NOT NULL,
  line_total_tsh BIGINT NOT NULL
);

CREATE TABLE estimates (
  id SERIAL PRIMARY KEY,
  estimate_no TEXT UNIQUE,
  client_id INTEGER REFERENCES clients(id),
  status TEXT DEFAULT 'pending',
  total_amount_tsh BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  category TEXT,
  amount_tsh BIGINT NOT NULL,
  notes TEXT,
  attachment_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT,
  path TEXT NOT NULL,
  linked_type TEXT,
  linked_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for reporting
CREATE INDEX invoices_status_due_idx ON invoices (status, due_date);
CREATE INDEX invoices_issue_date_idx ON invoices (issue_date);
CREATE INDEX invoices_issue_year_idx ON invoices (EXTRACT(YEAR FROM issue_date));

COMMIT;
