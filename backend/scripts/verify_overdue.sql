-- verify_overdue.sql
-- Query to list overdue invoices and the total overdue amount
SELECT invoice_no, total_amount_tsh, due_date, status FROM invoices WHERE status='overdue' ORDER BY id;

SELECT COALESCE(SUM(total_amount_tsh),0) AS total_overdue FROM invoices WHERE status='overdue';
