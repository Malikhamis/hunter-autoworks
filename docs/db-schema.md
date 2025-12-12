# DB Schema Design - Hunter Autoworks

Goal: Postgres schema to support invoices, estimates, expenses, clients, items/services, attachments and reporting in TSH.

Guiding principles
- Currency: All monetary fields are integer `amount_tsh` stored in TSH (no decimals). Display formatting includes thousand separators and "TSh" prefix.
- Dates: Use `date` for invoice/expense dates and `timestamp with time zone` for created_at/updated_at.
- Reporting: Use `invoice_date` and `EXTRACT(YEAR FROM invoice_date)` in queries. Consider partitioning by year if dataset grows.
- Offline resilience: fallback JSON files will mirror core columns (doc_id, type, customer, amount, created_at).

Core tables

1) clients
- id: serial primary key
- name: text not null
- contact_phone: text
- contact_email: text
- address: text
- notes: text
- created_at: timestamptz default now()

2) items_services
- id: serial primary key
- name: text not null
- description: text
- unit_price_tsh: bigint not null
- created_at: timestamptz default now()

3) invoices
- id: serial primary key
- invoice_no: text not null unique (e.g., "007")
- client_id: int references clients(id) on delete set null
- status: text not null default 'draft' -- enum: draft,sent,unpaid,paid,cancelled
- sent_status: text default 'not_sent' -- enum: not_sent,draft,sent
- issue_date: date
- due_date: date
- total_amount_tsh: bigint default 0
- deposit_requested: boolean default false
- payment_method: text -- e.g., 'manual_crdb', 'cash'
- paid_date: date
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

4) invoice_items
- id: serial primary key
- invoice_id: int references invoices(id) on delete cascade
- item_id: int references items_services(id) -- optional
- description: text
- quantity: numeric default 1
- unit_price_tsh: bigint not null
- line_total_tsh: bigint not null -- (quantity * unit_price_tsh)

5) estimates
- id: serial primary key
- estimate_no: text unique
- client_id: int references clients(id)
- status: text default 'pending' -- pending,sent,accepted,rejected
- total_amount_tsh: bigint default 0
- created_at: timestamptz default now()

6) expenses
- id: serial primary key
- expense_date: date not null
- category: text
- amount_tsh: bigint not null
- notes: text
- attachment_id: int nullable
- created_at: timestamptz default now()

7) attachments
- id: serial primary key
- filename: text not null
- content_type: text
- path: text not null
- linked_type: text -- 'invoice'|'estimate'|'expense'
- linked_id: int
- created_at: timestamptz default now()

Indexes and queries
- Index `invoices_status_due_idx` on (status, due_date) for overdue/unpaid queries.
- Index on (issue_date) to accelerate yearly aggregates.

Seed guidance
- Provide seed rows that create 4 overdue invoices totaling TSH 4,840,100 as requested. Make them status='unpaid' with due_date in the past.

Migration strategy
- Provide a single SQL migration `001_create_tables.sql` that creates all tables and indexes.
- Provide seed script `seed_2025.sql` that inserts demo clients, items, and the invoices required.

Notes on scaling
- For large-scale multi-year reporting, consider partitioning `invoices` by year on `issue_date`.
- Keep money as integer TSH. If you later need cents, switch to minor currency units and adjust migrations.

Next: create migration SQL and seed script.