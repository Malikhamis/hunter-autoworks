-- seed_2025.sql
-- Seed demo data for 2025 to produce dashboard metrics (4 overdue invoices totaling TSH 4,840,100)

BEGIN;

-- Clients
INSERT INTO clients (name, contact_phone, contact_email, address, notes)
VALUES
('PS Auto Center', '+255700000001', 'psauto@example.com', 'Dar es Salaam', 'Demo client'),
('A1 Motors', '+255700000002', 'a1@example.com', 'Arusha', ''),
('QuickFix Garage', '+255700000003', 'quickfix@example.com', 'Mwanza', '');

-- Items/Services
INSERT INTO items_services (name, description, unit_price_tsh) VALUES
('Oil Change', 'Engine oil and filter', 5000),
('Brake Pad Replacement', 'Front brake pads', 120000),
('Wheel Alignment', '4-wheel alignment', 35000),
('Full Service', 'Comprehensive service package', 250000);

-- Create invoices: 4 overdue invoices totalling 4,840,100 TSH
-- Invoice amounts chosen to sum to 4,840,100

-- Invoice 1: overdue
INSERT INTO invoices (invoice_no, client_id, status, issue_date, due_date, total_amount_tsh)
VALUES ('INV-2025-001', 1, 'sent', '2025-08-01', '2025-08-15', 120000);

-- Invoice 2: overdue
INSERT INTO invoices (invoice_no, client_id, status, issue_date, due_date, total_amount_tsh)
VALUES ('INV-2025-002', 1, 'overdue', '2025-07-10', '2025-07-24', 350000);

-- Invoice 3: overdue
INSERT INTO invoices (invoice_no, client_id, status, issue_date, due_date, total_amount_tsh)
VALUES ('INV-2025-003', 2, 'overdue', '2025-06-01', '2025-06-14', 2460100);

-- Invoice 4: overdue
INSERT INTO invoices (invoice_no, client_id, status, issue_date, due_date, total_amount_tsh)
VALUES ('INV-2025-004', 3, 'overdue', '2025-05-20', '2025-06-05', 1840000);

-- Map invoice items roughly
INSERT INTO invoice_items (invoice_id, item_id, description, quantity, unit_price_tsh, line_total_tsh) VALUES
(1, 1, 'Oil Change for Toyota', 1, 5000, 5000),
(1, 3, 'Wheel alignment', 1, 35000, 35000),
(2, 4, 'Full service for Mercedes', 1, 250000, 250000),
(3, 2, 'Brake pads for truck', 1, 120000, 120000),
(3, 4, 'Full service large vehicle', 1, 2340100, 2340100),
(4, 4, 'Full service', 1, 1840000, 1840000);

COMMIT;
